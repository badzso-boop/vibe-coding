import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth, isAuthError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { checkTileLimit } from '@/lib/tier'
import { ok, created, Errors } from '@/lib/response'

type Params = { params: Promise<{ workspaceId: string }> }

const schema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(255).nullish(),
  openMode: z.enum(['iframe', 'tab']).default('iframe'),
  isPinned: z.boolean().default(false),
  faviconUrl: z.string().url().nullish(),
})

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const { workspaceId } = await params
  const supabase = createServiceClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', auth.ctx.user.id)
    .maybeSingle()

  if (!workspace) return Errors.workspaceNotFound()

  const { data: tiles, error } = await supabase
    .from('tiles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch tiles:', error)
    return Errors.internalError()
  }

  return ok(
    (tiles ?? []).map((t) => ({
      id: t.id,
      workspaceId: t.workspace_id,
      url: t.url,
      title: t.title,
      faviconUrl: t.favicon_url,
      openMode: t.open_mode,
      isPinned: t.is_pinned,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    })),
  )
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const { workspaceId } = await params

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return Errors.badRequest('Invalid request body')
  }

  const supabase = createServiceClient()

  // Verify workspace belongs to user
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('user_id', auth.ctx.user.id)
    .maybeSingle()

  if (!workspace) return Errors.workspaceNotFound()

  // Tile count limit check
  const limitError = await checkTileLimit(supabase, auth.ctx.user.id, workspaceId)
  if (limitError) return limitError

  const { data: tile, error } = await supabase
    .from('tiles')
    .insert({
      workspace_id: workspaceId,
      url: body.url,
      title: body.title ?? null,
      favicon_url: body.faviconUrl ?? null,
      open_mode: body.openMode,
      is_pinned: body.isPinned,
    })
    .select('*')
    .single()

  if (error || !tile) {
    console.error('Failed to create tile:', error)
    return Errors.internalError()
  }

  return created({
    id: tile.id,
    workspaceId: tile.workspace_id,
    url: tile.url,
    title: tile.title,
    faviconUrl: tile.favicon_url,
    openMode: tile.open_mode,
    isPinned: tile.is_pinned,
    createdAt: tile.created_at,
    updatedAt: tile.updated_at,
  })
}
