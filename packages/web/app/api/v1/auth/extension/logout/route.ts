import { type NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { noContent, Errors } from '@/lib/response'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const { deviceId, user } = auth.ctx

  if (!deviceId) {
    return Errors.badRequest('X-Device-Id header is required for extension logout')
  }

  const supabase = createServiceClient()

  // Revoke the device — next API call with this deviceId returns 401 DEVICE_REVOKED
  const { error } = await supabase
    .from('devices')
    .update({ is_revoked: true })
    .eq('id', deviceId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to revoke device:', error?.message)
    return Errors.internalError()
  }

  return noContent()
}
