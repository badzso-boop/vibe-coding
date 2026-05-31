import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Download, Monitor, LayoutGrid, ArrowRight, Zap } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch subscription and usage in parallel
  const [subscriptionResult, workspacesResult, devicesResult] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('tier, status, current_period_end')
      .eq('user_id', user.id)
      .single(),
    supabase.from('workspaces').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('devices').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const subscription = subscriptionResult.data
  const tier = subscription?.tier ?? 'free'
  const isPro = tier === 'pro'
  const workspaceCount = workspacesResult.count ?? 0
  const deviceCount = devicesResult.count ?? 0

  const limits = isPro ? { workspaces: '∞', devices: 5 } : { workspaces: 1, devices: 1 }

  const displayName = user.user_metadata?.full_name
    ? (user.user_metadata.full_name as string).split(' ')[0]
    : (user.email?.split('@')[0] ?? 'there')

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Hi, {displayName} 👋</h1>
        <p className="mt-1 text-slate-500">Here&apos;s your FlowSpace overview.</p>
      </div>

      {/* Plan card */}
      <div
        className={`mb-6 overflow-hidden rounded-2xl border p-6 ${
          isPro
            ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50'
            : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isPro ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {isPro ? 'Pro' : 'Free'}
              </span>
              {isPro && subscription?.current_period_end && (
                <span className="text-xs text-slate-500">
                  Renews{' '}
                  {new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {isPro
                ? 'You have access to all Pro features including unlimited workspaces and multi-device sync.'
                : 'You are on the free plan. Upgrade to Pro to unlock unlimited workspaces and cross-device sync.'}
            </p>
          </div>
          {!isPro && (
            <Link
              href="/dashboard/billing"
              className="ml-4 flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              <Zap size={14} />
              Upgrade
            </Link>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-1 flex items-center gap-2 text-slate-500">
            <LayoutGrid size={15} />
            <span className="text-xs font-medium uppercase tracking-wide">Workspaces</span>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-bold text-slate-900">{workspaceCount}</span>
            <span className="mb-0.5 text-sm text-slate-400">/ {limits.workspaces}</span>
          </div>
          {!isPro && workspaceCount >= 1 && (
            <p className="mt-2 text-xs text-amber-600">Limit reached on free plan</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-1 flex items-center gap-2 text-slate-500">
            <Monitor size={15} />
            <span className="text-xs font-medium uppercase tracking-wide">Devices</span>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-bold text-slate-900">{deviceCount}</span>
            <span className="mb-0.5 text-sm text-slate-400">/ {limits.devices}</span>
          </div>
          {deviceCount > 0 && (
            <Link
              href="/dashboard/devices"
              className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-500"
            >
              Manage <ArrowRight size={11} />
            </Link>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-1 flex items-center gap-2 text-slate-500">
            <Download size={15} />
            <span className="text-xs font-medium uppercase tracking-wide">Extension</span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-700">Ready to install</p>
          <a
            href="#"
            className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-500"
          >
            Download <ArrowRight size={11} />
          </a>
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Download size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Install extension</p>
              <p className="text-xs text-slate-500">Chrome, Firefox, Edge</p>
            </div>
          </a>

          <Link
            href="/dashboard/devices"
            className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Monitor size={18} className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Manage devices</p>
              <p className="text-xs text-slate-500">{deviceCount} connected</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
