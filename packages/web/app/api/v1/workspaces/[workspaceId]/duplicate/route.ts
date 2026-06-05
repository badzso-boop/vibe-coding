import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { requireAuth, isAuthError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { checkWorkspaceLimit } from '@/lib/tier'
import { created, Errors } from '@/lib/response'
import type { LayoutNode } from '@flowspace/shared'

type Params = { params: Promise<{ workspaceId: string }> }

const schema = z.object({
  name: z.string().min(1).max(255),
})

// Recursively remap tileIds in the layout tree using the provided idMapping
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

  const { workspaceId } = await params

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return Errors.badRequest('Invalid request body')
  }

  const supabase = createServiceClient()

  // Check tier limit before duplicating
  const limitError = await checkWorkspaceLimit(supabase, auth.ctx.user.id)
  if (limitError) return limitError

  // Fetch source workspace with tiles
  const { data: source } = await supabase
    .from('workspaces')
    .select('*, tiles(*)')
    .eq('id', workspaceId)
    .eq('user_id', auth.ctx.user.id)
    .maybeSingle()

  if (!source) return Errors.workspaceNotFound()

  // Determine sort_order for the new workspace
  const { count } = await supabase
    .from('workspaces')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', auth.ctx.user.id)

  // Create new workspace (without shortcut_key to avoid conflict)
  const { data: newWorkspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({
      user_id: auth.ctx.user.id,
      name: body.name,
      icon: source.icon,
      color: source.color,
      shortcut_key: null,
      sort_order: count ?? 0,
      layout_json: null,
    })
    .select('*')
    .single()

  if (wsError || !newWorkspace) {
    console.error('Failed to create duplicate workspace:', wsError?.message)
    return Errors.internalError()
  }

  const sourceTiles = source.tiles as Array<Record<string, unknown>>

  if (sourceTiles.length > 0) {
    // Build ID mapping: old tile UUID → new tile UUID
    const idMapping: Record<string, string> = {}
    for (const tile of sourceTiles) {
      idMapping[tile.id as string] = randomUUID()
    }

    // Insert duplicated tiles with new IDs
    const newTiles = sourceTiles.map((tile) => ({
      id: idMapping[tile.id as string],
      workspace_id: newWorkspace.id,
      url: tile.url,
      title: tile.title,
      favicon_url: tile.favicon_url,
      open_mode: tile.open_mode,
      is_pinned: tile.is_pinned,
    }))

    const { error: tilesError } = await supabase.from('tiles').insert(newTiles)
    if (tilesError) {
      console.error('Failed to duplicate tiles:', tilesError?.message)
      // Clean up the workspace we just created
      await supabase.from('workspaces').delete().eq('id', newWorkspace.id)
      return Errors.internalError()
    }

    // Remap layout_json with new tile IDs
    if (source.layout_json) {
      const remappedLayout = remapLayout(source.layout_json as LayoutNode, idMapping)
      await supabase
        .from('workspaces')
        .update({ layout_json: remappedLayout })
        .eq('id', newWorkspace.id)
    }
  }

  // Return fresh workspace data
  const { data: result } = await supabase
    .from('workspaces')
    .select('*, tiles(*)')
    .eq('id', newWorkspace.id)
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
