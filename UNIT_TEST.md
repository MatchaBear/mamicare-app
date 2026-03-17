# 🧪 MamiCare Unit Test Results

> Tested on: **2026-03-18**
> Environment: **Chrome Incognito (localhost) + Vercel Production (multi-device)**
> Tester: **Berry (MatchaBear)**
> Status: **29/29 PASSED ✅ — ALL TESTED**

---

## IDENTITY & USER

| # | Test Case | Result | Remarks |
|---|---|---|---|
| TC-01 | Buka app fresh → layar "Siapa kamu?" muncul dengan 4 pilihan | ✅ | |
| TC-02 | Tap setiap user → masuk home dengan emoji user di header | ✅ | |
| TC-03 | Tutup browser → buka lagi → langsung masuk home (no picker) | ✅ | Tested via Incognito → new tab → close → reopen |
| TC-04 | Tap emoji di header → balik ke user picker | ✅ | |

## DRINK LOGGER

| # | Test Case | Result | Remarks |
|---|---|---|---|
| TC-05 | Tap "+ Tambah Minum" → modal muncul | ✅ | |
| TC-06 | SIMPAN disabled kalau belum pilih jenis + jumlah | ✅ | |
| TC-07 | Log berhasil → counter naik + entry muncul di timeline | ✅ | |
| TC-08 | Entry timeline menampilkan nama logger | ✅ | — 🧙 Berry |
| TC-09 | Notes kosong → tidak ada baris notes di timeline | ✅ | |
| TC-10 | Notes diisi → muncul italic di bawah summary | ✅ | |

## MEAL LOGGER

| # | Test Case | Result | Remarks |
|---|---|---|---|
| TC-11 | Tap Makan → modal muncul | ✅ | |
| TC-12 | SIMPAN disabled kalau menu field + porsi belum diisi | ✅ | |
| TC-13 | Log berhasil → muncul dengan format "Waktu · menu (Porsi)" | ✅ | |

## MEDICATION LOGGER

| # | Test Case | Result | Remarks |
|---|---|---|---|
| TC-14 | Tap preset → nama auto-isi, tombol "Obat Lainnya" available | ✅ | Obat Lainnya memunculkan free text field |
| TC-15 | Bisa ketik nama obat custom via Obat Lainnya | ✅ | |
| TC-16 | SIMPAN disabled kalau nama kosong + status belum dipilih | ✅ | |

## WOUND MONITOR

| # | Test Case | Result | Remarks |
|---|---|---|---|
| TC-17 | Tap Luka → modal muncul | ✅ | |
| TC-18 | Bisa pilih lebih dari satu appearance (multi-select) | ✅ | |
| TC-19 | SIMPAN disabled kalau kondisi + perban + tampilan luka belum diisi | ✅ | Either button atau free text wajib diisi |

## DELETE

| # | Test Case | Result | Remarks |
|---|---|---|---|
| TC-20 | Tap 🗑️ → modal konfirmasi muncul dengan summary entry | ✅ | |
| TC-21 | Tap Batal → entry tidak terhapus | ✅ | |
| TC-22 | Tap Hapus → entry hilang dari timeline | ✅ | |

## REKAP SCREEN

| # | Test Case | Result | Remarks |
|---|---|---|---|
| TC-23 | Tap 📋 Rekap → masuk rekap screen | ✅ | |
| TC-24 | Hari ini auto-expand | ✅ | |
| TC-25 | Entry di rekap menampilkan nama + device | ✅ | — 🧙 Berry · 💻 Mac |
| TC-26 | Tap ← Kembali → balik home | ✅ | Multi-day view dimonitor setelah beberapa hari |

## MULTI-DEVICE SYNC

| # | Test Case | Result | Remarks |
|---|---|---|---|
| TC-27 | Log dari iPhone → refresh Mac browser → data muncul | ✅ | Tested: 📱 iPhone → 💻 Mac |
| TC-28 | Log dari Mac → refresh iPhone → data muncul | ✅ | Tested: 💻 Mac → 📱 iPhone |
| TC-29 | Delete dari satu device → refresh device lain → entry hilang | ✅ | Confirmed deleted from Supabase |

---

> *"Not all those who wander are lost — but all those who skip testing are."*
> — Gandalf, probably

