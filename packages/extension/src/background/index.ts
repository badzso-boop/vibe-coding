import browser from '@/lib/browser'
import { storage } from '@/lib/storage'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

browser.runtime.onInstalled.addListener(() => {
  console.log('[FlowSpace] Extension installed')
})

// Handle messages from content scripts (OPEN_FLOWSPACE_APP + Firefox auth relay)
browser.runtime.onMessage.addListener(async (message: unknown) => {
  const msg = message as Record<string, unknown> | null

  if (msg?.type === 'OPEN_FLOWSPACE_APP') {
    const appUrl = browser.runtime.getURL('src/app/index.html')
    const tabs = await browser.tabs.query({})
    const existing = tabs.find((t) => t.url?.startsWith(appUrl))
    if (existing?.id != null) {
      await browser.tabs.update(existing.id, { active: true })
      if (existing.windowId != null) {
        await browser.windows.update(existing.windowId, { focused: true })
      }
    } else {
      await browser.tabs.create({ url: appUrl })
    }
    return { ok: true }
  }

  // Firefox auth relay: content script forwards the one-time code from the web page
  if (msg?.type === 'FLOWSPACE_AUTH_CODE') {
    const code = msg.code as string
    const state = msg.state as string
    try {
      await exchangeCode(code, state)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }
})

// Chrome-only: web page sends auth code directly via externally_connectable
if (browser.runtime.onMessageExternal) {
  browser.runtime.onMessageExternal.addListener(async (message: unknown) => {
    const msg = message as Record<string, unknown> | null
    if (msg?.type !== 'FLOWSPACE_AUTH_CODE') return
    const code = msg.code as string
    const state = msg.state as string
    try {
      await exchangeCode(code, state)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })
}

function parseJwtExpiry(jwt: string): number {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1])) as { exp: number }
    return payload.exp * 1000
  } catch {
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
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `Exchange failed: ${res.status}`)
  }

  const { data } = (await res.json()) as {
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
