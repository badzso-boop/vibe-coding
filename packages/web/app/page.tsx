import Link from 'next/link'
import {
  LayoutGrid,
  Keyboard,
  Globe,
  RefreshCw,
  Shield,
  Zap,
  Check,
  ChevronRight,
  Download,
  Monitor,
  Star,
} from 'lucide-react'
import { Nav } from '@/components/nav'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Nav />

      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-20">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 h-[400px] w-[400px] rounded-full bg-blue-800/15 blur-[100px]" />
          <div className="absolute top-1/3 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-600/10 blur-[80px]" />
        </div>

        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5">
            <Star size={12} className="text-blue-400" />
            <span className="text-xs font-medium text-blue-300">
              Browser Extension for Power Users
            </span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Your browser,{' '}
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
              finally organized.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400 sm:text-xl">
            FlowSpace turns your browser into a tiling workspace manager. View multiple websites
            side-by-side, switch between contexts instantly with a keystroke, and never lose your
            focus again.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth/register"
              className="group flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/40"
            >
              <Download size={18} />
              Get started — it&apos;s free
              <ChevronRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="#how-it-works"
              className="flex items-center gap-2 rounded-xl border border-white/10 px-8 py-4 text-base font-medium text-slate-300 transition-all hover:border-white/20 hover:text-white"
            >
              See how it works
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Check size={12} className="text-blue-500" /> Free forever plan
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={12} className="text-blue-500" /> Chrome, Firefox & Edge
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={12} className="text-blue-500" /> No account migration
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={12} className="text-blue-500" /> Open in seconds
            </span>
          </div>

          {/* Browser mockup */}
          <div className="relative mx-auto mt-20 max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-white/5 bg-slate-800/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/70" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                  <div className="h-3 w-3 rounded-full bg-green-500/70" />
                </div>
                <div className="mx-auto flex h-6 w-72 items-center rounded-md bg-slate-700/50 px-3 text-xs text-slate-500">
                  app.flowspace.io/dashboard
                </div>
              </div>

              {/* Workspace layout */}
              <div className="flex h-72 sm:h-96">
                {/* Sidebar */}
                <div className="flex w-14 flex-col items-center gap-3 border-r border-white/5 bg-slate-900 py-4">
                  {['W', 'P', 'F'].map((label, i) => (
                    <div
                      key={label}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                        i === 0
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Tiled content */}
                <div className="flex flex-1 flex-col">
                  <div className="flex h-1/2 gap-0">
                    <div className="flex-1 border-b border-r border-white/5 bg-slate-800/30 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm bg-blue-500/60" />
                        <div className="h-2 w-24 rounded bg-slate-700" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2 w-full rounded bg-slate-700/50" />
                        <div className="h-2 w-4/5 rounded bg-slate-700/50" />
                        <div className="h-2 w-3/5 rounded bg-slate-700/50" />
                      </div>
                    </div>
                    <div className="flex-1 border-b border-white/5 bg-slate-800/20 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm bg-green-500/60" />
                        <div className="h-2 w-20 rounded bg-slate-700" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2 w-full rounded bg-slate-700/50" />
                        <div className="h-2 w-3/4 rounded bg-slate-700/50" />
                        <div className="h-2 w-1/2 rounded bg-slate-700/50" />
                      </div>
                    </div>
                  </div>
                  <div className="flex h-1/2">
                    <div className="flex-[2] border-r border-white/5 bg-slate-800/40 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm bg-purple-500/60" />
                        <div className="h-2 w-28 rounded bg-slate-700" />
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-6 rounded bg-slate-700/40" />
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 bg-slate-800/10 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-3 w-3 rounded-sm bg-orange-500/60" />
                        <div className="h-2 w-16 rounded bg-slate-700" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2 w-full rounded bg-slate-700/50" />
                        <div className="h-2 w-4/5 rounded bg-slate-700/50" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -right-4 -top-4 rounded-xl border border-blue-500/20 bg-blue-600/90 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur">
              <div className="flex items-center gap-1.5">
                <Keyboard size={12} />
                Ctrl+2 → Work
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 rounded-xl border border-white/10 bg-slate-800/90 px-3 py-2 text-xs font-medium text-slate-300 shadow-lg backdrop-blur">
              <div className="flex items-center gap-1.5">
                <LayoutGrid size={12} className="text-blue-400" />4 tiles, 1 workspace
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-blue-500">
              Features
            </p>
            <h2 className="mb-4 text-4xl font-bold tracking-tight">
              Everything you need to stay in flow
            </h2>
            <p className="mx-auto max-w-xl text-slate-400">
              Designed for developers, designers, and knowledge workers who live in their browser.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: LayoutGrid,
                color: 'blue',
                title: 'Tiling layouts',
                desc: 'Split your browser window into any arrangement. Reference docs alongside your editor, monitor dashboards side-by-side — your layout, your rules.',
              },
              {
                icon: Keyboard,
                color: 'indigo',
                title: 'Keyboard-first',
                desc: 'Switch workspaces with Ctrl+1 through Ctrl+9. Navigate tiles without reaching for the mouse. Every action has a shortcut.',
              },
              {
                icon: Globe,
                color: 'cyan',
                title: 'Works with every site',
                desc: 'Sites that block iframes open as tab tiles with a floating sidebar. FlowSpace handles the technical details — you just browse.',
              },
              {
                icon: RefreshCw,
                color: 'violet',
                title: 'Multi-device sync',
                desc: 'Your workspaces follow you across devices. Pick up exactly where you left off, whether on your laptop or desktop.',
              },
              {
                icon: Shield,
                color: 'sky',
                title: 'Your browser stays yours',
                desc: 'No migration. No new browser. FlowSpace layers on top of Chrome, Firefox, or Edge — keeping all your passwords, history, and extensions.',
              },
              {
                icon: Zap,
                color: 'blue',
                title: 'Instant switching',
                desc: 'Zero loading time between workspaces. Tiles are persistent — your pages stay loaded in the background, ready instantly.',
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-blue-500/20 hover:bg-white/[0.04]"
              >
                <div className={`mb-4 inline-flex rounded-xl bg-${color}-500/10 p-3`}>
                  <Icon size={20} className={`text-${color}-400`} />
                </div>
                <h3 className="mb-2 text-base font-semibold">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-32 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-blue-500">
              Setup
            </p>
            <h2 className="mb-4 text-4xl font-bold tracking-tight">Up and running in 60 seconds</h2>
            <p className="mx-auto max-w-xl text-slate-400">
              No complex configuration. No migration wizard. Install, create a workspace, and go.
            </p>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-[28px] top-0 h-full w-px bg-gradient-to-b from-blue-600 via-blue-600/50 to-transparent lg:hidden" />
            <div className="absolute top-[28px] left-0 h-px w-full bg-gradient-to-r from-blue-600 via-blue-600/50 to-transparent hidden lg:block" />

            <div className="grid gap-10 lg:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Install the extension',
                  desc: 'Add FlowSpace from the Chrome Web Store, Firefox Add-ons, or Edge Extensions. Takes 10 seconds.',
                },
                {
                  step: '02',
                  title: 'Create your workspaces',
                  desc: 'Set up spaces for Work, Personal, Research — whatever fits your workflow. Name them, color them, assign shortcuts.',
                },
                {
                  step: '03',
                  title: 'Add tiles and go',
                  desc: 'Add URLs to each workspace. Arrange tiles with drag-and-drop. Hit Ctrl+1 and your layout is ready.',
                },
              ].map(({ step, title, desc }) => (
                <div key={step} className="relative flex gap-5 lg:flex-col lg:gap-6">
                  <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-600 text-sm font-bold">
                    {step}
                  </div>
                  <div className="lg:mt-0">
                    <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                    <p className="text-sm leading-relaxed text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-blue-500">
              Pricing
            </p>
            <h2 className="mb-4 text-4xl font-bold tracking-tight">Simple, honest pricing</h2>
            <p className="mx-auto max-w-xl text-slate-400">
              Start free. Upgrade when you need more workspaces, devices, or templates.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Free */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
              <div className="mb-6">
                <p className="mb-1 text-sm font-medium text-slate-400">Free</p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-bold">€0</span>
                  <span className="mb-2 text-slate-400">/month</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Forever free. No credit card required.
                </p>
              </div>

              <Link
                href="/auth/register"
                className="mb-8 block w-full rounded-xl border border-white/10 py-3 text-center text-sm font-semibold text-white transition-colors hover:border-white/20"
              >
                Get started free
              </Link>

              <ul className="space-y-3">
                {[
                  '1 workspace',
                  '4 tiles per workspace',
                  '1 device',
                  'Keyboard shortcuts',
                  'Official templates',
                  'Iframe & tab tiles',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-400">
                    <Check size={14} className="shrink-0 text-slate-600" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro */}
            <div className="relative overflow-hidden rounded-2xl border border-blue-500/40 bg-blue-950/30 p-8">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />

              <div className="absolute right-4 top-4 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">
                Popular
              </div>

              <div className="mb-6">
                <p className="mb-1 text-sm font-medium text-blue-300">Pro</p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-bold">€9</span>
                  <span className="mb-2 text-blue-300">/month</span>
                </div>
                <p className="mt-2 text-sm text-blue-400/70">
                  Everything you need for serious work.
                </p>
              </div>

              <Link
                href="/auth/register"
                className="relative mb-8 block w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-500"
              >
                Start free trial
              </Link>

              <ul className="space-y-3">
                {[
                  'Unlimited workspaces',
                  'Unlimited tiles',
                  '5 devices with sync',
                  'All keyboard shortcuts',
                  'Community templates',
                  'Priority support',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                    <Check size={14} className="shrink-0 text-blue-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950/60 via-blue-900/30 to-slate-950 p-16 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
          </div>
          <div className="relative">
            <Monitor size={40} className="mx-auto mb-6 text-blue-400" />
            <h2 className="mb-4 text-4xl font-bold tracking-tight">
              Ready to take control of your browser?
            </h2>
            <p className="mx-auto mb-8 max-w-md text-slate-400">
              Join thousands of developers and designers who have already organized their digital
              workspace.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-500"
            >
              Get started for free
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="h-2 w-2 rounded-[2px] bg-white" />
                  <div className="h-2 w-2 rounded-[2px] bg-blue-300" />
                  <div className="h-2 w-2 rounded-[2px] bg-blue-300" />
                  <div className="h-2 w-2 rounded-[2px] bg-white" />
                </div>
              </div>
              <span className="text-sm font-semibold text-white">FlowSpace</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-500">
              <Link href="/auth/login" className="hover:text-white transition-colors">
                Sign in
              </Link>
              <Link href="/auth/register" className="hover:text-white transition-colors">
                Sign up
              </Link>
              <Link href="#pricing" className="hover:text-white transition-colors">
                Pricing
              </Link>
            </div>
            <p className="text-sm text-slate-600">© 2025 FlowSpace. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
