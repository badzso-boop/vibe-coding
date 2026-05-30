import { type NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth'
import { apiError } from '@/lib/response'

// TODO: Implement Stripe checkout when Stripe integration is added
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  return apiError(503, 'NOT_IMPLEMENTED', 'Stripe integration coming soon')
}
