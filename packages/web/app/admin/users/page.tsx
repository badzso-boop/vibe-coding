import Link from 'next/link'
import { ArrowRight, Users, LayoutGrid, Monitor, TrendingUp } from 'lucide-react'
import { requireAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase'

export const metadata = { title: 'Admin — Users' }

export default async function AdminUsersPage() {
  await requireAdmin()

  const service = createServiceClient()

  const [usersResult, workspaceCountResult, deviceCountResult] = await Promise.all([
    service
      .from('users')
      .select(
        `id, email, name, avatar_url, is_admin, created_at, last_login_at,
         subscriptions(tier, status),
         workspaces(id),
         devices(id, is_revoked)`,
      )
      .order('created_at', { ascending: false }),
    service.from('workspaces').select('id', { count: 'exact', head: true }),
    service.from('devices').select('id', { count: 'exact', head: true }).eq('is_revoked', false),
  ])

  const users = (usersResult.data ?? []) as Array<{
    id: string
    email: string
    name: string | null
    avatar_url: string | null
    is_admin: boolean
    created_at: string
    last_login_at: string | null
    subscriptions: Array<{ tier: string; status: string }> | null
    workspaces: Array<{ id: string }> | null
    devices: Array<{ id: string; is_revoked: boolean }> | null
  }>

  const totalUsers = users.length
  const proUsers = users.filter((u) => u.subscriptions?.[0]?.tier === 'pro').length
  const totalWorkspaces = workspaceCountResult.count ?? 0
  const activeDevices = deviceCountResult.count ?? 0

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Users },
    { label: 'Pro Users', value: proUsers, icon: TrendingUp },
    { label: 'Workspaces', value: totalWorkspaces, icon: LayoutGrid },
    { label: 'Active Devices', value: activeDevices, icon: Monitor },
  ]

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="mt-1 text-slate-500">Manage and support your users.</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-1 flex items-center gap-2 text-slate-500">
              <Icon size={14} />
              <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            </div>
            <span className="text-3xl font-bold text-slate-900">{value}</span>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                User
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Plan
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Workspaces
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Devices
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Joined
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Last Login
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => {
              const tier = user.subscriptions?.[0]?.tier ?? 'free'
              const isPro = tier === 'pro'
              const wsCount = user.workspaces?.length ?? 0
              const activeDevCount = user.devices?.filter((d) => !d.is_revoked).length ?? 0

              return (
                <tr key={user.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-medium text-slate-900">{user.email}</p>
                      {user.name && <p className="text-xs text-slate-500">{user.name}</p>}
                      {user.is_admin && (
                        <span className="mt-0.5 inline-block text-xs font-medium text-red-600">
                          admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isPro ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isPro ? 'Pro' : 'Free'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{wsCount}</td>
                  <td className="px-5 py-4 text-slate-700">{activeDevCount}</td>
                  <td className="px-5 py-4 text-slate-500">
                    {new Date(user.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-500"
                    >
                      View <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
