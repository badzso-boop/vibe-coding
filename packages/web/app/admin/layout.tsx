import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, LogOut, ShieldCheck } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/lib/supabase'
import { Logo } from '@/components/logo'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?next=/admin/users')

  const service = createServiceClient()
  const { data: profile } = await service
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) redirect('/dashboard')

  const navItems = [{ href: '/admin/users', label: 'Users', icon: Users }]

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="border-b border-slate-100 p-5">
          <Logo variant="dark" />
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
            <ShieldCheck size={11} />
            Admin Panel
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2">
            <p className="truncate text-xs font-medium text-slate-900">{user.email}</p>
          </div>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex w-full flex-col lg:flex-1">
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
