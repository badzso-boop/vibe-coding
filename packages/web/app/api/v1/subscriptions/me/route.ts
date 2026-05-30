import { type NextRequest } from 'next/server'
import { requireAuth, isAuthError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase'
import { ok, Errors } from '@/lib/response'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (isAuthError(auth)) return auth.error

  const supabase = createServiceClient()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', auth.ctx.user.id)
    .maybeSingle()

  if (!sub) {
    // Should not happen — subscription row is created on user registration via DB trigger
    console.error('No subscription found for user:', auth.ctx.user.id)
    return Errors.internalError()
  }

  return ok({
    tier: sub.tier,
    status: sub.status,
    stripeCustomerId: sub.stripe_customer_id,
    currentPeriodStart: sub.current_period_start,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    trialEnd: sub.trial_end,
  })
}
