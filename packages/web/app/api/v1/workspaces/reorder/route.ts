import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth, isAuthError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { ok, Errors } from '@/lib/response'

const schema = z.object({
  order: z.array(z.string().uuid()).min(1),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return Errors.badRequest('Invalid request body')
  }

  const supabase = createServiceClient()

  // Verify all workspace IDs belong to this user before updating
  const { data: owned } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', auth.ctx.user.id)
    .in('id', body.order)

  if ((owned?.length ?? 0) !== body.order.length) {
    return Errors.forbidden()
  }

  // Bulk update sort_order using the position in the provided array
  const updates = body.order.map((id, index) => ({
    id,
    sort_order: index,
    user_id: auth.ctx.user.id,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('workspaces').upsert(updates, { onConflict: 'id' })

  if (error) {
    console.error('Failed to reorder workspaces:', error)
    return Errors.internalError()
  }

  return ok({ updated: body.order.length })
}
