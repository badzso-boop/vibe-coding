import browser from './browser'
import type { PoppedTab, Favorite } from './types'

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

export async function getAuth(): Promise<AuthData | null> {
  const auth = await storage.get('auth')
  if (!auth) return null
  if (Date.now() >= auth.expiresAt - 60_000) return null
  return auth
}

export async function isAuthenticated(): Promise<boolean> {
  const auth = await getAuth()
  return auth !== null
}
