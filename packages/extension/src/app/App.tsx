import { useEffect, useState, useCallback } from 'react'
import { Plus, Settings, Loader2, Globe, X, LayoutGrid } from 'lucide-react'
import { api } from '@/lib/api'
import { isAuthenticated, storage } from '@/lib/storage'
import type { Workspace, Tile } from '@/lib/types'
import type { LayoutNode } from '@flowspace/shared'

const APP_URL = import.meta.env.VITE_APP_URL ?? 'http://localhost:3001'

// ─── Layout renderer ─────────────────────────────────────────────────────────

interface TileViewProps {
  tile: Tile
  onClose: () => void
}

function TileView({ tile, onClose }: TileViewProps) {
  const [loading, setLoading] = useState(true)

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-900">
      {/* Tile header */}
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-white/5 bg-slate-800/50 px-2">
        {tile.faviconUrl ? (
          <img src={tile.faviconUrl} className="h-3.5 w-3.5 rounded-sm" alt="" />
        ) : (
          <Globe size={12} className="text-slate-500" />
        )}
        <span className="flex-1 truncate text-[11px] text-slate-400">
          {tile.title ?? tile.url}
        </span>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-slate-600 hover:bg-white/5 hover:text-slate-300"
        >
          <X size={11} />
        </button>
      </div>

      {/* Content */}
      {tile.openMode === 'iframe' ? (
        <>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
              <Loader2 size={20} className="animate-spin text-slate-600" />
            </div>
          )}
          <iframe
            src={tile.url}
            className="flex-1 border-none bg-white"
            onLoad={() => setLoading(false)}
            title={tile.title ?? tile.url}
          />
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-6">
          {tile.faviconUrl && (
            <img src={tile.faviconUrl} className="h-10 w-10 rounded-lg" alt="" />
          )}
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

interface SplitPaneProps {
  node: LayoutNode
  tiles: Tile[]
  onRemoveTile: (tileId: string) => void
}

function SplitPane({ node, tiles, onRemoveTile }: SplitPaneProps) {
  if (node.type === 'tile') {
    const tile = tiles.find((t) => t.id === node.tileId)
    if (!tile) return <div className="flex-1 bg-slate-900" />
    return (
      <div className="flex-1 overflow-hidden">
        <TileView tile={tile} onClose={() => onRemoveTile(tile.id)} />
      </div>
    )
  }

  const flexDir = node.direction === 'row' ? 'flex-row' : 'flex-col'
  const firstSize = `${node.ratio * 100}%`
  const secondSize = `${(1 - node.ratio) * 100}%`

  return (
    <div className={`flex ${flexDir} h-full w-full overflow-hidden`}>
      <div
        className="overflow-hidden"
        style={node.direction === 'row' ? { width: firstSize } : { height: firstSize }}
      >
        <SplitPane node={node.first} tiles={tiles} onRemoveTile={onRemoveTile} />
      </div>
      <div className={node.direction === 'row' ? 'w-px bg-white/5' : 'h-px bg-white/5'} />
      <div className="flex-1 overflow-hidden">
        <SplitPane node={node.second} tiles={tiles} onRemoveTile={onRemoveTile} />
      </div>
    </div>
  )
}

// ─── Add tile modal ───────────────────────────────────────────────────────────

interface AddTileModalProps {
  onAdd: (url: string) => void
  onClose: () => void
}

function AddTileModal({ onAdd, onClose }: AddTileModalProps) {
  const [url, setUrl] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
    onAdd(withProtocol)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <h2 className="mb-4 text-base font-semibold text-white">Add tile</h2>
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

// ─── Add workspace modal ──────────────────────────────────────────────────────

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

// ─── Main App ────────────────────────────────────────────────────────────────

function buildLayout(tiles: Tile[]): LayoutNode | null {
  if (tiles.length === 0) return null
  if (tiles.length === 1) return { type: 'tile', tileId: tiles[0].id }

  // Build a balanced binary tree
  const mid = Math.floor(tiles.length / 2)
  const left = buildLayout(tiles.slice(0, mid))
  const right = buildLayout(tiles.slice(mid))
  if (!left || !right) return left ?? right ?? null

  return {
    type: 'split',
    direction: tiles.length === 2 ? 'row' : 'column',
    ratio: 0.5,
    first: left,
    second: right,
  }
}

export function App() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [tiles, setTiles] = useState<Tile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddTile, setShowAddTile] = useState(false)
  const [showAddWorkspace, setShowAddWorkspace] = useState(false)
  const [addingTile, setAddingTile] = useState(false)

  const activeWorkspace = workspaces.find((w) => w.id === activeId) ?? null

  // Check auth on mount
  useEffect(() => {
    isAuthenticated().then(setAuthed)
  }, [])

  // Load workspaces when authed
  useEffect(() => {
    if (!authed) return
    loadWorkspaces()
  }, [authed])

  // Load tiles when workspace changes
  useEffect(() => {
    if (!activeId) return
    loadTiles(activeId)
  }, [activeId])

  // Keyboard shortcuts Ctrl+1..9
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

  async function loadWorkspaces() {
    setLoading(true)
    try {
      const data = await api.get<Workspace[]>('/workspaces')
      setWorkspaces(data)
      const saved = await storage.get('activeWorkspaceId')
      const first = data[0]?.id ?? null
      setActiveId((saved && data.find((w) => w.id === saved) ? saved : first))
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
    } catch (err) {
      console.error('Failed to load tiles:', err)
      setTiles([])
    }
  }

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

  async function handleAddTile(url: string) {
    if (!activeId) return
    setShowAddTile(false)
    setAddingTile(true)
    try {
      // Fetch metadata first
      let title: string | null = null
      let faviconUrl: string | null = null
      let openMode: 'iframe' | 'tab' = 'iframe'
      try {
        const meta = await api.get<{ title: string | null; faviconUrl: string | null; isIframeable: boolean }>(
          `/tiles/metadata?url=${encodeURIComponent(url)}`
        )
        title = meta.title
        faviconUrl = meta.faviconUrl
        openMode = meta.isIframeable ? 'iframe' : 'tab'
      } catch {
        // Metadata is optional — continue with defaults
      }

      const tile = await api.post<Tile>(`/workspaces/${activeId}/tiles`, {
        url,
        title,
        faviconUrl,
        openMode,
      })

      setTiles((prev) => {
        const next = [...prev, tile]
        // Save layout to backend
        const layout = buildLayout(next)
        void api.patch(`/workspaces/${activeId}/layout`, {
          layoutJson: layout,
          updatedAt: activeWorkspace?.updatedAt,
        }).catch(console.error)
        return next
      })
    } catch (err) {
      console.error('Failed to add tile:', err)
    } finally {
      setAddingTile(false)
    }
  }

  const handleRemoveTile = useCallback(async (tileId: string) => {
    if (!activeId) return
    try {
      await api.delete(`/workspaces/${activeId}/tiles/${tileId}`)
      setTiles((prev) => {
        const next = prev.filter((t) => t.id !== tileId)
        const layout = buildLayout(next)
        void api.patch(`/workspaces/${activeId}/layout`, {
          layoutJson: layout,
          updatedAt: activeWorkspace?.updatedAt,
        }).catch(console.error)
        return next
      })
    } catch (err) {
      console.error('Failed to remove tile:', err)
    }
  }, [activeId, activeWorkspace])

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

  // ── Loading ──
  if (authed === null || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 size={28} className="animate-spin text-blue-400" />
      </div>
    )
  }

  const layout = activeWorkspace?.layoutJson ?? buildLayout(tiles)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-white">
      {/* Workspace sidebar */}
      <aside className="flex w-14 flex-col items-center gap-2 border-r border-white/5 bg-slate-900 py-3">
        {workspaces.map((ws, idx) => (
          <button
            key={ws.id}
            onClick={() => switchWorkspace(ws.id)}
            title={`${ws.name}${ws.shortcutKey ? ` (Ctrl+${ws.shortcutKey})` : ''}`}
            className={`group relative flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all ${
              ws.id === activeId
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {ws.icon ?? ws.name[0].toUpperCase()}
            {ws.shortcutKey && (
              <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-950 text-[8px] text-slate-500 group-hover:flex">
                {ws.shortcutKey}
              </span>
            )}
          </button>
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
        {/* Header */}
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/5 bg-slate-900/50 px-4">
          <span className="text-sm font-medium text-slate-300">
            {activeWorkspace?.name ?? 'FlowSpace'}
          </span>
          <button
            onClick={() => setShowAddTile(true)}
            disabled={addingTile || !activeId}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {addingTile ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
            Add tile
          </button>
        </div>

        {/* Tiles */}
        <div className="flex-1 overflow-hidden">
          {tiles.length === 0 ? (
            workspaces.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/15">
                  <LayoutGrid size={28} className="text-blue-400" />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-300">Create your first workspace</p>
                  <p className="text-xs text-slate-500">Organize websites into workspaces and tile them side-by-side</p>
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
                  onClick={() => setShowAddTile(true)}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  <Plus size={14} />
                  Add first tile
                </button>
              </div>
            )
          ) : layout ? (
            <SplitPane node={layout} tiles={tiles} onRemoveTile={handleRemoveTile} />
          ) : null}
        </div>
      </main>

      {/* Modals */}
      {showAddTile && (
        <AddTileModal onAdd={handleAddTile} onClose={() => setShowAddTile(false)} />
      )}
      {showAddWorkspace && (
        <AddWorkspaceModal onAdd={handleAddWorkspace} onClose={() => setShowAddWorkspace(false)} />
      )}
    </div>
  )
}
