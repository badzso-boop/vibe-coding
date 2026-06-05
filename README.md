# FlowSpace

A browser extension that turns your browser into a tiling workspace manager. Organize multiple websites side-by-side in resizable panels — like a window manager, but inside your browser. Switch between workspaces instantly with keyboard shortcuts.

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
  - [4. Google OAuth setup](#4-google-oauth-setup)
  - [5. Paddle setup](#5-paddle-setup)
  - [6. Run locally](#6-run-locally)
  - [7. Build & load the extension](#7-build--load-the-extension)
- [Vercel Deploy](#vercel-deploy)
- [Admin Panel](#admin-panel)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Architecture](#architecture)
- [Subscription Tiers](#subscription-tiers)
- [Security](#security)
- [Testing](#testing)
- [CI / CD](#ci--cd)
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

Each tile loads the target website inside the extension view. The extension strips `X-Frame-Options` and `Content-Security-Policy` headers for its own sub-frames using `declarativeNetRequest`. For sites that still can't be meaningfully embedded (e.g. Gmail, Google Drive — due to third-party cookie restrictions), FlowSpace auto-detects this via the metadata API and opens them as tracked browser tabs instead, with their icon pinned in the left sidebar.

---

## Features

### Implemented

- **Tiling layout** — Binary tree split system (like VS Code panels). Each tile can be split right or down individually.
- **Drag-to-resize** — Drag dividers between tiles to resize them. Works correctly even when tiles contain iframes.
- **Workspaces** — Multiple named workspaces, each with its own layout, icon, color, and optional keyboard shortcut.
- **Workspace settings** — Edit name, emoji icon, color, and `Ctrl+1–9` shortcut per workspace.
- **Keyboard shortcuts** — `Ctrl+1–9` switches between workspaces. `Ctrl+Shift+D` brings you back to FlowSpace from any tab.
- **Favorites bar** — Star any tile to add it to the favorites bar in the top header. Click a favorite to open it in the current workspace instantly.
- **Open in tab + sidebar tracking** — Pop out any tile to a real browser tab with one click. The site's favicon appears in the left sidebar; clicking it switches back to that tab. Icons are cleaned up automatically when the tab is closed.
- **Tile URL editing** — Pencil icon button in the tile header (visible on hover) lets you change a tile's URL. Re-fetches metadata and recalculates `openMode` for the new URL automatically.
- **Tile page tabs** — Files icon button in the tile header adds extra pages to a tile (like VS Code tabs). A compact tab bar appears when 2+ pages are open; each extra tab can be closed independently. Active page index is tracked per tile in `browser.storage.local`.
- **Button tooltips** — All tile header action buttons show a delayed tooltip on hover.
- **Automatic iframe detection** — When adding a tile, the metadata API checks the site's `X-Frame-Options` and `Content-Security-Policy` headers server-side. Sites that block embedding are auto-set to `openMode: 'tab'`.
- **Frame-buster protection** — `sandbox` attribute on iframes blocks JavaScript frame-busting scripts while keeping the page fully functional.
- **Content script widget** — Floating button injected into every tab for quick navigation back to FlowSpace. Shows tooltip and `Ctrl+Shift+D` hint.
- **Extension auth flow** — Secure one-time code exchange using AES-256-GCM encrypted tokens. No passwords stored in the extension.
- **Token refresh** — Expired Supabase tokens are automatically refreshed; concurrent refresh requests are deduplicated. `401` responses trigger a one-time retry with a fresh token.
- **Auth** — Email + password, Google OAuth, email verification, password reset (all via Supabase Auth).
- **Dashboard** — Usage overview, device management, subscription info.
- **Device management** — View all connected devices, revoke access to individual devices.
- **Admin panel** — User management, subscription overview, device revocation for support purposes.
- **Free tier enforcement** — 1 workspace, 4 tiles per workspace, 1 device.
- **Cross-browser** — Chrome, Edge, Brave (native). Firefox 128+ (via `webextension-polyfill`).
- **Newsletter signup** — Email capture form on the landing page backed by Resend Audiences.
- **Vercel Analytics** — Page view and session tracking via `@vercel/analytics`, active in production automatically.
- **CI pipeline** — GitHub Actions runs type-check, lint, and unit tests on every push.

### Not yet implemented

- **Paddle payments** — Pro tier upgrade flow (checkout + webhook handler, billing page wired but pending Paddle account).
- **Workspace templates** — API exists, not wired into the extension UI.
- **Workspace reorder** — API exists (`POST /workspaces/reorder`), not in extension UI.
- **Chrome Web Store** — Not published yet.
- **Firefox Add-ons** — Not published yet.
- **Vercel production deploy** — Not deployed yet (see [Vercel Deploy](#vercel-deploy)).

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Extension UI | React 19 + Vite 5 + Tailwind v4 | Manifest V3, `vite-plugin-web-extension` |
| Web app | Next.js 15 App Router + Tailwind v4 | SSR, API routes, dashboard |
| Database | Supabase (PostgreSQL) | Row Level Security, Auth |
| Auth | Supabase Auth | Email/password, Google OAuth, JWT |
| Email | Resend | Transactional emails + newsletter audience |
| Payments | Paddle (Merchant of Record) | Handles EU VAT automatically — pending integration |
| Analytics | Vercel Analytics | Page views + sessions, free on Vercel Hobby |
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
│   │   │   │   └── index.html
│   │   │   ├── background/
│   │   │   │   └── index.ts          ← Service worker (auth exchange, tab management)
│   │   │   ├── content/
│   │   │   │   ├── index.ts          ← Content script (floating widget, Ctrl+Shift+D)
│   │   │   │   └── auth-relay.ts     ← Firefox auth relay (postMessage bridge)
│   │   │   ├── popup/
│   │   │   │   └── App.tsx           ← Extension popup (Sign In / Open FlowSpace)
│   │   │   └── lib/
│   │   │       ├── api.ts            ← Typed API client (auth header injection, 401 retry)
│   │   │       ├── browser.ts        ← webextension-polyfill wrapper
│   │   │       ├── storage.ts        ← browser.storage.local typed wrapper + token refresh
│   │   │       └── types.ts          ← Workspace, Tile, PoppedTab, Favorite, TilePage
│   │   ├── public/rules/
│   │   │   └── iframe.json           ← declarativeNetRequest rules (strips iframe-blocking headers)
│   │   ├── manifest.json             ← MV3 manifest (Chrome + Firefox)
│   │   └── vite.config.ts
│   │
│   ├── web/                          ← Next.js web app (landing + dashboard + API)
│   │   ├── app/
│   │   │   ├── layout.tsx            ← Root layout (Vercel Analytics injected here)
│   │   │   ├── page.tsx              ← Landing page
│   │   │   ├── auth/                 ← Login, register, reset-password, update-password, callback
│   │   │   ├── dashboard/            ← Overview, devices, billing
│   │   │   ├── admin/                ← User management (is_admin required)
│   │   │   └── api/v1/               ← All API routes
│   │   ├── lib/
│   │   │   ├── auth.ts               ← requireAuth() — JWT validation
│   │   │   ├── crypto.ts             ← AES-256-GCM encrypt/decrypt
│   │   │   ├── tier.ts               ← Tier limit checks
│   │   │   ├── supabase.ts           ← Service role + anon client factories
│   │   │   └── response.ts           ← ok(), Errors.* helpers
│   │   └── tests/                    ← 78 unit tests (Vitest)
│   │
│   └── shared/                       ← Shared TypeScript types + constants
│       └── src/index.ts              ← LayoutNode, TIER_LIMITS
│
├── supabase/
│   ├── schema.sql                    ← Full DB schema (✅ already run in production)
│   └── migrations/
│       └── 001_add_is_admin.sql
│
├── DEPLOYMENT_PLAN.md                ← Step-by-step production launch plan
├── PAYMENT_PLAN.md                   ← Paddle integration + Hungarian tax guide
├── project-overview.md
├── data-model.md
├── api-design.md
└── README.md
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
TOKEN_ENCRYPTION_KEY=your-64-char-hex-string

# App URL (used for OAuth redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Resend — get API key from resend.com
RESEND_API_KEY=re_...
# Resend Audience ID for newsletter signups
RESEND_AUDIENCE_ID=your-audience-id

# Paddle — get from paddle.com dashboard (leave blank until Paddle account is set up)
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
PADDLE_PRO_PRICE_ID=
```

Create `packages/extension/.env.local`:

```env
VITE_API_URL=http://localhost:3001
VITE_APP_URL=http://localhost:3001
```

> **Security:** `.env.local` is in `.gitignore`. Never commit it. `SUPABASE_SERVICE_ROLE_KEY` bypasses all Row Level Security — keep it server-side only.

---

### 3. Supabase setup

#### 3a. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Note your **Project URL** and **API keys** (Settings → API)

#### 3b. Run the database schema

> ✅ **Already done** for the production project. Only needed when setting up a fresh project.

1. Open your Supabase project → **SQL Editor**
2. Paste the contents of `supabase/schema.sql` and run it
3. Then run the admin migration:

```sql
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE public.users SET is_admin = TRUE WHERE email = 'your@email.com';
```

#### 3c. Configure auth providers

Supabase Dashboard → **Authentication → Providers**:
- Enable **Email** (with email confirmation)
- Enable **Google** (see [Google OAuth setup](#4-google-oauth-setup) below)

Supabase Dashboard → **Authentication → URL Configuration**:
- Site URL: `https://your-app.vercel.app` (or `http://localhost:3001` for dev)
- Redirect URLs: `https://your-app.vercel.app/auth/callback`, `http://localhost:3001/auth/callback`

#### 3d. Configure Resend for transactional emails (optional)

Supabase → Settings → Auth → SMTP Settings → add Resend SMTP credentials.

---

### 4. Google OAuth setup

Google OAuth requires credentials from Google Cloud Console. Without this, the "Continue with Google" button will not work.

#### Step 1 — Google Cloud Console (~5 min)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g. "FlowSpace")
3. Left menu → **APIs & Services** → **OAuth consent screen**
   - User type: **External**
   - App name: FlowSpace, your email, save
   - Scopes: only `email` and `profile` needed
4. **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs — add both:
     ```
     https://your-project-id.supabase.co/auth/v1/callback
     http://localhost:3001/auth/callback
     ```
5. Copy the **Client ID** and **Client Secret**

#### Step 2 — Supabase Dashboard (~2 min)

1. **Authentication** → **Providers** → **Google**
2. Toggle **Enable**
3. Paste in the Client ID and Client Secret from above
4. **Save**

That's it — no code changes needed.

---

### 5. Paddle setup

Paddle is the payment provider (Merchant of Record — they handle EU VAT so you don't have to).

> See `PAYMENT_PLAN.md` for the full financial plan including Hungarian taxation.

#### Step 1 — Create a Paddle account

1. Go to [paddle.com](https://paddle.com) → Create account
2. Verify your business details
3. Dashboard → **Catalog** → **Products** → create "FlowSpace Pro"
   - Price: €9.00 / month (recurring)
4. Copy the **Price ID** → this is your `PADDLE_PRO_PRICE_ID`

#### Step 2 — Get API credentials

1. Dashboard → **Developer** → **Authentication** → create an API key
2. Copy → `PADDLE_API_KEY`

#### Step 3 — Configure webhook

1. Dashboard → **Developer** → **Notifications** → New notification
2. URL: `https://your-app.vercel.app/api/v1/webhooks/paddle`
3. Events to subscribe: `subscription.activated`, `subscription.canceled`, `subscription.payment_failed`
4. Copy the webhook secret → `PADDLE_WEBHOOK_SECRET`

> **Note:** The webhook endpoint code is part of Fázis 3 in `DEPLOYMENT_PLAN.md` — not yet implemented.

---

### 6. Run locally

```bash
pnpm dev
```

This runs `packages/web` on **http://localhost:3001**. The web app includes all API routes — no separate server needed.

> **WSL users:** Browser auto-launch won't work from WSL. Open `http://localhost:3001` manually.

---

### 7. Build & load the extension

```bash
pnpm --filter extension build
```

Output goes to `packages/extension/dist/`.

#### Load in Chrome / Edge / Brave

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. **Load unpacked** → select `packages/extension/dist/`
4. Copy the **Extension ID** → add to `NEXT_PUBLIC_EXTENSION_IDS` in `.env.local`

#### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on** → select `packages/extension/dist/manifest.json`

#### After loading

1. Click the FlowSpace toolbar icon → **Sign in**
2. Log in at `http://localhost:3001/auth/extension`
3. The extension receives auth tokens automatically
4. Click **Open FlowSpace** to launch the UI

---

## Vercel Deploy

**What is Vercel and why do I need it?**

The web app (`packages/web`) is a Next.js application that serves:
- The landing page and dashboard UI
- All API routes (`/api/v1/...`) that the extension calls
- Auth flows (login, Google OAuth callback, password reset)

Without a production deployment, the extension only works pointing at `http://localhost:3001`. To share it with real users, the web app must be hosted somewhere publicly accessible. Vercel is the standard choice for Next.js apps — free on the Hobby plan for small projects.

### Deploy steps

1. Push the repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → import from GitHub
3. **Root directory:** `packages/web`
4. **Build command:** `pnpm build`
5. **Environment variables** — add all variables from `.env.local` (with production values):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_EXTENSION_IDS=your-chrome-extension-id
TOKEN_ENCRYPTION_KEY=your-64-char-hex
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
RESEND_API_KEY=re_...
RESEND_AUDIENCE_ID=...
PADDLE_API_KEY=...
PADDLE_WEBHOOK_SECRET=...
PADDLE_PRO_PRICE_ID=...
```

6. Deploy — Vercel gives you a URL like `https://flowspace-xyz.vercel.app`
7. Add a custom domain in Vercel → Settings → Domains (e.g. `app.flowspace.io`)
8. Update Supabase Auth → URL Configuration with the production URL
9. Update `packages/extension/manifest.json` → `externally_connectable` → production URL
10. Rebuild and reload the extension

### Vercel Analytics

Analytics are already wired into the app (`@vercel/analytics` in `app/layout.tsx`). They activate automatically once the app is deployed to Vercel — no configuration needed. View data in the Vercel dashboard under your project → **Analytics** tab.

Tracks: page views, unique visitors, top pages, countries, browsers. Free on the Hobby plan.

---

## Admin Panel

Available at `/admin/users` — only accessible to users with `is_admin = TRUE` in the database.

| Page | URL | What it shows |
|---|---|---|
| User list | `/admin/users` | All users with plan badge, workspace/device counts, join date |
| Stats bar | `/admin/users` (top) | Total users, Pro users, total workspaces, active devices |
| User detail | `/admin/users/:id` | Subscription, all devices, all workspaces |
| Device revoke | `/admin/users/:id` | Revoke any user's device |

**Security:** The admin layout checks `is_admin` twice — once from the session cookie and once from the database via the service role client.

---

## API Reference

### Base URL

```
http://localhost:3001/api/v1      (development)
https://your-domain.com/api/v1   (production)
```

### Authentication

All endpoints (except `/auth/extension/exchange`, `/newsletter/subscribe`, and `/health`) require:

```
Authorization: Bearer <supabase_access_token>
X-Device-Id: <device_uuid>        (optional, sent by extension for device tracking)
```

### Response format

```json
// Success
{ "data": { ... }, "meta": { "requestId": "uuid" } }

// Error
{ "error": { "code": "ERROR_CODE", "message": "Human readable" }, "meta": { "requestId": "uuid" } }
```

### Error codes

| Code | HTTP | Description |
|---|---|---|
| `TOKEN_INVALID` | 401 | Invalid or expired Supabase token |
| `DEVICE_REVOKED` | 401 | Device was revoked via the dashboard |
| `TIER_LIMIT_REACHED` | 422 | Free tier limit hit (workspaces, tiles) |
| `DEVICE_LIMIT_REACHED` | 422 | Max device count reached for your plan |
| `SHORTCUT_CONFLICT` | 409 | Keyboard shortcut already used by another workspace |
| `STALE_DATA` | 409 | Optimistic lock conflict — another device modified the resource |
| `AUTH_CODE_EXPIRED` | 401 | Extension auth code expired or already used |
| `AUTH_STATE_MISMATCH` | 401 | CSRF protection: state parameter mismatch |
| `WRONG_PASSWORD` | 403 | Incorrect password (account deletion confirmation) |
| `WORKSPACE_NOT_FOUND` | 404 | |
| `TILE_NOT_FOUND` | 404 | |
| `DEVICE_NOT_FOUND` | 404 | |
| `BAD_REQUEST` | 400 | Request body validation failed |
| `FORBIDDEN` | 403 | Permission denied |
| `INTERNAL_ERROR` | 500 | Server error |

---

### Auth endpoints

#### `POST /auth/extension/code`
Creates a 2-minute one-time auth code. Called by the web app after login.

#### `POST /auth/extension/exchange`
Exchanges the one-time code for Supabase tokens. Creates a device record. No auth required.

**Free tier behavior:** If the device limit (1) is reached, the oldest device is automatically revoked to allow re-auth after reinstalling. Pro tier returns `422 DEVICE_LIMIT_REACHED` when all 5 slots are full.

#### `POST /auth/extension/refresh`
Exchanges a Supabase refresh token for a new access token. Called automatically by the extension before each request when the token is within 60 seconds of expiry.

#### `POST /auth/extension/logout`
Revokes the current device. Returns `204`.

---

### User endpoints

#### `GET /users/me` — profile + subscription
#### `PATCH /users/me` — update name or avatarUrl
#### `DELETE /users/me` — delete account. Requires `{ confirmPassword }` for email+password users (verified server-side).

---

### Workspace endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/workspaces` | List all, ordered by sort_order |
| `POST` | `/workspaces` | Create. Free: max 1 workspace |
| `GET` | `/workspaces/:id` | Get with tiles |
| `PATCH` | `/workspaces/:id` | Update (requires `updatedAt` for optimistic locking) |
| `DELETE` | `/workspaces/:id` | Delete + cascade tiles |
| `PATCH` | `/workspaces/:id/layout` | Save binary tree layout |
| `POST` | `/workspaces/:id/duplicate` | Clone with tiles |
| `POST` | `/workspaces/reorder` | Bulk update sort_order |
| `POST` | `/workspaces/from-template/:id` | Create from template (tile limit enforced) |

---

### Tile endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/workspaces/:id/tiles` | List tiles (max 500) |
| `POST` | `/workspaces/:id/tiles` | Add tile. Free: max 4 per workspace |
| `PATCH` | `/workspaces/:id/tiles/:tileId` | Update url/title/openMode/isPinned |
| `DELETE` | `/workspaces/:id/tiles/:tileId` | Remove |

---

### Other endpoints

#### `GET /tiles/metadata?url=<encoded-url>`
Fetches title, favicon, and iframe-compatibility for a URL. Private/loopback IPs and DNS-rebinding are blocked (SSRF protection).

#### `GET /devices` / `PATCH /devices/:id` / `DELETE /devices/:id`
List, rename, or revoke devices.

#### `GET /subscriptions/me`
Current subscription details.

#### `GET /templates` / `POST /workspaces/from-template/:id`
List workspace templates / create from template.

#### `POST /newsletter/subscribe`
Subscribe email to Resend Audience. No auth required. Duplicate emails treated as success.

#### `GET /health`
Returns `{ "status": "ok" }`. No auth required.

---

## Database Schema

### Tables

| Table | Description |
|---|---|
| `users` | User profiles, synced from `auth.users` via DB trigger |
| `subscriptions` | One per user — tracks plan, Paddle IDs, billing period |
| `devices` | Extension installs — each auth creates a device record |
| `workspaces` | Named workspaces with layout, icon, color, shortcut key |
| `tiles` | Individual website panels within a workspace |
| `auth_extension_codes` | Short-lived one-time codes for extension auth (2-min TTL) |
| `workspace_templates` | Reusable workspace presets |

### Layout JSON structure

```typescript
type LayoutNode =
  | { type: 'split'; direction: 'row' | 'column'; ratio: number; first: LayoutNode; second: LayoutNode }
  | { type: 'tile'; tileId: string }
```

`ratio` is 0.0–1.0 (proportion of the first child). `null` means empty workspace.

---

## Architecture

### Extension auth flow

```
Extension popup → "Sign In"
  → Opens /auth/extension?state=X&extensionId=Y
  → User logs in (email or Google)
  → Web app calls POST /api/v1/auth/extension/code
    (tokens encrypted AES-256-GCM, stored with 2-min TTL)
  → Chrome:  chrome.runtime.sendMessage(extensionId, { code, state })
     Firefox: postMessage → auth-relay.ts → browser.runtime.sendMessage
  → Background script calls POST /api/v1/auth/extension/exchange
    (code exchanged for Supabase tokens, device record created)
  → Tokens saved to browser.storage.local
```

### Token refresh flow

```
getAuth() called before every API request
  → token expires in < 60s?
    → POST /api/v1/auth/extension/refresh (concurrent calls deduplicated)
    → new tokens saved to storage
  → 401 received from any endpoint?
    → one-time retry with fresh token via attemptRefresh()
```

### Header stripping (declarativeNetRequest)

Static rules in `public/rules/iframe.json` remove `X-Frame-Options`, `Content-Security-Policy`, `Cross-Origin-Resource-Policy`, `Cross-Origin-Opener-Policy`, and `Cross-Origin-Embedder-Policy` from sub-frame responses, enabling sites like Notion, Linear, and Google Docs to be embedded.

---

## Subscription Tiers

| | Free | Pro (€9/month) |
|---|---|---|
| Workspaces | 1 | Unlimited |
| Tiles per workspace | 4 | Unlimited |
| Devices | 1 (auto-rotated on re-install) | 5 (manual management) |
| Keyboard shortcuts | Ctrl+1–9 | Ctrl+1–9 |

Defined in `packages/shared/src/index.ts`:

```typescript
export const TIER_LIMITS = {
  free: { workspaces: 1, tilesPerWorkspace: 4, devices: 1 },
  pro:  { workspaces: Infinity, tilesPerWorkspace: Infinity, devices: 5 },
}
```

---

## Security

### Token security
- Supabase JWT tokens validated server-side on every call via `supabase.auth.getUser(token)`
- Extension auth codes encrypted with **AES-256-GCM** (`TOKEN_ENCRYPTION_KEY`) — never stored in plain text
- One-time codes expire after 2 minutes, single-use (replay protection via `used_at`)
- Account deletion requires password confirmation for email+password users (verified via Supabase `signInWithPassword`)

### SSRF protection (tile metadata endpoint)
The `/tiles/metadata` endpoint fetches external URLs on behalf of users. Three layers of protection:
1. **Hostname blocklist** — private IPv4 ranges (10.x, 172.16–31.x, 192.168.x, 169.254.x/AWS metadata, 127.x, 0.x, 255.x), IPv6 private ranges (fc00::/7, fe80::/10), and IPv4-mapped IPv6 (`::ffff:...`)
2. **DNS pre-resolution** — all A/AAAA records resolved before each request; any private address → rejected (closes DNS rebinding window)
3. **Manual redirect following** — `redirect: 'manual'` with re-validation on every hop (max 5); prevents open-redirect SSRF

### Extension security
- Auth tokens in `browser.storage.local` — inaccessible to web pages
- Content scripts use a closed Shadow DOM
- `SUPABASE_SERVICE_ROLE_KEY` never in frontend or git

### Admin panel
- `is_admin` checked server-side on every admin request via service role client
- Flag cannot be changed via any client-facing API

---

## Testing

78 tests across 7 files using **Vitest**. All run offline — no real database needed.

```bash
pnpm --filter web exec vitest run         # single run (CI-friendly)
pnpm --filter web exec vitest             # watch mode
pnpm --filter web exec vitest --coverage  # coverage report
```

| File | Tests | Coverage |
|---|---|---|
| `crypto.test.ts` | 7 | AES-256-GCM roundtrip, random IV, wrong key, tampered ciphertext |
| `response.test.ts` | 22 | All `ok/created/noContent/apiError/Errors.*` factories |
| `auth.test.ts` | 7 | `requireAuth()`: missing/bad/revoked token, valid context |
| `tier.test.ts` | 11 | Workspace/tile/device limits for free + pro |
| `workspaces.test.ts` | 17 | Full CRUD: auth, validation, tier limits, optimistic locking |
| `auth-exchange.test.ts` | 9 | Code exchange: validation, expiry, state mismatch, device auto-revoke |
| `devices.test.ts` | 5 | Device list, `isCurrent` flag, logout |

---

## CI / CD

### GitHub Actions (`.github/workflows/ci.yml`)

Runs on every push:

| Step | Scope |
|---|---|
| Format check (`prettier`) | all packages |
| Type check (`tsc --noEmit`) | web + extension |
| Lint (`eslint --max-warnings 0`) | web + extension |
| Tests (`vitest run`) | web (78 tests) |

All must pass before merging to `main`.

### Branch protection

`main` is protected:
- Merges require a pull request
- All CI checks must be green
- Admin (repo owner) can push directly

---

## Roadmap

### Short term
- [ ] **Paddle integration** — checkout URL, webhook handler, billing page (`DEPLOYMENT_PLAN.md` Fázis 3)
- [ ] **Vercel production deploy** — with custom domain and all env vars
- [ ] **Chrome Web Store submission** — $5 fee, screenshots, privacy policy page
- [ ] **Google OAuth** — Cloud Console setup + Supabase provider config

### Medium term
- [ ] **Workspace reorder** — drag-and-drop in the sidebar
- [ ] **Workspace templates** — use official templates from the extension UI
- [ ] **Firefox Add-ons submission**
- [ ] **Onboarding wizard** — first-time user flow (0 workspaces → guided setup)
- [ ] **Error monitoring** — Sentry integration
- [ ] **Real-time sync** — Supabase Realtime for Pro multi-device sync

### Long term
- [ ] **Offline mode** — cached workspaces + sync queue
- [ ] **Custom templates** — Pro users create and share templates
- [ ] **Workspace sharing** — share read-only layouts
- [ ] **Safari** — Safari Web Extensions (requires Apple developer steps)

### Done
- [x] **Token refresh** — auto-refresh expired tokens, 401 retry, concurrent deduplication
- [x] **Security hardening** — SSRF protection, account deletion auth, tier bypass fixes
- [x] **GitHub Actions CI** — format, type-check, lint, 78 tests on every push
- [x] **Branch protection** — PR required, CI must be green, admin push allowed
- [x] **Vercel Analytics** — `@vercel/analytics` in root layout, activates on Vercel deploy
- [x] **Auth fixes** — forgot password PKCE flow, Google OAuth error handling
- [x] **Unit test suite** — 78 tests, Vitest, fully offline (mocked Supabase)
- [x] **Supabase schema** — deployed to production project
- [x] **Tab tile sidebar** — pop tiles to real tabs, favicon tracked, auto-cleanup
- [x] **Favorites bar** — star tiles, one-click reopen in any workspace
- [x] **Automatic iframe detection** — `openMode` set correctly at tile creation
- [x] **Newsletter** — Resend Audiences integration
- [x] **Pre-commit hook** — Husky blocks commits with formatting/type/lint/test errors

---

## Development notes

```bash
pnpm dev                              # start web app dev server (localhost:3001)
pnpm --filter extension build         # build extension (output → dist/)
pnpm --filter web exec vitest run     # run tests
pnpm --filter web exec vitest         # tests in watch mode
pnpm build                            # build all packages
```

> **Extension watch mode:** The extension uses `vite build` (not `--watch`) intentionally — WSL + watch mode causes instability on Windows-mounted drives (`/mnt/g/...`). Rebuild manually after code changes and reload in `chrome://extensions`.
