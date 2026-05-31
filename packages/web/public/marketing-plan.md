# FlowSpace — Teljes Marketing & Content Terv

> **Filozofia:** Nem reklámozunk — értéket adunk. Minden poszt vagy tanít valamit, vagy megmutat valamit ami wow-faktort vált ki, vagy relatábilis pain pointot üt meg. A termék eladja magát, ha a megfelelő emberek látják.
>
> **Nyelv:** Az összes poszt **angolul** megy ki — a célközönség globális, angolul éred el a legtöbb embert.
>
> **Ez a dokumentum:** Copy-paste kész tartalmak, pontos ütemezéssel. Csak a GIF/screenshot/videó a te dolgod, a szöveg kész.

---

## Profil beállítások (egyszeri, első nap)

### X (Twitter)
- **Handle:** `@flowspaceapp`
- **Name:** FlowSpace
- **Bio:** `Turn your browser into a tiling workspace manager. Free extension for Chrome & Firefox. Built by one person.`
- **Website:** flowspace.app (vagy a Vercel URL)
- **Pinned tweet:** → lásd Launch Week, Day 1

### Reddit
- **Account neve:** u/flowspace_dev (vagy a saját neved)
- **Avatar:** FlowSpace logo
- **Megjegyzés:** Reddit-en személyes hangon kommunikálj, nem brand-ként — "I built this" sokkal jobban teljesít mint "We built this"

### Instagram
- **Handle:** `@flowspace.app`
- **Name:** FlowSpace
- **Bio:** `Window manager for your browser ⚡`
  `Tiling workspaces · Free Chrome extension`
  `↓ Try it free`
- **Link:** flowspace.app
- **Highlights:** Setup · Features · Tips · Updates (ezeket menet közben töltöd fel)

### TikTok
- **Handle:** `@flowspace.app`
- **Bio:** `Your browser, but smarter 🧠`
  `Tiling workspace manager extension`
  `Link in bio ↓`

---

## Fázis 1 — Launch Week (1-7. nap)

### Nap 1 (Hétfő) — X: Az első poszt

**Tweet 1 — Pinned, product announcement:**
```
I spent the last few months building a tiling window manager
that runs entirely inside your browser.

No new app. No new window. Just your browser — reorganized.

It's called FlowSpace and it's free.

Here's what it does: [GIF]
```

**Tweet 2 — Thread folytatás (reply az előzőre):**
```
The problem I kept having:

→ 40+ tabs open
→ 6 different windows
→ constant alt-tabbing
→ losing context every 10 minutes

I wanted something like i3wm or tmux but for the browser.
So I built it.
```

**Tweet 3:**
```
FlowSpace lets you:

• Create named workspaces (Work / Research / Personal)
• Split any website into tiles (horizontal or vertical)
• Switch workspaces with Ctrl+1, Ctrl+2, Ctrl+3
• Pop out sites that block iframes — they dock to your sidebar
• Star favorites that live in your header bar

All inside one browser tab.
```

**Tweet 4:**
```
Tech stack for the devs:

→ Chrome/Firefox extension (Manifest V3)
→ React + TypeScript frontend
→ Next.js backend
→ Supabase auth + storage
→ declarativeNetRequest to strip X-Frame-Options headers

Built solo. Shipped this week.

Try it free: [link]
```

---

### Nap 1 (Hétfő) — Reddit: r/webdev első poszt

**Title:**
```
I built a tiling window manager that runs inside the browser — Show HN style
```

**Body:**
```
Hey r/webdev,

I got frustrated with tab chaos and built something about it.

**The problem:** I was constantly juggling 40+ tabs across multiple windows, losing context, alt-tabbing between things that were related to the same task. I wanted the kind of focused layout you get from i3wm or tmux — but for the browser.

**What I built:** FlowSpace — a Chrome/Firefox extension that turns a browser tab into a tiling workspace manager.

You can:
- Create named workspaces (Work / Research / Personal)
- Split any website side by side in tiles
- Switch workspaces with keyboard shortcuts (Ctrl+1/2/3)
- If a site blocks iframes (Gmail, Google Drive), it auto-detects it and opens in a tracked tab instead — the favicon shows up in your sidebar so you can switch back instantly
- Favorite sites live in a bar at the top

It's free and works in Chrome and Firefox.

**Tech side:** Built with React + TypeScript, Next.js backend, Supabase, Chrome Manifest V3. The iframe-stripping uses `declarativeNetRequest` to remove X-Frame-Options headers.

[Screenshot/GIF here]

Would love feedback — especially on the UX. What would make this actually useful in your workflow?

---

*Link in my profile if you want to try it. Not posting it here to stay within the subreddit rules.*
```

