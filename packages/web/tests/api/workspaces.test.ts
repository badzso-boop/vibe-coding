import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { makeSupabase, AUTH_CTX } from '../helpers/supabase-mock'

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
  isAuthError: (r: { error: unknown }) => r.error !== null,
}))
vi.mock('@/lib/supabase', () => ({
  createServiceClient: vi.fn(),
}))

import { requireAuth } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { GET, POST } from '@/app/api/v1/workspaces/route'
import { GET as GET_WS, PATCH, DELETE } from '@/app/api/v1/workspaces/[workspaceId]/route'

const mockWorkspace = {
  id: 'ws-1',
  name: 'Work',
  icon: null,
  color: null,
  shortcut_key: null,
  sort_order: 0,
  layout_json: null,
  created_at: '2024-01-01T00:00:00+00:00',
  updated_at: '2024-01-01T00:00:00+00:00',
  tiles: [{ count: 2 }],
}

function makeReq(method = 'GET', body?: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/v1/workspaces', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue(AUTH_CTX as never)
})

// ─── GET /workspaces ────────────────────────────────────────────────────────

describe('GET /api/v1/workspaces', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      ctx: null,
      error: { status: 401, json: async () => ({ error: { code: 'TOKEN_INVALID' } }) },
    } as never)
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns workspace list on success', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({ tables: { workspaces: { data: [mockWorkspace] } } }) as never,
    )
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: unknown[] }
    expect(body.data).toHaveLength(1)
  })

  it('returns empty array when user has no workspaces', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({ tables: { workspaces: { data: [] } } }) as never,
    )
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: unknown[] }
    expect(body.data).toHaveLength(0)
  })
})

// ─── POST /workspaces ───────────────────────────────────────────────────────

describe('POST /api/v1/workspaces', () => {
  it('returns 400 on missing name', async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeSupabase() as never)
    const res = await POST(makeReq('POST', { name: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 on invalid color format', async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeSupabase() as never)
    const res = await POST(makeReq('POST', { name: 'Test', color: 'not-a-color' }))
    expect(res.status).toBe(400)
  })

  it('returns 409 when shortcut key is already taken', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        tables: {
          // Pro tier: checkWorkspaceLimit returns null immediately (no workspaces count query)
          subscriptions: { data: { tier: 'pro' } },
          workspaces: { data: { id: 'other-ws' } }, // shortcut conflict check
        },
      }) as never,
    )
    const res = await POST(makeReq('POST', { name: 'Test', shortcutKey: 1 }))
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('SHORTCUT_CONFLICT')
  })

  it('returns 422 when workspace tier limit is reached', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        tables: {
          subscriptions: { data: { tier: 'free' } },
          workspaces: { count: 3 }, // free tier limit = 3
        },
      }) as never,
    )
    const res = await POST(makeReq('POST', { name: 'Test' }))
    expect(res.status).toBe(422)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('TIER_LIMIT_REACHED')
  })

  it('returns 201 with new workspace on success', async () => {
    const newWs = { ...mockWorkspace, tiles: [] }
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        tables: {
          // Pro tier: no workspaces count query for workspace limit
          subscriptions: { data: { tier: 'pro' } },
          workspaces: [
            { count: 2 }, // count for sort_order calculation
            { data: newWs }, // insert result
          ],
        },
      }) as never,
    )
    const res = await POST(makeReq('POST', { name: 'My Workspace' }))
    expect(res.status).toBe(201)
    const body = (await res.json()) as { data: { name: string } }
    expect(body.data.name).toBe('Work')
  })
})

// ─── PATCH /workspaces/:id ──────────────────────────────────────────────────

const PARAMS = { params: Promise.resolve({ workspaceId: 'ws-1' }) }

