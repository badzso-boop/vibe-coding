import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { requireAuth, isAuthError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { checkWorkspaceLimit } from '@/lib/tier'
import { created, Errors } from '@/lib/response'
import type { LayoutNode } from '@flowspace/shared'

type Params = { params: Promise<{ templateId: string }> }

const schema = z.object({
  name: z.string().min(1).max(255),
  shortcutKey: z.number().int().min(1).max(9).nullable().optional(),
})

function remapLayout(node: LayoutNode, idMapping: Record<string, string>): LayoutNode {
  if (node.type === 'tile') {
    return { type: 'tile', tileId: idMapping[node.tileId] ?? node.tileId }
  }
  return {
    ...node,
    first: remapLayout(node.first, idMapping),
    second: remapLayout(node.second, idMapping),
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const { templateId } = await params

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return Errors.badRequest('Invalid request body')
  }

  const supabase = createServiceClient()

  const limitError = await checkWorkspaceLimit(supabase, auth.ctx.user.id)
  if (limitError) return limitError

  // Fetch the template
  const { data: template } = await supabase
    .from('workspace_templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle()

  if (!template) return Errors.templateNotFound()

  // Shortcut key conflict check
  if (body.shortcutKey !== undefined && body.shortcutKey !== null) {
    const { data: conflict } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', auth.ctx.user.id)
      .eq('shortcut_key', body.shortcutKey)
      .maybeSingle()

    if (conflict) return Errors.shortcutConflict()
  }

  const { count } = await supabase
    .from('workspaces')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', auth.ctx.user.id)

  // Create workspace
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({
      user_id: auth.ctx.user.id,
      name: body.name,
      icon: template.icon,
      color: null,
      shortcut_key: body.shortcutKey ?? null,
      sort_order: count ?? 0,
      layout_json: null,
    })
    .select('*')
    .single()

  if (wsError || !workspace) {
    console.error('Failed to create workspace from template:', wsError)
    return Errors.internalError()
  }

  // Instantiate tiles from template.tiles_json
  const templateTiles = template.tiles_json as Array<{
    id: string
    url: string
    title: string
    openMode: string
  }>

  const idMapping: Record<string, string> = {}
  for (const t of templateTiles) {
    idMapping[t.id] = randomUUID()
  }

  const tilesToInsert = templateTiles.map((t) => ({
    id: idMapping[t.id],
    workspace_id: workspace.id,
    url: t.url,
    title: t.title,
    open_mode: t.openMode as 'iframe' | 'tab',
    is_pinned: false,
    favicon_url: null,
  }))

  if (tilesToInsert.length > 0) {
    const { error: tilesError } = await supabase.from('tiles').insert(tilesToInsert)
    if (tilesError) {
      console.error('Failed to insert template tiles:', tilesError)
      await supabase.from('workspaces').delete().eq('id', workspace.id)
      return Errors.internalError()
    }

    // Remap layout_json and save
    const remappedLayout = remapLayout(template.layout_json as LayoutNode, idMapping)
    await supabase.from('workspaces').update({ layout_json: remappedLayout }).eq('id', workspace.id)
  }

  // Increment template use_count
  void supabase
    .from('workspace_templates')
    .update({ use_count: (template.use_count ?? 0) + 1 })
    .eq('id', templateId)

  // Return fresh data
  const { data: result } = await supabase
    .from('workspaces')
    .select('*, tiles(*)')
    .eq('id', workspace.id)
    .single()

  return created({
    id: result?.id,
    name: result?.name,
    icon: result?.icon,
    color: result?.color,
    shortcutKey: result?.shortcut_key,
    sortOrder: result?.sort_order,
    layoutJson: result?.layout_json,
    tiles: (result?.tiles as unknown[]) ?? [],
    createdAt: result?.created_at,
    updatedAt: result?.updated_at,
  })
}
