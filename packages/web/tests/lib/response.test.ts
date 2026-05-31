import { describe, it, expect } from 'vitest'
import { ok, created, noContent, apiError, Errors } from '@/lib/response'

async function json(r: Response) {
  return r.json() as Promise<Record<string, unknown>>
}

describe('ok()', () => {
  it('returns 200 with data and meta', async () => {
    const res = ok({ foo: 'bar' })
    expect(res.status).toBe(200)
    const body = await json(res)
    expect((body.data as Record<string, unknown>).foo).toBe('bar')
    expect(body.meta).toBeDefined()
  })

  it('accepts custom status', async () => {
    const res = ok({}, 202)
    expect(res.status).toBe(202)
  })
})

describe('created()', () => {
  it('returns 201', async () => {
    const res = created({ id: '1' })
    expect(res.status).toBe(201)
    const body = await json(res)
    expect((body.data as Record<string, unknown>).id).toBe('1')
  })
})

describe('noContent()', () => {
  it('returns 204 with no body', () => {
    const res = noContent()
    expect(res.status).toBe(204)
    expect(res.body).toBeNull()
  })
})

describe('apiError()', () => {
  it('returns the correct status, code, and message', async () => {
    const res = apiError(400, 'BAD_REQUEST', 'nope')
    expect(res.status).toBe(400)
    const body = await json(res)
    const err = body.error as Record<string, unknown>
    expect(err.code).toBe('BAD_REQUEST')
    expect(err.message).toBe('nope')
  })

  it('includes details when provided', async () => {
    const res = apiError(409, 'STALE', 'stale', { serverUpdatedAt: '2024-01-01' })
    const body = await json(res)
    const err = body.error as Record<string, unknown>
    expect((err.details as Record<string, unknown>).serverUpdatedAt).toBe('2024-01-01')
  })
})

describe('Errors factories', () => {
  it.each([
    ['tokenInvalid', 401, 'TOKEN_INVALID'],
    ['deviceRevoked', 401, 'DEVICE_REVOKED'],
    ['authCodeExpired', 401, 'AUTH_CODE_EXPIRED'],
    ['authStateMismatch', 401, 'AUTH_STATE_MISMATCH'],
    ['forbidden', 403, 'FORBIDDEN'],
    ['subscriptionExpired', 403, 'SUBSCRIPTION_EXPIRED'],
    ['workspaceNotFound', 404, 'WORKSPACE_NOT_FOUND'],
    ['tileNotFound', 404, 'TILE_NOT_FOUND'],
    ['deviceNotFound', 404, 'DEVICE_NOT_FOUND'],
    ['templateNotFound', 404, 'TEMPLATE_NOT_FOUND'],
    ['deviceLimitReached', 422, 'DEVICE_LIMIT_REACHED'],
    ['shortcutConflict', 409, 'SHORTCUT_CONFLICT'],
    ['internalError', 500, 'INTERNAL_ERROR'],
  ] as const)('Errors.%s() → %i %s', async (factory, status, code) => {
    const res = (Errors as any)[factory]()
    expect(res.status).toBe(status)
    const body = await json(res)
    expect((body.error as Record<string, unknown>).code).toBe(code)
  })

  it('Errors.tierLimitReached() includes custom message', async () => {
    const res = Errors.tierLimitReached('Free tier allows only 3 workspaces.')
    expect(res.status).toBe(422)
    const body = await json(res)
    expect((body.error as Record<string, unknown>).code).toBe('TIER_LIMIT_REACHED')
    expect((body.error as Record<string, unknown>).message).toContain('Free tier')
  })

  it('Errors.badRequest() includes custom message', async () => {
    const res = Errors.badRequest('Missing field x')
    expect(res.status).toBe(400)
    const body = await json(res)
    expect((body.error as Record<string, unknown>).message).toBe('Missing field x')
  })

  it('Errors.staleData() includes serverUpdatedAt in details', async () => {
    const ts = '2024-06-01T10:00:00+00:00'
    const res = Errors.staleData(ts)
    expect(res.status).toBe(409)
    const body = await json(res)
    const err = body.error as Record<string, unknown>
    expect(err.code).toBe('STALE_DATA')
    expect((err.details as Record<string, unknown>).serverUpdatedAt).toBe(ts)
  })
})
