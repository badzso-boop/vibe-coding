# FlowSpace — API Design

## Alapelvek

- **Base URL:** `https://api.flowspace.io/v1`
- **Formátum:** JSON request/response
- **Auth:** Bearer token (JWT access token) — kivéve a publikus és webhook endpointok
- **Verzionálás:** URL prefix (`/v1/`)

---

## Auth fejléc

```
Authorization: Bearer <access_token>
```

---

## Általános response formátum

### Siker
```json
{
  "data": { ... },
  "meta": { "requestId": "uuid" }
}
```

### Lista
```json
{
  "data": [ ... ],
  "meta": { "total": 12, "requestId": "uuid" }
}
```

### Hiba
```json
{
  "error": {
    "code": "SUBSCRIPTION_EXPIRED",
    "message": "Your subscription has expired.",
    "details": {}
  },
  "meta": { "requestId": "uuid" }
}
```

### HTTP státuszkódok

| Kód | Mikor |
|---|---|
| 200 | Sikeres lekérés / módosítás |
| 201 | Sikeres létrehozás |
| 204 | Sikeres törlés (nincs body) |
| 400 | Hibás request (validáció) |
| 401 | Érvénytelen vagy lejárt token |
| 403 | Nincs jogosultság (pl. más user adatai) |
| 404 | Nem található |
| 409 | Conflict (pl. duplicate shortcut_key) |
| 422 | Üzleti logika hiba (pl. Free tier limit elérve) |
| 429 | Rate limit |
| 500 | Szerver hiba |

---

## Error kódok

| Kód | HTTP | Leírás |
|---|---|---|
| `TOKEN_INVALID` | 401 | Érvénytelen vagy lejárt Supabase token |
| `DEVICE_REVOKED` | 401 | Az eszközt visszavonták a dashboardon |
| `SUBSCRIPTION_EXPIRED` | 403 | Lejárt előfizetés |
| `TIER_LIMIT_REACHED` | 422 | Free tier limit (pl. max 1 workspace) |
| `DEVICE_LIMIT_REACHED` | 422 | Max 5 device elérve (Pro) |
| `SHORTCUT_CONFLICT` | 409 | Ezt a shortcut_key-t már használja egy másik workspace |
| `STALE_DATA` | 409 | Optimistic lock conflict — más device már módosította az erőforrást |
| `AUTH_CODE_EXPIRED` | 401 | Extension auth code lejárt vagy már felhasználták |
| `AUTH_STATE_MISMATCH` | 401 | CSRF védelem: a state paraméter nem egyezik |
| `WORKSPACE_NOT_FOUND` | 404 | |
| `TILE_NOT_FOUND` | 404 | |

---

## Endpointok

---

### Auth

#### Supabase-kezelt flow-ok (nem saját endpoint)

A következő flow-kat **a kliens közvetlenül a Supabase SDK-n keresztül hívja** — nem írunk hozzá backend kódot:

| Flow | Supabase SDK hívás |
|---|---|
| Regisztráció | `supabase.auth.signUp({ email, password })` |
| Email verifikáció | Supabase automatikusan küldi Resend-en át |
| Bejelentkezés | `supabase.auth.signInWithPassword({ email, password })` |
| Google OAuth | `supabase.auth.signInWithOAuth({ provider: 'google' })` |
| Jelszó reset email | `supabase.auth.resetPasswordForEmail(email)` |
| Token refresh | `supabase.auth.refreshSession()` — automatikus |
| Kijelentkezés (web) | `supabase.auth.signOut()` |

A Supabase access token (`1 óra`) kerül minden saját API kérés `Authorization: Bearer` headerébe. A backend `supabase.auth.getUser(token)` hívással validálja.

---

#### Extension Auth Flow — részletes leírás

