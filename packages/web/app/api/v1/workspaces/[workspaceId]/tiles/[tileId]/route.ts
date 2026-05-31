import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth, isAuthError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { ok, noContent, Errors } from '@/lib/response'

type Params = { params: Promise<{ workspaceId: string; tileId: string }> }

const patchSchema = z.object({
  updatedAt: z.string().datetime(),
  url: z.string().url().optional(),
  title: z.string().min(1).max(255).nullable().optional(),
  openMode: z.enum(['iframe', 'tab']).optional(),
  isPinned: z.boolean().optional(),
  faviconUrl: z.string().url().nullable().optional(),
})

async function verifyTileOwnership(
  supabase: ReturnType<typeof import('@/lib/supabase').createServiceClient>,
  workspaceId: string,
  tileId: string,
  userId: string,
) {
  const { data } = await supabase
    .from('tiles')
    .select('id, updated_at, is_pinned, workspaces!inner(user_id)')
    .eq('id', tileId)
    .eq('workspace_id', workspaceId)
    .eq('workspaces.user_id', userId)
    .maybeSingle()

  return data
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const { workspaceId, tileId } = await params

  let body: z.infer<typeof patchSchema>
  try {
    body = patchSchema.parse(await request.json())
  } catch {
    return Errors.badRequest('Invalid request body — updatedAt is required')
  }

  const supabase = createServiceClient()

  const tile = await verifyTileOwnership(supabase, workspaceId, tileId, auth.ctx.user.id)
  if (!tile) return Errors.tileNotFound()

  if (tile.updated_at !== body.updatedAt) {
    return Errors.staleData(tile.updated_at)
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.url !== undefined) updates.url = body.url
  if (body.title !== undefined) updates.title = body.title
  if (body.openMode !== undefined) updates.open_mode = body.openMode
  if (body.isPinned !== undefined) updates.is_pinned = body.isPinned
  if (body.faviconUrl !== undefined) updates.favicon_url = body.faviconUrl

  const { data: updated, error } = await supabase
    .from('tiles')
    .update(updates)
    .eq('id', tileId)
    .select('*')
    .single()

  if (error || !updated) {
    console.error('Failed to update tile:', error)
    return Errors.internalError()
  }

  return ok({
    id: updated.id,
    workspaceId: updated.workspace_id,
    url: updated.url,
    title: updated.title,
    faviconUrl: updated.favicon_url,
    openMode: updated.open_mode,
    isPinned: updated.is_pinned,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const { workspaceId, tileId } = await params
  const { searchParams } = new URL(request.url)
  const force = searchParams.get('force') === 'true'

  const supabase = createServiceClient()

  const tile = await verifyTileOwnership(supabase, workspaceId, tileId, auth.ctx.user.id)
  if (!tile) return Errors.tileNotFound()

  if (tile.is_pinned && !force) {
    return Errors.badRequest('This tile is pinned. Add ?force=true to delete it anyway.')
  }

  const { error } = await supabase.from('tiles').delete().eq('id', tileId)

  if (error) {
    console.error('Failed to delete tile:', error)
    return Errors.internalError()
  }

  return noContent()
}
