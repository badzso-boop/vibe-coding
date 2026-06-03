# FlowSpace — Production Deployment Plan

## Prioritási sorrend & összefoglaló

| # | Feladat | Miért kritikus | Becsült idő |
|---|---|---|---|
| 1 | Supabase schema + Vercel deploy | Semmi nem megy nélküle | ~2 nap |
| 2 | Token refresh | User 1h után kidobva | ~4 óra |
| 3 | Stripe | Pénz kell | ~1-2 nap |
| 4 | Chrome Web Store beadás | Terjesztés | ~3 óra + review |
| 5 | Onboarding flow | Retention | ~1 nap |
| 6 | Real-time sync | Pro feature ígéret | ~1 nap |
| 7 | Sentry + Analytics | Hibák láthatósága | ~2 óra |

**Minimum viable launch: 1+2+3+4 = ~5-6 nap munka**

---

## Fázis 1: Backend & Infrastruktúra alap (~2 nap)

### 1.1 Supabase production schema
- Supabase Dashboard → SQL Editor → futtatni: `supabase/schema.sql`
- Ellenőrizni: `subscriptions` trigger létrejött-e (automatikusan hoz létre Free tiert új usernél)

### 1.2 Environment variables

**Vercelre (`packages/web`):**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
NEXT_PUBLIC_APP_URL=https://app.flowspace.io
RESEND_API_KEY
```

**Extension (`packages/extension/.env.production`):**
```
VITE_API_URL=https://app.flowspace.io
VITE_APP_URL=https://app.flowspace.io
```

### 1.3 Vercel deploy
- Root directory: `packages/web`
- Build command: `pnpm build`
- `manifest.json` → `externally_connectable` URL frissítése: `https://app.flowspace.io/*`

---

## Fázis 2: Token refresh implementálás (~4 óra)

A `refreshToken` el van tárolva, de sem refresh endpoint, sem refresh logika nincs. A user ~1 óra után csendben kijelentkezik.

### Backend — új endpoint
`packages/web/app/api/v1/auth/extension/refresh/route.ts`
- Fogadja: `{ refreshToken: string }`
- Meghívja: `supabase.auth.refreshSession(refreshToken)`
- Visszaadja: új `accessToken`, `refreshToken`, `expiresAt`

### Extension — `packages/extension/src/lib/storage.ts`
- `getAuth()` kibővítése: ha a token lejárt → automatikusan hívja a refresh endpointot
- Ha a refresh is meghiúsul → `storage.clear()` → user visszairányítva loginra

### Extension — `packages/extension/src/lib/api.ts`
- `request()` függvénybe: ha 401-et kap → megpróbál refreshelni → újraküldi a requestet

---

## Fázis 3: Stripe integráció (~1-2 nap)

### 3.1 Stripe account & product
- Stripe Dashboardon: Product → "FlowSpace Pro" → €9/hó recurring price
- Szükséges env varok: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`

### 3.2 Checkout endpoint
`packages/web/app/api/v1/subscriptions/checkout/route.ts` — jelenleg 503 stub:
- Stripe customer létrehozása vagy meglévő keresése a `stripe_customer_id` alapján
- `stripe.checkout.sessions.create({ mode: 'subscription', price: PRICE_ID })`
- Visszaadni: `{ url: checkoutSession.url }`

### 3.3 Webhook handler
`packages/web/app/api/v1/webhooks/stripe/route.ts` — új fájl:
- `checkout.session.completed` → `tier = 'pro'`, `status = 'active'`
- `customer.subscription.deleted` → downgrade `tier = 'free'`
- `invoice.payment_failed` → `status = 'past_due'`

### 3.4 Billing portal
`packages/web/app/api/v1/subscriptions/portal/route.ts` — új fájl:
- `stripe.billingPortal.sessions.create()` → redirect URL visszaadása
- A billing page "Manage subscription" gombja hívja ezt

---

## Fázis 4: Chrome Web Store beadás (~3 óra + 1-7 nap review)

### 4.1 Előkészítés
- `$5` developer fee befizetése: Chrome Web Store Developer Dashboard
- Store assets: screenshots (1280×800 vagy 640×400), icon (128×128), leírás angolul
- Privacy policy oldal: `/privacy` route a webappba

### 4.2 Manifest final check
- `manifest.json` → `version`: `"0.1.0"` → `"1.0.0"`
- `externally_connectable` → production URL: `https://app.flowspace.io/*`

### 4.3 Build & zip
```bash
pnpm --filter extension build
cd packages/extension && zip -r flowspace-extension.zip dist/
```

### 4.4 Beadás
- Chrome Web Store Developer Dashboard → New Item → zip feltöltés
- Category: "Productivity"
- Review: általában 1-7 munkanap

---

## Fázis 5: Onboarding flow (~1 nap)

Az első 30 másodperc kritikus a retenciónál. Jelenleg nincs onboarding.

- Extension első megnyitásakor (0 workspace): "Hozd létre az első workspace-det" wizard
- Opcionális: előre definiált template workspace-ek (pl. "Work", "Research", "Social")
- Érintett fájl: `packages/extension/src/app/App.tsx` (az üres state kezelése)

---

## Fázis 6: Real-time sync (~1 nap) — Pro feature

A Pro tier "5 eszközön sync" ígéretet tesz, de nincs implementálva.

**Opció A (egyszerű): polling**
- `loadTiles()` újrahívása minden 30 másodpercben ha Pro user
- Nincs extra dependency

**Opció B (proper): Supabase Realtime**
- `@supabase/supabase-js` az extension-be
- Workspace/tile változásokra subscribe → `loadTiles()` triggerelése
- Érintett fájl: `packages/extension/src/app/App.tsx`

---

## Fázis 7: Monitoring & Analytics (~2 óra)

- **Sentry**: `@sentry/nextjs` a webappba — runtime hibák trackingje
- **Vercel Analytics**: Vercel dashboardon bekapcsolni (ingyenes)
- **Plausible vagy PostHog**: privacy-friendly analytics a landing page-re
