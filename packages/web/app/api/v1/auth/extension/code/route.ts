import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { requireAuth, isAuthError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { encrypt } from '@/lib/crypto'
import { ok, Errors } from '@/lib/response'

const schema = z.object({
  state: z.string().min(16).max(128),
  extensionId: z.string().min(1).max(128),
  // The web app passes its current Supabase tokens to be relayed to the extension
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
})

export async function POST(request: NextRequest) {
  // This endpoint is called by the web app after the user has logged in via Supabase.
  // The web app sends its own Supabase tokens so they can be securely relayed to the extension.
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return Errors.badRequest('Invalid request body')
  }

  const supabase = createServiceClient()

  // Generate a cryptographically random one-time code
  const code = randomBytes(32).toString('hex')

  // Encrypt the Supabase tokens before storing — they must never be readable from the DB
  const encryptedTokens = encrypt(
    JSON.stringify({
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
    }),
  )

  const { error } = await supabase.from('auth_extension_codes').insert({
    user_id: auth.ctx.user.id,
    code,
    state: body.state,
    encrypted_tokens: encryptedTokens,
    // expires_at has a DB default of NOW() + 2 minutes
  })

  if (error) {
    console.error('Failed to create extension code:', error?.message)
    return Errors.internalError()
  }

  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString()

  return ok({ code, expiresAt })
}
