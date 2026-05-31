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
import { GET } from '@/app/api/v1/devices/route'
import { POST } from '@/app/api/v1/auth/extension/logout/route'

const mockDevices = [
  {
    id: 'device-1',
    name: 'Chrome Extension',
    browser: 'chrome',
    last_seen_at: '2024-01-10T00:00:00+00:00',
    created_at: '2024-01-01T00:00:00+00:00',
    is_revoked: false,
  },
  {
    id: 'device-2',
    name: 'Firefox Extension',
    browser: 'firefox',
    last_seen_at: null,
    created_at: '2024-01-02T00:00:00+00:00',
    is_revoked: false,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireAuth).mockResolvedValue(AUTH_CTX as never)
})

describe('GET /api/v1/devices', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      ctx: null,
      error: { status: 401, json: async () => ({ error: { code: 'TOKEN_INVALID' } }) },
    } as never)
    const req = new NextRequest('http://localhost:3001/api/v1/devices')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns list of active devices', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({ tables: { devices: { data: mockDevices } } }) as never,
    )
    const req = new NextRequest('http://localhost:3001/api/v1/devices')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: Array<{ id: string; isCurrent: boolean }> }
    expect(body.data).toHaveLength(2)
    // AUTH_CTX.ctx.deviceId = 'device-uuid-1' — neither device matches, so none is current
    expect(body.data.every((d) => !d.isCurrent)).toBe(true)
  })

  it('marks the current device correctly', async () => {
    // Override auth ctx so deviceId matches device-1
    vi.mocked(requireAuth).mockResolvedValue({
      ctx: { user: { id: 'user-uuid-1', email: 'test@example.com' }, deviceId: 'device-1' },
      error: null,
    } as never)
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({ tables: { devices: { data: mockDevices } } }) as never,
    )
    const req = new NextRequest('http://localhost:3001/api/v1/devices')
    const res = await GET(req)
    const body = (await res.json()) as { data: Array<{ id: string; isCurrent: boolean }> }
    const current = body.data.find((d) => d.isCurrent)
    expect(current?.id).toBe('device-1')
  })
})

describe('POST /api/v1/auth/extension/logout', () => {
  it('returns 400 when X-Device-Id header is missing', async () => {
    // AUTH_CTX has deviceId: 'device-uuid-1' — override to null to test missing header
    vi.mocked(requireAuth).mockResolvedValue({
      ctx: { user: { id: 'user-uuid-1', email: 'test@example.com' }, deviceId: null },
      error: null,
    } as never)
    vi.mocked(createServiceClient).mockReturnValue(makeSupabase() as never)
    const req = new NextRequest('http://localhost:3001/api/v1/auth/extension/logout', {
      method: 'POST',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 204 on successful device revocation', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({ tables: { devices: { data: null, error: null } } }) as never,
    )
    const req = new NextRequest('http://localhost:3001/api/v1/auth/extension/logout', {
      method: 'POST',
    })
    const res = await POST(req)
    expect(res.status).toBe(204)
  })
})
