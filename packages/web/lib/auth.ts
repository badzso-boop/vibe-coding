import { type NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from './supabase'
import { Errors } from './response'

export interface AuthContext {
  user: { id: string; email: string }
  deviceId: string | null
}

type AuthSuccess = { ctx: AuthContext; error: null }
type AuthFailure = { ctx: null; error: NextResponse }
export type AuthResult = AuthSuccess | AuthFailure

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return { ctx: null, error: Errors.tokenInvalid() }
  }

  const token = authHeader.slice(7)
  const supabase = createServiceClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return { ctx: null, error: Errors.tokenInvalid() }
  }

  const deviceId = request.headers.get('X-Device-Id')

  if (deviceId) {
    const { data: device } = await supabase
      .from('devices')
      .select('id, is_revoked')
      .eq('id', deviceId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (device?.is_revoked === true) {
      return { ctx: null, error: Errors.deviceRevoked() }
    }

    if (device) {
      // Update last_seen_at without blocking the response
      void supabase
        .from('devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', deviceId)
    }
  }

  return {
    ctx: { user: { id: user.id, email: user.email! }, deviceId },
    error: null,
  }
}

// Convenience: unwrap auth or return the error response early
// Usage: const { user } = unwrapAuth(await requireAuth(request)); if (!user) return authError
export function isAuthError(result: AuthResult): result is AuthFailure {
  return result.error !== null
}