Az extension nem tárolja a user jelszavát és nem nyit iframet a login oldalra. A web appban történő Supabase bejelentkezés után a tokenek egy biztonságos one-time code cserén keresztül jutnak el az extensionhez.

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────┐
│   Extension     │        │    Web App       │        │   Backend   │
└────────┬────────┘        └────────┬─────────┘        └──────┬──────┘
         │                          │                          │
    1. "Sign In" kattintás          │                          │
         │                          │                          │
    2. state = crypto.randomUUID()  │                          │
       chrome.storage.session       │                          │
       .set({ state })              │                          │
         │                          │                          │
    3. chrome.tabs.create({         │                          │
       url: app.flowspace.io/       │                          │
       auth/extension               │                          │
       ?state=<state>               │                          │
       &extensionId=<runtime.id>})  │                          │
         │                          │                          │
         │          4. User bejelentkezik Supabase-zel         │
         │          (email+jelszó vagy Google OAuth)           │
         │                          │                          │
         │          5. Web app rendelkezik Supabase            │
         │          access+refresh tokenekkel                  │
         │                          │                          │
         │          6. POST /auth/extension/code ─────────────▶│
         │             Bearer: <supabase_access_token>         │
         │             { state, extensionId }                  │
         │                          │                          │
         │                          │  Backend:                │
         │                          │  - getUser(token) ✓      │
         │                          │  - Tokeneket titkosítja  │
         │                          │  - Létrehoz code sort    │
         │                          │◀─ { code } ──────────────│
         │                          │                          │
         │◀─ chrome.runtime         │                          │
         │   .sendMessage(          │                          │
         │   extensionId,           │                          │
         │   { code, state })       │                          │
         │                          │                          │
    7. Ellenőrzi:                   │                          │
       state egyezik? ✓             │                          │
         │                          │                          │
    8. POST /auth/extension/exchange ────────────────────────▶│
       { code, state, deviceName, browser }                   │
         │                                                     │
         │◀────────────────── { accessToken, refreshToken,     │
         │                     user, deviceId }               │
         │                     (Supabase tokenek)             │
         │                                                     │
    9. chrome.storage.local.set({                              │
       accessToken, refreshToken,                              │
       deviceId, user })                                       │
   10. Auth tab bezárása                                       │
   11. Dashboard betöltődik                                    │
```

---

#### `POST /auth/extension/code`
**Csak a web app hívja** — a Supabase bejelentkezés után. Létrehoz egy 2 perces one-time code-ot.

**Auth:** `Authorization: Bearer <supabase_access_token>` — ugyanolyan mint minden más védett endpoint. A backend `supabase.auth.getUser(token)`-nel validálja.

> Ez oldja fel a korábbi "session cookie vs Bearer token" ellentmondást — nincs különleges auth, ugyanaz a Bearer token flow mint mindenhol.

**Request:**
```json
{
  "state": "a3f8c2d1...",
  "extensionId": "abcdefghijklmnop"
}
```

**Response 200:**
```json
{
  "data": {
    "code": "9f2a4b8c...",
    "expiresAt": "2026-05-30T10:02:00Z"
  }
}
```

> A backend titkosítva tárolja a Supabase tokeneket az `auth_extension_codes` táblában. A code maga csak egy véletlen index — a valódi adat titkosított.

---

#### `POST /auth/extension/exchange`
**Az extension hívja** — beváltja a one-time code-ot Supabase tokenekre.

**Auth:** Nincs — a code maga az autentikáció.

**Request:**
```json
{
  "code": "9f2a4b8c...",
  "state": "a3f8c2d1...",
  "deviceName": "Chrome – Windows laptop",
  "browser": "chrome"
}
```

**Response 200:**
```json
{
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "...",
    "deviceId": "uuid",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Kovács Péter"
    }
  }
}
```

> Backend lépések:
> 1. Megkeresi a code-ot: `expires_at > NOW()` és `used_at IS NULL` és `state` egyezik
> 2. `used_at = NOW()` (replay protection)
> 3. Visszafejti a titkosított Supabase tokeneket
> 4. Új `devices` sort hoz létre (device limit ellenőrzéssel)
> 5. Visszaadja a tokeneket és a deviceId-t

> Hibák: `401 AUTH_CODE_EXPIRED`, `401 AUTH_STATE_MISMATCH`

---

#### `POST /auth/extension/logout`
Extension kijelentkezés — device törlése és Supabase session invalidálása.

**Auth:** `Authorization: Bearer <supabase_access_token>` + `X-Device-Id` header

**Response 204**

---

#### Extension `manifest.json` — szükséges beállítások

```json
{
  "externally_connectable": {
    "matches": ["https://app.flowspace.io/*"]
  },
  "permissions": [
    "declarativeNetRequest",
    "tabs",
    "storage",
    "scripting",
    "webNavigation",
    "activeTab",
    "sessions"
  ],
  "host_permissions": [
    "https://*/*",
    "http://*/*"
  ]
}
```

---

#### Extension Auth Flow — részletes leírás

Az extension nem tárolja a user jelszavát és nem nyit iframet a login oldalra. Helyette egy biztonságos, redirect-alapú flow működik:

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Extension  │         │   Web App    │         │   Backend   │
└──────┬──────┘         └──────┬───────┘         └──────┬──────┘
       │                       │                         │
  1. User kattint "Sign In"-re │                         │
       │                       │                         │
  2. Generál: state = random64()                         │
     Tárol: chrome.storage.session { state }             │
       │                       │                         │
  3. chrome.tabs.create →      │                         │
     app.flowspace.io/auth/extension                     │
     ?state=<state>            │                         │
     &extensionId=<runtime.id> │                         │
       │                       │                         │
       │              4. User bejelentkezik               │
       │              (email+jelszó vagy Google)          │
       │                       │                         │
       │              5. POST /auth/extension/code ──────▶│
       │                       │   { state, userId }     │
       │                       │                         │
       │                       │◀── { code } ────────────│
       │                       │   (2 perces one-time)   │
       │                       │                         │
       │◀── chrome.runtime.sendMessage ──────────────────│
       │    { code, state }    │                         │
       │    (extensionId alapján célzott)                │
       │                       │                         │
  6. Ellenőrzi: state egyezik? │                         │
       │                       │                         │
  7. POST /auth/extension/exchange ──────────────────────▶│
     { code, state,            │                         │
       deviceName, browser }   │                         │
       │                       │                         │
       │◀──────────────────────────── { accessToken,     │
       │                       │       refreshToken,     │
       │                       │       user, deviceId }  │
       │                       │                         │
  8. chrome.storage.local-ba menti a tokeneket           │
  9. Auth tab bezárása         │                         │
 10. Dashboard megjelenik      │                         │
```

