# 🌸 MamiCare — *The Fellowship of the Care*

> *"Even the smallest person can change the course of the future."*
> — Lady Galadriel

---

## 📜 The Lore

In the land of Tangsel, where diabetes is the Shadow and blood sugar is Mount Doom, a fellowship was formed.

**Nyok** — our beloved hobbit, 68 years young, freshly returned from the fires of surgery, her left toe a sacrifice to the Dark Lord of Diabetes. She did not choose this quest. But she has us.

**The Fellowship:**
- 🧙 **Berry** — the reluctant developer, armed with a MacBook Air and too many terminal tabs
- 👩 **Wife** — co-architect of the plan, keeper of the vision
- 👵 **Nyok** — the patient, the reason, the whole point
- 🧑‍🍳 **Bu Susi** — the caregiver, the real MVP in the Shire

MamiCare is their One App — built to track meals, drinks, medications, and wound recovery. One app to log them all.

---

## ⚗️ The Tech Forge (Stack)

| Layer | Tool | Notes |
|---|---|---|
| ⚡ Frontend | React + Vite 6 | The mithril of frameworks |
| 🎨 Styling | Tailwind CSS (CDN) | Gandalf-approved utility classes |
| 💾 Storage | localStorage | Phase 1 — the Bag End of databases |
| ☁️ Hosting | Vercel | Deployed to the Cloud of Valinor |
| 📱 PWA | vite-plugin-pwa | Installable on any Shire phone |

---

## 🗺️ The Quest Log (Changelog)

### 🏆 v0.3.0 — *"The Two Timelines"*
`2026-03-18`
- ✅ Rekap/History screen — lihat semua catatan per hari
- ✅ Hari ini auto-expand, hari sebelumnya collapsed
- ✅ Summary badges per hari (💧 minum, 🍽️ makan, dll)
- ✅ PWA update prompt — notif otomatis kalau ada versi baru
- ✅ Tombol Rekap di header home screen

### 🏆 v0.2.1 — *"The Wound That Was"*
`2026-03-18`
- ✅ Wound Monitor — kondisi luka harian
- ✅ Multi-select tampilan luka (kering, basah, bengkak, dll)
- ✅ Status ganti perban
- ✅ Notes field + masuk timeline

### 🏆 v0.2.0 — *"The Two Loggers"*
`2026-03-17`
- ✅ Meal Logger — catat makan, menu, porsi
- ✅ Medication Logger — preset obat diabetes + custom input
- ✅ Notes/remarks field di setiap entry
- ✅ Delete log dengan konfirmasi (anti misclick)
- ✅ Shared modal architecture (reusable components)

### 🏆 v0.1.0 — *"There and Back Again"*
`2026-03-17`
- ✅ Project scaffolded (Vite 6 + React + Tailwind)
- ✅ Drink Logger — log jenis & jumlah minum
- ✅ Daily drink counter with progress bar
- ✅ Today's timeline (Catatan Hari Ini)
- ✅ Data persisted via localStorage
- ✅ Deployed live → [mamicare-app.vercel.app](https://mamicare-app.vercel.app)
- ✅ Installable as PWA on Android & iOS

---

## 🔭 The Road Goes Ever On (Roadmap)

### 🧭 v0.4.0 — *"The King Returns"* *(next)*
- [ ] ☁️ Supabase sync — data di cloud, Berry bisa monitor dari Singapore
- [ ] 👥 Multi-user — Berry, Wife, Bu Susi, Nyok punya akun masing-masing
- [ ] 🔔 Push notification reminders

### 🏰 v0.5.0 — *"The Scouring of the Shire"*
- [ ] 📄 Export PDF untuk dokter
- [ ] 📊 Weekly trend chart — grafik minum & makan
- [ ] 📸 Foto luka

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

