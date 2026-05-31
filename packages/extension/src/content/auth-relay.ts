import browser from '@/lib/browser'

// Firefox auth relay: the web auth page posts FLOWSPACE_AUTH_RELAY to itself,
// this content script picks it up and forwards it to the background via
// browser.runtime.sendMessage (internal), then posts FLOWSPACE_AUTH_RELAY_DONE back.
// Chrome uses externally_connectable instead and never triggers this.

window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin) return
  if ((e.data as { type?: string } | null)?.type !== 'FLOWSPACE_AUTH_RELAY') return

  const { code, state } = e.data as { code: string; state: string }

  browser.runtime
    .sendMessage({ type: 'FLOWSPACE_AUTH_CODE', code, state })
    .then(() => {
      window.postMessage({ type: 'FLOWSPACE_AUTH_RELAY_DONE', ok: true }, window.location.origin)
    })
    .catch((err: unknown) => {
      window.postMessage(
        {
          type: 'FLOWSPACE_AUTH_RELAY_DONE',
          ok: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        },
        window.location.origin,
      )
    })
})
