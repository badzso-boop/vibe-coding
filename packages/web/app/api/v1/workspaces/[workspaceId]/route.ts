import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth, isAuthError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { ok, noContent, Errors } from '@/lib/response'

type Params = { params: Promise<{ workspaceId: string }> }

function formatWorkspace(w: Record<string, unknown>, tiles?: unknown[]) {
  return {
    id: w.id,
    name: w.name,
    icon: w.icon,
    color: w.color,
    shortcutKey: w.shortcut_key,
    sortOrder: w.sort_order,
    layoutJson: w.layout_json,
    tiles: (tiles ?? []).map((t) => {
      const tile = t as Record<string, unknown>
      return {
        id: tile.id,
        url: tile.url,
        title: tile.title,
        faviconUrl: tile.favicon_url,
        openMode: tile.open_mode,
        isPinned: tile.is_pinned,
        createdAt: tile.created_at,
        updatedAt: tile.updated_at,
      }
    }),
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const { workspaceId } = await params
  const supabase = createServiceClient()

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('*, tiles(*)')
    .eq('id', workspaceId)
    .eq('user_id', auth.ctx.user.id)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch workspace:', error)
    return Errors.internalError()
  }
  if (!workspace) return Errors.workspaceNotFound()

  const tiles = workspace.tiles as unknown[]
  return ok(formatWorkspace(workspace, tiles))
}

const patchSchema = z.object({
  updatedAt: z.string(),
  name: z.string().min(1).max(255).optional(),
  icon: z.string().max(50).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  shortcutKey: z.number().int().min(1).max(9).nullable().optional(),
})

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const { workspaceId } = await params

  let body: z.infer<typeof patchSchema>
  try {
    body = patchSchema.parse(await request.json())
  } catch {
    return Errors.badRequest('Invalid request body — updatedAt is required')
  }

  const supabase = createServiceClient()

  // Fetch current state for ownership check and optimistic lock
  const { data: current } = await supabase
    .from('workspaces')
    .select('updated_at')
    .eq('id', workspaceId)
    .eq('user_id', auth.ctx.user.id)
    .maybeSingle()

  if (!current) return Errors.workspaceNotFound()

  // Optimistic locking — reject if another device already modified this workspace
  if (current.updated_at !== body.updatedAt) {
    return Errors.staleData(current.updated_at)
  }

  // Shortcut key conflict check (only if changing shortcut key)
  if (body.shortcutKey !== undefined && body.shortcutKey !== null) {
    const { data: conflict } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', auth.ctx.user.id)
      .eq('shortcut_key', body.shortcutKey)
      .neq('id', workspaceId)
      .maybeSingle()

    if (conflict) return Errors.shortcutConflict()
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) updates.name = body.name
  if (body.icon !== undefined) updates.icon = body.icon
  if (body.color !== undefined) updates.color = body.color
  if (body.shortcutKey !== undefined) updates.shortcut_key = body.shortcutKey

  const { data: updated, error } = await supabase
    .from('workspaces')
    .update(updates)
    .eq('id', workspaceId)
    .eq('user_id', auth.ctx.user.id)
    .select('*')
    .single()

  if (error || !updated) {
    console.error('Failed to update workspace:', error)
    return Errors.internalError()
  }

  return ok(formatWorkspace(updated))
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const { workspaceId } = await params
  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', auth.ctx.user.id)
    .maybeSingle()

  if (!existing) return Errors.workspaceNotFound()

  // Tiles are cascade-deleted by the DB foreign key constraint
  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', workspaceId)
    .eq('user_id', auth.ctx.user.id)

  if (error) {
    console.error('Failed to delete workspace:', error)
    return Errors.internalError()
  }

  return noContent()
}
