'use server'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ArrowLeft, Monitor, LayoutGrid, ShieldOff } from 'lucide-react'
import { requireAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase'

type Params = { params: Promise<{ userId: string }> }

async function revokeDevice(formData: FormData) {
  'use server'
  await requireAdmin()
  const deviceId = formData.get('deviceId') as string
  const userId = formData.get('userId') as string
  const service = createServiceClient()
  await service
    .from('devices')
    .update({ is_revoked: true })
    .eq('id', deviceId)
    .eq('user_id', userId)
  revalidatePath(`/admin/users/${userId}`)
}

export default async function AdminUserDetailPage({ params }: Params) {
  await requireAdmin()

  const { userId } = await params
  const service = createServiceClient()

  const [userResult, subResult, devicesResult, workspacesResult] = await Promise.all([
    service.from('users').select('*').eq('id', userId).maybeSingle(),
    service.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
    service
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    service
      .from('workspaces')
      .select('id, name, icon, created_at, tiles(id)')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true }),
  ])

  const user = userResult.data
  if (!user) notFound()

  const sub = subResult.data
  const devices = devicesResult.data ?? []
  const workspaces = (workspacesResult.data ?? []) as Array<{
    id: string
    name: string
    icon: string | null
    created_at: string
    tiles: Array<{ id: string }>
  }>

  const isPro = sub?.tier === 'pro'

  return (
    <div className="max-w-4xl">
      {/* Back */}
      <Link
        href="/admin/users"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={14} />
        Back to users
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{user.email}</h1>
          {user.name && <p className="mt-0.5 text-slate-500">{user.name}</p>}
          <p className="mt-1 text-xs text-slate-400">ID: {user.id}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
            isPro ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {isPro ? 'Pro' : 'Free'}
        </span>
      </div>

      {/* Info cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Joined</p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {new Date(user.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last Login</p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {user.last_login_at
              ? new Date(user.last_login_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'Never'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Admin</p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {user.is_admin ? 'Yes' : 'No'}
          </p>
        </div>
      </div>

      {/* Subscription */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          Subscription
        </h2>
        {sub ? (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-slate-500">Tier: </span>
              <span className="font-medium text-slate-900">{sub.tier}</span>
            </div>
            <div>
              <span className="text-slate-500">Status: </span>
              <span className="font-medium text-slate-900">{sub.status}</span>
            </div>
            {sub.stripe_customer_id && (
              <div>
                <span className="text-slate-500">Stripe Customer: </span>
                <span className="font-mono text-xs text-slate-700">{sub.stripe_customer_id}</span>
              </div>
            )}
            {sub.stripe_subscription_id && (
              <div>
                <span className="text-slate-500">Stripe Sub: </span>
                <span className="font-mono text-xs text-slate-700">
                  {sub.stripe_subscription_id}
                </span>
              </div>
            )}
            {sub.current_period_end && (
              <div>
                <span className="text-slate-500">Period ends: </span>
                <span className="font-medium text-slate-900">
                  {new Date(sub.current_period_end).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No subscription record found.</p>
        )}
      </div>

      {/* Devices */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <Monitor size={15} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">
            Devices ({devices.filter((d) => !d.is_revoked).length} active)
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Name
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Browser
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Last Seen
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {devices.map((device) => (
              <tr key={device.id} className={device.is_revoked ? 'opacity-50' : ''}>
                <td className="px-5 py-3 font-medium text-slate-900">{device.name}</td>
                <td className="px-5 py-3 capitalize text-slate-600">{device.browser ?? '—'}</td>
                <td className="px-5 py-3 text-slate-500">
                  {device.last_seen_at
                    ? new Date(device.last_seen_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Never'}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      device.is_revoked ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                    }`}
                  >
                    {device.is_revoked ? 'Revoked' : 'Active'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {!device.is_revoked && (
                    <form action={revokeDevice}>
                      <input type="hidden" name="deviceId" value={device.id} />
                      <input type="hidden" name="userId" value={userId} />
                      <button
                        type="submit"
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        <ShieldOff size={12} />
                        Revoke
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {devices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                  No devices registered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Workspaces */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <LayoutGrid size={15} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Workspaces ({workspaces.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Name
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tiles
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {workspaces.map((ws) => (
              <tr key={ws.id}>
                <td className="px-5 py-3 font-medium text-slate-900">
                  {ws.icon ? `${ws.icon} ` : ''}
                  {ws.name}
                </td>
                <td className="px-5 py-3 text-slate-600">{ws.tiles.length}</td>
                <td className="px-5 py-3 text-slate-500">
                  {new Date(ws.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
              </tr>
            ))}
            {workspaces.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-slate-400">
                  No workspaces yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