---

#### `POST /auth/extension/code`
**Csak a web app hívja** — a user sikeres bejelentkezése után. Generál egy rövid életű one-time code-ot az extensionnek.

**Auth:** Session cookie (a weboldalon bejelentkezett user session-je)

**Request:**
```json
{
  "state": "a3f8c2...",
  "extensionId": "abcdefghijklmnopqrstuvwxyz"
}
```

**Response 200:**
```json
{
  "data": {
    "code": "9f2a4b8c...",
    "expiresAt": "2026-05-30T10:02:00Z"
  }
}
```

> A backend itt:
> 1. Ellenőrzi hogy a user be van-e jelentkezve a weboldalon
> 2. Létrehoz egy `auth_extension_codes` sort
> 3. Megpróbálja `chrome.runtime.sendMessage(extensionId, { code, state })` helyett a web app maga hívja — a web app JavaScript-je hívja a Chrome API-t

---

#### `POST /auth/extension/exchange`
**Az extension hívja** — beváltja a one-time code-ot tokenekre.

**Auth:** Nincs (publikus endpoint, a code maga az autentikáció)

**Request:**
```json
{
  "code": "9f2a4b8c...",
  "state": "a3f8c2...",
  "deviceName": "Chrome – Windows laptop",
  "browser": "chrome"
}
```

**Response 200:**
```json
{
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "...",
    "deviceId": "uuid",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Kovács Péter"
    }
  }
}
```

> A backend itt:
> 1. Megkeresi a `code`-ot az `auth_extension_codes` táblában
> 2. Ellenőrzi: `expires_at > NOW()` és `used_at IS NULL` és `state` egyezik
> 3. Beállítja `used_at = NOW()` (replay protection)
> 4. Létrehoz egy új `devices` sort
> 5. Visszaadja az access + refresh tokent
>
> Hibák: `401 AUTH_CODE_EXPIRED` ha lejárt vagy már használt, `401 AUTH_STATE_MISMATCH` ha a state nem egyezik

---

#### Extension `manifest.json` — szükséges beállítás

Az `externally_connectable` meghatározza hogy a web app JavaScript-je küldhet-e üzenetet az extensionnek:

```json
{
  "externally_connectable": {
    "matches": ["https://app.flowspace.io/*"]
  }
}
```

Szükséges permissions:
```json
{
  "permissions": [
    "declarativeNetRequest",
    "tabs",
    "storage",
    "scripting",
    "webNavigation",
    "activeTab",
    "sessions"
  ],
  "host_permissions": [
    "https://*/*",
    "http://*/*"
  ]
}
```

---

### Users

