# 🌸 MamiCare — *The Fellowship of the Care*

> *"Even the smallest person can change the course of the future."*
> — Lady Galadriel
> **Current status:** `v1.2.0` stands as the golden baseline of `main`; every future quest branches from this stable shrine.

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

### 🏔️ v1.2.0 — *"The Two Towers"*
`2026-03-17`
- ✅ Modal sheet redesign — flex-col structure, header always fully visible
- ✅ Explicit ✕ close button on all modals (Drink, Meal, Medication, Wound)
- ✅ Drag pill affordance on bottom sheet — visual cue that it can be dismissed
- ✅ Pull-to-refresh architecture rewrite — wrapper and scroller now act independently
- ✅ Touch listener with `capture:true` — intercepts gesture before scroll child receives it
- ✅ `translateY` moved to non-scrollable wrapper (resolves iOS GPU compositing layer conflict)
- ✅ Pull-to-refresh rubber-band effect completes successfully — drag the content under the header, watch the refresh pill, and release for the same desktop animation

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

### 🧭 v1.2.1 — *"The Paths of the Dead"* *(next)*
- [ ] 🫳 Habit reminders — quick sip/drink nudges for low-output days

### 🏰 v1.3.0 — *"The Palantír"*
- [ ] 🔔 Push notification reminders — medication time, drink reminders
- [ ] 📊 Berry's Dashboard — weekly drink and meal trend charts
- [ ] 🚨 Alert when daily water intake falls below target

### 👑 v1.4.0 — *"The Scouring of the Shire"*
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
