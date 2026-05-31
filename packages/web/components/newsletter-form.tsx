'use client'

import { useState } from 'react'
import { ChevronRight, Loader2, CheckCircle } from 'lucide-react'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || state === 'loading') return
    setState('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = (await res.json()) as { data?: unknown; error?: { message: string } }
      if (!res.ok) {
        setErrorMsg(json.error?.message ?? 'Something went wrong. Please try again.')
        setState('error')
        return
      }
      setState('success')
    } catch {
      setErrorMsg('Network error. Please try again.')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-6 py-4 text-sm text-green-400">
        <CheckCircle size={16} />
        <span>You&apos;re on the list! We&apos;ll keep you posted.</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        disabled={state === 'loading'}
        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={state === 'loading'}
        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500 disabled:opacity-60"
      >
        {state === 'loading' ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <>
            Subscribe <ChevronRight size={15} />
          </>
        )}
      </button>
      {state === 'error' && (
        <p className="w-full text-center text-xs text-red-400 sm:col-span-2">{errorMsg}</p>
      )}
    </form>
  )
}
