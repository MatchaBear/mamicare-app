# 🌸 MamiCare — *The Fellowship of the Care*

> *"Even the smallest person can change the course of the future."*
> — Lady Galadriel
> **Current status:** `v1.4.0` stands as the golden production milestone of `main`; the slingshot pull-to-refresh quest now lives in the stable realm.

---

## 📜 The Lore

In the land of Tangsel, where diabetes is the Shadow and blood sugar is Mount Doom, a fellowship was formed.

**Nyok** — our beloved hobbit, 68 years young, freshly returned from the fires of surgery, her left toe a sacrifice to the Dark Lord of Diabetes. She did not choose this quest. But she has us.

**The Fellowship:**
- 🧙 **Berry** — the reluctant developer, armed with a MacBook Air and too many terminal tabs
- 👩 **Meme** — co-architect of the plan, keeper of the vision
- 👵 **Nyok** — the patient, the reason, the whole point
- 🧑‍🍳 **Bu Susi** — the caregiver, the real MVP in the Shire

MamiCare is their One App — built to track meals, drinks, medications, and wound recovery. One app to log them all.

---

## ⚗️ The Tech Forge (Stack)

| Layer | Tool | Notes |
|---|---|---|
| ⚡ Frontend | React + Vite 6 | The mithril of frameworks |
| 🎨 Styling | Tailwind CSS (CDN) | Gandalf-approved utility classes |
| ☁️ Database | Supabase (PostgreSQL) | The One Ring to sync them all |
| 🌐 Hosting | Vercel | Deployed to the Cloud of Valinor |
| 📱 PWA | vite-plugin-pwa | Installable on any Shire phone |

---

## 🗺️ The Quest Log (Changelog)

### 🏔️ v1.4.0 — *"The Slingshot of the Shire"*
`2026-03-20`
- ✅ `feature/local-ptr-slingshot` merged into `main` as the new production milestone
- ✅ Viewport-level touch capture — pull gesture now starts from the fixed app shell instead of the scrolling list
- ✅ Native browser pull-to-refresh blocked during active custom drag — prevents Safari / Chrome from stealing the gesture
- ✅ iOS-style rubber-band damping — downward drag now stretches with resistance instead of moving linearly
- ✅ Drag activation threshold + axis lock — tiny or mostly horizontal swipes no longer arm the refresh by accident
- ✅ Release animation + refresh hold offset — content settles back smoothly while refresh continues
- ✅ Pull indicator now stays visible below the header during the slingshot interaction on mobile
- ✅ Global overscroll protection added to app shell — keeps the effect local and stops browser bounce from fighting it
- ✅ This release closes the `v1.3.0` gap where refresh worked but the spinner still failed to appear reliably on mobile

### 🏔️ v1.3.0 — *"The Return of the King"*
`2026-03-18`
- ✅ Optimistic saves — entry appears instantly in UI, rolls back if Supabase fails
- ✅ Optimistic deletes — entry disappears instantly, restores if delete fails
- ✅ `saving` state — Save button shows "Menyimpan..." and disables during in-flight request
- ✅ `deleting` state — Delete button shows "Menghapus..." and disables during in-flight request
- ✅ `try/finally` on all async flows — loading and refreshing spinners can never get permanently stuck
- ✅ Realtime subscription now handles INSERT + UPDATE + DELETE (was missing UPDATE)
- ✅ `upsertLogInState` shared helper — realtime and optimistic updates use one consistent merge function
- ✅ Improved ID generation — crypto-backed randomness, bigint-safe to prevent cross-device collisions
- ✅ Fixed Tailwind dynamic grid — replaced `grid-cols-${cols}` with a static class map (was silently broken in production builds)
- ✅ Modal backdrop tap disabled by default — reduces accidental dismissal for older / less tech-savvy users
- ✅ Wound form "other appearance" field now clearly optional in both UI label and save logic
- ✅ `isMounted` guard on initial load — prevents state updates on unmounted component
- ✅ `touchcancel` handler added alongside `touchend` — covers interrupted gestures (incoming call, etc.)
- ✅ `refreshingRef` guard — prevents double-triggering refresh if gesture fires while already refreshing
- ✅ `MIN_REFRESH_MS = 420ms` — minimum visible spinner duration, prevents jarring instant-flash on fast connections
- ✅ `overpullY` extra rubber-band past trigger threshold — more elastic feel when pulling beyond 80px
- ✅ `100dvh` viewport height — fixes layout on mobile browsers with dynamic toolbars
- ✅ `safe-area-inset` padding on header and modals — correct spacing on notch / Dynamic Island devices
- ✅ Pull indicator uses opacity + translateY (not height-based) — smoother entrance animation
- ✅ Full inline code documentation — every component and design decision explained
- ⚠️ Pull-to-refresh rubber-band spinner below header — gesture detected and data refreshes correctly, visual indicator still not appearing on mobile

