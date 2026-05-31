import { type NextRequest } from 'next/server'
import { resend } from '@/lib/resend'
import { ok, Errors } from '@/lib/response'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  const audienceId = process.env.RESEND_AUDIENCE_ID
  if (!audienceId) {
    console.error('[newsletter] RESEND_AUDIENCE_ID is not set')
    return Errors.internalError()
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Errors.badRequest('Invalid JSON')
  }

  const email =
    typeof (body as Record<string, unknown>).email === 'string'
      ? ((body as Record<string, unknown>).email as string).trim().toLowerCase()
      : ''

  if (!email || !EMAIL_RE.test(email)) {
    return Errors.badRequest('A valid email address is required.')
  }

  const { error } = await resend.contacts.create({ email, audienceId, unsubscribed: false })

  if (error) {
    // Resend returns a specific error when the contact already exists
    if ('name' in error && (error as { name: string }).name === 'validation_error') {
      // Already subscribed — treat as success so we don't leak existence
      return ok({ subscribed: true })
    }
    console.error('[newsletter] Resend error:', error)
    return Errors.internalError()
  }

  return ok({ subscribed: true })
}
