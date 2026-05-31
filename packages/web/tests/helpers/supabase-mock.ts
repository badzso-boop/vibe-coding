import { vi } from 'vitest'

export interface QueryResult {
  data?: unknown
  error?: { message: string } | null
  count?: number | null
}

/**
 * Creates a chainable Supabase query builder that resolves with the given result.
 * All intermediate methods (select, eq, order, …) return `this` so chains work normally.
 * The builder is thenable so `await chain` resolves with `{ data, error, count }`.
 */
export function makeChain(result: QueryResult = {}) {
  const resolved = {
    data: result.data ?? null,
    error: result.error ?? null,
    count: result.count ?? null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    // Intermediate methods — return this for chaining
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),

    // Terminal methods — return resolved Promise
    single: vi.fn().mockResolvedValue(resolved),
    maybeSingle: vi.fn().mockResolvedValue(resolved),

    // Make the builder itself awaitable (for `await supabase.from().select().eq()`)
    then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
      Promise.resolve(resolved).then(resolve, reject),
  }

  return chain
}

/**
 * Creates a mock Supabase service client.
 *
 * `tables` is a map from table name → result. When the same table is queried
 * multiple times, results are consumed in order; the last entry is reused.
 *
 * Usage:
 *   const db = makeSupabase({
 *     workspaces: [{ data: myWorkspace }, { error: { message: 'fail' } }],
 *   })
 */
export function makeSupabase(options: {
  tables?: Record<string, QueryResult | QueryResult[]>
  authUser?: { id: string; email: string } | null
  authError?: { message: string } | null
} = {}) {
  const { tables = {}, authUser = null, authError = null } = options
  const callCounts: Record<string, number> = {}

  const from = vi.fn((table: string) => {
    callCounts[table] = (callCounts[table] ?? 0) + 1
    const entry = tables[table]
    if (!entry) return makeChain({ data: null })
    const results = Array.isArray(entry) ? entry : [entry]
    const result = results[callCounts[table] - 1] ?? results[results.length - 1]
    return makeChain(result)
  })

  return {
    from,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authUser },
        error: authError,
      }),
    },
  }
}

/** Convenience auth context returned by a successful requireAuth() */
export const AUTH_CTX = {
  ctx: {
    user: { id: 'user-uuid-1', email: 'test@example.com' },
    deviceId: 'device-uuid-1',
  },
  error: null,
}
