import { describe, it, expect } from 'vitest'
import { checkWorkspaceLimit, checkTileLimit, checkDeviceLimit } from '@/lib/tier'
import { makeSupabase } from '../helpers/supabase-mock'

const USER_ID = 'user-uuid-1'
const WS_ID = 'ws-uuid-1'

// TIER_LIMITS.free = { workspaces: 1, tilesPerWorkspace: 4, devices: 1 }
// TIER_LIMITS.pro  = { workspaces: Infinity, tilesPerWorkspace: Infinity, devices: 5 }

describe('checkWorkspaceLimit', () => {
  it('returns null when free tier user is under the workspace limit', async () => {
    const db = makeSupabase({
      tables: {
        subscriptions: { data: { tier: 'free' } },
        workspaces: { count: 0 }, // limit is 1
      },
    })
    const result = await checkWorkspaceLimit(db as never, USER_ID)
    expect(result).toBeNull()
  })

  it('returns 422 when free tier user is at the workspace limit', async () => {
    const db = makeSupabase({
      tables: {
        subscriptions: { data: { tier: 'free' } },
        workspaces: { count: 1 }, // at limit (limit = 1)
      },
    })
    const result = await checkWorkspaceLimit(db as never, USER_ID)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(422)
    const body = (await result!.json()) as { error: { code: string } }
    expect(body.error.code).toBe('TIER_LIMIT_REACHED')
  })

  it('returns null for pro tier regardless of count', async () => {
    const db = makeSupabase({
      tables: {
        subscriptions: { data: { tier: 'pro' } },
        workspaces: { count: 999 },
      },
    })
    const result = await checkWorkspaceLimit(db as never, USER_ID)
    expect(result).toBeNull()
  })

  it('defaults to free tier when no subscription row exists', async () => {
    const db = makeSupabase({
      tables: {
        subscriptions: { data: null }, // no subscription row
        workspaces: { count: 3 },
      },
    })
    const result = await checkWorkspaceLimit(db as never, USER_ID)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(422)
  })
})

describe('checkTileLimit', () => {
  it('returns null when free tier user is under tile limit', async () => {
    const db = makeSupabase({
      tables: {
        subscriptions: { data: { tier: 'free' } },
        tiles: { count: 3 }, // limit is 4
      },
    })
    const result = await checkTileLimit(db as never, USER_ID, WS_ID)
    expect(result).toBeNull()
  })

  it('returns 422 when free tier user is at tile limit', async () => {
    const db = makeSupabase({
      tables: {
        subscriptions: { data: { tier: 'free' } },
        tiles: { count: 4 }, // at limit (limit = 4)
      },
    })
    const result = await checkTileLimit(db as never, USER_ID, WS_ID)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(422)
  })

  it('returns null for pro tier regardless of tile count', async () => {
    const db = makeSupabase({
      tables: {
        subscriptions: { data: { tier: 'pro' } },
        tiles: { count: 500 },
      },
    })
    const result = await checkTileLimit(db as never, USER_ID, WS_ID)
    expect(result).toBeNull()
  })
})

describe('checkDeviceLimit', () => {
  it('returns null when free tier user has 0 devices', async () => {
    const db = makeSupabase({
      tables: {
        subscriptions: { data: { tier: 'free' } },
        devices: { count: 0 },
      },
    })
    const result = await checkDeviceLimit(db as never, USER_ID)
    expect(result).toBeNull()
  })

  it('returns 422 when free tier user already has 1 device (limit = 1)', async () => {
    const db = makeSupabase({
      tables: {
        subscriptions: { data: { tier: 'free' } },
        devices: { count: 1 },
      },
    })
    const result = await checkDeviceLimit(db as never, USER_ID)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(422)
    const body = (await result!.json()) as { error: { code: string } }
    expect(body.error.code).toBe('DEVICE_LIMIT_REACHED')
  })

  it('returns null when pro tier user has 4 devices (limit = 5)', async () => {
    const db = makeSupabase({
      tables: {
        subscriptions: { data: { tier: 'pro' } },
        devices: { count: 4 },
      },
    })
    const result = await checkDeviceLimit(db as never, USER_ID)
    expect(result).toBeNull()
  })

  it('returns 422 when pro tier user is at device limit', async () => {
    const db = makeSupabase({
      tables: {
        subscriptions: { data: { tier: 'pro' } },
        devices: { count: 5 },
      },
    })
    const result = await checkDeviceLimit(db as never, USER_ID)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(422)
  })
})
