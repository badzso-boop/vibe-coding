import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth, isAuthError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { ok, Errors } from '@/lib/response'

type Params = { params: Promise<{ workspaceId: string }> }

// Recursive Zod schema for the binary-tree layout structure
const layoutNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal('split'),
      direction: z.enum(['row', 'column']),
      ratio: z.number().min(0.05).max(0.95),
      first: layoutNodeSchema,
      second: layoutNodeSchema,
    }),
    z.object({
      type: z.literal('tile'),
      tileId: z.string().uuid(),
    }),
  ]),
)

const schema = z.object({
  updatedAt: z.string().optional(),
  layoutJson: layoutNodeSchema.nullable(),
})

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const { workspaceId } = await params

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return Errors.badRequest('Invalid request body — updatedAt and valid layoutJson are required')
  }

  const supabase = createServiceClient()

  const { data: current } = await supabase
    .from('workspaces')
    .select('updated_at')
    .eq('id', workspaceId)
    .eq('user_id', auth.ctx.user.id)
    .maybeSingle()

  if (!current) return Errors.workspaceNotFound()

  if (body.updatedAt && current.updated_at !== body.updatedAt) {
    return Errors.staleData(current.updated_at)
  }

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('workspaces')
    .update({ layout_json: body.layoutJson, updated_at: now })
    .eq('id', workspaceId)
    .eq('user_id', auth.ctx.user.id)

  if (error) {
    console.error('Failed to update layout:', error?.message)
    return Errors.internalError()
  }

  return ok({ updatedAt: now })
}
