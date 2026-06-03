import { getAuth, attemptRefresh, storage } from './storage'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const auth = await getAuth()
  const deviceId = auth?.deviceId

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }

  if (auth) headers['Authorization'] = `Bearer ${auth.accessToken}`
  if (deviceId) headers['X-Device-Id'] = deviceId

  const res = await fetch(`${BASE_URL}/api/v1${path}`, { ...init, headers })

  // On 401, try once to refresh the token and retry the original request
  if (res.status === 401 && retry) {
    const stored = await storage.get('auth')
    if (stored) {
      const fresh = await attemptRefresh(stored)
      if (fresh) return request<T>(path, init, false)
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ code: 'UNKNOWN', message: res.statusText }))
    throw new ApiError(res.status, body.code ?? 'UNKNOWN', body.message ?? res.statusText)
  }

  if (res.status === 204) return undefined as T
  const json = await res.json()
  return (json.data ?? json) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
