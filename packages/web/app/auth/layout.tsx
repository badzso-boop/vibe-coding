import Link from 'next/link'
import { Logo } from '@/components/logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Logo />
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
          ← Back to home
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  )
}
