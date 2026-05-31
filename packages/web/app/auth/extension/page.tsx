'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { Logo } from '@/components/logo'

type Step = 'checking' | 'login' | 'authorizing' | 'success' | 'error'

// Extension IDs that are allowed to receive auth codes.
// Set NEXT_PUBLIC_EXTENSION_IDS as a comma-separated list in your environment.
const ALLOWED_EXTENSION_IDS = new Set(
  (process.env.NEXT_PUBLIC_EXTENSION_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)

function isAllowedExtensionId(id: string): boolean {
  // In development allow any non-empty ID so local testing works
  if (process.env.NODE_ENV === 'development') return id.length > 0
  return ALLOWED_EXTENSION_IDS.has(id)
}

function ExtensionAuthContent() {
  const searchParams = useSearchParams()
  const state = searchParams.get('state') ?? ''
  const extensionId = searchParams.get('extensionId') ?? ''

  const [step, setStep] = useState<Step>('checking')
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    if (!state || !extensionId) {
      setError('Invalid extension auth request. Please try again from the extension.')
      setStep('error')
      return
    }
    if (!isAllowedExtensionId(extensionId)) {
      setError('Unknown extension. Please reinstall FlowSpace and try again.')
      setStep('error')
      return
    }
    checkSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function checkSession() {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      await authorizeExtension()
    } else {
      setStep('login')
    }
  }

  async function authorizeExtension() {
    setStep('authorizing')
    const supabase = createClient()
    const { data: sessionData } = await supabase.auth.getSession()

    if (!sessionData.session) {
      setError('Session expired. Please try again.')
      setStep('error')
      return
    }

    const res = await fetch('/api/v1/auth/extension/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        state,
        extensionId,
        accessToken: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.message || 'Failed to authorize. Please try again.')
      setStep('error')
      return
    }

    const {
      data: { code },
    } = await res.json()

    // Send code to extension via chrome.runtime.sendMessage
    try {
      // @ts-expect-error chrome is a browser global in Chromium-based browsers
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        // @ts-expect-error
        chrome.runtime.sendMessage(
          extensionId,
          { type: 'FLOWSPACE_AUTH_CODE', code, state },
          (response: unknown) => {
            // @ts-expect-error
            const lastError = chrome.runtime.lastError
            if (lastError) {
              setError(
                `Extension not reachable: ${lastError.message ?? 'unknown error'}. Make sure the extension is installed and reload it.`,
              )
              setStep('error')
              return
            }
            const res = response as { ok?: boolean; error?: string } | null
            if (res?.ok === false) {
              setError(res.error ?? 'Authorization failed. Please try again.')
              setStep('error')
              return
            }
            setStep('success')
            setTimeout(() => window.close(), 2000)
          },
        )
      } else {
        // Firefox: relay via content script postMessage (auth-relay.ts)
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            window.removeEventListener('message', onRelayDone)
            reject(
              new Error(
                'Extension relay timed out. Make sure FlowSpace is installed and reload it.',
              ),
            )
          }, 6000)

          function onRelayDone(e: MessageEvent) {
            if (e.origin !== window.location.origin) return
            if ((e.data as { type?: string } | null)?.type !== 'FLOWSPACE_AUTH_RELAY_DONE') return
            clearTimeout(timer)
            window.removeEventListener('message', onRelayDone)
            const d = e.data as { ok: boolean; error?: string }
            if (d.ok) resolve()
            else reject(new Error(d.error ?? 'Auth relay failed'))
          }

          window.addEventListener('message', onRelayDone)
          window.postMessage({ type: 'FLOWSPACE_AUTH_RELAY', code, state }, window.location.origin)
        })
        setStep('success')
        setTimeout(() => window.close(), 2000)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not communicate with the extension. Please try again.',
      )
      setStep('error')
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError(null)
    setLoginLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setLoginError(error.message)
      setLoginLoading(false)
      return
    }

    await authorizeExtension()
  }

  async function handleGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/extension?state=${state}&extensionId=${extensionId}`,
      },
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Logo className="mb-4" />
          <h1 className="text-xl font-semibold text-white">Connect to extension</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to link FlowSpace to your browser</p>
        </div>

        {step === 'checking' && (
          <div className="flex justify-center">
            <Loader2 size={28} className="animate-spin text-blue-400" />
          </div>
        )}

        {step === 'login' && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <button
              onClick={handleGoogle}
              className="mb-5 flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-950/50 px-3 text-xs text-slate-500">or</span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
              />

              {loginError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {loginLoading && <Loader2 size={14} className="animate-spin" />}
                Sign in & connect
              </button>
            </form>
          </div>
        )}

        {step === 'authorizing' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-blue-400" />
            <p className="text-sm text-slate-400">Connecting to extension…</p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle size={40} className="text-green-400" />
            <p className="text-base font-medium text-white">Connected!</p>
            <p className="text-sm text-slate-400">This window will close automatically.</p>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <XCircle size={40} className="text-red-400" />
            <p className="text-base font-medium text-white">Something went wrong</p>
            <p className="text-sm text-center text-slate-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ExtensionAuthPage() {
  return (
    <Suspense>
      <ExtensionAuthContent />
    </Suspense>
  )
}
