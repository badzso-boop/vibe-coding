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
}

export const storage = {
  async get<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K]> {
    const result = await chrome.storage.local.get(key)
    return result[key] as StorageSchema[K]
  },

  async set<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]): Promise<void> {
    await chrome.storage.local.set({ [key]: value })
  },

  async remove(key: keyof StorageSchema): Promise<void> {
    await chrome.storage.local.remove(key)
  },

  async clear(): Promise<void> {
    await chrome.storage.local.clear()
  },

  onChange(callback: (changes: Partial<StorageSchema>) => void): () => void {
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      const mapped: Partial<StorageSchema> = {}
      for (const key of Object.keys(changes) as Array<keyof StorageSchema>) {
        mapped[key] = changes[key].newValue
      }
      callback(mapped)
    }
    chrome.storage.local.onChanged.addListener(listener)
    return () => chrome.storage.local.onChanged.removeListener(listener)
  },
}

export async function getAuth(): Promise<AuthData | null> {
  const auth = await storage.get('auth')
  if (!auth) return null
  // Consider token expired 60s early to avoid edge cases
  if (Date.now() >= auth.expiresAt - 60_000) return null
  return auth
}

export async function isAuthenticated(): Promise<boolean> {
  const auth = await getAuth()
  return auth !== null
}
