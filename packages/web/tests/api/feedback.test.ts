import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/utils/supabase/server'
import { POST } from '@/app/api/v1/feedback/route'

const VALID_BODY = {
  type: 'bug',
  title: 'Something is broken',
  description: 'When I click the button nothing happens and I expected it to work',
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost:3001/api/v1/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockAnonSupabase() {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  } as never)
}

function mockAuthSupabase(email: string, id = 'user-uuid-1') {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id, email } }, error: null }),
    },
  } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.GITHUB_FEEDBACK_TOKEN = 'ghp_test_token_123'
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => '{"id":1,"number":42}',
    }),
  )
  mockAnonSupabase()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ─── Missing token ────────────────────────────────────────────────────────────

describe('POST /api/v1/feedback — env guard', () => {
  it('returns 500 when GITHUB_FEEDBACK_TOKEN is not set', async () => {
    delete process.env.GITHUB_FEEDBACK_TOKEN
    const res = await POST(makeReq(VALID_BODY))
    expect(res.status).toBe(500)
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })
})

// ─── Validation ───────────────────────────────────────────────────────────────

describe('POST /api/v1/feedback — validation', () => {
  it('returns 400 for missing body', async () => {
    const res = await POST(
      new NextRequest('http://localhost:3001/api/v1/feedback', { method: 'POST' }),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid type', async () => {
    const res = await POST(makeReq({ ...VALID_BODY, type: 'complaint' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when title is too short (< 5 chars)', async () => {
    const res = await POST(makeReq({ ...VALID_BODY, title: 'oops' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when title is too long (> 100 chars)', async () => {
    const res = await POST(makeReq({ ...VALID_BODY, title: 'x'.repeat(101) }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when description is too short (< 10 chars)', async () => {
    const res = await POST(makeReq({ ...VALID_BODY, description: 'short' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when description is too long (> 2000 chars)', async () => {
    const res = await POST(makeReq({ ...VALID_BODY, description: 'x'.repeat(2001) }))
    expect(res.status).toBe(400)
  })
})

// ─── Success paths ────────────────────────────────────────────────────────────

describe('POST /api/v1/feedback — GitHub issue creation', () => {
  it('returns 200 and submitted:true on valid bug report', async () => {
    const res = await POST(makeReq(VALID_BODY))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.submitted).toBe(true)
  })

  it('calls GitHub API exactly once', async () => {
    await POST(makeReq(VALID_BODY))
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce()
  })

  it('sends request to the correct GitHub endpoint', async () => {
    await POST(makeReq(VALID_BODY))
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('api.github.com/repos/badzso-boop/vibe-coding/issues')
  })

  it('prefixes issue title with [Feedback]', async () => {
    await POST(makeReq(VALID_BODY))
    const [, opts] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(opts!.body as string)
    expect(body.title).toBe('[Feedback] Something is broken')
  })

  it('maps bug type to "bug" label', async () => {
    await POST(makeReq({ ...VALID_BODY, type: 'bug' }))
    const [, opts] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(opts!.body as string).labels).toContain('bug')
  })

  it('maps feature type to "enhancement" label', async () => {
    await POST(makeReq({ ...VALID_BODY, type: 'feature' }))
    const [, opts] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(opts!.body as string).labels).toContain('enhancement')
  })

  it('maps other type to "question" label', async () => {
    await POST(makeReq({ ...VALID_BODY, type: 'other' }))
    const [, opts] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(opts!.body as string).labels).toContain('question')
  })

  it('includes description in issue body', async () => {
    await POST(makeReq(VALID_BODY))
    const [, opts] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(opts!.body as string)
    expect(body.body).toContain(VALID_BODY.description)
  })
})

// ─── Auth context ─────────────────────────────────────────────────────────────

describe('POST /api/v1/feedback — user attribution', () => {
  it('includes authenticated user email in issue body', async () => {
    mockAuthSupabase('user@example.com')
    await POST(makeReq(VALID_BODY))
    const [, opts] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(opts!.body as string)
    expect(body.body).toContain('user@example.com')
    expect(body.body).toContain('authenticated')
  })

  it('includes provided email in issue body for anonymous user', async () => {
    await POST(makeReq({ ...VALID_BODY, email: 'anon@example.com' }))
    const [, opts] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(opts!.body as string)
    expect(body.body).toContain('anon@example.com')
  })

  it('marks submission as anonymous when no email is provided', async () => {
    await POST(makeReq(VALID_BODY))
    const [, opts] = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(opts!.body as string)
    expect(body.body).toContain('anonymous')
  })

  it('still succeeds when supabase auth throws', async () => {
    vi.mocked(createClient).mockRejectedValue(new Error('supabase error'))
    const res = await POST(makeReq(VALID_BODY))
    expect(res.status).toBe(200)
  })
})

// ─── GitHub API error ─────────────────────────────────────────────────────────

describe('POST /api/v1/feedback — GitHub API failure', () => {
  it('returns 500 when GitHub API returns non-ok status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => 'Unprocessable Entity',
      }),
    )
    const res = await POST(makeReq(VALID_BODY))
    expect(res.status).toBe(500)
  })
})
