import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { makeSupabase } from '../helpers/supabase-mock'

vi.mock('@/lib/supabase', () => ({
  createServiceClient: vi.fn(),
}))

import { createServiceClient } from '@/lib/supabase'

const mockUser = { id: 'user-uuid-1', email: 'test@example.com' }

function makeRequest(options: { token?: string; deviceId?: string } = {}) {
  const headers: Record<string, string> = {}
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`
  if (options.deviceId) headers['X-Device-Id'] = options.deviceId
  return new NextRequest('http://localhost:3001/api/v1/test', { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('requireAuth', () => {
  it('returns TOKEN_INVALID when Authorization header is missing', async () => {
    const req = makeRequest()
    const result = await requireAuth(req)
    expect(result.error).not.toBeNull()
    expect(result.error!.status).toBe(401)
    const body = await result.error!.json() as { error: { code: string } }
    expect(body.error.code).toBe('TOKEN_INVALID')
  })

  it('returns TOKEN_INVALID when token format is wrong (no Bearer prefix)', async () => {
    const req = makeRequest({ token: undefined })
    const headers = new Headers({ Authorization: 'Basic abc' })
    const badReq = new NextRequest('http://localhost:3001/test', { headers })
    const result = await requireAuth(badReq)
    expect(result.error).not.toBeNull()
    expect(result.error!.status).toBe(401)
  })

  it('returns TOKEN_INVALID when Supabase rejects the token', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({ authUser: null, authError: { message: 'Invalid JWT' } }) as never,
    )
    const result = await requireAuth(makeRequest({ token: 'bad-token' }))
    expect(result.error).not.toBeNull()
    expect(result.error!.status).toBe(401)
  })

  it('returns auth context when token is valid and no device header', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({ authUser: mockUser }) as never,
    )
    const result = await requireAuth(makeRequest({ token: 'valid-token' }))
    expect(result.error).toBeNull()
    expect(result.ctx!.user.id).toBe(mockUser.id)
    expect(result.ctx!.user.email).toBe(mockUser.email)
    expect(result.ctx!.deviceId).toBeNull()
  })

  it('returns auth context when device exists and is not revoked', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        authUser: mockUser,
        tables: {
          devices: [
            // First call: select device for revocation check
            { data: { id: 'device-1', is_revoked: false } },
            // Second call: fire-and-forget update (ignored)
            { data: null },
          ],
        },
      }) as never,
    )
    const result = await requireAuth(makeRequest({ token: 'valid-token', deviceId: 'device-1' }))
    expect(result.error).toBeNull()
    expect(result.ctx!.deviceId).toBe('device-1')
  })

  it('returns DEVICE_REVOKED when device is_revoked = true', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        authUser: mockUser,
        tables: {
          devices: { data: { id: 'device-1', is_revoked: true } },
        },
      }) as never,
    )
    const result = await requireAuth(makeRequest({ token: 'valid-token', deviceId: 'device-1' }))
    expect(result.error).not.toBeNull()
    expect(result.error!.status).toBe(401)
    const body = await result.error!.json() as { error: { code: string } }
    expect(body.error.code).toBe('DEVICE_REVOKED')
  })

  it('returns auth context (deviceId=null) when device not found for that user', async () => {
    // Device ID sent but not found in DB (wrong user or deleted)
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        authUser: mockUser,
        tables: {
          devices: { data: null }, // not found
        },
      }) as never,
    )
    const result = await requireAuth(makeRequest({ token: 'valid-token', deviceId: 'unknown-device' }))
    // Should succeed — deviceId just won't be in ctx (device not found != revoked)
    expect(result.error).toBeNull()
  })
})
