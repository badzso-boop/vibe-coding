import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { encrypt } from '@/lib/crypto'
import { makeSupabase } from '../helpers/supabase-mock'

vi.mock('@/lib/supabase', () => ({
  createServiceClient: vi.fn(),
}))

import { createServiceClient } from '@/lib/supabase'
import { POST } from '@/app/api/v1/auth/extension/exchange/route'

const CODE = 'a'.repeat(64)
const STATE = 'b'.repeat(32)
const USER_ID = 'user-uuid-1'

const validTokens = encrypt(
  JSON.stringify({ accessToken: 'access-jwt', refreshToken: 'refresh-token' }),
)

const futureExpiry = new Date(Date.now() + 120_000).toISOString()

const validCode = {
  id: 'code-row-1',
  user_id: USER_ID,
  code: CODE,
  state: STATE,
  encrypted_tokens: validTokens,
  expires_at: futureExpiry,
  used_at: null,
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost:3001/api/v1/auth/extension/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/v1/auth/extension/exchange', () => {
  it('returns 400 when code is wrong length', async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeSupabase() as never)
    const res = await POST(makeReq({ code: 'short', state: STATE }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when state is too short', async () => {
    vi.mocked(createServiceClient).mockReturnValue(makeSupabase() as never)
    const res = await POST(makeReq({ code: CODE, state: 'tiny' }))
    expect(res.status).toBe(400)
  })

  it('returns 401 AUTH_CODE_EXPIRED when code not found', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({ tables: { auth_extension_codes: { data: null } } }) as never,
    )
    const res = await POST(makeReq({ code: CODE, state: STATE }))
    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('AUTH_CODE_EXPIRED')
  })

  it('returns 401 AUTH_CODE_EXPIRED when code is already used', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        tables: {
          auth_extension_codes: {
            data: { ...validCode, used_at: '2024-01-01T00:00:00Z' },
          },
        },
      }) as never,
    )
    const res = await POST(makeReq({ code: CODE, state: STATE }))
    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('AUTH_CODE_EXPIRED')
  })

  it('returns 401 AUTH_CODE_EXPIRED when code is expired', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        tables: {
          auth_extension_codes: {
            data: { ...validCode, expires_at: new Date(Date.now() - 1000).toISOString() },
          },
        },
      }) as never,
    )
    const res = await POST(makeReq({ code: CODE, state: STATE }))
    expect(res.status).toBe(401)
  })

  it('returns 401 AUTH_STATE_MISMATCH when state does not match', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        tables: {
          auth_extension_codes: {
            data: { ...validCode, state: 'completely-different-state-value-here' },
          },
        },
      }) as never,
    )
    const res = await POST(makeReq({ code: CODE, state: STATE }))
    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('AUTH_STATE_MISMATCH')
  })

  it('returns 201 with tokens and device on successful exchange', async () => {
    // Query order in the route:
    // 1. auth_extension_codes SELECT (code lookup)
    // 2. auth_extension_codes UPDATE (mark as used)
    // 3. subscriptions SELECT (getUserTier for checkDeviceLimit)
    // 4. devices SELECT count (checkDeviceLimit)
    // 5. users SELECT (user profile)
    // 6. devices INSERT (register new device)
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        tables: {
          auth_extension_codes: [
            { data: validCode },  // 1. code lookup
            { data: null },       // 2. mark as used
          ],
          subscriptions: { data: { tier: 'free' } }, // 3. tier check (free, 0 devices → ok)
          devices: [
            { count: 0 },                      // 4. limit check (under limit)
            { data: { id: 'new-device-id' } }, // 6. insert result
          ],
          users: { data: { id: USER_ID, email: 'test@example.com', name: null, avatar_url: null } }, // 5.
        },
      }) as never,
    )
    const res = await POST(makeReq({ code: CODE, state: STATE, deviceName: 'My Extension', browser: 'chrome' }))
    expect(res.status).toBe(201)
    const body = await res.json() as {
      data: { accessToken: string; refreshToken: string; deviceId: string }
    }
    expect(body.data.accessToken).toBe('access-jwt')
    expect(body.data.refreshToken).toBe('refresh-token')
    expect(body.data.deviceId).toBe('new-device-id')
  })

  it('auto-revokes oldest device for free tier when at device limit', async () => {
    // Query order when limit is hit and auto-revoke kicks in:
    // 1. auth_extension_codes SELECT
    // 2. auth_extension_codes UPDATE (mark as used)
    // 3. subscriptions SELECT (getUserTier — limit hit → returns limitError)
    // 4. devices SELECT count (= 1, limit = 1 → limitError returned)
    // 5. devices SELECT never-used (→ null, none found)
    // 6. subscriptions SELECT (tier check for auto-revoke branch)
    // 7. devices SELECT oldest (→ oldest-device)
    // 8. devices DELETE oldest
    // 9. users SELECT profile
    // 10. devices INSERT new
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        tables: {
          auth_extension_codes: [
            { data: validCode },  // 1.
            { data: null },       // 2.
          ],
          subscriptions: [
            { data: { tier: 'free' } },  // 3. for checkDeviceLimit
            { data: { tier: 'free' } },  // 6. for auto-revoke branch
          ],
          devices: [
            { count: 1 },                      // 4. limit check
            { data: null },                    // 5. no never-used device
            { data: { id: 'oldest-device' } }, // 7. oldest device
            { data: null },                    // 8. delete result
            { data: { id: 'new-device-id' } }, // 10. insert new
          ],
          users: { data: { id: USER_ID, email: 'test@example.com', name: null, avatar_url: null } }, // 9.
        },
      }) as never,
    )
    const res = await POST(makeReq({ code: CODE, state: STATE }))
    expect(res.status).toBe(201)
  })

  it('returns 422 for pro tier when at device limit (no auto-revoke)', async () => {
    // Pro users must manage devices manually from the dashboard
    vi.mocked(createServiceClient).mockReturnValue(
      makeSupabase({
        tables: {
          auth_extension_codes: [
            { data: validCode },  // code lookup
            { data: null },       // mark as used
          ],
          subscriptions: [
            { data: { tier: 'pro' } },  // checkDeviceLimit getUserTier
            { data: { tier: 'pro' } },  // auto-revoke tier check → pro → return limitError
          ],
          devices: [
            { count: 5 },   // pro limit = 5, exceeded
            { data: null }, // no never-used device
          ],
        },
      }) as never,
    )
    const res = await POST(makeReq({ code: CODE, state: STATE }))
    expect(res.status).toBe(422)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe('DEVICE_LIMIT_REACHED')
  })
})
