# FlowSpace — Adatmodell

## Auth architektúra döntés: Supabase Auth

**Supabase Auth kezeli** (nem írunk hozzá kódot):
- Email + jelszó regisztráció, email verifikáció, jelszó reset — Resend-en keresztül küldi az emaileket
- Google OAuth provider
- JWT kiadás és refresh token rotáció
- `auth.users` tábla (Supabase belső sémája — mi nem nyúlunk hozzá)

**Mi kezeljük:**
- `public.users` — a mi saját profil adataink (szinkronizálva `auth.users`-ből DB trigger-rel)
- `devices` — extension bejelentkezések nyilvántartása, device limit, visszavonás
- `auth_extension_codes` — extension one-time code flow
- Minden workspace/tile/subscription adat

**JWT validáció a backend API-ban:**
Minden védett endpoint: `supabase.auth.getUser(bearerToken)` hívással validál. Nincs custom JWT signing.

**`public.users` szinkron trigger:**
```sql
CREATE OR REPLACE FUNCTION sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET email = NEW.email, updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_from_auth();
```

---

## Táblakapcsolatok

```
users (szinkronizált auth.users-ből)
 ├── subscriptions (1:1)
 ├── devices (1:N)
 └── workspaces (1:N)
      └── tiles (1:N)

workspace_templates (független, opcionálisan linked created_by → users)
auth_extension_codes (ideiglenes, 2 perces TTL)
```

---

## Táblák

### `users`

> `id` megegyezik a Supabase `auth.users.id`-val — nem generálunk külön UUID-t. A tábla egy DB trigger-rel szinkronizálódik az `auth.users` INSERT eseményére.

| Mező | Típus | Leírás |
|---|---|---|
| id | UUID PK | = `auth.users.id` |
| email | VARCHAR(255) UNIQUE NOT NULL | Szinkronizálva `auth.users.email`-ből |
| name | VARCHAR(255) | User által beállított megjelenített név |
| avatar_url | TEXT | Profilkép URL |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| last_login_at | TIMESTAMPTZ | Utolsó bejelentkezés — frissítve login-kor |

> `google_id` és `email_verified` **nem kell** — a Supabase Auth kezeli, a JWT-ben benne van.

---

### `subscriptions`

| Mező | Típus | Leírás |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| stripe_customer_id | VARCHAR UNIQUE **NULL** | Stripe customer ID — **csak upgradekor jön létre**, Free usernél NULL |
| stripe_subscription_id | VARCHAR UNIQUE NULL | Az aktív előfizetés Stripe ID-ja — Free usernél NULL |
| stripe_price_id | VARCHAR NULL | Melyik árazási csomag (Pro havi/éves) |
| tier | ENUM('free','pro') DEFAULT 'free' | |
| status | ENUM('trialing','active','past_due','canceled','paused') | |
| current_period_start | TIMESTAMPTZ NULL | Aktuális számlázási ciklus kezdete |
| current_period_end | TIMESTAMPTZ NULL | Lejárat — ezt ellenőrzi az extension (Free usernél NULL) |
| cancel_at_period_end | BOOLEAN DEFAULT FALSE | Lemondta de fut a ciklus végéig |
| trial_end | TIMESTAMPTZ NULL | Trial lejárata (ha van) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

> **Megjegyzés:** Regisztrációkor minden új user kap egy `subscriptions` sort `tier='free'` és `stripe_customer_id=NULL` értékkel. A Stripe customer csak akkor jön létre amikor a user először kattint az "Upgrade" gombra — ekkor hívódik a `POST /subscriptions/checkout` endpoint.

---

### `devices`

> A Supabase Auth kezeli a refresh tokeneket — mi csak a device-ok nyilvántartását csináljuk (UI + limit enforcement + visszavonás).

