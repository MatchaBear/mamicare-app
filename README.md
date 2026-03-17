# 🌸 MamiCare — *The Fellowship of the Care*

> *"Even the smallest person can change the course of the future."*
> — Lady Galadriel

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

### 🏆 v1.1.0 — *"The Shire Calls"*
`2026-03-17`
- ✅ Realtime sync — perubahan dari HP lain langsung muncul tanpa refresh
- ✅ Fixed header — MamiCare header tidak ikut bergerak saat scroll atau pull
- ✅ Pull-to-refresh gesture — tarik konten ke bawah untuk refresh data
- ✅ Non-passive touch handler — iOS Safari & Chrome mobile conflict resolved
- ✅ Pull indicator animasi — icon berputar saat ditarik, "Lepaskan!" saat threshold tercapai
- ✅ Indicator posisi fixed antara header dan konten — header 100% tidak bergerak

### 🏆 v1.0.0 — *"The One Ring"*
`2026-03-18`
- ✅ Supabase cloud sync — semua HP baca/tulis ke DB yang sama
- ✅ Multi-device confirmed: iPhone + MacBook + any device
- ✅ User identity — siapa yang log entry (Nyok/Bu Susi/Berry/Meme)
- ✅ Device info — device apa yang dipakai (📱 iPhone / 💻 Mac)
- ✅ Wound appearance wajib diisi (button atau free text)
- ✅ Obat Lainnya button dengan conditional input field
- ✅ 26/26 unit test cases passed (localhost)
- ✅ Production deployed & stable di mamicare-app.vercel.app

### 🏆 v0.3.0 — *"The Two Timelines"*
`2026-03-17`
- ✅ Rekap/History screen — lihat semua catatan per hari
- ✅ Hari ini auto-expand, hari sebelumnya collapsed
- ✅ Summary badges per hari
- ✅ PWA update prompt — notif otomatis kalau ada versi baru

### 🏆 v0.2.1 — *"The Wound That Was"*
`2026-03-17`
- ✅ Wound Monitor — kondisi luka harian
- ✅ Multi-select tampilan luka (kering, basah, bengkak, dll)
- ✅ Status ganti perban + notes field

### 🏆 v0.2.0 — *"The Two Loggers"*
`2026-03-17`
- ✅ Meal Logger — catat makan, menu, porsi
- ✅ Medication Logger — preset obat diabetes + custom input
- ✅ Notes/remarks field di setiap entry
- ✅ Delete log dengan konfirmasi (anti misclick)

### 🏆 v0.1.0 — *"There and Back Again"*
`2026-03-17`
- ✅ Project scaffolded (Vite 6 + React + Tailwind)
- ✅ Drink Logger — log jenis & jumlah minum
- ✅ Daily drink counter with progress bar
- ✅ Data persisted via localStorage
- ✅ Deployed live → mamicare-app.vercel.app

---

## 🔭 The Road Goes Ever On (Roadmap)

### 🧭 v1.2.0 — *"The Palantír"*
- [ ] 🔔 Push notification reminders — waktunya obat, waktunya minum
- [ ] 📊 Dashboard Berry — grafik mingguan minum & makan
- [ ] 🚨 Alert kalau minum kurang dari target

### 👑 v1.3.0 — *"The Scouring of the Shire"*
- [ ] 📄 Export PDF untuk dokter
- [ ] 📸 Foto luka — upload & lihat progress

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

