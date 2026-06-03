# FlowSpace — Fizetési & Adózási Teljes Terv

## 1. Melyik payment providert válaszd?

### Miért NEM Stripe direktben

Stripe esetén **te vagy a jogi eladó** minden felhasználónak. Ez azt jelenti:
- EU-s magánszemélyektől **27% magyar ÁFA**-t kell szedni és bevallani
- Be kell regisztrálni az **EU OSS rendszerbe** (ha €10k/év felett mész EU-s eladásban)
- Kell egy könyvelő aki érti a digitális szolgáltatások ÁFA-ját
- **Havonta** bevallás és befizetés

Solo indie projektnél ez rengeteg adminisztráció. Kerüld.

---

### Merchant of Record (MoR) — a jobb út

Ezeknél **a provider az eladó jogilag**, nem te. Ők kezelik az adókat, te csak nettó pénzt kapsz.

| | **Paddle** | **Polar.sh** | **Dodo Payments** | **Stripe Managed Payments** |
|---|---|---|---|---|
| Díj | 5% + $0.50 | 5% + $0.50 | **4% + $0.40** | 5% + $0.50 |
| Alapdíj | Nincs | Nincs (Starter) | Nincs | Nincs |
| EU ÁFA kezelés | ✅ | ✅ | ✅ | ✅ |
| Magyar adó szükséges | Csak a saját bevételedre | Csak a saját bevételedre | Csak a saját bevételedre | Csak a saját bevételedre |
| Érettség | ⭐⭐⭐⭐⭐ Proven | ⭐⭐⭐ Új | ⭐⭐⭐ Legújabb | ⭐⭐⭐⭐ Stripe mögött |
| Indie hacker DX | Jó | Kiváló (GitHub integráció) | Jó | Jó |
| Megjegyzés | Enterprise-grade | Open source, fejlesztőknek | Legolcsóbb | LemonSqueezy utódja |

**Ajánlás: Paddle** (megbízható, bevált, SaaS-ra optimalizált) vagy **Polar.sh** (fejlesztőbarát, nyílt forráskódú).

---

## 2. Mennyit kap a zsebedbe egy €9-es előfizetésből?

### Paddle esetén (5% + $0.50 ≈ €0.46)

```
Felhasználó fizet:          €9.00
Paddle díja:               -€0.45 (5%)
                           -€0.46 (~$0.50)
──────────────────────────────────────
Te kapsz:                   €8.09 / hó / user

Éves nettó 1 usertől:      €97.08
```

### Dodo Payments esetén (4% + $0.40 ≈ €0.37)

```
Felhasználó fizet:          €9.00
Dodo díja:                 -€0.36 (4%)
                           -€0.37 (~$0.40)
──────────────────────────────────────
Te kapsz:                   €8.27 / hó / user

Éves nettó 1 usertől:      €99.24
```

> A MoR maga kezeli az EU ÁFÁ-t — a €9-ből ők vonják le az ÁFÁ-t mielőtt neked kifizetik.
> Neked nem kell ÁFÁval foglalkoznod.

---

## 3. Magyar adózás — mi vonatkozik rád?

### A jó hír MoR-ral

Mikor Paddle/Polar kifizet neked, az **külföldi cégből érkező B2B bevétel**. Ez sokkal egyszerűbb,
mint végfelhasználóknak számlázni:
- Nincs ÁFA kötelezettség a kifizetések után (fordított adózás / reverse charge)
- Nincs OSS regisztráció
- Nincs havi ÁFA bevallás

**A Paddle kifizetése neked olyan, mintha egy külföldi megbízótól kapnál honoráriumot.**

---

### Vállalkozási forma — melyiket válaszd?

#### Opció A: Átalányadós egyéni vállalkozó ✅ Ajánlott

Legegyszerűbb forma kis és közepes bevételnél.

| Bevétel | Adó közelítőleg |
|---|---|
| Évi €5,000 (~2M HUF) | ~15-20% effektív |
| Évi €15,000 (~6M HUF) | ~25-30% effektív |
| Évi €30,000 (~12M HUF) | ~30-35% effektív |

