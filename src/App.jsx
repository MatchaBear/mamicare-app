import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { supabase } from './supabase'

/**
 * ============================================================
 * App.jsx — MamiCare
 * ============================================================
 *
 * WHAT THIS APP IS
 * - A mobile-first shared caregiving log.
 * - Family / caregiver team can record:
 *   1) drink intake
 *   2) meals
 *   3) medicine
 *   4) wound condition
 *
 * HIGH-LEVEL COMPONENT BREAKDOWN
 * - UserPickerScreen: choose who is currently using the device
 * - UpdatePrompt: PWA new-version prompt
 * - ModalShell: shared bottom-sheet shell for all data-entry modals
 * - DrinkModal / MealModal / MedModal / WoundModal: form entry screens
 * - DrinkCard: today hydration progress
 * - TodayTimeline: today's logs
 * - RekapScreen: grouped history / archive screen
 * - App: state orchestration, Supabase sync, pull-to-refresh, screen routing
 *
 * IMPROVEMENTS INCLUDED IN THIS VERSION
 * 1. Fixed Tailwind dynamic grid issue:
 *    - `grid-cols-${cols}` can fail in Tailwind because it may not be statically detected.
 *    - Replaced with a safe class map.
 *
 * 2. Made modal closing more intentional:
 *    - Explicit close button remains the main way to close.
 *    - Backdrop tap is disabled by default to reduce accidental closure,
 *      especially for older / non-technical users.
 *
 * 3. Realtime now handles INSERT + UPDATE + DELETE:
 *    - Original version only handled INSERT and DELETE.
 *    - This matters because `.upsert()` can produce UPDATE behavior too.
 *
 * 4. Added safer async flow:
 *    - `try/finally` around loading and refreshing state.
 *    - Prevents "refreshing" spinner from getting stuck if request fails.
 *
 * 5. Improved local state merge logic:
 *    - Realtime and optimistic updates now share one helper (`upsertLogInState`)
 *      to reduce duplication bugs.
 *
 * 6. Improved ID generation:
 *    - Uses `crypto.randomUUID()` when available instead of only Date.now().
 *    - Helps avoid collisions across multiple devices.
 *
 * 7. Cleaned up wording mismatch in wound form:
 *    - "Other appearance" text is now clearly optional in the UI and logic.
 *
 * NOTE ABOUT DATABASE COMPATIBILITY
 * - I kept the saved payload compatible with your current code style.
 * - I did NOT add new DB columns here, because if your Supabase table doesn't
 *   already have them, inserts would fail.
 */

/* ============================================================
 * Helpers
 * ============================================================
 */

const today = () => new Date().toISOString().split('T')[0]

const nowTime = () =>
  new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function upsertLogInState(prevLogs, incomingLog) {
  const index = prevLogs.findIndex(l => l.id === incomingLog.id)

  if (index === -1) {
    return [incomingLog, ...prevLogs].sort(
      (a, b) => Number(b.timestamp) - Number(a.timestamp)
    )
  }

  const next = [...prevLogs]
  next[index] = incomingLog
  return next.sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
}

const SAFE_TOP_PAD = 'calc(env(safe-area-inset-top, 0px) + 12px)'
const SAFE_BOTTOM_PAD = 'calc(env(safe-area-inset-bottom, 0px) + 24px)'
const APP_VIEWPORT_HEIGHT = '100dvh'
const TRIGGER_PX = 80
const MAX_PULL_Y = 56
const MIN_REFRESH_MS = 420

/* ============================================================
 * User Identity
 * ============================================================
 *
 * Purpose:
 * - This lets the household share the same app while still recording
 *   who created each log entry.
 * - Identity is stored locally on the device so the user doesn't need
 *   to re-pick themselves every time.
 */

const USERS = [
  { id: 'nyok', name: 'Nyok', emoji: '👵' },
  { id: 'susi', name: 'Sus Susi', emoji: '🧑‍🍳' },
  { id: 'berry', name: 'Berry', emoji: '🧙' },
  { id: 'meme', name: 'Mega', emoji: '👩' },
]

function getCurrentUser() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('mamicare_user') || null
}

function setStoredCurrentUser(userId) {
  if (typeof window === 'undefined') return
  localStorage.setItem('mamicare_user', userId)
}

function clearStoredCurrentUser() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('mamicare_user')
}

function getDeviceInfo() {
  if (typeof navigator === 'undefined') return '🌐 Browser'

  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return '📱 iPhone'
  if (/iPad/.test(ua)) return '📱 iPad'
  if (/Android/.test(ua)) return '📱 Android'
  if (/Mac/.test(ua)) return '💻 Mac'
  if (/Windows/.test(ua)) return '🖥️ Windows'
  return '🌐 Browser'
}

/* ============================================================
 * Data layer (Supabase)
 * ============================================================
 *
 * Purpose:
 * - Keep all DB access in small helper functions.
 * - Makes the main App component easier to read.
 */

async function loadLogs() {
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Failed to load logs:', error)
    return []
  }

  return data || []
}

async function saveLog(log) {
  const { error } = await supabase.from('logs').upsert(log)

  if (error) {
    console.error('Failed to save log:', error)
    throw error
  }
}

