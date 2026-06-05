import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth, isAuthError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { checkWorkspaceLimit } from '@/lib/tier'
import { ok, created, Errors } from '@/lib/response'

function formatWorkspace(w: Record<string, unknown>, tileCount?: number) {
  return {
    id: w.id,
    name: w.name,
    icon: w.icon,
    color: w.color,
    shortcutKey: w.shortcut_key,
    sortOrder: w.sort_order,
    layoutJson: w.layout_json,
    tileCount: tileCount ?? 0,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const supabase = createServiceClient()

  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('*, tiles(count)')
    .eq('user_id', auth.ctx.user.id)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to fetch workspaces:', error?.message)
    return Errors.internalError()
  }

  return ok(
    (workspaces ?? []).map((w) => {
      const tiles = w.tiles as unknown as Array<{ count: number }>
      return formatWorkspace(w, tiles?.[0]?.count ?? 0)
    }),
  )
}

const createSchema = z.object({
  name: z.string().min(1).max(255),
  icon: z.string().max(50).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  shortcutKey: z.number().int().min(1).max(9).nullable().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  let body: z.infer<typeof createSchema>
  try {
    body = createSchema.parse(await request.json())
  } catch {
    return Errors.badRequest('Invalid request body')
  }

  const supabase = createServiceClient()

  // Tier limit check
  const limitError = await checkWorkspaceLimit(supabase, auth.ctx.user.id)
  if (limitError) return limitError

  // Shortcut key uniqueness check
  if (body.shortcutKey !== undefined && body.shortcutKey !== null) {
    const { data: existing } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', auth.ctx.user.id)
      .eq('shortcut_key', body.shortcutKey)
      .maybeSingle()

    if (existing) return Errors.shortcutConflict()
  }

  // Determine sort_order (append to end)
  const { count } = await supabase
    .from('workspaces')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', auth.ctx.user.id)

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({
      user_id: auth.ctx.user.id,
      name: body.name,
      icon: body.icon ?? null,
      color: body.color ?? null,
      shortcut_key: body.shortcutKey ?? null,
      sort_order: count ?? 0,
      layout_json: null,
    })
    .select('*')
    .single()

  if (error || !workspace) {
    console.error('Failed to create workspace:', error?.message)
    return Errors.internalError()
  }

  return created(formatWorkspace(workspace, 0))
}
