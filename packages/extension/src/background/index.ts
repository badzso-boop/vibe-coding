import { storage } from '@/lib/storage'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

chrome.runtime.onInstalled.addListener(() => {
  console.log('[FlowSpace] Extension installed')
})

// Content script asks us to open/focus the FlowSpace app tab
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'OPEN_FLOWSPACE_APP') return

  const appUrl = chrome.runtime.getURL('src/app/index.html')

  chrome.tabs.query({}, (tabs) => {
    const existing = tabs.find((t) => t.url?.startsWith(appUrl))
    if (existing?.id != null) {
      chrome.tabs.update(existing.id, { active: true })
      if (existing.windowId != null) {
        chrome.windows.update(existing.windowId, { focused: true })
      }
    } else {
      chrome.tabs.create({ url: appUrl })
    }
    sendResponse({ ok: true })
  })

  return true // keep channel open for async response
})

// Web app sends the one-time auth code here after the user logs in
chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'FLOWSPACE_AUTH_CODE') return

  const { code, state } = message as { type: string; code: string; state: string }
  if (!code || !state) {
    sendResponse({ ok: false, error: 'Missing code or state' })
    return
  }

  // Must return true to keep the channel open for the async response
  exchangeCode(code, state)
    .then(() => sendResponse({ ok: true }))
    .catch((err) => sendResponse({ ok: false, error: String(err) }))

  return true
})

function parseJwtExpiry(jwt: string): number {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    return (payload.exp as number) * 1000
  } catch {
    // Fallback: 1 hour from now
    return Date.now() + 3_600_000
  }
}

async function exchangeCode(code: string, state: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/auth/extension/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? `Exchange failed: ${res.status}`)
  }

  const { data } = await res.json() as {
    data: {
      accessToken: string
      refreshToken: string
      deviceId: string
      user: { id: string }
    }
  }

  await storage.set('auth', {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: parseJwtExpiry(data.accessToken),
    userId: data.user.id,
    deviceId: data.deviceId,
  })
}
