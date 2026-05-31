import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase'
import { decrypt } from '@/lib/crypto'
import { checkDeviceLimit } from '@/lib/tier'
import { ok, created, Errors } from '@/lib/response'

const schema = z.object({
  code: z.string().length(64),
  state: z.string().min(16).max(128),
  deviceName: z.string().min(1).max(255).default('Browser Extension'),
  browser: z.enum(['chrome', 'firefox', 'edge', 'brave', 'safari']).optional(),
})

export async function POST(request: NextRequest) {
  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return Errors.badRequest('Invalid request body')
  }

  const supabase = createServiceClient()

  // Look up the one-time code
  const { data: record } = await supabase
    .from('auth_extension_codes')
    .select('*')
    .eq('code', body.code)
    .maybeSingle()

  // Validate: must exist, not expired, not already used, state must match
  if (!record) {
    return Errors.authCodeExpired()
  }
  if (new Date(record.expires_at) < new Date()) {
    return Errors.authCodeExpired()
  }
  if (record.used_at !== null) {
    return Errors.authCodeExpired()
  }
  if (record.state !== body.state) {
    return Errors.authStateMismatch()
  }

  // Mark as used immediately to prevent replay attacks
  const { error: markError } = await supabase
    .from('auth_extension_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', record.id)

  if (markError) {
    console.error('Failed to mark code as used:', markError)
    return Errors.internalError()
  }

  // Decrypt the stored Supabase tokens
  let tokens: { accessToken: string; refreshToken: string }
  try {
    tokens = JSON.parse(decrypt(record.encrypted_tokens)) as {
      accessToken: string
      refreshToken: string
    }
  } catch {
    console.error('Failed to decrypt extension tokens')
    return Errors.internalError()
  }

  // Check device limit — if at limit, try to reclaim a never-activated device
  const limitError = await checkDeviceLimit(supabase, record.user_id)
  if (limitError) {
    // 1. Clean up a device that was registered but never activated (failed mid-flow)
    const { data: neverUsed } = await supabase
      .from('devices')
      .select('id')
      .eq('user_id', record.user_id)
      .eq('is_revoked', false)
      .is('last_seen_at', null)
      .limit(1)
      .maybeSingle()

    if (neverUsed) {
      await supabase.from('devices').delete().eq('id', neverUsed.id)
    } else {
      // 2. For free tier (limit = 1): auto-revoke the oldest device so re-installing
      //    the extension doesn't permanently lock users out.
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('tier')
        .eq('user_id', record.user_id)
        .maybeSingle()
      const tier = (sub?.tier as string | null) ?? 'free'

      if (tier === 'free') {
        const { data: oldest } = await supabase
          .from('devices')
          .select('id')
          .eq('user_id', record.user_id)
          .eq('is_revoked', false)
          .order('last_seen_at', { ascending: true, nullsFirst: true })
          .limit(1)
          .maybeSingle()

        if (oldest) {
          await supabase.from('devices').delete().eq('id', oldest.id)
        } else {
          return limitError
        }
      } else {
        return limitError
      }
    }
  }

  // Fetch user profile to return alongside tokens
  const { data: userProfile } = await supabase
    .from('users')
    .select('id, email, name, avatar_url')
    .eq('id', record.user_id)
    .single()

  // Register the new device
  const { data: device, error: deviceError } = await supabase
    .from('devices')
    .insert({
      user_id: record.user_id,
      name: body.deviceName,
      browser: body.browser ?? null,
    })
    .select('id')
    .single()

  if (deviceError || !device) {
    console.error('Failed to create device:', deviceError)
    return Errors.internalError()
  }

  return created({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    deviceId: device.id,
    user: {
      id: userProfile?.id ?? record.user_id,
      email: userProfile?.email ?? '',
      name: userProfile?.name ?? null,
      avatarUrl: userProfile?.avatar_url ?? null,
    },
  })
}
