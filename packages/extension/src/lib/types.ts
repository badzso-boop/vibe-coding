import type { LayoutNode } from '@flowspace/shared'

export interface Workspace {
  id: string
  name: string
  icon: string | null
  color: string | null
  shortcutKey: number | null
  sortOrder: number
  layoutJson: LayoutNode | null
  tileCount: number
  updatedAt: string
}

export interface Tile {
  id: string
  workspaceId: string
  url: string
  title: string | null
  faviconUrl: string | null
  openMode: 'iframe' | 'tab'
  isPinned: boolean
  updatedAt: string
}
