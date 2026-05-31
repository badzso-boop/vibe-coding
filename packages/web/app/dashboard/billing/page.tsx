import { redirect } from 'next/navigation'
import { Check, Zap } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'

export const metadata = { title: 'Billing' }

export default async function BillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier, status, current_period_end')
    .eq('user_id', user.id)
    .single()

  const isPro = subscription?.tier === 'pro'

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
        <p className="mt-1 text-slate-500">Manage your subscription and billing details.</p>
      </div>

      {isPro ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Pro
                </span>
                <span className="text-sm text-slate-500 capitalize">{subscription?.status}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                €9 <span className="text-base font-normal text-slate-500">/ month</span>
              </p>
              {subscription?.current_period_end && (
                <p className="mt-1 text-sm text-slate-500">
                  Next billing date:{' '}
                  {new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>

          <hr className="my-6 border-slate-100" />

          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm text-amber-800">
              Billing portal coming soon. To cancel or modify your subscription, contact us at{' '}
              <a href="mailto:support@flowspace.io" className="font-medium underline">
                support@flowspace.io
              </a>
            </p>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-medium text-slate-500">Current plan</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">Free</p>
            <p className="mt-1 text-sm text-slate-500">1 workspace · 4 tiles · 1 device</p>
          </div>

          <div className="overflow-hidden rounded-2xl border-2 border-blue-500 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-900">Pro</span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    Most popular
                  </span>
                </div>
                <div className="mt-1 flex items-end gap-1">
                  <span className="text-3xl font-bold text-slate-900">€9</span>
                  <span className="mb-0.5 text-slate-500">/ month</span>
                </div>
              </div>
              <Zap size={24} className="text-blue-500" />
            </div>

            <ul className="my-6 space-y-2.5">
              {[
                'Unlimited workspaces',
                'Unlimited tiles per workspace',
                'Up to 5 devices with real-time sync',
                'All keyboard shortcuts',
                'Community & custom templates',
                'Priority support',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                  <Check size={14} className="shrink-0 text-blue-500" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-sm text-slate-600">
                Stripe checkout coming soon. To upgrade now, contact us at{' '}
                <a
                  href="mailto:support@flowspace.io"
                  className="font-medium text-blue-600 hover:underline"
                >
                  support@flowspace.io
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