### 🏔️ v1.2.0 — *"The Two Towers"*
`2026-03-17`
- ✅ Modal sheet redesign — flex-col structure, header always fully visible
- ✅ Explicit ✕ close button on all modals (Drink, Meal, Medication, Wound)
- ✅ Drag pill affordance on bottom sheet — visual cue that it can be dismissed
- ✅ Pull-to-refresh architecture rewrite — wrapper and scroller fully separated
- ✅ Touch listener with `capture:true` — intercepts gesture before scroll child receives it
- ✅ `translateY` moved to non-scrollable wrapper (resolves iOS GPU compositing layer conflict)

### 🏆 v1.1.0 — *"The Shire Calls"*
`2026-03-17`
- ✅ Realtime sync — changes from other devices appear instantly without manual refresh
- ✅ Fixed header — MamiCare header stays locked during scroll and pull gestures
- ✅ Pull-to-refresh gesture — drag content down to refresh data
- ✅ Non-passive touch handler — resolved iOS Safari & Chrome mobile scroll conflict
- ✅ Animated pull indicator — icon rotates on drag, "Release!" shown at trigger threshold
- ✅ Indicator sits between header and content — header never moves

### 🏆 v1.0.0 — *"The One Ring"*
`2026-03-18`
- ✅ Supabase cloud sync — all devices read and write to the same database
- ✅ Multi-device confirmed: iPhone + MacBook + any browser
- ✅ User identity — every entry records who logged it (Nyok / Bu Susi / Berry / Meme)
- ✅ Device info — records which device was used (📱 iPhone / 💻 Mac)
- ✅ Wound appearance field is required (quick-select buttons or free text)
- ✅ "Other Medication" button with conditional text input
- ✅ 26/26 unit test cases passed (localhost)
- ✅ Production deployed & stable at mamicare-app.vercel.app

### 🏆 v0.3.0 — *"The Two Timelines"*
`2026-03-17`
- ✅ Recap / History screen — view all entries grouped by day
- ✅ Today auto-expands, previous days start collapsed
- ✅ Daily summary badges (drinks, meals, meds, wound check)
- ✅ PWA update prompt — automatic notification when a new version is available

### 🏆 v0.2.1 — *"The Wound That Was"*
`2026-03-17`
- ✅ Wound Monitor — daily wound condition logging
- ✅ Multi-select wound appearance (dry, wet, swollen, etc.)
- ✅ Dressing change status + notes field

### 🏆 v0.2.0 — *"The Two Loggers"*
`2026-03-17`
- ✅ Meal Logger — log meal time, menu, and portion size
- ✅ Medication Logger — preset diabetes medications + custom input
- ✅ Notes / remarks field on every entry
- ✅ Delete entry with confirmation dialog (anti-misclick)

### 🏆 v0.1.0 — *"There and Back Again"*
`2026-03-17`
- ✅ Project scaffolded (Vite 6 + React + Tailwind)
- ✅ Drink Logger — log drink type and volume
- ✅ Daily drink counter with progress bar
- ✅ Data persisted via localStorage
- ✅ Deployed live → mamicare-app.vercel.app

---

## 🔭 The Road Goes Ever On (Roadmap)

### 🏰 v1.5.0 — *"The Palantír"* *(next)*
- [ ] 🔔 Push notification reminders — medication time, drink reminders
- [ ] 📊 Berry's Dashboard — weekly drink and meal trend charts
- [ ] 🚨 Alert when daily water intake falls below target

### 👑 v1.6.0 — *"The Scouring of the Shire"*
- [ ] 📄 PDF export for doctor appointments
- [ ] 📸 Wound photo upload — visual progress over time

---

## 🚀 Run Locally
```bash
git clone git@github.com:MatchaBear/mamicare-app.git
cd mamicare-app
npm install
npm run dev
```

Open `http://localhost:5173`

---

> *"I can't carry the app for you — but I can carry you."*
> — Samwise Gamgee, probably, about Supabase
