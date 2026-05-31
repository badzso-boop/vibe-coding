import { useEffect, useState } from 'react'
import { LayoutGrid, LogIn, LogOut, Loader2, ExternalLink } from 'lucide-react'
import { storage, isAuthenticated } from '@/lib/storage'
import { api } from '@/lib/api'

type Status = 'loading' | 'unauthenticated' | 'authenticated'

const APP_URL = import.meta.env.VITE_APP_URL ?? 'http://localhost:3001'

function generateState(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function App() {
  const [status, setStatus] = useState<Status>('loading')
  const [userEmail, setUserEmail] = useState<string | null>(null)

  async function checkAuth() {
    const ok = await isAuthenticated()
    if (!ok) {
      setStatus('unauthenticated')
      setUserEmail(null)
      return
    }
    setStatus('authenticated')
    // Fetch user email in the background — non-blocking
    api
      .get<{ email: string }>('/users/me')
      .then((u) => setUserEmail(u.email))
      .catch(() => null)
  }

  useEffect(() => {
    checkAuth()

    // Re-check when storage changes (e.g. after sign-in completes)
    const unsub = storage.onChange((changes) => {
      if ('auth' in changes) {
        checkAuth()
      }
    })
    return unsub
  }, [])

  function handleSignIn() {
    const state = generateState()
    const extensionId = chrome.runtime.id
    const url = `${APP_URL}/auth/extension?state=${state}&extensionId=${extensionId}`
    chrome.tabs.create({ url })
    window.close()
  }

  async function handleSignOut() {
    await storage.clear()
    setStatus('unauthenticated')
    setUserEmail(null)
  }

  function handleOpenApp() {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/app/index.html') })
    window.close()
  }

  return (
    <div className="flex min-h-[480px] flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
            <div className="grid grid-cols-2 gap-0.5">
              <div className="h-2 w-2 rounded-[2px] bg-white" />
              <div className="h-2 w-2 rounded-[2px] bg-blue-300" />
              <div className="h-2 w-2 rounded-[2px] bg-blue-300" />
              <div className="h-2 w-2 rounded-[2px] bg-white" />
            </div>
          </div>
          <span className="text-sm font-semibold tracking-tight">FlowSpace</span>
        </div>

        {status === 'authenticated' && (
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {status === 'loading' && <Loader2 size={24} className="animate-spin text-slate-500" />}

        {status === 'unauthenticated' && (
          <div className="w-full text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/15">
              <LayoutGrid size={28} className="text-blue-400" />
            </div>
            <h2 className="mb-2 text-base font-semibold">Organize your browser</h2>
            <p className="mb-6 text-sm leading-relaxed text-slate-400">
              Sign in to manage workspaces, tile websites side-by-side, and stay in flow.
            </p>
            <button
              onClick={handleSignIn}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              <LogIn size={15} />
              Sign in to FlowSpace
            </button>
          </div>
        )}

        {status === 'authenticated' && (
          <div className="w-full">
            {/* User info */}
            <div className="mb-5 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold uppercase">
                  {userEmail?.[0] ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white">
                    {userEmail ?? 'Loading…'}
                  </p>
                  <p className="text-[11px] text-slate-500">Signed in</p>
                </div>
              </div>
            </div>

            {/* Open app */}
            <button
              onClick={handleOpenApp}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              <LayoutGrid size={15} />
              Open FlowSpace
            </button>

            <a
              href={`${APP_URL}/dashboard`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-xs text-slate-400 transition-colors hover:border-white/20 hover:text-white"
            >
              <ExternalLink size={12} />
              Account dashboard
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 px-4 py-2.5 text-center text-[11px] text-slate-600">
        v0.1.0
      </div>
    </div>
  )
}
