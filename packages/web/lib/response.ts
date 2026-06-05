import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

function meta() {
  return { requestId: randomUUID() }
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data, meta: meta() }, { status })
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data, meta: meta() }, { status: 201 })
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    {
      error: { code, message, ...(details !== undefined ? { details } : {}) },
      meta: meta(),
    },
    { status },
  )
}

// Typed error factory — keeps error definitions consistent across all routes
export const Errors = {
  tokenInvalid: () => apiError(401, 'TOKEN_INVALID', 'Invalid or expired token'),
  deviceRevoked: () => apiError(401, 'DEVICE_REVOKED', 'This device has been revoked'),
  subscriptionExpired: () => apiError(403, 'SUBSCRIPTION_EXPIRED', 'Your subscription has expired'),
  tierLimitReached: (msg: string) => apiError(422, 'TIER_LIMIT_REACHED', msg),
  deviceLimitReached: () =>
    apiError(422, 'DEVICE_LIMIT_REACHED', 'Maximum device limit reached for your plan'),
  shortcutConflict: () =>
    apiError(409, 'SHORTCUT_CONFLICT', 'This shortcut key is already in use by another workspace'),
  staleData: (serverUpdatedAt: string) =>
    apiError(409, 'STALE_DATA', 'This resource was modified by another device. Please refresh.', {
      serverUpdatedAt,
    }),
  authCodeExpired: () =>
    apiError(401, 'AUTH_CODE_EXPIRED', 'The auth code has expired or was already used'),
  authStateMismatch: () =>
    apiError(401, 'AUTH_STATE_MISMATCH', 'The state parameter does not match'),
  workspaceNotFound: () => apiError(404, 'WORKSPACE_NOT_FOUND', 'Workspace not found'),
  tileNotFound: () => apiError(404, 'TILE_NOT_FOUND', 'Tile not found'),
  deviceNotFound: () => apiError(404, 'DEVICE_NOT_FOUND', 'Device not found'),
  templateNotFound: () => apiError(404, 'TEMPLATE_NOT_FOUND', 'Template not found'),
  badRequest: (msg: string) => apiError(400, 'BAD_REQUEST', msg),
  forbidden: () => apiError(403, 'FORBIDDEN', 'You do not have permission to perform this action'),
  wrongPassword: () => apiError(403, 'WRONG_PASSWORD', 'Incorrect password'),
  internalError: () => apiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred'),
} as const
