import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Settings, Loader2, Globe, X, LayoutGrid, AlertCircle, Pencil } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { isAuthenticated, storage } from '@/lib/storage'
import type { Workspace, Tile } from '@/lib/types'
import type { LayoutNode } from '@flowspace/shared'

const APP_URL = import.meta.env.VITE_APP_URL ?? 'http://localhost:3001'

// ─── Layout tree helpers ──────────────────────────────────────────────────────

function splitTileInLayout(
  node: LayoutNode,
  targetId: string,
  direction: 'row' | 'column',
  newTileId: string,
): LayoutNode {
  if (node.type === 'tile') {
    if (node.tileId !== targetId) return node
    return {
      type: 'split',
      direction,
      ratio: 0.5,
      first: { type: 'tile', tileId: targetId },
      second: { type: 'tile', tileId: newTileId },
    }
  }
  return {
    ...node,
    first: splitTileInLayout(node.first, targetId, direction, newTileId),
    second: splitTileInLayout(node.second, targetId, direction, newTileId),
  }
}

function removeTileFromLayout(node: LayoutNode, targetId: string): LayoutNode | null {
  if (node.type === 'tile') return node.tileId === targetId ? null : node
  const first = removeTileFromLayout(node.first, targetId)
  const second = removeTileFromLayout(node.second, targetId)
  if (!first) return second
  if (!second) return first
  return { ...node, first, second }
}

function findAnyLeafId(node: LayoutNode): string {
  if (node.type === 'tile') return node.tileId
  return findAnyLeafId(node.second)
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function SplitRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="0.5" y="0.5" width="4" height="11" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="7.5" y="0.5" width="4" height="11" rx="1" fill="currentColor" />
    </svg>
  )
}

function SplitDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="0.5" y="0.5" width="11" height="4" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="0.5" y="7.5" width="11" height="4" rx="1" fill="currentColor" />
    </svg>
  )
}

// ─── Tile view ────────────────────────────────────────────────────────────────

interface TileViewProps {
  tile: Tile
  onClose: () => void
  onSplitRight: () => void
  onSplitDown: () => void
}