#### `GET /users/me`
Bejelentkezett user adatai.

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Kovács Péter",
    "avatarUrl": null,
    "createdAt": "2026-01-01T00:00:00Z",
    "subscription": {
      "tier": "pro",
      "status": "active",
      "currentPeriodEnd": "2026-06-30T00:00:00Z",
      "cancelAtPeriodEnd": false
    }
  }
}
```

---

#### `PATCH /users/me`
Profil adatok módosítása.

**Request:**
```json
{
  "name": "Péter",
  "avatarUrl": "https://..."
}
```

**Response 200:** Frissített user objektum (ugyanaz mint GET /users/me)

---

#### `DELETE /users/me`
Fiók törlése. Megszünteti a Stripe előfizetést is.

**Request:**
```json
{
  "confirmPassword": "..."
}
```

**Response 204**

---

### Subscriptions

#### `GET /subscriptions/me`
Aktuális előfizetés részletei.

**Response 200:**
```json
{
  "data": {
    "tier": "pro",
    "status": "active",
    "stripeCustomerId": "cus_xxx",
    "currentPeriodStart": "2026-05-30T00:00:00Z",
    "currentPeriodEnd": "2026-06-30T00:00:00Z",
    "cancelAtPeriodEnd": false,
    "trialEnd": null
  }
}
```

---

#### `POST /subscriptions/checkout`
Stripe Checkout session létrehozása (irányít Stripe oldalára).

**Request:**
```json
{
  "priceId": "price_pro_monthly",
  "successUrl": "https://app.flowspace.io/dashboard?checkout=success",
  "cancelUrl": "https://app.flowspace.io/pricing"
}
```

**Response 200:**
```json
{
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/..."
  }
}
```

---

#### `POST /subscriptions/portal`
Stripe Customer Portal session (számlák, lemondás, fizetési adatok módosítása).

**Response 200:**
```json
{
  "data": {
    "portalUrl": "https://billing.stripe.com/..."
  }
}
```

---

#### `POST /webhooks/stripe`
Stripe webhook fogadása. **Nem igényel Bearer tokent** — Stripe-Signature header alapján validálódik.

Kezelt event típusok:
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.payment_succeeded`
- `checkout.session.completed`

**Response 200:** `{ "received": true }`

---

### Devices

#### `GET /devices`
Az összes bejelentkezett eszköz listája.

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Chrome – Windows laptop",
      "browser": "chrome",
      "lastSeenAt": "2026-05-30T09:00:00Z",
      "createdAt": "2026-01-15T00:00:00Z",
      "isCurrent": true
    }
  ]
}
```

---

#### `PATCH /devices/:deviceId`
Eszköz átnevezése.

**Request:**
```json
{
  "name": "Munka laptop"
}
```

**Response 200:** Frissített device objektum

---

#### `DELETE /devices/:deviceId`
Eszköz visszavonása (kijelentkeztetés).

**Response 204**

---

### Workspaces

#### `GET /workspaces`
Az összes workspace listája (rendezett `sort_order` szerint).

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Work",
      "icon": "💼",
      "color": "#6366f1",
      "shortcutKey": 1,
      "sortOrder": 0,
      "layoutJson": { ... },
      "tileCount": 4,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-05-30T10:00:00Z"
    }
  ]
}
```

---

#### `POST /workspaces`
Új workspace létrehozása.

**Request:**
```json
{
  "name": "Finance",
  "icon": "💰",
  "color": "#22c55e",
  "shortcutKey": 3
}
```

**Response 201:** Létrehozott workspace objektum

> Free tier esetén ha már van 1 workspace → `422 TIER_LIMIT_REACHED`
> Ha `shortcutKey` már foglalt → `409 SHORTCUT_CONFLICT`

---

#### `GET /workspaces/:workspaceId`
Egy workspace részletei a tile-okkal együtt.

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Work",
    "icon": "💼",
    "color": "#6366f1",
    "shortcutKey": 1,
    "sortOrder": 0,
    "layoutJson": {
      "type": "split",
      "direction": "row",
      "ratio": 0.5,
      "first": { "type": "tile", "tileId": "uuid-github" },
      "second": { "type": "tile", "tileId": "uuid-jira" }
    },
    "tiles": [
      {
        "id": "uuid-github",
        "url": "https://github.com",
        "title": "GitHub",
        "faviconUrl": "https://github.com/favicon.ico",
        "openMode": "iframe",
        "isPinned": false
      },
      {
        "id": "uuid-jira",
        "url": "https://mycompany.atlassian.net",
        "title": "Jira",
        "faviconUrl": "...",
        "openMode": "tab",
        "isPinned": true
      }
    ],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

#### `PATCH /workspaces/:workspaceId`
Workspace metaadatok módosítása (név, ikon, szín, shortcut).

