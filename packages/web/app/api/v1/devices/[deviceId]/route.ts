import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth, isAuthError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { ok, noContent, Errors } from '@/lib/response'

type Params = { params: Promise<{ deviceId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const { deviceId } = await params

  const schema = z.object({ name: z.string().min(1).max(255) })
  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return Errors.badRequest('Invalid request body')
  }

  const supabase = createServiceClient()

  const { data: device, error } = await supabase
    .from('devices')
    .update({ name: body.name })
    .eq('id', deviceId)
    .eq('user_id', auth.ctx.user.id)
    .eq('is_revoked', false)
    .select('id, name, browser, last_seen_at, created_at')
    .maybeSingle()

  if (error) {
    console.error('Failed to update device:', error?.message)
    return Errors.internalError()
  }
  if (!device) return Errors.deviceNotFound()

  return ok({
    id: device.id,
    name: device.name,
    browser: device.browser,
    lastSeenAt: device.last_seen_at,
    createdAt: device.created_at,
    isCurrent: device.id === auth.ctx.deviceId,
  })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const { deviceId } = await params

  const supabase = createServiceClient()

  const { data: device } = await supabase
    .from('devices')
    .select('id')
    .eq('id', deviceId)
    .eq('user_id', auth.ctx.user.id)
    .maybeSingle()

  if (!device) return Errors.deviceNotFound()

  const { error } = await supabase
    .from('devices')
    .update({ is_revoked: true })
    .eq('id', deviceId)
    .eq('user_id', auth.ctx.user.id)

  if (error) {
    console.error('Failed to revoke device:', error?.message)
    return Errors.internalError()
  }

  return noContent()
}