| Mező | Típus | Leírás |
|---|---|---|
| id | UUID PK | Az extension tárolja `chrome.storage.local`-ban és minden API kérésnél `X-Device-Id` headerben küldi |
| user_id | UUID FK → users.id | |
| name | VARCHAR(255) | "Chrome – Windows laptop" — user átnevezheti |
| browser | VARCHAR(20) | 'chrome' / 'firefox' / 'edge' / 'brave' / 'safari' |
| last_seen_at | TIMESTAMPTZ | Frissül minden API kérésnél ahol a middleware látja az `X-Device-Id` headert |
| created_at | TIMESTAMPTZ | |
| is_revoked | BOOLEAN NOT NULL DEFAULT FALSE | Ha a user kilövi a dashboardon — az extension következő API kérésnél `401 DEVICE_REVOKED`-ot kap |

> **Megjegyzés:** A Supabase JWT 1 órás access tokeneket ad. Revokálás után max. 1 óráig még működhet a régi token — ez elfogadható viselkedés MVPhez. Ha szigorúbb kell, Supabase Admin API-val lehet a user összes session-jét invalidálni.

> **Device limit:** Pro tier max. 5 aktív (nem revokált) device. Új device regisztrálásakor a backend megszámolja a nem revokált device-okat — ha eléri az 5-öt, `422 DEVICE_LIMIT_REACHED`.

---

### `workspaces`

| Mező | Típus | Leírás |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| name | VARCHAR(255) NOT NULL | "Work", "Personal", "Finance" |
| icon | VARCHAR(50) | Emoji: "💼" vagy icon slug |
| color | VARCHAR(7) | Hex szín: "#6366f1" — workspace sávban jelenik meg |
| shortcut_key | SMALLINT NULL | 1–9 → `Ctrl+1` ... `Ctrl+9` — **UNIQUE(user_id, shortcut_key)**, NULL ha nincs hozzárendelve |
| sort_order | SMALLINT | Sorrendezés a workspace sávban |
| layout_json | JSONB NULL | A tile-ok elrendezése — **NULL ha üres workspace**, bináris fa struktúra ha van legalább egy tile |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

### `tiles`

| Mező | Típus | Leírás |
|---|---|---|
| id | UUID PK | |
| workspace_id | UUID FK → workspaces.id | |
| url | TEXT NOT NULL | "https://github.com" |
| title | VARCHAR(255) | User által beállított megjelenített név |
| favicon_url | TEXT | A floating sidebar tray ikonja |
| open_mode | ENUM('iframe','tab') | Iframeben vagy külön tabban nyílik meg |
| is_pinned | BOOLEAN | Nem zárható be véletlenül |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

> **Megjegyzés:** Az `open_mode` kezdetben automatikusan kerül beállításra (az extension detektálja hogy az oldal iframe-elhető-e a response headerek alapján), de a user manuálisan felülírhatja.

---

### `auth_extension_codes`

Az extension login flow-ban használt rövid életű one-time code-ok táblája. Minden sor legfeljebb 2 percig él.

| Mező | Típus | Leírás |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id | Melyik user azonosította magát a weboldalon |
| code | VARCHAR(64) UNIQUE NOT NULL | Véletlenszerű one-time code (32 byte hex) |
| state | VARCHAR(64) NOT NULL | Az extension által generált state — CSRF védelem |
| encrypted_tokens | TEXT NOT NULL | AES-256-GCM-mel titkosított JSON: `{ accessToken, refreshToken }` — a Supabase tokenek amiket az extension megkap |
| expires_at | TIMESTAMPTZ NOT NULL | `NOW() + 2 perc` |
| used_at | TIMESTAMPTZ NULL | NULL amíg nem váltotta be — beváltás után kitöltődik (replay protection) |
| created_at | TIMESTAMPTZ | |

> **Miért titkosított?** A Supabase access + refresh token érzékeny adat. Ha valaki hozzáfér a DB-hez, ne tudja kiolvasni plain textben. A titkosítási kulcs env változóban él a backend szerveren.

