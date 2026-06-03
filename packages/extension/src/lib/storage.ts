import browser from './browser'
import type { PoppedTab, Favorite, TilePage } from './types'

export interface AuthData {
  accessToken: string
  refreshToken: string
  expiresAt: number
  userId: string
  deviceId: string
}

export interface StorageSchema {
  auth?: AuthData
  activeWorkspaceId?: string | null
  poppedTabs?: PoppedTab[]
  favorites?: Favorite[]
  tileExtraPages?: Record<string, TilePage[]>
}

export const storage = {
  async get<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K]> {
    const result = await browser.storage.local.get(key)
    return result[key] as StorageSchema[K]
  },

  async set<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]): Promise<void> {
    await browser.storage.local.set({ [key]: value })
  },

  async remove(key: keyof StorageSchema): Promise<void> {
    await browser.storage.local.remove(key)
  },

  async clear(): Promise<void> {
    await browser.storage.local.clear()
  },

  onChange(callback: (changes: Partial<StorageSchema>) => void): () => void {
    type ChangeMap = Record<string, { oldValue?: unknown; newValue?: unknown }>
    const listener = (changes: ChangeMap) => {
      const mapped: Partial<StorageSchema> = {}
      for (const key of Object.keys(changes) as Array<keyof StorageSchema>) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mapped[key] = changes[key].newValue as any
      }
      callback(mapped)
    }
    browser.storage.local.onChanged.addListener(listener)
    return () => browser.storage.local.onChanged.removeListener(listener)
  },
}

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

let refreshPromise: Promise<AuthData | null> | null = null

export async function attemptRefresh(auth: AuthData): Promise<AuthData | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/extension/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    })
    if (!res.ok) {
      await storage.clear()
      return null
    }
    const { data } = (await res.json()) as {
      data: { accessToken: string; refreshToken: string; expiresAt: number }
    }
    const updated: AuthData = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      userId: auth.userId,
      deviceId: auth.deviceId,
    }
    await storage.set('auth', updated)
    return updated
  } catch {
    return null
  }
}

export async function getAuth(): Promise<AuthData | null> {
  const auth = await storage.get('auth')
  if (!auth) return null
  if (Date.now() < auth.expiresAt - 60_000) return auth

  // Token expired or about to — refresh, deduplicating concurrent calls
  if (!refreshPromise) {
    refreshPromise = attemptRefresh(auth).finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export async function isAuthenticated(): Promise<boolean> {
  const auth = await getAuth()
  return auth !== null
}