Hogyan működik:
- **40% költséghányad** automatikusan (nem kell bizonylatot gyűjteni)
- A maradék 60% az adóalap
- Arra: **15% SZJA** + **18.5% TB járulék** (de TB-nek van minimuma!)
- TB minimum alap: minimálbér (2026-ban ~290,000 HUF/hó) → ~53,650 HUF/hó fix TB

#### Opció B: KATA ⚠️ Nem ajánlott SaaS-hoz

2022 óta KATA-val **csak magánszemélyektől** lehet bevételt fogadni. Paddle/Polar cégek →
KATA-val nem fogadható be tőlük. Kerüld SaaS-hoz.

#### Opció C: Kft 💼 Később, ha nő

- **9% társasági adó** (legalacsonyabb az EU-ban!)
- Osztalék után +15% SZJA
- Könyvelő kötelező (~30-50e HUF/hó)
- Érdemes fontolóra venni ha meghaladod az évi ~€20,000 bevételt

---

### Bankszámla

**Egyéni vállalkozónak nem kötelező külön üzleti számla**, de ajánlott a szétválasztás miatt.

| Opció | Pro | Contra |
|---|---|---|
| **Wise Business** ⭐ | Többdevizás, olcsó konverzió, EUR-t fogad | Nem magyar bank |
| **Revolut Business** | Modern, EUR számla | Havi díj van |
| **OTP/K&H vállalkozói** | Magyar bank, könyvelő ismeri | Drága devizaváltás |

**Legjobb megoldás:** Wise Business (EUR számla) + Magyar bank (HUF, adófizetéshez).
A Paddle EUR-ban fizet ki, Wise-on fogadod, szükség szerint váltasz át.

---

## 4. Éves pénzügyi modell — reálisan

### Fix éves költségek (MoR-ral)

| Tétel | Éves |
|---|---|
| Wise Business | ~€0-36 (forgalomtól függ) |
| Könyvelő (átalányadós) | ~€200-400 (évente egyszer adóbevallás) |
| Hetzner VPS | €60 |
| Domain | €10 |
| Supabase Free | €0 |
| Vercel Hobby | €0 |
| **Összesen** | **~€270-510/év** |

### Bevétel vs adó vs cost — 3 szcenárió

#### Pesszimista (27 fizető user, év végére)
```
Bruttó bevétel:         €2,916 / év
Paddle díja (~6%):       -€175
Neked jön:              €2,741
Magyar adó (~25%):       -€685
Fix költségek:           -€400
──────────────────────────────
Nettó zsebedbe:         ~€1,656 / év  (~€138/hó)
```

#### Realista (90 fizető user, év végére)
```
Bruttó bevétel:         €9,720 / év
Paddle díja (~6%):       -€583
Neked jön:              €9,137
Magyar adó (~28%):      -€2,558
Fix költségek:           -€400
──────────────────────────────
Nettó zsebedbe:         ~€6,179 / év  (~€515/hó)
```

#### Optimista (300 fizető user, év végére)
```
Bruttó bevétel:         €32,400 / év
Paddle díja (~6%):       -€1,944
Neked jön:              €30,456
Magyar adó (~32%):      -€9,746  (Kft érdemes lehet)
Fix költségek:            -€800  (Supabase Pro, stb.)
──────────────────────────────
Nettó zsebedbe:         ~€19,910 / év  (~€1,659/hó)
```

---

## 5. Teendők sorrendben

```
1. Egyéni vállalkozó nyitás (Webes ügyfélkapu, 1 óra)
   → ügyfélkapu.gov.hu → Vállalkozás indítás

2. Wise Business számla nyitás
   → wise.com/business (útlevéllel igazolható)

3. Paddle regisztráció (nem kell hozzá semmi különleges)
   → paddle.com → Create account → Bank adatok megadása

4. Könyvelőt keresni (évi ~1-2 találkozó elég)
   → Ajánlás: digitálisan dolgozó könyvelő (pl. Billingo-kompatibilis)

5. Paddle beépítése a kódba (2-3 óra)
   → checkout URL generálás, webhook → subscription aktiválás
```

---

> **Fontos:** Ez tájékoztató jellegű, nem adótanácsadás. Egy konzultáció egy digitális
> szolgáltatásokban jártas könyvelővel (~15-20e HUF) megéri mielőtt elindulsz.