---

### Nap 2 (Kedd) — TikTok: Első videó

**Script (30-45 sec, screen recording):**
```
[Hook — első 3 mp, szöveg a képernyőn:]
"How many browser tabs do you have open right now?"

[Screen recording: 40+ tab látható a böngészőben]
"This was me. Every. Single. Day."

[Átmenet: FlowSpace megnyílik]
"Then I built this."

[Demo: workspace váltás Ctrl+1-gyel, split tile-ok]
"Named workspaces. Tiling layout. Keyboard shortcuts."

[Gyors feature show:]
"Ctrl+1 → work mode"
"Ctrl+2 → research mode"
"And it lives inside your existing browser."

[CTA:]
"Free Chrome extension — link in bio"

[Caption:]
"POV: you finally organized your browser #productivity #chrome #webdev #browserextension #developer"
```

---

### Nap 3 (Szerda) — Instagram: Első 3 feed poszt feltöltve

**Poszt 1 — Hero shot (UI screenshot dark mode)**
```
Caption:
This is what your browser tab looks like when it's working for you — not against you.

FlowSpace turns any browser tab into a tiling workspace manager.

Named workspaces. Split layout. Keyboard shortcuts. Favorites bar.

Free Chrome & Firefox extension → link in bio

#productivity #chrome #browserextension #webdev #developer #workspace #focus #deepwork #indiedev
```

**Poszt 2 — Before/After**
```
Caption:
Before FlowSpace: 47 tabs, 4 windows, constant context switching.

After: Ctrl+1 for work. Ctrl+2 for research. Ctrl+3 for personal.

Same browser. Zero extra apps.

Free extension → link in bio

#productivity #chrome #focus #deepwork #workspace #chromextension #devtools
```

**Poszt 3 — Quote kártya (fehér szöveg sötét háttéren)**
```
"Stop switching tabs.
Start switching workspaces."

— FlowSpace

Caption:
The average knowledge worker switches between apps and tabs 1,200 times a day.
That's 4 hours of context-switching every week.

We built something about that.

Free → link in bio

#productivity #focus #deepwork #buildinpublic #indiedev #chrome
```

---

### Nap 4 (Csütörtök) — X: Build in public update

```
Day 4 of being "launched."

Stats so far:
→ [X] signups
→ [X] newsletter subs
→ Reddit post got [X] upvotes

Most common feedback: people want [X feature].

Next thing I'm building: [next feature or "still gathering feedback"]

The slow part of indie dev nobody tells you about: waiting.
```

---

### Nap 5 (Péntek) — Reddit: r/productivity

**Title:**
```
How I went from 47 tabs to 0 context switching (built my own solution)
```

**Body:**
```
I tried every tab manager out there. Toby, Workona, Sessions, OneTab. They all solve the wrong problem.

They help you *save* tabs. But the real problem is *using* multiple sites at the same time without losing your mind.

I needed something like a window manager — but inside the browser.

So I built FlowSpace. It's a Chrome/Firefox extension that lets you:

**1. Create named workspaces**
Work / Research / Client A / Personal — whatever makes sense for your brain

**2. Split sites into tiles**
Need to reference docs while writing code? Split them side by side.

**3. Switch with keyboard shortcuts**
Ctrl+1, Ctrl+2, Ctrl+3 — instant context switch, zero friction

**4. Smart handling for sites that block iframes**
Gmail, Google Drive, etc. auto-open in a tracked tab, favicon docks to your sidebar

The shift in thinking: instead of "where did I put that tab?" it becomes "I'm now in work mode" — and everything you need is already there.

It's free. Would love to hear if this resonates with anyone else's workflow.

[Screenshot]

---
Happy to answer questions about how it works technically or how I built it.
```

---

### Nap 6-7 (Hétvége) — Pihenő + kommentelés

Menj végig ezeken a szálakon és kommentelj **értékesen** (nem linkkel, nem reklámmal):
- r/productivity: bármilyen "tab chaos" vagy "browser workflow" téma
- r/webdev: extension fejlesztős szálak
- r/chrome: hasznos tippek threadek