Az `updatedAt` mező **kötelező** — optimistic locking. Ha a szerver `updated_at`-je nem egyezik a kliens által küldött értékkel (mert közben egy másik device módosított), a backend visszautasítja a kérést.

**Request:**
```json
{
  "updatedAt": "2026-05-30T10:00:00Z",
  "name": "Work & Dev",
  "icon": "🖥️",
  "color": "#8b5cf6",
  "shortcutKey": 2
}
```

**Response 200:** Frissített workspace objektum

**Response 409 (conflict):**
```json
{
  "error": {
    "code": "STALE_DATA",
    "message": "This workspace was modified by another device. Please refresh.",
    "details": {
      "serverUpdatedAt": "2026-05-30T10:05:00Z"
    }
  }
}
```

> Az extension a `STALE_DATA` hibára úgy reagál hogy lekéri az aktuális állapotot (`GET /workspaces/:id`), megmutatja a usernek hogy "Egy másik eszközön változás történt" és felajánlja hogy alkalmazza-e a helyi változást felülírásként, vagy elveti.

---

#### `PATCH /workspaces/:workspaceId/layout`
Layout JSON frissítése (tile áthúzásakor, elválasztó mozgatásakor hívódik).

**Request:**
```json
{
  "updatedAt": "2026-05-30T10:00:00Z",
  "layoutJson": {
    "type": "split",
    "direction": "row",
    "ratio": 0.65,
    "first": { "type": "tile", "tileId": "uuid-github" },
    "second": { "type": "tile", "tileId": "uuid-jira" }
  }
}
```

**Response 200:**
```json
{
  "data": { "updatedAt": "2026-05-30T10:30:00Z" }
}
```

> Conflict esetén: `409 STALE_DATA` (ugyanolyan mint fent)

---

#### `POST /workspaces/:workspaceId/duplicate`
Workspace másolása (tile-okkal és layout-tal együtt).

**Request:**
```json
{
  "name": "Work (copy)"
}
```

**Response 201:** Új workspace objektum

---

#### `POST /workspaces/reorder`
Workspace-ek sorrendjének módosítása (drag-and-drop a workspace sávban).

> `POST` és nem `PATCH` — a reorder nem egy konkrét resource módosítása, hanem bulk művelet. `PATCH /workspaces/reorder` routing conflictra futna (`reorder` workspace ID-ként értelmezné a router).

**Request:**
```json
{
  "order": ["uuid-work", "uuid-finance", "uuid-personal"]
}
```

**Response 200:**
```json
{
  "data": { "updated": 3 }
}
```

---

#### `DELETE /workspaces/:workspaceId`
Workspace törlése az összes tile-jával együtt.

**Response 204**

---

### Tiles

#### `POST /workspaces/:workspaceId/tiles`
Új tile hozzáadása egy workspace-hez.

**Request:**
```json
{
  "url": "https://github.com",
  "title": "GitHub",
  "openMode": "iframe",
  "isPinned": false
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid-new-tile",
    "workspaceId": "uuid-workspace",
    "url": "https://github.com",
    "title": "GitHub",
    "faviconUrl": "https://github.com/favicon.ico",
    "openMode": "iframe",
    "isPinned": false,
    "createdAt": "..."
  }
}
```

> Free tier esetén ha már van 4 tile ebben a workspace-ben → `422 TIER_LIMIT_REACHED`

---

#### `PATCH /workspaces/:workspaceId/tiles/:tileId`
Tile adatainak módosítása.

**Request:**
```json
{
  "updatedAt": "2026-05-30T10:00:00Z",
  "title": "My GitHub",
  "openMode": "tab",
  "isPinned": true,
  "url": "https://github.com/notifications"
}
```

**Response 200:** Frissített tile objektum

> Conflict esetén: `409 STALE_DATA`

---

#### `DELETE /workspaces/:workspaceId/tiles/:tileId`
Tile törlése.

> Ha `isPinned = true` → csak `?force=true` query parammal törölhető

**Response 204**

---

### Tiles — Metadata

#### `GET /tiles/metadata`
URL metaadatok lekérése tile hozzáadásakor — auto-kitölti a title és favicon mezőket, és megmondja hogy az oldal iframe-elhető-e.

**Auth:** Bearer token szükséges

**Query params:** `?url=https%3A%2F%2Fgithub.com`

**Response 200:**
```json
{
  "data": {
    "url": "https://github.com",
    "title": "GitHub · Build and ship software on a single, collaborative platform",
    "faviconUrl": "https://github.com/favicon.ico",
    "isIframeable": false,
    "iframeBlockReason": "x-frame-options: DENY"
  }
}
```

