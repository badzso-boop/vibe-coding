'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, MessageSquare } from 'lucide-react'
import { Logo } from './logo'
import { FeedbackModal } from './feedback-modal'

export function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Logo />

        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-sm text-slate-400 transition-colors hover:text-white"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm text-slate-400 transition-colors hover:text-white"
          >
            How it works
          </Link>
          <Link
            href="#pricing"
            className="text-sm text-slate-400 transition-colors hover:text-white"
          >
            Pricing
          </Link>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <FeedbackModal
            trigger={
              <button className="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white">
                <MessageSquare size={14} />
                Feedback
              </button>
            }
          />
          <Link
            href="/auth/login"
            className="text-sm text-slate-400 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Get started free
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-slate-400 hover:text-white md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/5 bg-slate-950 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <Link
              href="#features"
              className="text-sm text-slate-400"
              onClick={() => setOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-slate-400"
              onClick={() => setOpen(false)}
            >
              How it works
            </Link>
            <Link href="#pricing" className="text-sm text-slate-400" onClick={() => setOpen(false)}>
              Pricing
            </Link>
            <hr className="border-white/10" />
            <FeedbackModal
              trigger={
                <button className="flex items-center gap-1.5 text-sm text-slate-400">
                  <MessageSquare size={14} />
                  Feedback
                </button>
              }
            />
            <Link href="/auth/login" className="text-sm text-slate-400">
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white"
            >
              Get started free
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
