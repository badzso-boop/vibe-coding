import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutGrid, Monitor, CreditCard, LogOut, ShieldCheck } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/lib/supabase'
import { Logo } from '@/components/logo'

async function SignOutButton() {
  return (
    <form action="/auth/signout" method="POST">
      <button
        type="submit"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white w-full"
      >
        <LogOut size={15} />
        Sign out
      </button>
    </form>
  )
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/dashboard')
  }

  const service = createServiceClient()
  const { data: profile } = await service
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
    { href: '/dashboard/devices', label: 'Devices', icon: Monitor },
    { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="border-b border-slate-100 p-5">
          <Logo variant="dark" />
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
            <p className="text-xs font-medium text-slate-900 truncate">{user.email}</p>
          </div>
          {profile?.is_admin && (
            <Link
              href="/admin/users"
              className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <ShieldCheck size={15} />
              Admin Panel
            </Link>
          )}
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex w-full flex-col lg:flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 lg:hidden">
          <Logo variant="dark" />
          <nav className="flex gap-2">
            {navItems.map(({ href, icon: Icon }) => (
              <Link key={href} href={href} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <Icon size={18} />
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