**Response 200 (iframe-elhető oldal):**
```json
{
  "data": {
    "url": "https://linear.app",
    "title": "Linear – Plan and build the product you love",
    "faviconUrl": "https://linear.app/favicon.ico",
    "isIframeable": true,
    "iframeBlockReason": null
  }
}
```

> **Backend működése:**
> 1. HEAD request a megadott URL-re (teljes oldal letöltése nélkül)
> 2. Response headerek ellenőrzése: `X-Frame-Options`, `Content-Security-Policy` (frame-ancestors)
> 3. Ha HEAD nem adja meg a title-t → GET request, HTML parse, `<title>` tag kinyerése
> 4. Favicon: először `<link rel="icon">` az HTML-ből, fallback: `<domain>/favicon.ico`
>
> **Timeout:** 5 másodperc. Ha az URL nem elérhető → `{ title: null, faviconUrl: null, isIframeable: false, iframeBlockReason: 'unreachable' }`
>
> **Rate limit:** 30 kérés / perc / user (megakadályozza a backend-et mint proxyt való visszaélést)

---

### Templates

#### `GET /templates`
Elérhető workspace sablonok listája.

**Query params:**
- `?official=true` — csak platform sablonok
- `?sort=popular` — use_count szerint rendezve

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Developer Setup",
      "description": "GitHub, Jira, Docs és Slack egy helyen",
      "icon": "🖥️",
      "isOfficial": true,
      "useCount": 1420,
      "tilesJson": [
        { "url": "https://github.com", "title": "GitHub", "openMode": "iframe" },
        { "url": "https://jira.atlassian.com", "title": "Jira", "openMode": "tab" }
      ]
    }
  ]
}
```

---

#### `POST /workspaces/from-template/:templateId`
Új workspace létrehozása sablon alapján.

**Request:**
```json
{
  "name": "My Dev Workspace",
  "shortcutKey": 1
}
```

**Response 201:** Létrehozott workspace objektum a tile-okkal együtt

---

### Health

#### `GET /health`
Szerver állapot ellenőrzés — monitoring és uptime check-ekhez.

**Auth:** Nincs

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-30T10:00:00Z",
  "version": "1.0.0"
}
```

> TODO: Ide kerülhet DB connectivity check és Supabase elérhetőség ellenőrzés is, de MVPhez elég az egyszerű válasz.

---

## Rate limiting

| Endpoint csoport | Limit |
|---|---|
| `POST /auth/*` | 10 kérés / perc / IP |
| `POST /webhooks/stripe` | Nincs limit (Stripe IP-k whitelist) |
| Minden más | 120 kérés / perc / user |

Rate limit válasz header-ek:
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1748599260
```

---

## Sync stratégia (Extension ↔ Backend)

Az extension az alábbi esetekben szinkronizál:

| Esemény | Akció |
|---|---|
| Extension betöltésekor | `GET /workspaces` — lista, majd az aktív workspace `GET /workspaces/:id` |
| Workspace váltáskor | `GET /workspaces/:id` — lazy load, csak akkor ha még nem volt betöltve |
| Tile hozzáadásakor | `POST /workspaces/:id/tiles` |
| Layout változásakor (egér **felengedésekor**) | `PATCH /workspaces/:id/layout` — nem minden egérmozdulatnál |
| Workspace metaadat változásakor | `PATCH /workspaces/:id` |
| Access token lejártakor | `POST /auth/refresh` automatikusan, átlátszóan |
| Subscription ellenőrzésekor | `GET /users/me` (óránként egyszer) |

### Conflict kezelés (STALE_DATA)

Ha egy PATCH kérés `409 STALE_DATA` hibát kap:

```
1. Extension lekéri az aktuális állapotot: GET /workspaces/:id
2. Összehasonlítja a helyi változással
3. Toast üzenet: "Egy másik eszközön változás történt"
   ├── "Felülírás" → újra elküldi a PATCH-t az új updatedAt-tel
   └── "Elveti" → betölti a szerver állapotát, helyi változás elveszik
```

### Offline cache

Az extension a workspace-eket `chrome.storage.local`-ban cachelve tartja. Ha nincs internetkapcsolat:
- A cached állapot betöltődik — az extension offline is használható
- Módosítások lokálisan megtörténnek, és egy `pendingSync` queue-ba kerülnek
- Amint visszajön a kapcsolat, a queue feldolgozódik (conflict ellenőrzéssel)