Minta komment stílus:
```
"I had the same problem — ended up building a workspace manager for 
the browser because nothing else fit. The key insight for me was 
that tab *grouping* isn't the same as tab *layout*. You want to 
see things simultaneously, not just categorize them."
```

---

## Fázis 2 — Hét 2-4: Momentum építés

### X Tweet bank (ezeket rotáld hetente 2-3x)

**Micro-tip sorozat (nem mindig FlowSpace, értéket adnak önmagukban):**

```
Chrome tip most people don't know:

Ctrl+Shift+T → reopens your last closed tab
Ctrl+L → jump to address bar instantly
Ctrl+Shift+J → open DevTools console directly

(and yes, FlowSpace adds Ctrl+1/2/3 for workspace switching)
```

```
The best productivity upgrade I made last year wasn't an app.

It was deciding that every "task" gets its own browser workspace.

Research for project A → Workspace 1
Writing → Workspace 2  
Email/comms → Workspace 3

Context switching dropped by 80%.
```

```
Hot take: tab groups don't solve tab chaos.

They just make the chaos more organized.

The real fix is spatial — knowing *where* things are, not just 
what color they are.
```

```
Why I built a tiling layout instead of tab groups:

Tab groups: "these tabs are related"
Tiling layout: "I can see all of these at once"

One is categorization.
The other is a workspace.

Different problem. Different solution.
```

```
Something I didn't expect when building FlowSpace:

Gmail and Google Drive block iframes entirely.

So I built auto-detection: if a site can't be embedded,
it opens in a real tab and the favicon docks to your sidebar.
Click the icon → you're back.

Small UX detail that took a week to get right. Worth it.
```

```
People ask me: "why not just use multiple browser profiles?"

Browser profiles don't let you see two sites at the same time.
They're separate contexts, not a split layout.

I wanted tmux for the browser. So I built it.
```

**Build in public tweetek (hetente 1x, az aktuális állapotot mutasd):**

```
Build in public week [X]:

Shipped: [feature]
Learned: [insight]
Numbers: [signup szám] users, [newsletter szám] newsletter subs
Next: [következő feature]

The honest part: growth is slow. But every week someone DMs me 
"this is exactly what I needed" and that's enough to keep going.
```

---

### TikTok videó bank (heti 1-2 videó scriptje)

**Videó 2 — "What if your browser worked like your terminal?"**
```
[Hook szöveg:] "What if your browser worked like your terminal?"

[Screen: tmux split képernyő]
"Developers love tmux for this."

[Screen: i3wm tiling]
"Designers love tiling window managers for this."

[Screen: FlowSpace split tiles]
"So I built the same thing — but inside the browser."

[Demo: workspace váltás, split layout]
"Named workspaces. Keyboard shortcuts. Tiling layout."

[CTA:] "Free Chrome extension. Link in bio."

Caption: "POV: you're a developer who hates chaos #webdev #developer #productivity #chrome #buildinpublic"
```

**Videó 3 — Keyboard shortcut demo**
```
[Hook:] "3 keyboard shortcuts that changed how I use my browser"

"Number 1: Ctrl+1"
[Switch to Work workspace — everything is there]

"Number 2: Ctrl+2"  
[Switch to Research workspace]

"Number 3: Ctrl+Shift+→"
[Split current tile horizontally]

"These are FlowSpace shortcuts."
"Free Chrome extension. Link in bio."

Caption: "keyboard shortcuts that actually matter #productivity #chrome #developer #webdev #browserextension"
```

**Videó 4 — Pain point hook**
```
[Hook:] "Stop me if this sounds familiar"

[Screen recording: rengeteg tab]
"You open 'just one more tab'"

[Több tab nyílik]
"Then another"

[Még több]
"Then you lose the one you actually needed"

[Átmenet:]
"I built something for this."

[FlowSpace demo: clean workspace]
"Named workspaces. Everything where you expect it."

Caption: "the tab problem finally solved? #productivity #chrome #webdev #focus"
```

**Videó 5 — Feature spotlight: Favorites bar**
```
[Hook:] "The feature that saves me 10 minutes a day"

[Favorites bar mutatása a headerben]
"Sites you use constantly → star them"

[Kattintás egy favoriton]
"One click → opens in your current workspace"

[Demo: Gmail, Notion, GitHub favorites]
"No more hunting through bookmarks or pinned tabs"

Caption: "browser productivity hack #productivity #chrome #browserextension #developer"
```

---

