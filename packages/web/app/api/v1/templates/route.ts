import { type NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { ok, Errors } from '@/lib/response'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const { searchParams } = new URL(request.url)
  const officialOnly = searchParams.get('official') === 'true'
  const sort = searchParams.get('sort') // 'popular' | null

  const supabase = createServiceClient()

  let query = supabase
    .from('workspace_templates')
    .select('id, name, description, icon, is_official, use_count, layout_json, tiles_json, created_at')

  if (officialOnly) {
    query = query.eq('is_official', true)
  }

  if (sort === 'popular') {
    query = query.order('use_count', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data: templates, error } = await query

  if (error) {
    console.error('Failed to fetch templates:', error)
    return Errors.internalError()
  }

  return ok(
    (templates ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      icon: t.icon,
      isOfficial: t.is_official,
      useCount: t.use_count,
      layoutJson: t.layout_json,
      tilesJson: t.tiles_json,
      createdAt: t.created_at,
    })),
  )
}
