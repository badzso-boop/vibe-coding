# FlowSpace

A browser extension that turns your browser into a tiling workspace manager. Organize multiple websites side-by-side in resizable panels — like a window manager, but inside your browser. Switch between workspaces instantly with keyboard shortcuts.

![FlowSpace](https://via.placeholder.com/1200x600/0f172a/3b82f6?text=FlowSpace)

---

## Table of Contents

- [What is FlowSpace](#what-is-flowspace)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
  - [1. Clone & install dependencies](#1-clone--install-dependencies)
  - [2. Environment variables](#2-environment-variables)
  - [3. Supabase setup](#3-supabase-setup)
  - [4. Run locally](#4-run-locally)
  - [5. Build & load the extension](#5-build--load-the-extension)
- [Admin Panel](#admin-panel)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Architecture](#architecture)
- [Subscription Tiers](#subscription-tiers)
- [Security](#security)
- [Testing](#testing)
- [Roadmap](#roadmap)

---

## What is FlowSpace

FlowSpace solves a common problem: people lose productivity switching between dozens of browser tabs — email, project management, documentation, dashboards, social media. FlowSpace lets you group related websites into **workspaces** and view them simultaneously in a tiled layout, all within a single browser tab.

```
┌────────────────┬────────────────┬───────────────────┐
│                │                │                   │
│    GitHub      │     Jira       │   Google Docs     │
│    (iframe)    │    (iframe)    │    (iframe)       │
│                │                │                   │
├────────────────┴────────────────┤                   │
│                                 │                   │
│          Linear                 │                   │
│          (iframe)               │                   │
│                                 │                   │
└─────────────────────────────────┴───────────────────┘
```

Each tile loads the target website inside the extension view. The extension strips `X-Frame-Options` and `Content-Security-Policy` headers for its own sub-frames using `declarativeNetRequest`, making it possible to embed sites that would normally block iframes.

---

## Features

### Implemented (MVP)

- **Tiling layout** — Binary tree split system (like VS Code panels). Each tile can be split right or down individually.
- **Drag-to-resize** — Drag dividers between tiles to resize them. Works correctly even when tiles contain iframes.
- **Workspaces** — Multiple named workspaces, each with its own layout, icon, color, and optional keyboard shortcut.
- **Workspace settings** — Edit name, emoji icon, color, and `Ctrl+1–9` shortcut per workspace.
- **Keyboard shortcuts** — `Ctrl+1–9` switches between workspaces. `Ctrl+Shift+D` brings you back to FlowSpace from any tab.
- **Frame-buster protection** — `sandbox` attribute on iframes blocks JavaScript frame-busting scripts (e.g. Stack Overflow) while keeping the page fully functional.
- **Content script widget** — Floating button injected into every tab for quick navigation back to FlowSpace.
- **Extension auth flow** — Secure one-time code exchange using AES-256-GCM encrypted tokens. No passwords stored in the extension.
- **Auth** — Email + password, Google OAuth, email verification, password reset (all via Supabase Auth).
- **Dashboard** — Usage overview, device management, subscription info.
- **Device management** — View all connected devices, revoke access to individual devices.
- **Admin panel** — User management, subscription overview, device revocation for support purposes.
- **Free tier enforcement** — 1 workspace, 4 tiles per workspace, 1 device.
- **Cross-browser** — Chrome, Edge, Brave (native). Firefox 128+ (via `webextension-polyfill`).
- **Toast notifications** — Error feedback for failed API calls.

### Not yet implemented

- **Stripe payments** — Pro tier upgrade (endpoint returns 503, wired up but not active).
- **Workspace templates** — API exists, not wired into the extension UI.
- **Workspace reorder** — API exists (`POST /workspaces/reorder`), not in extension UI.
- **Tile settings** — Edit URL, title, open mode (`iframe` vs `tab`) after creation.
- **Offline mode** — Currently requires active internet connection.
- **Chrome Web Store** — Not published yet.
- **Firefox Add-ons** — Not published yet.
- **Vercel / production deploy** — Not deployed yet.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Extension UI | React 19 + Vite 5 + Tailwind v4 | Manifest V3, `vite-plugin-web-extension` |
| Web app | Next.js 15 App Router + Tailwind v4 | SSR, API routes, dashboard |
| Database | Supabase (PostgreSQL) | Row Level Security, real-time, Auth |
| Auth | Supabase Auth | Email/password, Google OAuth, JWT |
| Email | Resend | Transactional emails via Supabase |
| Payments | Stripe | Stubbed — not yet active |
| Monorepo | pnpm workspaces + Turborepo | |
| Cross-browser | `webextension-polyfill` 0.12 | Chrome + Firefox unified API |
| Type safety | TypeScript 5.5 strict mode | All packages |
| Shared types | `@flowspace/shared` (internal package) | `LayoutNode`, tier limits |

---

## Project Structure

```
vibe coding/                          ← monorepo root
├── packages/
│   ├── extension/                    ← Browser extension (Chrome + Firefox)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── App.tsx           ← Main extension UI (workspace + tile management)
│   │   │   │   └── index.html        ← Extension app entry point
│   │   │   ├── background/
│   │   │   │   └── index.ts          ← Service worker (auth exchange, tab management)
│   │   │   ├── content/
│   │   │   │   ├── index.ts          ← Content script (floating widget, Ctrl+Shift+D)
│   │   │   │   └── auth-relay.ts     ← Firefox auth relay (postMessage bridge)
│   │   │   ├── popup/
│   │   │   │   └── App.tsx           ← Extension popup (Sign In / Open FlowSpace)
│   │   │   └── lib/
│   │   │       ├── api.ts            ← Typed API client with auth header injection
│   │   │       ├── browser.ts        ← webextension-polyfill wrapper
│   │   │       ├── storage.ts        ← browser.storage.local typed wrapper
│   │   │       └── types.ts          ← Workspace, Tile TypeScript interfaces
│   │   ├── public/
│   │   │   └── rules/
│   │   │       └── iframe.json       ← declarativeNetRequest rules (strips iframe-blocking headers)
│   │   ├── manifest.json             ← MV3 manifest (Chrome + Firefox)
│   │   └── vite.config.ts
│   │
│   ├── web/                          ← Next.js web app (landing + dashboard + API)
│   │   ├── app/
│   │   │   ├── page.tsx              ← Landing page
│   │   │   ├── auth/
│   │   │   │   ├── login/            ← Email + Google login
│   │   │   │   ├── register/         ← Registration
│   │   │   │   ├── reset-password/   ← Password reset request
│   │   │   │   ├── update-password/  ← Set new password
│   │   │   │   ├── extension/        ← Extension OAuth callback page
│   │   │   │   └── callback/         ← Supabase OAuth redirect handler
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx          ← Overview: plan, usage stats
│   │   │   │   ├── devices/          ← Connected devices list + revoke
│   │   │   │   └── billing/          ← Subscription management (Stripe)
│   │   │   ├── admin/
│   │   │   │   ├── layout.tsx        ← Admin layout (requires is_admin = true)
│   │   │   │   └── users/
│   │   │   │       ├── page.tsx      ← User list + stats overview
│   │   │   │       └── [userId]/
│   │   │   │           └── page.tsx  ← User detail: sub, devices, workspaces
│   │   │   └── api/v1/
│   │   │       ├── auth/extension/
│   │   │       │   ├── code/         ← POST: generate one-time auth code
│   │   │       │   ├── exchange/     ← POST: exchange code for tokens
│   │   │       │   └── logout/       ← POST: revoke device + invalidate session
│   │   │       ├── users/me/         ← GET/PATCH: user profile
│   │   │       ├── devices/          ← GET: list devices
│   │   │       ├── devices/[id]/     ← PATCH/DELETE: rename / revoke device
│   │   │       ├── workspaces/       ← GET/POST: list + create workspaces
│   │   │       ├── workspaces/[id]/  ← GET/PATCH/DELETE: workspace CRUD
│   │   │       ├── workspaces/[id]/layout/    ← PATCH: save tile layout
│   │   │       ├── workspaces/[id]/tiles/     ← GET/POST: list + add tiles
│   │   │       ├── workspaces/[id]/tiles/[id] ← PATCH/DELETE: edit / remove tile
│   │   │       ├── workspaces/[id]/duplicate/ ← POST: clone workspace
│   │   │       ├── workspaces/reorder/        ← POST: reorder workspaces
│   │   │       ├── workspaces/from-template/[id] ← POST: create from template
│   │   │       ├── tiles/metadata/   ← GET: fetch title + favicon for a URL
│   │   │       ├── subscriptions/me/ ← GET: current subscription
│   │   │       ├── subscriptions/checkout/ ← POST: Stripe checkout (stubbed)
│   │   │       ├── templates/        ← GET: workspace templates
│   │   │       └── health/           ← GET: health check
│   │   ├── lib/
│   │   │   ├── auth.ts               ← requireAuth() — JWT validation middleware
│   │   │   ├── admin.ts              ← requireAdmin() — admin check middleware
│   │   │   ├── supabase.ts           ← Service role client (server-side only)
│   │   │   ├── response.ts           ← ok(), created(), Errors.* response helpers
│   │   │   ├── tier.ts               ← checkWorkspaceLimit(), checkDeviceLimit(), etc.
│   │   │   └── crypto.ts             ← AES-256-GCM encrypt/decrypt for auth codes
│   │   ├── tests/
│   │   │   ├── setup.ts              ← Global test env vars (encryption key, Supabase URLs)
│   │   │   ├── helpers/
│   │   │   │   └── supabase-mock.ts  ← Chainable Supabase mock factory
│   │   │   ├── lib/
│   │   │   │   ├── crypto.test.ts    ← encrypt/decrypt unit tests
│   │   │   │   ├── response.test.ts  ← Response helpers + Errors.* factory tests
│   │   │   │   ├── auth.test.ts      ← requireAuth() middleware tests
│   │   │   │   └── tier.test.ts      ← Tier limit check tests
│   │   │   └── api/
│   │   │       ├── workspaces.test.ts     ← Workspace CRUD route tests
│   │   │       ├── auth-exchange.test.ts  ← Extension auth exchange route tests
│   │   │       └── devices.test.ts        ← Device list + logout route tests
│   │   └── vitest.config.ts          ← Vitest config (path aliases, coverage)
│   │
│   └── shared/                       ← Shared TypeScript types + constants
│       └── src/
│           └── index.ts              ← LayoutNode type, TIER_LIMITS constants
│
├── supabase/
│   ├── schema.sql                    ← Full database schema (run once in Supabase SQL Editor)
│   └── migrations/
│       └── 001_add_is_admin.sql      ← Add is_admin column + set yourself as admin
│
├── project-overview.md               ← Product concept, UX principles, browser support
├── data-model.md                     ← Database tables, relationships, layout_json spec
├── api-design.md                     ← Full API design with request/response examples
├── pnpm-workspace.yaml
├── turbo.json
└── README.md                         ← This file
```

---

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (`npm install -g pnpm`)
- **Supabase account** — [supabase.com](https://supabase.com) (free tier is enough)
- **Chrome, Edge, or Brave** for testing (Firefox 128+ also supported)

---

## Installation & Setup

### 1. Clone & install dependencies

```bash
git clone <your-repo-url> flowspace
cd flowspace
pnpm install
```

### 2. Environment variables

Create `packages/web/.env.local`:

```env
# Supabase — get these from your Supabase project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...      # anon/public key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...                  # service_role key — NEVER expose this

# Extension IDs allowed to receive auth codes
# In development, any non-empty ID is accepted automatically
# In production: comma-separated list of your published extension IDs
NEXT_PUBLIC_EXTENSION_IDS=your-chrome-extension-id,your-firefox-extension-id

# AES-256-GCM key for encrypting extension auth codes — generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your-64-char-hex-key

# App URL (used for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Stripe (leave blank until you implement payments)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Create `packages/extension/.env.local`:

```env
VITE_API_URL=http://localhost:3001
VITE_APP_URL=http://localhost:3001
```

> **Security:** `.env.local` is in `.gitignore`. Never commit it. The `SUPABASE_SERVICE_ROLE_KEY` must only ever be on the server — it bypasses all Row Level Security.

### 3. Supabase setup

#### 3a. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Note your **Project URL** and **API keys** (Settings → API)

#### 3b. Run the database schema

1. Open your Supabase project → **SQL Editor**
2. Copy the contents of `supabase/schema.sql`
3. Run it — this creates all tables, indexes, and triggers

#### 3c. Run the admin migration

```sql
-- Add is_admin column
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Grant yourself admin access
UPDATE public.users SET is_admin = TRUE WHERE email = 'your@email.com';
```

#### 3d. Configure Supabase Auth

In your Supabase project → **Authentication → Providers**:
- Enable **Email** (with email confirmation)
- Enable **Google** OAuth (add your OAuth app credentials from Google Cloud Console)

In **Authentication → Email Templates**, customize the confirmation and reset emails if needed.

In **Authentication → URL Configuration**:
- Site URL: `http://localhost:3001`
- Redirect URLs: `http://localhost:3001/auth/callback`

#### 3e. Configure Resend (optional but recommended)

By default Supabase sends emails via its own SMTP. For production, integrate [Resend](https://resend.com):
1. Create a Resend account → get API key
2. Supabase → Settings → Auth → SMTP Settings → add Resend credentials

### 4. Run locally

```bash
# From the monorepo root — starts both the web app and watches for changes
pnpm dev
```

This runs:
- `packages/web` on **http://localhost:3001** (Next.js dev server)

The web app includes the backend API (`/api/v1/...`) — no separate server needed.

> **Note (WSL users):** If you're on WSL with the project on a Windows drive (`/mnt/g/...`), browser auto-launch won't work. Open `http://localhost:3001` manually.

### 5. Build & load the extension

The extension is built separately (no watch mode — `vite build` only):

```bash
cd packages/extension
pnpm build
# or from root:
pnpm --filter extension build
```

Build output goes to `packages/extension/dist/`.

#### Load in Chrome / Edge / Brave

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `packages/extension/dist/` folder
5. Note the **Extension ID** shown on the card — add it to `NEXT_PUBLIC_EXTENSION_IDS` in `.env.local`

#### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `packages/extension/dist/manifest.json`

> Firefox extensions loaded this way are temporary — they disappear on restart. For persistent testing, use `about:addons` and install a signed `.xpi`.

#### After loading

1. Click the FlowSpace icon in the toolbar
2. Click **Sign in** — this opens `http://localhost:3001/auth/extension`
3. Log in with your account
4. The extension receives the auth token automatically and closes the tab
5. Click **Open FlowSpace** in the popup to launch the full UI

---

## Admin Panel

The admin panel is available at `/admin/users` and is only accessible to users with `is_admin = TRUE` in the database.

**Access:** After running the migration and setting yourself as admin, navigate to `http://localhost:3001/dashboard` — you'll see an **Admin Panel** link at the bottom of the sidebar.

### Admin features

| Page | URL | What it shows |
|---|---|---|
| User list | `/admin/users` | All users with plan badge, workspace count, device count, join date |
| Stats bar | `/admin/users` (top) | Total users, Pro users, total workspaces, active devices |
| User detail | `/admin/users/:id` | Full info: subscription (with Stripe IDs), all devices, all workspaces |
| Device revoke | `/admin/users/:id` | Revoke any user's device directly from the UI |

**Security:** The admin layout checks `is_admin` twice — once from the session cookie and once from the database via the service role client. Non-admin users are redirected to `/dashboard`.

---

## API Reference

### Base URL

```
http://localhost:3001/api/v1      (development)
https://your-domain.com/api/v1   (production)
```

### Authentication

All endpoints (except `/auth/extension/exchange` and `/health`) require:

```
Authorization: Bearer <supabase_access_token>
X-Device-Id: <device_uuid>        (optional, sent by extension for device tracking)
```

### Response format

**Success:**
```json
{ "data": { ... }, "meta": { "requestId": "uuid" } }
```

**Error:**
```json
{ "error": { "code": "ERROR_CODE", "message": "Human readable message" }, "meta": { "requestId": "uuid" } }
```

### Error codes

| Code | HTTP | Description |
|---|---|---|
| `TOKEN_INVALID` | 401 | Invalid or expired Supabase token |
| `DEVICE_REVOKED` | 401 | Device was revoked via the dashboard |
| `TIER_LIMIT_REACHED` | 422 | Free tier limit hit (workspaces, tiles) |
| `DEVICE_LIMIT_REACHED` | 422 | Max device count reached for your plan |
| `SHORTCUT_CONFLICT` | 409 | That keyboard shortcut is already used by another workspace |
| `STALE_DATA` | 409 | Optimistic lock conflict — another device modified the resource |
| `AUTH_CODE_EXPIRED` | 401 | Extension auth code expired or already used |
| `AUTH_STATE_MISMATCH` | 401 | CSRF protection: state parameter mismatch |
| `WORKSPACE_NOT_FOUND` | 404 | |
| `TILE_NOT_FOUND` | 404 | |
| `DEVICE_NOT_FOUND` | 404 | |
| `BAD_REQUEST` | 400 | Request body validation failed |
| `FORBIDDEN` | 403 | You don't have permission |
| `INTERNAL_ERROR` | 500 | Server error |

---

### Auth endpoints

#### `POST /auth/extension/code`
Called by the web app after the user logs in. Creates a 2-minute one-time auth code.

```json
// Request
{ "state": "random-state-string", "extensionId": "chrome-extension-id" }

// Response 200
{ "data": { "code": "hex-64-chars", "expiresAt": "2026-05-30T10:02:00Z" } }
```

#### `POST /auth/extension/exchange`
Called by the extension. Exchanges the one-time code for Supabase tokens. No auth header needed.

```json
// Request
{
  "code": "hex-64-chars",
  "state": "random-state-string",
  "deviceName": "Chrome Extension",
  "browser": "chrome"
}

// Response 201
{
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "...",
    "deviceId": "uuid",
    "user": { "id": "uuid", "email": "user@example.com", "name": null, "avatarUrl": null }
  }
}
```

**Free tier behavior:** If the device limit (1) is reached, the endpoint automatically revokes the oldest existing device, allowing re-authentication after reinstalling the extension. Pro tier returns `422 DEVICE_LIMIT_REACHED` when all 5 device slots are full.

#### `POST /auth/extension/logout`
Revokes the current device and invalidates the Supabase session. Returns `204`.

---

### User endpoints

#### `GET /users/me`
Returns the current user's profile and subscription.

#### `PATCH /users/me`
Update `name` or `avatarUrl`.

---

### Workspace endpoints

#### `GET /workspaces`
List all workspaces ordered by `sort_order`.

#### `POST /workspaces`
Create a new workspace.
```json
{ "name": "Work", "icon": "💼", "color": "#6366f1", "shortcutKey": 1 }
```
Free tier: max 1 workspace → `422 TIER_LIMIT_REACHED` if exceeded.

#### `GET /workspaces/:workspaceId`
Get workspace with tiles array.

#### `PATCH /workspaces/:workspaceId`
Update name, icon, color, or shortcut key. Requires `updatedAt` for optimistic locking.
```json
{ "updatedAt": "2026-05-30T10:00:00Z", "name": "Dev", "icon": "🖥️", "color": "#8b5cf6", "shortcutKey": 2 }
```

#### `PATCH /workspaces/:workspaceId/layout`
Save the binary tree tile layout after drag-to-resize or tile add/remove.
```json
{ "layoutJson": { "type": "split", "direction": "row", "ratio": 0.6, "first": {...}, "second": {...} } }
```

#### `POST /workspaces/:workspaceId/duplicate`
Clone a workspace including all tiles and the layout.

#### `POST /workspaces/reorder`
Bulk update `sort_order` for all workspaces.
```json
{ "order": ["uuid-1", "uuid-2", "uuid-3"] }
```

#### `DELETE /workspaces/:workspaceId`
Delete workspace and all its tiles (cascade). Returns `204`.

---

### Tile endpoints

#### `GET /workspaces/:workspaceId/tiles`
List all tiles in a workspace.

#### `POST /workspaces/:workspaceId/tiles`
Add a tile to a workspace.
```json
{ "url": "https://github.com", "title": "GitHub", "faviconUrl": "...", "openMode": "iframe", "isPinned": false }
```
Free tier: max 4 tiles per workspace → `422 TIER_LIMIT_REACHED` if exceeded.

#### `PATCH /workspaces/:workspaceId/tiles/:tileId`
Update tile URL, title, openMode, or isPinned.

#### `DELETE /workspaces/:workspaceId/tiles/:tileId`
Remove a tile. Returns `204`.

---

### Other endpoints

#### `GET /tiles/metadata?url=<encoded-url>`
Fetches the title and favicon for a URL. Used when adding a new tile to auto-populate the name.
```json
{ "data": { "title": "GitHub", "faviconUrl": "https://github.com/favicon.ico" } }
```

#### `GET /devices`
List all registered devices for the current user.

#### `PATCH /devices/:deviceId`
Rename a device.

#### `DELETE /devices/:deviceId`
Revoke a device (kick it out). The extension will receive `401 DEVICE_REVOKED` on its next API call.

#### `GET /subscriptions/me`
Current subscription details.

#### `POST /subscriptions/checkout`
Create a Stripe Checkout session. Currently returns `503 NOT_IMPLEMENTED`.

#### `GET /templates`
List available workspace templates.

#### `POST /workspaces/from-template/:templateId`
Create a workspace from a template (tiles are created, layout is mapped).

#### `GET /health`
Returns `{ "status": "ok" }`. No auth required. Use for uptime monitoring.

---

## Database Schema

### Tables

| Table | Description |
|---|---|
| `users` | User profiles, synced from `auth.users` via DB trigger |
| `subscriptions` | One per user — tracks plan, Stripe IDs, billing period |
| `devices` | Extension installs — each auth creates a device record |
| `workspaces` | Named workspaces with layout, icon, color, shortcut key |
| `tiles` | Individual website panels within a workspace |
| `auth_extension_codes` | Short-lived one-time codes for extension auth (2-min TTL) |
| `workspace_templates` | Reusable workspace presets (official + user-created) |

### Key relationships

```
users
 ├── subscriptions (1:1)
 ├── devices (1:N)  ← one per extension install
 └── workspaces (1:N)
      └── tiles (1:N)
```

### Layout JSON structure

Tile layout is stored as a binary tree in `workspaces.layout_json`:

```typescript
type LayoutNode =
  | { type: 'split'; direction: 'row' | 'column'; ratio: number; first: LayoutNode; second: LayoutNode }
  | { type: 'tile'; tileId: string }
```

`ratio` is 0.0–1.0 (the proportion of the first child). Updated on every drag-to-resize `mouseup` event. `null` means empty workspace.

---

## Architecture

### Extension auth flow

```
Extension popup
  │
  ├─ "Sign In" button
  │    ↓
  │  Generates random state, opens:
  │  localhost:3001/auth/extension?state=X&extensionId=Y
  │    ↓
  │  User logs in with Supabase (email or Google)
  │    ↓
  │  Web app calls POST /api/v1/auth/extension/code
  │  (tokens encrypted AES-256-GCM, stored in auth_extension_codes)
  │    ↓
  │  Chrome:  chrome.runtime.sendMessage(extensionId, { code, state })
  │  Firefox: window.postMessage → auth-relay.ts content script
  │             → browser.runtime.sendMessage (internal)
  │    ↓
  │  Background script calls POST /api/v1/auth/extension/exchange
  │  (exchanges code for Supabase tokens, creates device record)
  │    ↓
  └─ Tokens saved to browser.storage.local → extension is authenticated
```

### Header stripping (declarativeNetRequest)

The extension uses a static rule in `public/rules/iframe.json` to remove iframe-blocking headers from all sub-frame responses:

- `X-Frame-Options` — removed
- `Content-Security-Policy` — removed
- `Content-Security-Policy-Report-Only` — removed

This makes it possible to embed sites like Google, Gmail, Notion, Linear, etc. in iframes.

### Frame-buster protection

Some sites (e.g. Stack Overflow) use JavaScript to escape iframes even after headers are stripped. The extension sets the `sandbox` attribute on all iframes without `allow-top-navigation`:

```
sandbox="allow-scripts allow-same-origin allow-forms allow-popups
         allow-popups-to-escape-sandbox allow-modals allow-downloads
         allow-top-navigation-by-user-activation"
```

This blocks `window.top.location = ...` calls while keeping the page fully functional. User-triggered link navigation still works via `allow-top-navigation-by-user-activation`.

### Binary tree layout manipulation

The layout is a recursive binary tree. Three operations:

- **Split tile** — replaces a `tile` node with a `split` node containing the original tile and a new tile
- **Remove tile** — removes a `tile` node and collapses the parent `split` (sibling takes the removed slot)
- **Resize** — updates the `ratio` field on the `split` node whose divider was dragged

During drag, `pointer-events: none` is set on all iframes to prevent them from capturing mouse events. A `window mouseleave` fallback listener handles the mouse leaving the browser window.

---

## Subscription Tiers

| | Free | Pro (€9/month) |
|---|---|---|
| Workspaces | 1 | Unlimited |
| Tiles per workspace | 4 | Unlimited |
| Devices | 1 (auto-rotated on re-install) | 5 (manual management) |
| Keyboard shortcuts | Ctrl+1–9 | Ctrl+1–9 |
| Workspace templates | Official only | All (+ create custom) |
| Admin panel access | ✗ (is_admin flag required) | ✗ (is_admin flag required) |

Tier limits are defined in `packages/shared/src/index.ts`:

```typescript
export const TIER_LIMITS = {
  free: { workspaces: 1, tilesPerWorkspace: 4, devices: 1 },
  pro:  { workspaces: Infinity, tilesPerWorkspace: Infinity, devices: 5 },
}
```

---

## Security

### Token security
- Supabase JWT access tokens are validated server-side on every API call via `supabase.auth.getUser(token)`
- Tokens in `auth_extension_codes` are encrypted with **AES-256-GCM** using a server-side `ENCRYPTION_KEY` — never stored in plain text
- One-time codes expire after 2 minutes and are single-use (replay protection via `used_at` timestamp)

### Extension security
- Auth tokens stored only in `browser.storage.local` — inaccessible to web pages
- Content scripts use a **closed Shadow DOM** to prevent style conflicts and external access
- `SUPABASE_SERVICE_ROLE_KEY` is never in the frontend or in git — server-side only
- `.env.local` is gitignored

### Admin panel
- `is_admin` flag checked server-side on every admin page request
- Uses the service role client (server-side only) — the flag itself cannot be changed via any client-facing API

### iframe security
The `sandbox` attribute prevents iframes from:
- Navigating the top-level frame (`allow-top-navigation` omitted)
- Accessing `window.top.location`

Combined with `allow-same-origin`, cookie-based auth in embedded sites still works correctly because cross-origin restrictions still apply between the extension origin and the embedded site.

---

## Testing

The backend (Next.js API routes and lib utilities) is covered by a unit test suite using **Vitest**.

### Running tests

```bash
# From the monorepo root
pnpm --filter web test            # single run (CI-friendly)
pnpm --filter web test:watch      # watch mode — re-runs on save during development
pnpm --filter web test:coverage   # generates coverage report in packages/web/coverage/
```

### Test overview

78 tests across 7 files — all run in under 2 seconds.

| File | Tests | What is covered |
|---|---|---|
| `tests/lib/crypto.test.ts` | 7 | AES-256-GCM roundtrip, random IV per call, wrong/missing key throws, tampered ciphertext and auth tag both throw |
| `tests/lib/response.test.ts` | 22 | `ok()`, `created()`, `noContent()`, `apiError()` status codes and shapes; every `Errors.*` factory: correct HTTP status, error code, and message |
| `tests/lib/auth.test.ts` | 7 | `requireAuth()`: missing header → 401, bad token format → 401, Supabase rejects token → 401, revoked device → 401 DEVICE_REVOKED, valid token with/without device header → auth context returned |
| `tests/lib/tier.test.ts` | 11 | `checkWorkspaceLimit`, `checkTileLimit`, `checkDeviceLimit` for free tier (under limit → null, at limit → 422) and pro tier (always null for workspace/tile; 5-device limit for devices) |
| `tests/api/workspaces.test.ts` | 17 | `GET /workspaces` (auth, empty list, populated list); `POST /workspaces` (validation errors, tier limit, shortcut conflict, success); `PATCH /workspaces/:id` (missing updatedAt, not found, stale data, shortcut conflict, success); `DELETE /workspaces/:id` (not found, success); `GET /workspaces/:id` (not found, success) |
| `tests/api/auth-exchange.test.ts` | 9 | Code length validation, state length validation, code not found → 401, already-used code → 401, expired code → 401, state mismatch → 401, successful exchange → 201 with tokens + deviceId, free-tier auto-revoke of oldest device, pro-tier limit returns 422 |
| `tests/api/devices.test.ts` | 5 | `GET /devices` (auth guard, device list, `isCurrent` flag); `POST /auth/extension/logout` (no device header → 400, success → 204) |

### Architecture

**No integration tests, no real database.** All tests run fully offline by mocking the Supabase client. This keeps the suite fast and avoids needing a running Supabase instance in CI.

```
tests/
├── setup.ts                 ← sets TOKEN_ENCRYPTION_KEY and Supabase env vars before every test
├── helpers/
│   └── supabase-mock.ts     ← shared mock factory
├── lib/                     ← pure unit tests (no mocking needed for crypto + response)
└── api/                     ← route tests (requireAuth + createServiceClient both mocked)
```

#### Supabase mock (`tests/helpers/supabase-mock.ts`)

The Supabase client uses a deeply chainable query builder pattern:

```ts
await supabase.from('workspaces').select('*').eq('user_id', id).order('sort_order')
```

`makeChain(result)` creates a mock object where every intermediate method (`select`, `eq`, `order`, `limit`, …) returns `this`, and the chain itself is thenable — `await chain` resolves with `{ data, error, count }`. Terminal methods (`single()`, `maybeSingle()`) also return a resolved Promise.

`makeSupabase({ tables, authUser })` builds a full client mock. The `tables` map accepts either a single result or an array of results per table. When the same table is queried multiple times within one request handler, results are consumed in order (last entry is reused if the array runs out). This lets you configure multi-step handlers accurately:

```ts
// Example: POST /auth/extension/exchange queries 'devices' twice
makeSupabase({
  tables: {
    devices: [
      { count: 0 },                      // 1st call: device limit check
      { data: { id: 'new-device-id' } }, // 2nd call: insert new device
    ],
  },
})
```

#### API route test pattern

For API route tests, two modules are always mocked:

```ts
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
  isAuthError: (r) => r.error !== null,
}))
vi.mock('@/lib/supabase', () => ({
  createServiceClient: vi.fn(),
}))
```

`requireAuth` is configured per-test to return either an auth context (`AUTH_CTX` from the helper) or a simulated 401, completely bypassing JWT validation. `createServiceClient` returns a `makeSupabase(...)` mock configured for the specific scenario being tested.

### Adding tests for a new endpoint

1. Create `tests/api/<resource>.test.ts`
2. Add the two standard `vi.mock` calls at the top
3. Import your route handler (`GET`, `POST`, etc.) directly
4. For each test case, configure `requireAuth` and `createServiceClient` with `makeSupabase`
5. Construct a `NextRequest` and call the handler — assert on `res.status` and `await res.json()`

The query result order in `makeSupabase` must match the exact order your handler calls `supabase.from(table)`. Comments in the existing test files document this order for reference.

---

## Roadmap

### Short term
- [ ] **GitHub push** — get the code safely into version control
- [ ] **Vercel deploy** — production deployment
- [ ] **Stripe integration** — Pro tier upgrade flow
- [ ] **GitHub Actions + Supabase CI** — automated schema migrations on push

### Medium term
- [ ] **Tile settings** — edit URL, title, open mode after creation
- [ ] **Workspace reorder** — drag-and-drop in the sidebar
- [ ] **Workspace templates** — use official templates from the extension UI
- [ ] **Chrome Web Store submission** — publish the extension
- [ ] **Firefox Add-ons submission** — publish for Firefox
- [ ] **Rate limiting** — protect API endpoints
- [ ] **Error monitoring** — Sentry integration

### Long term
- [ ] **Offline mode** — cached workspaces + sync queue for offline use
- [ ] **Token refresh** — auto-refresh expired Supabase tokens in the extension
- [ ] **Custom templates** — Pro users can create and share workspace templates
- [ ] **Workspace sharing** — share read-only workspace layouts
- [ ] **Tab tile sidebar** — full sidebar UI for tab-mode tiles (currently only floating button)
- [ ] **Multi-window sync** — keep layout in sync across multiple browser windows
- [ ] **Mobile** — responsive dashboard, mobile-friendly workspace viewer
- [ ] **Safari** — requires additional Apple developer steps (Safari Web Extensions)

---

## Development notes

### pnpm commands

```bash
pnpm dev                          # start web app dev server
pnpm build                        # build all packages
pnpm --filter web build           # build web app only
pnpm --filter extension build     # build extension only
pnpm --filter web type-check      # TypeScript check (web)
pnpm --filter extension type-check  # TypeScript check (extension)
pnpm --filter web test            # run backend unit tests (single run)
pnpm --filter web test:watch      # run tests in watch mode (re-runs on file save)
pnpm --filter web test:coverage   # run tests with coverage report
```

### Extension build is not a watch mode

The `dev` script in the extension package runs `vite build` (not `vite build --watch`). This is intentional — WSL + watch mode causes instability on Windows-mounted drives. After any code change, manually run `pnpm --filter extension build` and reload the extension in the browser.

### Supabase local development

You can use [Supabase CLI](https://supabase.com/docs/guides/cli) for local development:
```bash
supabase start          # starts local Supabase stack
supabase db push        # apply migrations
```

Or just use the hosted Supabase project for development (simpler for small teams).

### Adding a new API endpoint

1. Create `packages/web/app/api/v1/<path>/route.ts`
2. Use `requireAuth(request)` + `isAuthError(auth)` for authentication
3. Use `ok()`, `created()`, `noContent()`, or `Errors.*` from `@/lib/response`
4. Add Zod validation for request bodies
5. Use `createServiceClient()` for all database operations (bypasses RLS)