function TileView({ tile, onClose, onSplitRight, onSplitDown }: TileViewProps) {
  const [loading, setLoading] = useState(true)

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-900">
      <div className="group flex h-8 shrink-0 items-center gap-1.5 border-b border-white/5 bg-slate-800/50 px-2">
        {tile.faviconUrl ? (
          <img src={tile.faviconUrl} className="h-3.5 w-3.5 shrink-0 rounded-sm" alt="" />
        ) : (
          <Globe size={12} className="shrink-0 text-slate-500" />
        )}
        <span className="flex-1 truncate text-[11px] text-slate-400">{tile.title ?? tile.url}</span>

        {/* Split + close buttons — appear on header hover */}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onSplitRight}
            title="Split right"
            className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-slate-200"
          >
            <SplitRightIcon />
          </button>
          <button
            onClick={onSplitDown}
            title="Split down"
            className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-slate-200"
          >
            <SplitDownIcon />
          </button>
          <div className="mx-0.5 h-3 w-px bg-white/10" />
          <button
            onClick={onClose}
            className="rounded p-0.5 text-slate-500 hover:bg-white/10 hover:text-slate-300"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {tile.openMode === 'iframe' ? (
        <>
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900">
              <Loader2 size={20} className="animate-spin text-slate-600" />
            </div>
          )}
          <iframe
            src={tile.url}
            className="flex-1 border-none bg-white"
            onLoad={() => setLoading(false)}
            title={tile.title ?? tile.url}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-top-navigation-by-user-activation"
          />
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          {tile.faviconUrl && <img src={tile.faviconUrl} className="h-10 w-10 rounded-lg" alt="" />}
          <p className="text-sm font-medium text-slate-300">{tile.title ?? tile.url}</p>
          <p className="text-xs text-slate-500">This site opens in a tab</p>
          <a
            href={tile.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
          >
            Open tab
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Split pane ───────────────────────────────────────────────────────────────

interface SplitPaneProps {
  node: LayoutNode
  tiles: Tile[]
  onRemoveTile: (tileId: string) => void
  onLayoutChange: (node: LayoutNode) => void
  onSplitTile: (tileId: string, direction: 'row' | 'column') => void
}

function SplitPane({ node, tiles, onRemoveTile, onLayoutChange, onSplitTile }: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  if (node.type === 'tile') {
    const tile = tiles.find((t) => t.id === node.tileId)
    if (!tile) return <div className="flex-1 bg-slate-900" />
    return (
      <div className="flex h-full w-full overflow-hidden">
        <TileView
          tile={tile}
          onClose={() => onRemoveTile(tile.id)}
          onSplitRight={() => onSplitTile(tile.id, 'row')}
          onSplitDown={() => onSplitTile(tile.id, 'column')}
        />
      </div>
    )
  }

  const isRow = node.direction === 'row'

  function startDrag(e: React.MouseEvent) {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const el = container as HTMLDivElement
    const firstChild = el.children[0] as HTMLElement

    // Iframes steal mouse events when cursor enters them — disable during drag
    document.querySelectorAll('iframe').forEach((f) => {
      ;(f as HTMLElement).style.pointerEvents = 'none'
    })

    function onMouseMove(ev: MouseEvent) {
      const rect = el.getBoundingClientRect()
      let ratio = isRow
        ? (ev.clientX - rect.left) / rect.width
        : (ev.clientY - rect.top) / rect.height
      ratio = Math.max(0.1, Math.min(0.9, ratio))
      firstChild.style[isRow ? 'width' : 'height'] = `${ratio * 100}%`
    }

    function onMouseUp(ev: MouseEvent) {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mouseleave', onMouseUp)
      document.body.style.cursor = ''
      document.querySelectorAll('iframe').forEach((f) => {
        ;(f as HTMLElement).style.pointerEvents = ''
      })
      const rect = el.getBoundingClientRect()
      let ratio = isRow
        ? (ev.clientX - rect.left) / rect.width
        : (ev.clientY - rect.top) / rect.height
      ratio = Math.max(0.1, Math.min(0.9, ratio))
      onLayoutChange({ ...node, ratio } as LayoutNode)
    }

    document.body.style.cursor = isRow ? 'col-resize' : 'row-resize'
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mouseleave', onMouseUp, { once: true })
  }

  return (
    <div
      ref={containerRef}
      className={`flex ${isRow ? 'flex-row' : 'flex-col'} h-full w-full overflow-hidden`}
    >
      <div
        className="overflow-hidden"
        style={isRow ? { width: `${node.ratio * 100}%` } : { height: `${node.ratio * 100}%` }}
      >
        <SplitPane
          node={node.first}
          tiles={tiles}
          onRemoveTile={onRemoveTile}
          onLayoutChange={(n) => onLayoutChange({ ...node, first: n })}
          onSplitTile={onSplitTile}
        />
      </div>
      <div
        className={`group shrink-0 ${isRow ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'} relative bg-white/5 transition-colors hover:bg-blue-500/50`}
        onMouseDown={startDrag}
      >
        <div
          className={`absolute ${isRow ? 'inset-y-0 -left-1 -right-1' : 'inset-x-0 -top-1 -bottom-1'}`}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <SplitPane
          node={node.second}
          tiles={tiles}
          onRemoveTile={onRemoveTile}
          onLayoutChange={(n) => onLayoutChange({ ...node, second: n })}
          onSplitTile={onSplitTile}
        />
      </div>
    </div>
  )
}

// ─── Modals ───────────────────────────────────────────────────────────────────

interface AddTileModalProps {
  title?: string
  onAdd: (url: string) => void
  onClose: () => void
}

function AddTileModal({ title = 'Add tile', onAdd, onClose }: AddTileModalProps) {
  const [url, setUrl] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    onAdd(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <h2 className="mb-4 text-base font-semibold text-white">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface AddWorkspaceModalProps {
  onAdd: (name: string) => void
  onClose: () => void
}

function AddWorkspaceModal({ onAdd, onClose }: AddWorkspaceModalProps) {
  const [name, setName] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim()) onAdd(name.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <h2 className="mb-4 text-base font-semibold text-white">New workspace</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Work, Personal, Research"
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Edit workspace modal ─────────────────────────────────────────────────────

const WORKSPACE_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
]

interface EditWorkspaceModalProps {
  workspace: Workspace
  usedShortcuts: Set<number>
  onSave: (data: {
    name: string
    icon: string | null
    color: string | null
    shortcutKey: number | null
  }) => Promise<void>
  onClose: () => void
}

function EditWorkspaceModal({
  workspace,
  usedShortcuts,
  onSave,
  onClose,
}: EditWorkspaceModalProps) {
  const [name, setName] = useState(workspace.name)
  const [icon, setIcon] = useState(workspace.icon ?? '')
  const [color, setColor] = useState<string | null>(workspace.color)
  const [shortcutKey, setShortcutKey] = useState<number | null>(workspace.shortcutKey)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onSave({ name: name.trim(), icon: icon.trim() || null, color, shortcutKey })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <h2 className="mb-5 text-base font-semibold text-white">Edit workspace</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Icon <span className="text-slate-600">(emoji)</span>
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="🚀"
              maxLength={4}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
            />
          </div>

          {/* Color */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">Color</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setColor(null)}
                title="No color"
                className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 bg-slate-700 text-[10px] text-slate-500 transition-all ${!color ? 'border-white' : 'border-transparent hover:border-white/30'}`}
              >
                ∅
              </button>
              {WORKSPACE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-lg border-2 transition-all ${color === c ? 'scale-110 border-white' : 'border-transparent hover:border-white/40'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Shortcut key */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Shortcut <span className="text-slate-600">(Ctrl+…)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setShortcutKey(null)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${!shortcutKey ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
              >
                None
              </button>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                const taken = usedShortcuts.has(n)
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={taken}
                    onClick={() => setShortcutKey(shortcutKey === n ? null : n)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                      shortcutKey === n
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main app ─────────────────────────────────────────────────────────────────

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tiles, setTiles] = useState<Tile[]>([])
  const [layout, setLayout] = useState<LayoutNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddTile, setShowAddTile] = useState(false)
  const [showAddWorkspace, setShowAddWorkspace] = useState(false)
  const [addingTile, setAddingTile] = useState(false)
  // null = regular add, set = split a specific tile
  const [splitTarget, setSplitTarget] = useState<{
    tileId: string
    direction: 'row' | 'column'
  } | null>(null)
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([])
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null)

  const activeWorkspace = workspaces.find((w) => w.id === activeId) ?? null

  function showError(message: string) {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
  }

  async function loadWorkspaces() {
    setLoading(true)
    try {
      const data = await api.get<Workspace[]>('/workspaces')
      setWorkspaces(data)
      const saved = await storage.get('activeWorkspaceId')
      const first = data[0]?.id ?? null
      setActiveId(saved && data.find((w) => w.id === saved) ? saved : first)
    } catch (err) {
      console.error('Failed to load workspaces:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadTiles(workspaceId: string) {
    try {
      const data = await api.get<Tile[]>(`/workspaces/${workspaceId}/tiles`)
      setTiles(data)
      const ws = workspaces.find((w) => w.id === workspaceId)
      setLayout(ws?.layoutJson ?? (data.length > 0 ? { type: 'tile', tileId: data[0].id } : null))
    } catch (err) {
      console.error('Failed to load tiles:', err)
      setTiles([])
      setLayout(null)
    }
  }

  useEffect(() => {
    isAuthenticated().then(setAuthed)
  }, [])
  useEffect(() => {
    if (authed) loadWorkspaces()
  }, [authed])
  useEffect(() => {
    if (activeId) loadTiles(activeId)
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.ctrlKey) return
      const n = parseInt(e.key)
      if (n >= 1 && n <= 9) {
        const ws = workspaces.find((w) => w.shortcutKey === n) ?? workspaces[n - 1]
        if (ws) {
          setActiveId(ws.id)
          e.preventDefault()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [workspaces])

  function saveLayout(newLayout: LayoutNode | null, workspaceId: string) {
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === workspaceId ? { ...w, layoutJson: newLayout } : w)),
    )
    // No updatedAt sent — layout conflicts are non-critical, skip stale check
    api.patch(`/workspaces/${workspaceId}/layout`, { layoutJson: newLayout }).catch((err) => {
      console.error('Failed to save layout:', err)
      showError(err instanceof ApiError ? err.message : 'Failed to save layout.')
    })
  }

  function handleLayoutChange(newLayout: LayoutNode) {
    setLayout(newLayout)
    if (activeId) saveLayout(newLayout, activeId)
  }

  async function fetchTileMeta(url: string) {
    try {
      return await api.get<{ title: string | null; faviconUrl: string | null }>(
        `/tiles/metadata?url=${encodeURIComponent(url)}`,
      )
    } catch {
      return { title: null, faviconUrl: null }
    }
  }

  async function createTileRecord(workspaceId: string, url: string) {
    const { title, faviconUrl } = await fetchTileMeta(url)
    return api.post<Tile>(`/workspaces/${workspaceId}/tiles`, {
      url,
      title,
      faviconUrl,
      openMode: 'iframe',
    })
  }

  // Called when user clicks "Add tile" in the header (no split target)
  async function handleAddTile(url: string) {
    if (!activeId) return
    setShowAddTile(false)
    setAddingTile(true)
    try {
      const tile = await createTileRecord(activeId, url)
      const newTiles = [...tiles, tile]
      setTiles(newTiles)

      let newLayout: LayoutNode
      if (layout) {
        // Split any existing leaf to append new tile on the right
        const leafId = findAnyLeafId(layout)
        newLayout = splitTileInLayout(layout, leafId, 'row', tile.id)
      } else {
        newLayout = { type: 'tile', tileId: tile.id }
      }
      setLayout(newLayout)
      saveLayout(newLayout, activeId)
    } catch (err) {
      console.error('Failed to add tile:', err)
      showError(err instanceof ApiError ? err.message : 'Failed to add tile.')
    } finally {
      setAddingTile(false)
    }
  }

  // Called when user clicks split → or ↓ on a tile, then submits URL
  async function handleSplitTile(url: string) {
    if (!activeId || !splitTarget || !layout) return
    setShowAddTile(false)
    setAddingTile(true)
    const { tileId, direction } = splitTarget
    setSplitTarget(null)
    try {
      const tile = await createTileRecord(activeId, url)
      const newTiles = [...tiles, tile]
      const newLayout = splitTileInLayout(layout, tileId, direction, tile.id)
      setTiles(newTiles)
      setLayout(newLayout)
      saveLayout(newLayout, activeId)
    } catch (err) {
      console.error('Failed to split tile:', err)
      showError(err instanceof ApiError ? err.message : 'Failed to add tile.')
    } finally {
      setAddingTile(false)
    }
  }

  function openSplitModal(tileId: string, direction: 'row' | 'column') {
    setSplitTarget({ tileId, direction })
    setShowAddTile(true)
  }

  const handleRemoveTile = useCallback(
    async (tileId: string) => {
      if (!activeId) return
      try {
        await api.delete(`/workspaces/${activeId}/tiles/${tileId}`)
        const newTiles = tiles.filter((t) => t.id !== tileId)
        const newLayout = layout ? removeTileFromLayout(layout, tileId) : null
        setTiles(newTiles)
        setLayout(newLayout)
        if (activeId) saveLayout(newLayout, activeId)
      } catch (err) {
        console.error('Failed to remove tile:', err)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeId, activeWorkspace, tiles, layout],
  )

  async function handleAddWorkspace(name: string) {
    setShowAddWorkspace(false)
    try {
      const ws = await api.post<Workspace>('/workspaces', { name })
      setWorkspaces((prev) => [...prev, ws])
      setActiveId(ws.id)
    } catch (err) {
      console.error('Failed to create workspace:', err)
    }
  }

  async function handleDeleteWorkspace(wsId: string) {
    try {
      await api.delete(`/workspaces/${wsId}`)
      const remaining = workspaces.filter((w) => w.id !== wsId)
      setWorkspaces(remaining)
      if (activeId === wsId) {
        setActiveId(remaining[0]?.id ?? null)
        setTiles([])
        setLayout(null)
      }
    } catch (err) {
      console.error('Failed to delete workspace:', err)
      showError(err instanceof ApiError ? err.message : 'Failed to delete workspace.')
    }
  }

  async function handleEditWorkspace(data: {
    name: string
    icon: string | null
    color: string | null
    shortcutKey: number | null
  }) {
    if (!editingWorkspace) return
    const ws = workspaces.find((w) => w.id === editingWorkspace.id)
    if (!ws) return
    // Throws on error — caught by EditWorkspaceModal
    const updated = await api.patch<{ updatedAt: string }>(`/workspaces/${ws.id}`, {
      ...data,
      updatedAt: ws.updatedAt,
    })
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === ws.id ? { ...w, ...data, updatedAt: updated.updatedAt } : w)),
    )
    setEditingWorkspace(null)
  }

  async function switchWorkspace(id: string) {
    setActiveId(id)
    await storage.set('activeWorkspaceId', id)
  }

  // ── Not authed ──
  if (authed === false) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <LayoutGrid size={32} className="mx-auto mb-4 text-blue-400" />
          <p className="mb-2 text-base font-semibold">Not signed in</p>
          <p className="mb-4 text-sm text-slate-400">Open the FlowSpace popup to sign in.</p>
          <a
            href={`${APP_URL}/auth/login`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Sign in
          </a>
        </div>
      </div>
    )
  }

  if (authed === null || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 size={28} className="animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-white">
      {/* Workspace sidebar */}
      <aside className="flex w-14 flex-col items-center gap-2 border-r border-white/5 bg-slate-900 py-3">
        {workspaces.map((ws) => (
          <div key={ws.id} className="group/ws relative h-9 w-9">
            <button
              onClick={() => switchWorkspace(ws.id)}
              title={`${ws.name}${ws.shortcutKey ? ` (Ctrl+${ws.shortcutKey})` : ''}`}
              className={`relative flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                ws.id === activeId
                  ? 'text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
              style={ws.id === activeId ? { backgroundColor: ws.color ?? '#2563eb' } : undefined}
            >
              {ws.icon ?? ws.name[0].toUpperCase()}
              {ws.shortcutKey && (
                <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-950 text-[8px] text-slate-500 group-hover/ws:flex">
                  {ws.shortcutKey}
                </span>
              )}
            </button>
            {/* Edit button — top-left on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingWorkspace(ws)
              }}
              title={`Edit ${ws.name}`}
              className="absolute -left-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-slate-400 ring-1 ring-slate-950 hover:bg-blue-600 hover:text-white group-hover/ws:flex"
            >
              <Pencil size={7} />
            </button>
            {/* Delete button — top-right on hover */}
            <button
              onClick={() => handleDeleteWorkspace(ws.id)}
              title={`Delete ${ws.name}`}
              className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-slate-400 ring-1 ring-slate-950 hover:bg-red-600 hover:text-white group-hover/ws:flex"
            >
              <X size={8} />
            </button>
          </div>
        ))}

        <button
          onClick={() => setShowAddWorkspace(true)}
          title="New workspace"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-dashed border-white/10 text-slate-600 transition-colors hover:border-blue-500/40 hover:text-blue-400"
        >
          <Plus size={16} />
        </button>

        <div className="flex-1" />

        <a
          href={`${APP_URL}/dashboard`}
          target="_blank"
          rel="noreferrer"
          title="Account"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-800 hover:text-slate-300"
        >
          <Settings size={16} />
        </a>
      </aside>

      {/* Main area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/5 bg-slate-900/50 px-4">
          <span className="text-sm font-medium text-slate-300">
            {activeWorkspace?.name ?? 'FlowSpace'}
          </span>
          <button
            onClick={() => {
              setSplitTarget(null)
              setShowAddTile(true)
            }}
            disabled={addingTile || !activeId}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {addingTile ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            Add tile
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {tiles.length === 0 ? (
            workspaces.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/15">
                  <LayoutGrid size={28} className="text-blue-400" />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-300">
                    Create your first workspace
                  </p>
                  <p className="text-xs text-slate-500">
                    Organize websites into workspaces and tile them side-by-side
                  </p>
                </div>
                <button
                  onClick={() => setShowAddWorkspace(true)}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  <Plus size={14} />
                  Create workspace
                </button>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/15">
                  <LayoutGrid size={28} className="text-blue-400" />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-300">Empty workspace</p>
                  <p className="text-xs text-slate-500">Add your first tile to get started</p>
                </div>
                <button
                  onClick={() => {
                    setSplitTarget(null)
                    setShowAddTile(true)
                  }}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  <Plus size={14} />
                  Add first tile
                </button>
              </div>
            )
          ) : layout ? (
            <SplitPane
              node={layout}
              tiles={tiles}
              onRemoveTile={handleRemoveTile}
              onLayoutChange={handleLayoutChange}
              onSplitTile={openSplitModal}
            />
          ) : null}
        </div>
      </main>

      {/* Modals */}
      {showAddTile &&
        (splitTarget ? (
          <AddTileModal
            title={
              splitTarget.direction === 'row' ? 'Split right — add URL' : 'Split down — add URL'
            }
            onAdd={handleSplitTile}
            onClose={() => {
              setShowAddTile(false)
              setSplitTarget(null)
            }}
          />
        ) : (
          <AddTileModal onAdd={handleAddTile} onClose={() => setShowAddTile(false)} />
        ))}
      {showAddWorkspace && (
        <AddWorkspaceModal onAdd={handleAddWorkspace} onClose={() => setShowAddWorkspace(false)} />
      )}
      {editingWorkspace && (
        <EditWorkspaceModal
          workspace={editingWorkspace}
          usedShortcuts={
            new Set(
              workspaces
                .filter((w) => w.id !== editingWorkspace.id && w.shortcutKey != null)
                .map((w) => w.shortcutKey as number),
            )
          }
          onSave={handleEditWorkspace}
          onClose={() => setEditingWorkspace(null)}
        />
      )}

      {/* Error toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-slate-900/95 px-4 py-3 text-sm text-red-400 shadow-xl backdrop-blur"
            >
              <AlertCircle size={15} className="mt-px shrink-0" />
              <span>{t.message}</span>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="ml-1 shrink-0 text-red-600 hover:text-red-400"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