> **Cleanup:** Napi job törli a lejárt (`expires_at < NOW()`) vagy már használt (`used_at IS NOT NULL`) sorokat.

---

### `workspace_templates`

| Mező | Típus | Leírás |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR(255) NOT NULL | "Developer Setup", "Social Media Manager" |
| description | TEXT | |
| icon | VARCHAR(50) | Emoji vagy icon slug |
| is_official | BOOLEAN | Platform által készített sablon |
| created_by | UUID FK → users.id | NULL ha official |
| use_count | INTEGER | Népszerűség szerinti rendezéshez |
| layout_json | JSONB NOT NULL | Ugyanolyan struktúra mint workspace.layout_json |
| tiles_json | JSONB NOT NULL | Tile konfigok URL-ekkel — felhasználónak importálható |
| created_at | TIMESTAMPTZ | |

---

## A `layout_json` struktúra

A tile-ok elrendezése egy **bináris fa** — ugyanolyan elven mint a VS Code szerkesztőpanelei.

### TypeScript típusdefiníció

```typescript
type LayoutNode =
  | {
      type: 'split'
      direction: 'row' | 'column'
      ratio: number          // 0.0–1.0, az első gyerek aránya
      first: LayoutNode
      second: LayoutNode
    }
  | {
      type: 'tile'
      tileId: string         // UUID → tiles.id
    }
```

### Példa — 3 tile (bal 2, jobb 1)

```json
{
  "type": "split",
  "direction": "row",
  "ratio": 0.5,
  "first": {
    "type": "split",
    "direction": "column",
    "ratio": 0.5,
    "first": { "type": "tile", "tileId": "uuid-github" },
    "second": { "type": "tile", "tileId": "uuid-jira" }
  },
  "second": { "type": "tile", "tileId": "uuid-docs" }
}
```

### Vizuálisan

```
┌────────────┬────────────┬─────────────────┐
│            │            │                 │
│   GitHub   │   Jira     │  Google Docs    │
│   (iframe) │   (iframe) │  (iframe)       │
│            │            │                 │
└────────────┴────────────┴─────────────────┘
```

### Ratio frissítés

Ha a user elhúzza az elválasztót → csak a `ratio` értéke változik az érintett `split` node-ban → `PATCH /workspaces/:id/layout` hívás.

---

## Template → Workspace UUID csere algoritmus

Amikor egy template alapján workspace jön létre, a template placeholder tile ID-jait valódi UUID-kra kell cserélni.

### A template struktúrája
```json
{
  "layout_json": {
    "type": "split", "direction": "row", "ratio": 0.5,
    "first": { "type": "tile", "tileId": "placeholder-1" },
    "second": { "type": "tile", "tileId": "placeholder-2" }
  },
  "tiles_json": [
    { "id": "placeholder-1", "url": "https://github.com", "title": "GitHub", "openMode": "iframe" },
    { "id": "placeholder-2", "url": "https://jira.atlassian.com", "title": "Jira", "openMode": "tab" }
  ]
}
```

### Az algoritmus (backend, TypeScript)

```typescript
function instantiateTemplate(template: WorkspaceTemplate, workspaceId: string) {
  // 1. Minden placeholder ID-hoz generálunk egy új UUID-t
  const idMapping: Record<string, string> = {}
  for (const tile of template.tilesJson) {
    idMapping[tile.id] = crypto.randomUUID()
  }

  // 2. Tile sorok létrehozása a DB-ben az új UUID-kkal
  const newTiles = template.tilesJson.map(tile => ({
    id: idMapping[tile.id],
    workspace_id: workspaceId,
    url: tile.url,
    title: tile.title,
    open_mode: tile.openMode,
    is_pinned: false,
  }))

  // 3. layout_json rekurzív bejárása és tileId-k cseréje
  function remapLayout(node: LayoutNode): LayoutNode {
    if (node.type === 'tile') {
      return { type: 'tile', tileId: idMapping[node.tileId] }
    }
    return {
      ...node,
      first: remapLayout(node.first),
      second: remapLayout(node.second),
    }
  }

  const newLayoutJson = remapLayout(template.layoutJson)

  return { newTiles, newLayoutJson }
}
```

