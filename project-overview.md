# FlowSpace — Project Overview

## Koncepció

Böngésző extension amely lehetővé teszi hogy a felhasználó több weboldalt egyszerre kezeljen egyetlen felületen — mint egy saját tiling window manager a böngészőben. Különböző "workspace"-ek között lehet váltani (Munka, Személyes, Pénzügyek stb.), ahol minden workspace tile-okból áll amelyek iframeben vagy külön tabban nyitják meg az oldalakat.

---

## Termék komponensei

```
Browser Extension  ──▶  Backend API  ◀──  Web App (landing + dashboard)
                              │
                    PostgreSQL + Stripe
```

| Komponens | Leírás |
|---|---|
| Browser Extension | A fő termék — tiling layout, workspace váltás, floating sidebar |
| Web App | Landing page + account dashboard + subscription kezelés |
| Backend API | Auth, workspace sync, Stripe webhooks |

---

## Tech Stack

### Monorepo struktúra
```
flowspace/
├── packages/
│   ├── extension/    ← React + Vite + Manifest V3 + Tailwind
│   ├── web/          ← Next.js + Tailwind (landing + dashboard)
│   └── shared/       ← közös TypeScript típusok, utils, API client
├── pnpm-workspace.yaml
└── turbo.json
```

### Technológiák

| Réteg | Technológia | Miért |
|---|---|---|
| Extension UI | React + Vite + Tailwind | Gyors build, jól ismert |
| Web (landing+dash) | Next.js + Tailwind | SSR, egyszerű Vercel deploy |
| Backend API | Next.js API routes | Nem kell külön szerver |
| Adatbázis | Supabase (PostgreSQL) | DB + realtime + Row Level Security |
| Auth | Supabase Auth | Beépített email/jelszó, Google OAuth, email verifikáció, jelszó reset — ingyenes |
| Email | Resend | Egyszerű API, Next.js integráció, ingyenes tier (3000 email/hó) |
| Fizetés | Stripe | Standard, webhook support |
| Deploy | Vercel | Next.js natív |
| Cross-browser | webextension-polyfill | Chrome + Firefox + Edge egységes API |

---

## Browser támogatás

| Browser | Támogatás |
|---|---|
| Chrome | Natív |
| Edge | Natív (Chromium alapú) |
| Brave | Natív (Chromium alapú) |
| Firefox | webextension-polyfill-lel |
| Safari | Részleges (extra Apple dev lépések) |

---

## UX alapelvek

### Iframe tile
- Az oldal beágyazva jelenik meg a dashboardon belül
- Az extension eltávolítja az `X-Frame-Options` és `CSP frame-ancestors` headereket
- A layout egy bináris fa (ld. data-model.md)

### Tab tile
- Az oldal valódi böngésző tabban nyílik meg
- Az extension content script injektál egy floating sidebart az oldalba
- A sidebar mutatja az összes workspace komponenst és navigációs ikonokat
- `Ctrl+Shift+D` → visszaugrik a dashboard tabra

### Workspace váltás
- `Ctrl+1` ... `Ctrl+9` → workspace váltás
- A workspace sáv bal oldalon vagy felül látható
- Minden workspacehez saját ikon, szín, billentyűkombináció rendelhető

---

## Subscription tiers

| | Free | Pro (€9/hó) |
|---|---|---|
| Workspaces | 1 | Korlátlan |
| Tiles / workspace | 4 | Korlátlan |
| Device sync | ✗ | ✓ (max 5 device) |
| Keyboard shortcuts | Alap | Teljes |
| Workspace templates | Csak official | Összes |

---

## Auth architektúra — Supabase Auth

A standard auth flow-okat (regisztráció, login, Google OAuth, email verifikáció, jelszó reset) **Supabase Auth kezeli** — nem írunk hozzá saját backend kódot. A kliens közvetlenül hívja a Supabase SDK-t.

Mi csak az extension-specifikus flow-t implementáljuk (ld. api-design.md).

**Supabase Auth felelőssége:**
- Email + jelszó regisztráció és verifikáció (Resend-en keresztül)
- Google OAuth
- JWT kiadás (access token: 1 óra, refresh token: hosszú életű)
- Jelszó reset email küldése

**Mi implementáljuk:**
- Extension one-time code flow (`POST /auth/extension/code` + `POST /auth/extension/exchange`)
- Device menedzsment (melyik eszközök vannak bejelentkezve, visszavonás)
- Device limit enforcement (Pro: max 5 eszköz)

**Extension auth flow (röviden):**
```
1. Extension "Sign In" → megnyitja app.flowspace.io/auth/extension?state=xyz
2. User bejelentkezik Supabase-zel (email vagy Google)
3. Weboldal generál one-time code-ot (POST /auth/extension/code)
4. chrome.runtime.sendMessage → code átmegy az extensionnek
5. Extension beváltja: POST /auth/extension/exchange → Supabase tokenek
6. chrome.storage.local-ban tárolódik → kész
```
