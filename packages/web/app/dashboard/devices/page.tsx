import { redirect } from 'next/navigation'
import { Monitor, Laptop, Globe } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { RevokeDeviceButton } from './revoke-button'

export const metadata = { title: 'Devices' }

function DeviceIcon({ browser }: { browser: string | null }) {
  if (browser === 'firefox') return <Globe size={18} className="text-orange-400" />
  if (browser === 'edge') return <Monitor size={18} className="text-blue-500" />
  if (browser === 'chrome' || browser === 'brave') return <Monitor size={18} className="text-blue-400" />
  return <Laptop size={18} className="text-slate-400" />
}

function formatLastSeen(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function DevicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: devices } = await supabase
    .from('devices')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_revoked', false)
    .order('last_seen_at', { ascending: false })

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', user.id)
    .single()

  const isPro = subscription?.tier === 'pro'
  const deviceLimit = isPro ? 5 : 1

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Devices</h1>
        <p className="mt-1 text-slate-500">
          Manage devices with access to your FlowSpace account.
          {' '}
          <span className="text-slate-400">
            {devices?.length ?? 0} / {deviceLimit} used
          </span>
        </p>
      </div>

      {!isPro && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            <strong>Free plan:</strong> Limited to 1 device.{' '}
            <a href="/dashboard/billing" className="font-medium underline hover:no-underline">
              Upgrade to Pro
            </a>{' '}
            for up to 5 devices with sync.
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {!devices || devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Monitor size={24} className="text-slate-400" />
            </div>
            <p className="mb-1 text-sm font-medium text-slate-700">No devices connected</p>
            <p className="text-sm text-slate-400">
              Install the FlowSpace extension and sign in to connect a device.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {devices.map((device, idx) => (
              <li key={device.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <DeviceIcon browser={device.browser} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {device.name ?? device.browser ?? 'Unknown device'}
                    </p>
                    {idx === 0 && (
                      <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Most recent
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Last seen {formatLastSeen(device.last_seen_at)} · Added{' '}
                    {new Date(device.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <RevokeDeviceButton deviceId={device.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