### Összefoglalva
```
Template placeholder ID-k → idMapping → valódi DB UUID-k
layout_json rekurzív walk → minden tileId cserélve → mentés workspace-be
```

---

## Extension-only tárolás (chrome.storage.local)

Ezek **nem kerülnek az adatbázisba** — munkamenet szintű, eszközönként eltérő adatok:

```json
{
  "activeWorkspaceId": "uuid-work",
  "accessToken": "eyJhbGci...",
  "refreshToken": "...",
  "lastSyncedAt": "2026-05-30T10:00:00Z",
  "tabMapping": {
    "uuid-github": 142,
    "uuid-gmail": 87
  }
}
```

| Kulcs | Leírás |
|---|---|
| activeWorkspaceId | Melyik workspace van éppen megnyitva ezen az eszközön |
| accessToken | JWT, 15 perces élettartam |
| refreshToken | 30 napos, auto-megújul |
| lastSyncedAt | Mikor volt az utolsó sikeres sync a backenddel |
| tabMapping | tileId → böngésző tab ID (minden újraindításkor nullázódik) |

---

## SQL — teljes séma

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- users.id = auth.users.id (Supabase Auth) — trigger szinkronizálja
CREATE TABLE users (
  id              UUID PRIMARY KEY,
  email           VARCHAR(255) UNIQUE NOT NULL,
  name            VARCHAR(255),
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ
);

-- Trigger: új Supabase user → public.users sor létrehozása
CREATE OR REPLACE FUNCTION sync_user_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_from_auth();

CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id      VARCHAR(255) UNIQUE,           -- NULL amíg Free tier
  stripe_subscription_id  VARCHAR(255) UNIQUE,           -- NULL amíg Free tier
  stripe_price_id         VARCHAR(255),
  tier                    VARCHAR(20) NOT NULL DEFAULT 'free',
  status                  VARCHAR(20) NOT NULL DEFAULT 'active',
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN DEFAULT FALSE,
  trial_end               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tier_check   CHECK (tier IN ('free','pro')),
  CONSTRAINT status_check CHECK (status IN ('trialing','active','past_due','canceled','paused'))
);

CREATE TABLE devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL DEFAULT 'Browser Extension',
  browser       VARCHAR(20),
  last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  is_revoked    BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT browser_check CHECK (browser IN ('chrome','firefox','edge','brave','safari'))
);

CREATE TABLE workspaces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  icon          VARCHAR(50),
  color         VARCHAR(7),
  shortcut_key  SMALLINT CHECK (shortcut_key BETWEEN 1 AND 9),
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  layout_json   JSONB,                                   -- NULL = üres workspace, az extension "Add first tile" állapotot mutat
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_shortcut_per_user UNIQUE (user_id, shortcut_key)
);

CREATE TABLE tiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  title         VARCHAR(255),
  favicon_url   TEXT,
  open_mode     VARCHAR(10) NOT NULL DEFAULT 'iframe',
  is_pinned     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT open_mode_check CHECK (open_mode IN ('iframe','tab'))
);

CREATE TABLE auth_extension_codes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code              VARCHAR(64) UNIQUE NOT NULL,
  state             VARCHAR(64) NOT NULL,
  encrypted_tokens  TEXT NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 minutes'),
  used_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auth_codes_code ON auth_extension_codes(code);

CREATE TABLE workspace_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  icon         VARCHAR(50),
  is_official  BOOLEAN DEFAULT FALSE,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  use_count    INTEGER DEFAULT 0,
  layout_json  JSONB NOT NULL,
  tiles_json   JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexek
CREATE INDEX idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX idx_tiles_workspace_id ON tiles(workspace_id);
CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_token_hash ON devices(refresh_token_hash);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
```