describe('PATCH /api/v1/workspaces/:id', () => {
  it('returns 400 when updatedAt is missing', async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeSupabase() as never)
    const req = new NextRequest('http://localhost:3001/api/v1/workspaces/ws-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    })
    const res = await PATCH(req, PARAMS)
    expect(res.status).toBe(400)
  })

  it('returns 404 when workspace not found or wrong user', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({ tables: { workspaces: { data: null } } }) as never,
    )
    const req = new NextRequest('http://localhost:3001/api/v1/workspaces/ws-1', {
      method: 'PATCH',
      body: JSON.stringify({ updatedAt: '2024-01-01T00:00:00+00:00', name: 'x' }),
    })
    const res = await PATCH(req, PARAMS)
    expect(res.status).toBe(404)
  })

  it('returns 409 STALE_DATA when updatedAt does not match', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        tables: {
          workspaces: { data: { updated_at: '2024-06-01T10:00:00+00:00' } },
        },
      }) as never,
    )
    const req = new NextRequest('http://localhost:3001/api/v1/workspaces/ws-1', {
      method: 'PATCH',
      body: JSON.stringify({ updatedAt: '2024-01-01T00:00:00+00:00', name: 'x' }),
    })
    const res = await PATCH(req, PARAMS)
    expect(res.status).toBe(409)
    const body = (await res.json()) as {
      error: { code: string; details: { serverUpdatedAt: string } }
    }
    expect(body.error.code).toBe('STALE_DATA')
    expect(body.error.details.serverUpdatedAt).toBe('2024-06-01T10:00:00+00:00')
  })

  it('returns 409 SHORTCUT_CONFLICT when another workspace has that shortcut', async () => {
    const ts = '2024-01-01T00:00:00+00:00'
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        tables: {
          workspaces: [
            { data: { updated_at: ts } }, // ownership + optimistic lock check
            { data: { id: 'other-ws' } }, // shortcut conflict check
          ],
        },
      }) as never,
    )
    const req = new NextRequest('http://localhost:3001/api/v1/workspaces/ws-1', {
      method: 'PATCH',
      body: JSON.stringify({ updatedAt: ts, shortcutKey: 5 }),
    })
    const res = await PATCH(req, PARAMS)
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('SHORTCUT_CONFLICT')
  })

  it('returns 200 with updated workspace on success', async () => {
    const ts = '2024-01-01T00:00:00+00:00'
    const updated = { ...mockWorkspace, name: 'Renamed', tiles: [] }
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        tables: {
          workspaces: [
            { data: { updated_at: ts } }, // ownership + lock
            { data: updated }, // update result
          ],
        },
      }) as never,
    )
    const req = new NextRequest('http://localhost:3001/api/v1/workspaces/ws-1', {
      method: 'PATCH',
      body: JSON.stringify({ updatedAt: ts, name: 'Renamed' }),
    })
    const res = await PATCH(req, PARAMS)
    expect(res.status).toBe(200)
  })
})

// ─── DELETE /workspaces/:id ─────────────────────────────────────────────────

describe('DELETE /api/v1/workspaces/:id', () => {
  it('returns 404 when workspace does not exist', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({ tables: { workspaces: { data: null } } }) as never,
    )
    const req = new NextRequest('http://localhost:3001/api/v1/workspaces/ws-1', {
      method: 'DELETE',
    })
    const res = await DELETE(req, PARAMS)
    expect(res.status).toBe(404)
  })

  it('returns 204 on success', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        tables: {
          workspaces: [
            { data: { id: 'ws-1' } }, // existence check
            { data: null }, // delete
          ],
        },
      }) as never,
    )
    const req = new NextRequest('http://localhost:3001/api/v1/workspaces/ws-1', {
      method: 'DELETE',
    })
    const res = await DELETE(req, PARAMS)
    expect(res.status).toBe(204)
  })
})

// ─── GET /workspaces/:id ────────────────────────────────────────────────────

describe('GET /api/v1/workspaces/:id', () => {
  it('returns 404 when workspace not found', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({ tables: { workspaces: { data: null } } }) as never,
    )
    const req = new NextRequest('http://localhost:3001/api/v1/workspaces/ws-1')
    const res = await GET_WS(req, PARAMS)
    expect(res.status).toBe(404)
  })

  it('returns 200 with workspace and tiles', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        tables: {
          workspaces: {
            data: { ...mockWorkspace, tiles: [] },
          },
        },
      }) as never,
    )
    const req = new NextRequest('http://localhost:3001/api/v1/workspaces/ws-1')
    const res = await GET_WS(req, PARAMS)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { id: string } }
    expect(body.data.id).toBe('ws-1')
  })
})