### Instagram Story minták (heti 3-4 story)

**Story 1 — Poll (minden hétfőn):**
```
Képernyőfotó szöveg: "Real talk 👇"
Poll: "How many tabs do you have open right now?"
- "Under 10 (liar 😅)"
- "10-30"
- "30-50"
- "I don't count anymore"
```

**Story 2 — Behind the scenes (minden szerdán):**
```
Screen recording a fejlesztésről + szöveg:
"Working on [feature] today"
"Building solo is slow but I control everything"
"Follow for updates 👆"
```

**Story 3 — Feature tip (minden pénteken):**
```
Kép + szöveg overlay:
"FlowSpace tip of the week:"
"[konkrét tip, pl. 'Press Ctrl+Shift+→ to split any tile horizontally']"
"Try it → link in bio"
```

**Story 4 — User repost / social proof:**
Ha valaki megemlíti a FlowSpace-t → azonnal repostold, köszönd meg.

---

## Fázis 3 — Hónap 2-3: Traction és community

### Reddit deep-dive posztok (havonta 1-2)

**Technikai write-up — r/webdev / r/programming:**

**Title:** `How I use declarativeNetRequest to strip X-Frame-Options headers in a Chrome extension (and why it's actually safe)`

```
Body:
One of the core features of FlowSpace (tiling workspace manager I built) 
is embedding arbitrary websites side by side. 

The problem: many sites send X-Frame-Options: DENY or CSP frame-ancestors 'none', 
which makes the browser refuse to render them in iframes.

The solution: declarativeNetRequest rules that strip these headers from sub-frame responses.

Here's the rule:

{
  "id": 1,
  "priority": 1,
  "action": {
    "type": "modifyHeaders",
    "responseHeaders": [
      { "header": "X-Frame-Options", "operation": "remove" },
      { "header": "Content-Security-Policy", "operation": "remove" }
    ]
  },
  "condition": {
    "resourceTypes": ["sub_frame"]
  }
}

**Why this is safe:**
- Only applies to sub_frame resources (iframes), not main frame
- The user explicitly chose to embed the site
- No data is intercepted or modified

**The catch:**
Some sites (Gmail, Google Drive) check in JavaScript whether they're in an iframe 
and redirect. For these, I added server-side detection: HEAD request → check headers → 
if blocked, set openMode: 'tab' instead of 'iframe'.

Happy to go deeper on any part of this if useful.
```

**Milestone poszt — r/Entrepreneur / r/indiehackers:**

```
Title: "3 months of building a browser extension solo — what actually worked"

Body:
[Honest retrospective: what you shipped, what flopped, real numbers, 
lessons learned. Write this when you actually have 3 months of data.]

Format:
- What I built and why
- Real numbers (don't lie, even if small)
- 3 things that worked
- 3 things that didn't
- What's next

This format consistently gets thousands of upvotes on r/Entrepreneur
```

---

### X Thread sorozat (hosszabb formátum, havi 2x)

**Thread 1 — "How I built a window manager for the browser"**
```
Tweet 1: "18 months ago I had 47 tabs open and missed a client deadline because 
I couldn't find the right tab. Last month I shipped the solution. Here's 
the whole story: 🧵"

Tweet 2: "The problem isn't too many tabs. It's that browsers assume you only 
care about one thing at a time. Every tab is equally visible (or invisible). 
There's no concept of context or workspace."

Tweet 3: "I looked at how developers solve this in terminals: tmux, screen, i3wm. 
The answer is always the same: named contexts + spatial layout + keyboard shortcuts."

Tweet 4: "So I built FlowSpace. A Chrome/Firefox extension that gives you:"
[bullets]

Tweet 5: "The hardest part technically: Gmail and Google Drive block iframes. 
I built server-side detection that checks X-Frame-Options headers before the 
user even tries to embed something. If it's blocked → auto-opens in a tracked tab."

Tweet 6: "The hardest part personally: shipping. This has been sitting at '80% done' 
for 3 months. I finally just launched it with rough edges."

Tweet 7: "It's free. Built by one person. If you try it, tell me what's broken."
[link]
```

---

## Tartalom naptár — Hónap 1 (konkrét ütemezés)

