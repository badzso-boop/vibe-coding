import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { ok, Errors } from '@/lib/response'

const schema = z.object({
  refreshToken: z.string().min(1),
})

export async function POST(request: NextRequest) {
  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return Errors.badRequest('Invalid request body')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return Errors.internalError()
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ refresh_token: body.refreshToken }),
  })

  if (!res.ok) {
    return Errors.tokenInvalid()
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_at: number
  }

  return ok({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at * 1000,
  })
}
