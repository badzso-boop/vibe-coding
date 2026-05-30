import { type NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { ok, Errors } from '@/lib/response'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const supabase = createServiceClient()

  const { data: devices, error } = await supabase
    .from('devices')
    .select('id, name, browser, last_seen_at, created_at, is_revoked')
    .eq('user_id', auth.ctx.user.id)
    .eq('is_revoked', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch devices:', error)
    return Errors.internalError()
  }

  return ok(
    (devices ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      browser: d.browser,
      lastSeenAt: d.last_seen_at,
      createdAt: d.created_at,
      isCurrent: d.id === auth.ctx.deviceId,
    })),
  )
}
