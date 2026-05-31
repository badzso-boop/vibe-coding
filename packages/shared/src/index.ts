// ─── Enums ────────────────────────────────────────────────────────────────────

export type Tier = 'free' | 'pro'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused'
export type OpenMode = 'iframe' | 'tab'
export type Browser = 'chrome' | 'firefox' | 'edge' | 'brave' | 'safari'
export type LayoutDirection = 'row' | 'column'

// ─── Layout ───────────────────────────────────────────────────────────────────

export type LayoutNode =
  | {
      type: 'split'
      direction: LayoutDirection
      ratio: number
      first: LayoutNode
      second: LayoutNode
    }
  | {
      type: 'tile'
      tileId: string
    }

// ─── Domain models ────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}

export interface Subscription {
  id: string
  userId: string
  tier: Tier
  status: SubscriptionStatus
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  trialEnd: string | null
  createdAt: string
  updatedAt: string
}

export interface Device {
  id: string
  userId: string
  name: string
  browser: Browser | null
  lastSeenAt: string
  createdAt: string
  isRevoked: boolean
}

export interface Workspace {
  id: string
  userId: string
  name: string
  icon: string | null
  color: string | null
  shortcutKey: number | null
  sortOrder: number
  layoutJson: LayoutNode | null
  createdAt: string
  updatedAt: string
}

export interface Tile {
  id: string
  workspaceId: string
  url: string
  title: string | null
  faviconUrl: string | null
  openMode: OpenMode
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

export interface WorkspaceTemplate {
  id: string
  name: string
  description: string | null
  icon: string | null
  isOfficial: boolean
  createdBy: string | null
  useCount: number
  layoutJson: LayoutNode
  tilesJson: Array<{
    id: string
    url: string
    title: string
    openMode: OpenMode
  }>
  createdAt: string
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface ApiMeta {
  requestId: string
}

export interface ApiSuccess<T> {
  data: T
  meta: ApiMeta
}

export interface ApiList<T> {
  data: T[]
  meta: ApiMeta & { total: number }
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta: ApiMeta
}

// ─── Tier limits ──────────────────────────────────────────────────────────────

export const TIER_LIMITS = {
  free: {
    workspaces: 1,
    tilesPerWorkspace: 4,
    devices: 1,
  },
  pro: {
    workspaces: Infinity,
    tilesPerWorkspace: Infinity,
    devices: 5,
  },
} as const satisfies Record<
  Tier,
  { workspaces: number; tilesPerWorkspace: number; devices: number }
>