async function deleteLog(id) {
  const { error } = await supabase.from('logs').delete().eq('id', id)

  if (error) {
    console.error('Failed to delete log:', error)
    throw error
  }
}

/* ============================================================
 * User picker screen
 * ============================================================
 *
 * Purpose:
 * - Acts as a very simple "who is using this device right now?" gate.
 * - Large touch targets, emoji, and minimal text keep it elderly-friendly.
 */

function UserPickerScreen({ onPicked }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <p className="text-6xl mb-4">🌸</p>
      <h1 className="text-3xl font-black text-gray-800 mb-2">MamiCare</h1>
      <p className="text-gray-500 text-lg mb-10 text-center">
        Siapa kamu hari ini?
      </p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {USERS.map(user => (
          <button
            key={user.id}
            onClick={() => {
              setStoredCurrentUser(user.id)
              onPicked(user.id)
            }}
            className="bg-white border-2 border-gray-200 rounded-3xl py-8 flex flex-col items-center gap-2 active:scale-95 transition-transform shadow-sm"
          >
            <span className="text-5xl">{user.emoji}</span>
            <span className="text-lg font-bold text-gray-800">{user.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
 * PWA update prompt
 * ============================================================
 *
 * Purpose:
 * - If a new app version is available, show a simple banner and let the user
 *   refresh into the latest version.
 */

function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50">
      <div className="bg-gray-800 text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-xl">
        <p className="text-sm font-medium">🆕 Ada versi terbaru!</p>
        <button
          onClick={() => updateServiceWorker(true)}
          className="bg-sky-500 text-white text-sm font-bold px-4 py-2 rounded-xl ml-4 active:bg-sky-600"
        >
          Perbarui
        </button>
      </div>
    </div>
  )
}

/* ============================================================
 * Reusable form bits
 * ============================================================
 *
 * These are UI primitives used by multiple modals.
 * Keeping them small and reusable makes the file much easier to maintain.
 */

function NotesField({ value, onChange }) {
  return (
    <div className="mb-6">
      <p className="text-gray-500 text-lg mb-2">Catatan (opsional)</p>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Tambahkan catatan di sini..."
        rows={3}
        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 resize-none focus:outline-none focus:border-sky-400"
      />
    </div>
  )
}

/**
 * ModalShell
 *
 * Breakdown:
 * - Shared bottom-sheet style wrapper for all entry forms.
 * - Sticky header with title + close button.
 * - Content area scrolls if modal content gets tall.
 *
 * Improvement note:
 * - Backdrop tap is intentionally NOT used to close by default.
 * - This reduces accidental dismissal for older users.
 * - If you want backdrop close again later, set `closeOnBackdrop={true}`.
 */
function ModalShell({
  onClose,
  title,
  children,
  closeOnBackdrop = false,
}) {
  function handleBackdropClick(e) {
    if (!closeOnBackdrop) return
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white w-full rounded-t-3xl overflow-hidden flex flex-col shadow-2xl"
        style={{
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 8px)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 pb-2 bg-white z-10 border-b border-gray-100 flex-shrink-0"
          style={{ paddingTop: SAFE_TOP_PAD }}
        >
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>

          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-full p-2 transition-colors"
            aria-label="Tutup"
          >
            <X size={22} className="text-gray-500" />
          </button>
        </div>

        <div
          className="px-6 pt-4 overflow-y-auto"
          style={{ paddingBottom: `calc(${SAFE_BOTTOM_PAD} + 16px)` }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * OptionGroup
 *
 * Breakdown:
 * - Shared button grid for select-one choice groups.
 *
 * Improvement note:
 * - Tailwind does not always generate dynamic classes like `grid-cols-${cols}`.
 * - So we use a static class map instead.
 */
function OptionGroup({ options, selected, onSelect, cols = 2 }) {
  const colClassMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }

  const gridColsClass = colClassMap[cols] || 'grid-cols-2'

  return (
    <div className={`grid ${gridColsClass} gap-3 mb-6`}>
      {options.map(opt => (
        <button
          key={String(opt.id)}
          onClick={() => onSelect(opt.id)}
          className={`py-4 text-lg rounded-2xl border-2 font-medium transition-all ${selected === opt.id
              ? 'bg-sky-500 text-white border-sky-500'
              : 'bg-white text-gray-700 border-gray-200'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function SaveButton({ canSave, onSave, saving = false }) {
  return (
    <button
      onClick={() => canSave && !saving && onSave()}
      disabled={!canSave || saving}
      className={`w-full py-5 text-xl font-bold rounded-2xl transition-all ${canSave && !saving
          ? 'bg-sky-500 text-white active:bg-sky-600'
          : 'bg-gray-100 text-gray-400'
        }`}
    >
      {saving ? 'Menyimpan...' : '✅ SIMPAN'}
    </button>
  )
}

/* ============================================================
 * Delete confirmation modal
 * ============================================================
 *
 * Purpose:
 * - Prevent accidental deletion from the timeline.
 */

function DeleteConfirmModal({ log, onConfirm, onCancel, deleting = false }) {
  const icons = {
    drink: '💧',
    meal: '🍽️',
    med: '💊',
    wound: '🩹',
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
        <p className="text-5xl text-center mb-4">{icons[log.type]}</p>

        <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
          Hapus catatan ini?
        </h3>

        <p className="text-gray-500 text-center mb-6">{log.summary}</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="py-4 text-lg rounded-2xl border-2 border-gray-200 text-gray-600 font-medium disabled:opacity-50"
          >
            Batal
          </button>

          <button
            onClick={onConfirm}
            disabled={deleting}
            className="py-4 text-lg rounded-2xl bg-red-500 text-white font-bold disabled:opacity-50"
          >
            {deleting ? 'Menghapus...' : '🗑️ Hapus'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
 * Entry modals
 * ============================================================
 *
 * Each modal is focused on one kind of caregiving log.
 * The form logic stays local to the modal, then sends a small clean payload
 * up to App through `onSave`.
 */

/* ---------------------------- DrinkModal ---------------------------- */
/**
 * Breakdown:
 * - Captures drink type, amount, and optional notes.
 * - Feeds into hydration progress card on the home screen.
 */
function DrinkModal({ onClose, onSave, saving = false }) {
  const [drinkKind, setDrinkKind] = useState(null)
  const [amount, setAmount] = useState(null)
  const [notes, setNotes] = useState('')

  const drinkTypes = [
    { id: 'water', label: '💧 Air Putih' },
    { id: 'tea', label: '🍵 Teh' },
    { id: 'juice', label: '🥤 Jus' },
    { id: 'soup', label: '🍲 Kuah/Sup' },
  ]

  const amounts = [
    { id: 0.5, label: '½ gelas' },
    { id: 1, label: '1 gelas' },
    { id: 2, label: '2 gelas' },
  ]

  return (
    <ModalShell onClose={onClose} title="💧 Catat Minum">
      <p className="text-gray-500 text-lg mb-3">Minuman apa?</p>
      <OptionGroup
        options={drinkTypes}
        selected={drinkKind}
        onSelect={setDrinkKind}
        cols={2}
      />

      <p className="text-gray-500 text-lg mb-3">Berapa banyak?</p>
      <OptionGroup
        options={amounts}
        selected={amount}
        onSelect={setAmount}
        cols={3}
      />

      <NotesField value={notes} onChange={setNotes} />

      <SaveButton
        canSave={drinkKind && amount}
        saving={saving}
        onSave={() => onSave({ type: drinkKind, amount, notes })}
      />
    </ModalShell>
  )
}

/* ----------------------------- MealModal ---------------------------- */
/**
 * Breakdown:
 * - Captures meal timing, food text, portion, and notes.
 * - `foodText` is free text because meals vary too much for strict presets.
 */
function MealModal({ onClose, onSave, saving = false }) {
  const [mealType, setMealType] = useState(null)
  const [foodText, setFoodText] = useState('')
  const [portion, setPortion] = useState(null)
  const [notes, setNotes] = useState('')

  const mealTypes = [
    { id: 'breakfast', label: '🌅 Sarapan' },
    { id: 'lunch', label: '☀️ Makan Siang' },
    { id: 'dinner', label: '🌙 Makan Malam' },
    { id: 'snack', label: '🍪 Camilan' },
  ]

  const portions = [
    { id: 'small', label: '🥣 Sedikit' },
    { id: 'medium', label: '🍽️ Normal' },
    { id: 'large', label: '🫕 Banyak' },
  ]

  const canSave = mealType && foodText.trim().length > 0 && portion

  return (
    <ModalShell onClose={onClose} title="🍽️ Catat Makan">
      <p className="text-gray-500 text-lg mb-3">Waktu makan?</p>
      <OptionGroup
        options={mealTypes}
        selected={mealType}
        onSelect={setMealType}
        cols={2}
      />

      <p className="text-gray-500 text-lg mb-3">Menu apa?</p>
      <textarea
        value={foodText}
        onChange={e => setFoodText(e.target.value)}
        placeholder="Contoh: Nasi putih, ayam goreng, sayur bayam..."
        rows={3}
        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 resize-none focus:outline-none focus:border-sky-400 mb-6"
      />

      <p className="text-gray-500 text-lg mb-3">Porsinya?</p>
      <OptionGroup
        options={portions}
        selected={portion}
        onSelect={setPortion}
        cols={3}
      />

      <NotesField value={notes} onChange={setNotes} />

      <SaveButton
        canSave={canSave}
        saving={saving}
        onSave={() => onSave({ mealType, foodText, portion, notes })}
      />
    </ModalShell>
  )
}

/* ------------------------------ MedModal ---------------------------- */
/**
 * Breakdown:
 * - Offers common medicine presets but still supports manual entry.
 * - Tracks whether medicine was taken / skipped / half dose.
 */
function MedModal({ onClose, onSave, saving = false }) {
  const [medName, setMedName] = useState('')
  const [isOther, setIsOther] = useState(false)
  const [status, setStatus] = useState(null)
  const [notes, setNotes] = useState('')

  const presets = [
    'Metformin',
    'Glibenclamide',
    'Glimepiride',
    'Insulin',
    'Acarbose',
    'Vitamin B12',
  ]

  const statuses = [
    { id: 'taken', label: '✅ Sudah Minum' },
    { id: 'skipped', label: '❌ Tidak Minum' },
    { id: 'half', label: '½ Setengah Dosis' },
  ]

  const canSave = medName.trim().length > 0 && status

  return (
    <ModalShell onClose={onClose} title="💊 Catat Obat">
      <p className="text-gray-500 text-lg mb-3">Obat apa?</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map(preset => (
          <button
            key={preset}
            onClick={() => {
              setMedName(preset)
              setIsOther(false)
            }}
            className={`px-4 py-2 rounded-full border-2 text-base font-medium transition-all ${medName === preset && !isOther
                ? 'bg-purple-500 text-white border-purple-500'
                : 'bg-white text-gray-600 border-gray-200'
              }`}
          >
            {preset}
          </button>
        ))}

        <button
          onClick={() => {
            setMedName('')
            setIsOther(true)
          }}
          className={`px-4 py-2 rounded-full border-2 text-base font-medium transition-all ${isOther
              ? 'bg-purple-500 text-white border-purple-500'
              : 'bg-white text-gray-600 border-gray-200'
            }`}
        >
          ✏️ Obat Lainnya
        </button>
      </div>

      {isOther && (
        <input
          type="text"
          value={medName}
          onChange={e => setMedName(e.target.value)}
          placeholder="Silakan isi nama obat di sini..."
          className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 focus:outline-none focus:border-purple-400 mb-6"
        />
      )}

      <p className="text-gray-500 text-lg mb-3">Status?</p>
      <OptionGroup
        options={statuses}
        selected={status}
        onSelect={setStatus}
        cols={1}
      />

      <NotesField value={notes} onChange={setNotes} />

      <SaveButton
        canSave={canSave}
        saving={saving}
        onSave={() => onSave({ medName, status, notes })}
      />
    </ModalShell>
  )
}

/* ----------------------------- WoundModal --------------------------- */
/**
 * Breakdown:
 * - Tracks daily wound condition and appearance.
 * - Allows multiple appearance tags because wound state is rarely one single thing.
 *
 * Improvement note:
 * - In the old version, the placeholder implied "other appearance" text was mandatory,
 *   but the logic did not actually require it.
 * - Here the field is clearly marked optional and matches the save logic.
 */
function WoundModal({ onClose, onSave, saving = false }) {
  const [condition, setCondition] = useState(null)
  const [appearance, setAppearance] = useState([])
  const [appearanceOther, setAppearanceOther] = useState('')
  const [dressingChanged, setDressingChanged] = useState(null)
  const [notes, setNotes] = useState('')

  const conditions = [
    { id: 'better', label: '😊 Lebih Baik' },
    { id: 'same', label: '😐 Sama Saja' },
    { id: 'worse', label: '😟 Memburuk' },
  ]

  const appearanceOptions = [
    { id: 'dry', label: '🏜️ Kering' },
    { id: 'wet', label: '💦 Basah' },
    { id: 'swollen', label: '🫧 Bengkak' },
    { id: 'redness', label: '🔴 Kemerahan' },
    { id: 'discharge', label: '🟡 Ada Cairan' },
    { id: 'smell', label: '👃 Berbau' },
  ]

  function toggleAppearance(id) {
    setAppearance(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const canSave =
    condition &&
    dressingChanged !== null &&
    (appearance.length > 0 || appearanceOther.trim().length > 0)

  return (
    <ModalShell onClose={onClose} title="🩹 Cek Kondisi Luka">
      <p className="text-gray-500 text-lg mb-3">Kondisi hari ini?</p>
      <OptionGroup
        options={conditions}
        selected={condition}
        onSelect={setCondition}
        cols={3}
      />

      <p className="text-gray-500 text-lg mb-3">
        Tampilan luka? <span className="text-sm">(pilih semua yang sesuai)</span>
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {appearanceOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => toggleAppearance(opt.id)}
            className={`py-4 text-lg rounded-2xl border-2 font-medium transition-all ${appearance.includes(opt.id)
                ? 'bg-rose-500 text-white border-rose-500'
                : 'bg-white text-gray-700 border-gray-200'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={appearanceOther}
        onChange={e => setAppearanceOther(e.target.value)}
        placeholder="Deskripsi tampilan luka lainnya... (opsional)"
        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 focus:outline-none focus:border-rose-400 mb-6"
      />

      <p className="text-gray-500 text-lg mb-3">Ganti perban hari ini?</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { id: true, label: '✅ Sudah Ganti' },
          { id: false, label: '⏭️ Belum Ganti' },
        ].map(opt => (
          <button
            key={String(opt.id)}
            onClick={() => setDressingChanged(opt.id)}
            className={`py-4 text-lg rounded-2xl border-2 font-medium transition-all ${dressingChanged === opt.id
                ? 'bg-sky-500 text-white border-sky-500'
                : 'bg-white text-gray-700 border-gray-200'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <NotesField value={notes} onChange={setNotes} />

      <SaveButton
        canSave={canSave}
        saving={saving}
        onSave={() =>
          onSave({
            condition,
            appearance,
            appearanceOther,
            dressingChanged,
            notes,
          })
        }
      />
    </ModalShell>
  )
}

/* ============================================================
 * Home widgets
 * ============================================================
 */

/* ----------------------------- DrinkCard ---------------------------- */
/**
 * Breakdown:
 * - Summarizes today's hydration.
 * - Uses a simple 8-glass goal.
 * - Gradient changes based on progress to give quick visual feedback.
 */
function DrinkCard({ logs, onAdd }) {
  const todayDrinks = logs.filter(l => l.type === 'drink' && l.date === today())
  const totalCups = todayDrinks.reduce((sum, log) => sum + Number(log.amount || 0), 0)

  const goal = 8
  const pct = Math.min((totalCups / goal) * 100, 100)

  const colorClass =
    totalCups < 4
      ? 'from-sky-400 to-blue-500'
      : totalCups < goal
        ? 'from-sky-500 to-cyan-400'
        : 'from-green-400 to-emerald-500'

  return (
    <div className={`bg-gradient-to-br ${colorClass} rounded-3xl p-5 text-white mb-4 shadow-lg`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-white/80 text-sm font-medium uppercase tracking-wide">
            Minum Hari Ini
          </p>
          <p className="text-4xl font-black mt-1">
            {totalCups} <span className="text-2xl font-bold">/ {goal} gelas</span>
          </p>
        </div>

        <span className="text-4xl">💧</span>
      </div>

      <div className="bg-white/30 rounded-full h-3 mb-4">
        <div
          className="bg-white rounded-full h-3 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <button
        onClick={onAdd}
        className="w-full bg-white/20 hover:bg-white/30 active:bg-white/40 border border-white/40 rounded-2xl py-3 text-lg font-semibold transition-all"
      >
        + Tambah Minum
      </button>
    </div>
  )
}

/* --------------------------- TodayTimeline -------------------------- */
/**
 * Breakdown:
 * - Shows today's logs in reverse chronological order.
 * - Includes delete action per item.
 */
function TodayTimeline({ logs, onDeleteRequest }) {
  const todayLogs = logs
    .filter(l => l.date === today())
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))

  if (todayLogs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-4xl mb-2">📋</p>
        <p className="text-lg">Belum ada catatan hari ini</p>
      </div>
    )
  }

  const icons = {
    drink: '💧',
    meal: '🍽️',
    med: '💊',
    wound: '🩹',
  }

  const labels = {
    drink: 'Minum',
    meal: 'Makan',
    med: 'Obat',
    wound: 'Luka',
  }

  return (
    <div className="space-y-3">
      {todayLogs.map(log => (
        <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icons[log.type]}</span>

            <div className="flex-1">
              <p className="font-semibold text-gray-800">{labels[log.type]}</p>
              <p className="text-gray-500 text-sm">{log.summary}</p>

              {log.notes ? (
                <p className="text-gray-400 text-sm italic mt-1">📝 {log.notes}</p>
              ) : null}

              {log.logged_by ? (
                <p className="text-gray-400 text-xs mt-0.5">— {log.logged_by}</p>
              ) : null}
            </div>

            <div className="flex flex-col items-end gap-2">
              <p className="text-gray-400 text-sm">{log.time}</p>

              <button
                onClick={() => onDeleteRequest(log)}
                className="text-red-300 hover:text-red-500 text-xl leading-none"
                aria-label="Hapus catatan"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ============================================================
 * Rekap / history screen
 * ============================================================
 *
 * Purpose:
 * - Archive view grouped by date.
 * - Expands per day so the list stays readable even with lots of logs.
 */

function RekapScreen({ logs, onBack }) {
  const icons = {
    drink: '💧',
    meal: '🍽️',
    med: '💊',
    wound: '🩹',
  }

  const labels = {
    drink: 'Minum',
    meal: 'Makan',
    med: 'Obat',
    wound: 'Luka',
  }

  const grouped = useMemo(() => {
    return logs.reduce((acc, log) => {
      if (!acc[log.date]) acc[log.date] = []
      acc[log.date].push(log)
      return acc
    }, {})
  }, [logs])

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  function formatDate(dateStr) {
    const date = new Date(`${dateStr}T00:00:00`)
    const todayStr = today()
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    if (dateStr === todayStr) return 'Hari Ini'
    if (dateStr === yesterdayStr) return 'Kemarin'

    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  function DaySummaryBadges({ dayLogs }) {
    const drinkTotal = dayLogs
      .filter(l => l.type === 'drink')
      .reduce((sum, log) => sum + Number(log.amount || 0), 0)

    const mealCount = dayLogs.filter(l => l.type === 'meal').length
    const medCount = dayLogs.filter(l => l.type === 'med').length
    const woundLog = dayLogs.find(l => l.type === 'wound')

    return (
      <div className="flex gap-2 flex-wrap mt-2">
        {drinkTotal > 0 && (
          <span className="bg-sky-100 text-sky-700 text-xs font-medium px-3 py-1 rounded-full">
            💧 {drinkTotal} gelas
          </span>
        )}

        {mealCount > 0 && (
          <span className="bg-orange-100 text-orange-700 text-xs font-medium px-3 py-1 rounded-full">
            🍽️ {mealCount}x makan
          </span>
        )}

        {medCount > 0 && (
          <span className="bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1 rounded-full">
            💊 {medCount}x obat
          </span>
        )}

        {woundLog && (
          <span className="bg-rose-100 text-rose-700 text-xs font-medium px-3 py-1 rounded-full">
            🩹 Luka dicek
          </span>
        )}
      </div>
    )
  }

  /**
   * DayCard
   *
   * Breakdown:
   * - Collapsible card for a single day.
   * - Defaults today's card to expanded so current activity is always obvious.
   */
  function DayCard({ dateStr, dayLogs }) {
    const [expanded, setExpanded] = useState(dateStr === today())

    const sorted = [...dayLogs].sort(
      (a, b) => Number(b.timestamp) - Number(a.timestamp)
    )

    return (
      <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="w-full px-5 py-4 flex items-center justify-between"
        >
          <div className="text-left">
            <p className="font-bold text-gray-800 text-lg capitalize">
              {formatDate(dateStr)}
            </p>
            <DaySummaryBadges dayLogs={dayLogs} />
          </div>

          <span
            className={`text-gray-400 text-xl transition-transform ${expanded ? 'rotate-180' : ''
              }`}
          >
            ▾
          </span>
        </button>

        {expanded && (
          <div className="border-t border-gray-100 divide-y divide-gray-50">
            {sorted.map(log => (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                <span className="text-2xl mt-0.5">{icons[log.type]}</span>

                <div className="flex-1">
                  <p className="font-semibold text-gray-700">{labels[log.type]}</p>
                  <p className="text-gray-500 text-sm">{log.summary}</p>

                  {log.notes ? (
                    <p className="text-gray-400 text-sm italic mt-0.5">
                      📝 {log.notes}
                    </p>
                  ) : null}

                  {log.logged_by ? (
                    <p className="text-gray-400 text-xs mt-0.5">
                      — {log.logged_by} {log.device_info ? `· ${log.device_info}` : ''}
                    </p>
                  ) : null}
                </div>

                <p className="text-gray-400 text-sm shrink-0">{log.time}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="h-screen flex flex-col bg-gray-50 overflow-hidden"
      style={{ height: APP_VIEWPORT_HEIGHT }}
    >
      <div
        className="bg-white px-5 pb-4 shadow-sm flex items-center gap-3 flex-shrink-0 z-40"
        style={{ paddingTop: SAFE_TOP_PAD }}
      >
        <button onClick={onBack} className="text-sky-500 text-lg font-semibold">
          ← Kembali
        </button>

        <h1 className="text-2xl font-black text-gray-800">📋 Rekap</h1>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 pt-5"
        style={{ paddingBottom: `calc(${SAFE_BOTTOM_PAD} + 64px)` }}
      >
        {sortedDates.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">📭</p>
            <p className="text-lg">Belum ada catatan sama sekali</p>
          </div>
        ) : (
          sortedDates.map(dateStr => (
            <DayCard
              key={dateStr}
              dateStr={dateStr}
              dayLogs={grouped[dateStr]}
            />
          ))
        )}
      </div>

      <UpdatePrompt />
    </div>
  )
}

/* ============================================================
 * Main App
 * ============================================================
 *
 * Breakdown:
 * - Owns global state
 * - Loads logs from Supabase
 * - Subscribes to realtime changes
 * - Handles screen switching (home / rekap)
 * - Handles pull-to-refresh gesture
 * - Opens and closes the entry modals
 * - Saves and deletes logs
 *
 * Pull-to-refresh design notes:
 * - Header remains fixed.
 * - Indicator grows underneath header.
 * - Content rubber-bands downward with damping.
 * - `touchmove` is manually attached with `{ passive: false }`
 *   so `preventDefault()` actually works on mobile.
 */

export default function App() {
  const scrollRef = useRef(null)

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [screen, setScreen] = useState('home')
  const [currentUser, setCurrentUser] = useState(getCurrentUser)

  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  /* ---------------- Pull-to-refresh state ---------------- */
  const [pullRaw, setPullRaw] = useState(0)

  const touchStartYRef = useRef(0)
  const isPullingRef = useRef(false)
  const pullRawRef = useRef(0)
  const handleRefreshRef = useRef(null)
  const refreshingRef = useRef(false)

  refreshingRef.current = refreshing

  /* ---------------- Initial load + realtime ---------------- */
  useEffect(() => {
    let isMounted = true

    async function init() {
      try {
        const data = await loadLogs()
        if (isMounted) setLogs(data)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    init()

    const channel = supabase
      .channel('logs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'logs' },
        payload => {
          if (payload.eventType === 'INSERT') {
            setLogs(prev => upsertLogInState(prev, payload.new))
          }

          if (payload.eventType === 'UPDATE') {
            setLogs(prev => upsertLogInState(prev, payload.new))
          }

          if (payload.eventType === 'DELETE') {
            setLogs(prev => prev.filter(log => log.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  async function handleRefresh() {
    if (refreshingRef.current) return

    const startedAt = Date.now()
    setRefreshing(true)

    try {
      const data = await loadLogs()
      setLogs(data)
    } finally {
      const elapsed = Date.now() - startedAt

      if (elapsed < MIN_REFRESH_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_REFRESH_MS - elapsed))
      }

      setRefreshing(false)
    }
  }

  handleRefreshRef.current = handleRefresh

  /* ---------------- Non-passive touch handlers ---------------- */
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function resetPull() {
      isPullingRef.current = false
      pullRawRef.current = 0
      setPullRaw(0)
    }

    function onTouchStart(e) {
      if (refreshingRef.current || e.touches.length !== 1) {
        resetPull()
        return
      }

      if (el.scrollTop <= 0.5) {
        touchStartYRef.current = e.touches[0].clientY
        isPullingRef.current = true
        pullRawRef.current = 0
        setPullRaw(0)
      } else {
        resetPull()
      }
    }

    function onTouchMove(e) {
      if (!isPullingRef.current || refreshingRef.current) return

      const diff = e.touches[0].clientY - touchStartYRef.current

      if (diff > 0) {
        e.preventDefault()
        pullRawRef.current = diff
        setPullRaw(diff)
      } else {
        resetPull()
      }
    }

    function onTouchEnd() {
      if (isPullingRef.current && pullRawRef.current > TRIGGER_PX) {
        handleRefreshRef.current?.()
      }

      resetPull()
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  /* ---------------- Derived pull values ---------------- */
  const dampened = Math.min(pullRaw * 0.42, MAX_PULL_Y)
  const rubberY = refreshing ? MAX_PULL_Y : dampened
  const pullProgress = Math.min(pullRaw / TRIGGER_PX, 1)
  const indicatorOffset = refreshing ? 0 : MAX_PULL_Y * (pullProgress - 1)
  const showPullIndicator = refreshing || pullRaw > 0
  const eased = refreshing || pullRaw === 0

  /* ---------------- Actions ---------------- */
  async function addLog(entry) {
    const user = USERS.find(u => u.id === currentUser)

    const newLog = {
      id: generateId(),
      date: today(),
      time: nowTime(),
      timestamp: Date.now(),
      logged_by: user ? `${user.emoji} ${user.name}` : 'Unknown',
      device_info: getDeviceInfo(),
      ...entry,
    }

    setSaving(true)

    try {
      // Optimistic local update
      setLogs(prev => upsertLogInState(prev, newLog))

      await saveLog(newLog)
    } catch (error) {
      // Roll back optimistic insert if save failed
      setLogs(prev => prev.filter(log => log.id !== newLog.id))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    setDeleting(true)

    const previousLogs = logs
    setLogs(prev => prev.filter(log => log.id !== id))

    try {
      await deleteLog(id)
      setDeleteTarget(null)
    } catch (error) {
      // Roll back if delete failed
      setLogs(previousLogs)
    } finally {
      setDeleting(false)
    }
  }

  /* ---------------- Save handlers per modal ---------------- */
  function handleDrinkSave({ type, amount, notes }) {
    const typeLabels = {
      water: 'Air Putih',
      tea: 'Teh',
      juice: 'Jus',
      soup: 'Kuah/Sup',
    }

    addLog({
      type: 'drink',
      amount,
      notes,
      summary: `${typeLabels[type]} · ${amount} gelas`,
    })

    setModal(null)
  }

  function handleMealSave({ mealType, foodText, portion, notes }) {
    const mealLabels = {
      breakfast: 'Sarapan',
      lunch: 'Makan Siang',
      dinner: 'Makan Malam',
      snack: 'Camilan',
    }

    const portionLabels = {
      small: 'Sedikit',
      medium: 'Normal',
      large: 'Banyak',
    }

    addLog({
      type: 'meal',
      notes,
      summary: `${mealLabels[mealType]} · ${foodText} (${portionLabels[portion]})`,
    })

    setModal(null)
  }

  function handleMedSave({ medName, status, notes }) {
    const statusLabels = {
      taken: 'Sudah diminum',
      skipped: 'Tidak diminum',
      half: 'Setengah dosis',
    }

    addLog({
      type: 'med',
      notes,
      summary: `${medName} · ${statusLabels[status]}`,
    })

    setModal(null)
  }

  function handleWoundSave({
    condition,
    appearance,
    appearanceOther,
    dressingChanged,
    notes,
  }) {
    const conditionLabels = {
      better: 'Lebih Baik 😊',
      same: 'Sama Saja 😐',
      worse: 'Memburuk 😟',
    }

    const appearanceLabels = {
      dry: 'Kering',
      wet: 'Basah',
      swollen: 'Bengkak',
      redness: 'Kemerahan',
      discharge: 'Ada Cairan',
      smell: 'Berbau',
    }

    const selectedAppearanceText = appearance
      .map(item => appearanceLabels[item])
      .filter(Boolean)
      .join(', ')

    const appearanceText = [selectedAppearanceText, appearanceOther.trim()]
      .filter(Boolean)
      .join(' · ')

    addLog({
      type: 'wound',
      notes,
      dressing_changed: dressingChanged,
      summary: `${conditionLabels[condition]} · ${appearanceText} · Perban: ${dressingChanged ? 'Diganti' : 'Belum diganti'
        }`,
    })

    setModal(null)
  }

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  /* ---------------- Route-like guards ---------------- */
  if (!currentUser) {
    return <UserPickerScreen onPicked={setCurrentUser} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">🌸</p>
          <p className="text-gray-500 text-lg">Memuat data...</p>
        </div>
      </div>
    )
  }

  if (screen === 'rekap') {
    return <RekapScreen logs={logs} onBack={() => setScreen('home')} />
  }

  /* ---------------- Home screen ---------------- */
  return (
    <div
      className="h-screen flex flex-col bg-gray-50 overflow-hidden"
      style={{ height: APP_VIEWPORT_HEIGHT }}
    >
      {/* Fixed header: never moves during pull gesture */}
      <div
        className="bg-white px-5 pb-4 shadow-sm flex-shrink-0 z-40"
        style={{ paddingTop: SAFE_TOP_PAD }}
      >
        <p className="text-gray-400 text-sm capitalize">{dateStr}</p>

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-gray-800">🌸 MamiCare</h1>

          <div className="flex gap-2">
            {(() => {
              const user = USERS.find(u => u.id === currentUser)

              return (
                <button
                  onClick={() => {
                    setCurrentUser(null)
                    clearStoredCurrentUser()
                  }}
                  className="bg-gray-100 text-gray-600 font-semibold text-sm px-3 py-2 rounded-full active:bg-gray-200"
                  aria-label="Ganti pengguna"
                  title="Ganti pengguna"
                >
                  {user ? user.emoji : '👤'}
                </button>
              )
            })()}

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-gray-100 text-gray-600 px-3 py-2 rounded-full active:bg-gray-200 disabled:opacity-60"
              aria-label="Refresh"
            >
              <RefreshCw
                size={18}
                className={refreshing ? 'animate-spin text-sky-400' : 'text-gray-500'}
              />
            </button>

            <button
              onClick={() => setScreen('rekap')}
              className="bg-gray-100 text-gray-600 font-semibold text-sm px-4 py-2 rounded-full active:bg-gray-200"
            >
              📋 Rekap
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative overflow-hidden bg-gray-50">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center overflow-hidden"
          style={{ height: MAX_PULL_Y }}
        >
          <div
            className="mt-2 flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md"
            style={{
              opacity: showPullIndicator ? 1 : 0,
              transform: `translateY(${indicatorOffset}px)`,
              transition: eased
                ? 'transform 0.25s ease, opacity 0.25s ease'
                : 'none',
            }}
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'animate-spin text-sky-400' : 'text-gray-400'}
              style={
                refreshing
                  ? undefined
                  : {
                      transform: `rotate(${pullProgress * 180}deg)`,
                      transition: 'transform 0.08s',
                    }
              }
            />

            <span className="text-sm text-gray-500">
              {refreshing
                ? 'Memperbarui...'
                : pullProgress >= 1
                  ? '🙌 Lepaskan!'
                  : 'Tarik untuk refresh'}
            </span>
          </div>
        </div>

        {/* Scroll viewport stays fixed; inner content rubber-bands below the header */}
        <div
          className="flex-1 min-h-0 h-full overflow-y-auto px-4"
          ref={scrollRef}
          style={{
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: `calc(${SAFE_BOTTOM_PAD} + 72px)`,
          }}
        >
          <div
            className="pt-5"
            style={{
              transform: `translateY(${rubberY}px)`,
              transition: eased ? 'transform 0.25s ease' : 'none',
            }}
          >
            <DrinkCard logs={logs} onAdd={() => setModal('drink')} />

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                {
                  id: 'meal',
                  emoji: '🍽️',
                  label: 'Makan',
                  color: 'bg-orange-50 border-orange-300 text-orange-700',
                },
                {
                  id: 'med',
                  emoji: '💊',
                  label: 'Obat',
                  color: 'bg-purple-50 border-purple-300 text-purple-700',
                },
                {
                  id: 'wound',
                  emoji: '🩹',
                  label: 'Luka',
                  color: 'bg-rose-50 border-rose-300 text-rose-600',
                },
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setModal(btn.id)}
                  className={`${btn.color} border-2 rounded-2xl py-5 flex flex-col items-center gap-1 active:scale-95 transition-transform`}
                >
                  <span className="text-3xl">{btn.emoji}</span>
                  <span className="text-sm font-semibold">{btn.label}</span>
                </button>
              ))}
            </div>

            <h2 className="text-lg font-bold text-gray-700 mb-3">Catatan Hari Ini</h2>
            <TodayTimeline logs={logs} onDeleteRequest={setDeleteTarget} />
          </div>
        </div>
      </div>

      {/* Entry modals */}
      {modal === 'drink' && (
        <DrinkModal
          onClose={() => setModal(null)}
          onSave={handleDrinkSave}
          saving={saving}
        />
      )}

      {modal === 'meal' && (
        <MealModal
          onClose={() => setModal(null)}
          onSave={handleMealSave}
          saving={saving}
        />
      )}

      {modal === 'med' && (
        <MedModal
          onClose={() => setModal(null)}
          onSave={handleMedSave}
          saving={saving}
        />
      )}

      {modal === 'wound' && (
        <WoundModal
          onClose={() => setModal(null)}
          onSave={handleWoundSave}
          saving={saving}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteConfirmModal
          log={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      <UpdatePrompt />
    </div>
  )
}