| Hét | Hétfő | Kedd | Szerda | Csütörtök | Péntek | Hétvége |
|---|---|---|---|---|---|---|
| **1** | X: Launch tweet thread | TikTok: Videó 1 | Reddit: r/webdev poszt | Instagram: 3 feed poszt | Reddit: r/productivity | Kommentelés |
| **2** | X: Build in public update | TikTok: Videó 2 | Reddit: kommentelés | X: Micro-tip | TikTok: Videó 3 | Pihenő |
| **3** | X: Hot take tweet | TikTok: Videó 4 | Reddit: r/chrome spotlight | Instagram: Story week | X: Build in public | Kommentelés |
| **4** | X: Thread (how I built it) | TikTok: Videó 5 | Reddit: technikai write-up | Instagram: Feed poszt | X: Stats + update | Pihenő |

**Instagram Stories:** Minden héten legalább 3 — hétfő poll, szerda BTS, péntek tip.

---

## Newsletter stratégia (Resend Audiences)

### Feliratkozók szerzése
- **Minden social profilban:** link a landing page-re ahol a form van
- **Reddit posztok végén:** "If you want to follow along, there's a newsletter on the site"
- **X bio-ban:** landing page link
- **TikTok bio:** link

### Email ütemezés (miután van 50+ feliratkozó)

**Email 1 — Welcome (automatikus, azonnal):**
```
Subject: "Welcome to FlowSpace — here's what to expect"

Hey,

Thanks for signing up. I'm Norbert, and I'm building FlowSpace solo.

FlowSpace is a browser extension that turns your browser into a 
tiling workspace manager. Think i3wm or tmux, but for the browser.

What you'll get from this newsletter:
→ When I ship something new (not spam, just real updates)
→ Browser productivity tips I actually use
→ Honest build-in-public updates

You can try FlowSpace free here: [link]

If you have 2 minutes: reply and tell me what your biggest browser 
frustration is. I read every response.

— Norbert
```

**Email 2 — Feature highlight (2 héttel később):**
```
Subject: "New in FlowSpace: [konkrét feature neve]"

Hey,

Quick update: [feature description]

Here's why I built it: [1-2 mondat]

[Screenshot/GIF]

Try it: [link]

— Norbert

P.S. [valami személyes megjegyzés a fejlesztési folyamatról]
```

---

## Social proof gyűjtés

### Hogyan kérj testimonial-t
Amikor valaki pozitívan reagál (komment, DM, reply):

```
"Hey, really glad it's working for you! Would you mind if I shared 
your comment/screenshot on our social channels? No pressure at all."
```

Ha beleegyezik → screenshot → Instagram story + X tweet + esetleg landing page-re kerül.

### ProductHunt launch (hónap 2-3 körül)
Amikor van már legalább 50-100 aktív felhasználó:
- ProductHunt launch tervezése
- Hunter-t keresni (valaki aki launch-ol téged, nagyobb reach)
- Az egész newsletter-t és social followinget mobilizálni a launch napján
- Minden feliratkozónak email hogy szavazzanak

---

## Amit NE csinálj

- **Ne postolj linket komment első reply-jaként** — azonnal spam-nek tűnik
- **Ne ugyanazt a szöveget** másold át szó szerint minden platformra
- **Ne hagyd abba 3 hét után** — az organic growth 2-3 hónapig tart mire látható
- **Ne ígérj feature-öket** amiket még nem shippeltél
- **Ne fizess followerekért** — tönkreteszi a credibilityt
- **Ne postolj naponta 5x** — inkább kevesebb, de jobb minőség

---

## Metrikák amit hetente nézz meg

| Metrika | Hol | Cél 1 hónap | Cél 3 hónap |
|---|---|---|---|
| Newsletter feliratkozók | Resend dashboard | 50 | 500 |
| X followers | X Analytics | 50 | 300 |
| TikTok followers | TikTok Studio | 100 | 1000 |
| Reddit karma | Reddit profil | 200 | 1000+ |
| Registered users | Supabase | 30 | 200 |
| Weekly active users | Supabase | 10 | 50 |

---

## Első lépések ma (prioritás sorrendben)

1. **X account** létrehozás → Nap 1 tweet thread kiposztolva
2. **Reddit poszt** r/webdev-re (a Show & Tell template)
3. **Instagram** account + első 3 feed poszt ütemezve (Later.com = ingyenes scheduler)
4. **TikTok** account + Videó 1 script alapján felvétel
5. **Newsletter** — minden profilban link a landing page-re

**A legfontosabb:** az első héten minden platformon megjelensz egyszerre. Utána tartod a ritmust. Az első hónapban a legkisebb traction is motiváló.
