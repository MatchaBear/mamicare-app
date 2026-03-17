import { useState, useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { supabase } from './supabase'

// ─── Helpers ────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0]
const nowTime = () => new Date().toLocaleTimeString('id-ID', {
  hour: '2-digit', minute: '2-digit'
})

// ─── User Identity ───────────────────────────────────────────
const USERS = [
  { id: 'nyok', name: 'Nyok', emoji: '👵' },
  { id: 'susi', name: 'Sus Susi', emoji: '🧑‍🍳' },
  { id: 'berry', name: 'Berry', emoji: '🧙' },
  { id: 'meme', name: 'Mega', emoji: '👩' },
]

function getCurrentUser() {
  return localStorage.getItem('mamicare_user') || null
}

function getDeviceInfo() {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return '📱 iPhone'
  if (/iPad/.test(ua)) return '📱 iPad'
  if (/Android/.test(ua)) return '📱 Android'
  if (/Mac/.test(ua)) return '💻 Mac'
  if (/Windows/.test(ua)) return '🖥️ Windows'
  return '🌐 Browser'
}

function setCurrentUser(userId) {
  localStorage.setItem('mamicare_user', userId)
}

function UserPickerScreen({ onPicked }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <p className="text-6xl mb-4">🌸</p>
      <h1 className="text-3xl font-black text-gray-800 mb-2">MamiCare</h1>
      <p className="text-gray-500 text-lg mb-10 text-center">Siapa kamu hari ini?</p>
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {USERS.map(user => (
          <button
            key={user.id}
            onClick={() => { setCurrentUser(user.id); onPicked(user.id) }}
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

async function loadLogs() {
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .order('timestamp', { ascending: false })
  if (error) { console.error(error); return [] }
  return data || []
}

async function saveLog(log) {
  const { error } = await supabase.from('logs').upsert(log)
  if (error) console.error(error)
}

async function deleteLog(id) {
  const { error } = await supabase.from('logs').delete().eq('id', id)
  if (error) console.error(error)
}

// ─── PWA Update Prompt ───────────────────────────────────────
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

// ─── Reusable: Notes Field ───────────────────────────────────
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

// ─── Reusable: Modal Shell ───────────────────────────────────
function ModalShell({ onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end z-50" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Reusable: Option Buttons ────────────────────────────────
function OptionGroup({ options, selected, onSelect, cols = 2 }) {
  return (
    <div className={`grid grid-cols-${cols} gap-3 mb-6`}>
      {options.map(opt => (
        <button
          key={opt.id}
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

// ─── Reusable: Save Button ───────────────────────────────────
function SaveButton({ canSave, onSave }) {
  return (
    <button
      onClick={() => canSave && onSave()}
      className={`w-full py-5 text-xl font-bold rounded-2xl transition-all ${canSave
        ? 'bg-sky-500 text-white active:bg-sky-600'
        : 'bg-gray-100 text-gray-400'
        }`}
    >
      ✅ SIMPAN
    </button>
  )
}

// ─── Delete Confirmation Modal ───────────────────────────────
function DeleteConfirmModal({ log, onConfirm, onCancel }) {
  const icons = { drink: '💧', meal: '🍽️', med: '💊', wound: '🩹' }
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
            className="py-4 text-lg rounded-2xl border-2 border-gray-200 text-gray-600 font-medium"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="py-4 text-lg rounded-2xl bg-red-500 text-white font-bold"
          >
            🗑️ Hapus
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Drink Modal ─────────────────────────────────────────────
function DrinkModal({ onClose, onSave }) {
  const [type, setType] = useState(null)
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
    <ModalShell onClose={onClose}>
      <h2 className="text-2xl font-bold text-gray-800 mb-5">💧 Catat Minum</h2>
      <p className="text-gray-500 text-lg mb-3">Minuman apa?</p>
      <OptionGroup options={drinkTypes} selected={type} onSelect={setType} cols={2} />
      <p className="text-gray-500 text-lg mb-3">Berapa banyak?</p>
      <OptionGroup options={amounts} selected={amount} onSelect={setAmount} cols={3} />
      <NotesField value={notes} onChange={setNotes} />
      <SaveButton canSave={type && amount} onSave={() => onSave({ type, amount, notes })} />
    </ModalShell>
  )
}

// ─── Meal Modal ──────────────────────────────────────────────
function MealModal({ onClose, onSave }) {
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
    <ModalShell onClose={onClose}>
      <h2 className="text-2xl font-bold text-gray-800 mb-5">🍽️ Catat Makan</h2>

      <p className="text-gray-500 text-lg mb-3">Waktu makan?</p>
      <OptionGroup options={mealTypes} selected={mealType} onSelect={setMealType} cols={2} />

      <p className="text-gray-500 text-lg mb-3">Menu apa?</p>
      <textarea
        value={foodText}
        onChange={e => setFoodText(e.target.value)}
        placeholder="Contoh: Nasi putih, ayam goreng, sayur bayam..."
        rows={3}
        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 resize-none focus:outline-none focus:border-sky-400 mb-6"
      />

      <p className="text-gray-500 text-lg mb-3">Porsinya?</p>
      <OptionGroup options={portions} selected={portion} onSelect={setPortion} cols={3} />

      <NotesField value={notes} onChange={setNotes} />
      <SaveButton
        canSave={canSave}
        onSave={() => onSave({ mealType, foodText, portion, notes })}
      />
    </ModalShell>
  )
}

// ─── Med Modal ───────────────────────────────────────────────
function MedModal({ onClose, onSave }) {
  const [medName, setMedName] = useState('')
  const [isOther, setIsOther] = useState(false)
  const [status, setStatus] = useState(null)
  const [notes, setNotes] = useState('')

  // Common diabetes meds — Berry can edit this list later
  const presets = [
    'Metformin', 'Glibenclamide', 'Glimepiride',
    'Insulin', 'Acarbose', 'Vitamin B12',
  ]

  const statuses = [
    { id: 'taken', label: '✅ Sudah Minum' },
    { id: 'skipped', label: '❌ Tidak Minum' },
    { id: 'half', label: '½ Setengah Dosis' },
  ]

  const canSave = medName.trim().length > 0 && status

  return (
    <ModalShell onClose={onClose}>
      <h2 className="text-2xl font-bold text-gray-800 mb-5">💊 Catat Obat</h2>

      <p className="text-gray-500 text-lg mb-3">Obat apa?</p>
      {/* Preset quick-tap */}
      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map(p => (
          <button
            key={p}
            onClick={() => { setMedName(p); setIsOther(false) }}
            className={`px-4 py-2 rounded-full border-2 text-base font-medium transition-all ${medName === p && !isOther
              ? 'bg-purple-500 text-white border-purple-500'
              : 'bg-white text-gray-600 border-gray-200'
              }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => { setMedName(''); setIsOther(true) }}
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
      <OptionGroup options={statuses} selected={status} onSelect={setStatus} cols={1} />

      <NotesField value={notes} onChange={setNotes} />
      <SaveButton canSave={canSave} onSave={() => onSave({ medName, status, notes })} />
    </ModalShell>
  )
}

// ─── Wound Modal ─────────────────────────────────────────────
function WoundModal({ onClose, onSave }) {
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
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const canSave = condition && dressingChanged !== null && (appearance.length > 0 || appearanceOther.trim().length > 0)

  return (
    <ModalShell onClose={onClose}>
      <h2 className="text-2xl font-bold text-gray-800 mb-5">🩹 Cek Kondisi Luka</h2>

      <p className="text-gray-500 text-lg mb-3">Kondisi hari ini?</p>
      <OptionGroup
        options={conditions}
        selected={condition}
        onSelect={setCondition}
        cols={3}
      />

      <p className="text-gray-500 text-lg mb-3">Tampilan luka? <span className="text-sm">(pilih semua yang sesuai)</span></p>
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
        placeholder="Deskripsi tampilan luka lainnya... (wajib diisi)"
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
      <SaveButton canSave={canSave} onSave={() => onSave({ condition, appearance, appearanceOther, dressingChanged, notes })} />    </ModalShell>
  )
}

// ─── Drink Card ──────────────────────────────────────────────
function DrinkCard({ logs, onAdd }) {
  const todayDrinks = logs.filter(l => l.type === 'drink' && l.date === today())
  const totalCups = todayDrinks.reduce((sum, l) => sum + l.amount, 0)
  const goal = 8
  const pct = Math.min((totalCups / goal) * 100, 100)
  const colorClass = totalCups < 4
    ? 'from-sky-400 to-blue-500'
    : totalCups < goal
      ? 'from-sky-500 to-cyan-400'
      : 'from-green-400 to-emerald-500'

  return (
    <div className={`bg-gradient-to-br ${colorClass} rounded-3xl p-5 text-white mb-4 shadow-lg`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-white/80 text-sm font-medium uppercase tracking-wide">Minum Hari Ini</p>
          <p className="text-4xl font-black mt-1">
            {totalCups} <span className="text-2xl font-normal">/ {goal} gelas</span>
          </p>
        </div>
        <span className="text-5xl">💧</span>
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

// ─── Today Timeline ──────────────────────────────────────────
function TodayTimeline({ logs, onDeleteRequest }) {
  const todayLogs = logs
    .filter(l => l.date === today())
    .sort((a, b) => b.timestamp - a.timestamp)

  if (todayLogs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-4xl mb-2">📋</p>
        <p className="text-lg">Belum ada catatan hari ini</p>
      </div>
    )
  }

  const icons = { drink: '💧', meal: '🍽️', med: '💊', wound: '🩹' }
  const labels = { drink: 'Minum', meal: 'Makan', med: 'Obat', wound: 'Luka' }

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

// ─── Rekap Screen ────────────────────────────────────────────
function RekapScreen({ logs, onBack }) {
  const icons = { drink: '💧', meal: '🍽️', med: '💊', wound: '🩹' }
  const labels = { drink: 'Minum', meal: 'Makan', med: 'Obat', wound: 'Luka' }

  // Group logs by date, sorted newest first
  const grouped = logs.reduce((acc, log) => {
    if (!acc[log.date]) acc[log.date] = []
    acc[log.date].push(log)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00')
    const todayStr = today()
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (dateStr === todayStr) return 'Hari Ini'
    if (dateStr === yesterdayStr) return 'Kemarin'
    return date.toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long'
    })
  }

  function DaySummaryBadges({ dayLogs }) {
    const drinkTotal = dayLogs
      .filter(l => l.type === 'drink')
      .reduce((s, l) => s + l.amount, 0)
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

  function DayCard({ dateStr, dayLogs }) {
    const [expanded, setExpanded] = useState(dateStr === today())
    const sorted = [...dayLogs].sort((a, b) => b.timestamp - a.timestamp)

    return (
      <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
        {/* Day header — tap to expand/collapse */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full px-5 py-4 flex items-center justify-between"
        >
          <div className="text-left">
            <p className="font-bold text-gray-800 text-lg capitalize">{formatDate(dateStr)}</p>
            <DaySummaryBadges dayLogs={dayLogs} />
          </div>
          <span className={`text-gray-400 text-xl transition-transform ${expanded ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>

        {/* Expanded log entries */}
        {expanded && (
          <div className="border-t border-gray-100 divide-y divide-gray-50">
            {sorted.map(log => (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                <span className="text-2xl mt-0.5">{icons[log.type]}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-700">{labels[log.type]}</p>
                  <p className="text-gray-500 text-sm">{log.summary}</p>
                  {log.notes ? (
                    <p className="text-gray-400 text-sm italic mt-0.5">📝 {log.notes}</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sky-500 text-lg font-semibold"
        >
          ← Kembali
        </button>
        <h1 className="text-2xl font-black text-gray-800">📋 Rekap</h1>
      </div>

      <div className="px-4 pt-5 pb-32">
        {sortedDates.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">📭</p>
            <p className="text-lg">Belum ada catatan sama sekali</p>
          </div>
        ) : (
          sortedDates.map(dateStr => (
            <DayCard key={dateStr} dateStr={dateStr} dayLogs={grouped[dateStr]} />
          ))
        )}
      </div>
      <UpdatePrompt />
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────
export default function App() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [screen, setScreen] = useState('home')
  const [currentUser, setCurrentUser] = useState(getCurrentUser)

  // Load logs from Supabase on mount
  useEffect(() => {
    // Initial load
    loadLogs().then(data => {
      setLogs(data)
      setLoading(false)
    })

    // Realtime subscription
    const channel = supabase
      .channel('logs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'logs' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLogs(prev => {
              // Avoid duplicate if it's our own entry
              if (prev.find(l => l.id === payload.new.id)) return prev
              return [payload.new, ...prev]
            })
          }
          if (payload.eventType === 'DELETE') {
            setLogs(prev => prev.filter(l => l.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Cleanup on unmount
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function addLog(entry) {
    const user = USERS.find(u => u.id === currentUser)
    const newLog = {
      id: Date.now(),
      date: today(),
      time: nowTime(),
      timestamp: Date.now(),
      logged_by: user ? `${user.emoji} ${user.name}` : 'Unknown',
      device_info: getDeviceInfo(),
      ...entry,
    }
    await saveLog(newLog)
    setLogs(prev => [newLog, ...prev])
  }

  async function handleDelete(id) {
    await deleteLog(id)
    setLogs(prev => prev.filter(l => l.id !== id))
    setDeleteTarget(null)
  }

  function handleDrinkSave({ type, amount, notes }) {
    const typeLabels = { water: 'Air Putih', tea: 'Teh', juice: 'Jus', soup: 'Kuah/Sup' }
    addLog({ type: 'drink', amount, notes, summary: `${typeLabels[type]} · ${amount} gelas` })
    setModal(null)
  }

  function handleMealSave({ mealType, foodText, portion, notes }) {
    const mealLabels = { breakfast: 'Sarapan', lunch: 'Makan Siang', dinner: 'Makan Malam', snack: 'Camilan' }
    const portionLabels = { small: 'Sedikit', medium: 'Normal', large: 'Banyak' }
    addLog({
      type: 'meal', notes,
      summary: `${mealLabels[mealType]} · ${foodText} (${portionLabels[portion]})`,
    })
    setModal(null)
  }

  function handleMedSave({ medName, status, notes }) {
    const statusLabels = { taken: 'Sudah diminum', skipped: 'Tidak diminum', half: 'Setengah dosis' }
    addLog({ type: 'med', notes, summary: `${medName} · ${statusLabels[status]}` })
    setModal(null)
  }

  function handleWoundSave({ condition, appearance, appearanceOther, dressingChanged, notes }) {
    const conditionLabels = { better: 'Lebih Baik 😊', same: 'Sama Saja 😐', worse: 'Memburuk 😟' }
    const appearanceLabels = {
      dry: 'Kering', wet: 'Basah', swollen: 'Bengkak',
      redness: 'Kemerahan', discharge: 'Ada Cairan', smell: 'Berbau'
    }
    const appearanceText = appearance.length > 0
      ? `${appearance.map(a => appearanceLabels[a]).join(', ')} · ${appearanceOther}`
      : appearanceOther
    addLog({
      type: 'wound', notes, dressing_changed: dressingChanged,
      summary: `${conditionLabels[condition]} · ${appearanceText} · Perban: ${dressingChanged ? 'Diganti' : 'Belum diganti'}`,
    })
    setModal(null)
  }

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm">
        <p className="text-gray-400 text-sm capitalize">{dateStr}</p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-800">🌸 MamiCare</h1>
          <div className="flex gap-2">
            {(() => {
              const user = USERS.find(u => u.id === currentUser)
              return (
                <button
                  onClick={() => { setCurrentUser(null); localStorage.removeItem('mamicare_user') }}
                  className="bg-gray-100 text-gray-600 font-semibold text-sm px-3 py-2 rounded-full active:bg-gray-200"
                >
                  {user ? user.emoji : '👤'}
                </button>
              )
            })()}
            <button
              onClick={() => setScreen('rekap')}
              className="bg-gray-100 text-gray-600 font-semibold text-sm px-4 py-2 rounded-full active:bg-gray-200"
            >
              📋 Rekap
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 pb-32">
        <DrinkCard logs={logs} onAdd={() => setModal('drink')} />

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { id: 'meal', emoji: '🍽️', label: 'Makan', color: 'bg-orange-50 border-orange-300 text-orange-700' },
            { id: 'med', emoji: '💊', label: 'Obat', color: 'bg-purple-50 border-purple-300 text-purple-700' },
            { id: 'wound', emoji: '🩹', label: 'Luka', color: 'bg-rose-50 border-rose-300 text-rose-600' },
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

      {modal === 'drink' && <DrinkModal onClose={() => setModal(null)} onSave={handleDrinkSave} />}
      {modal === 'meal' && <MealModal onClose={() => setModal(null)} onSave={handleMealSave} />}
      {modal === 'med' && <MedModal onClose={() => setModal(null)} onSave={handleMedSave} />}
      {modal === 'wound' && <WoundModal onClose={() => setModal(null)} onSave={handleWoundSave} />}

      {deleteTarget && (
        <DeleteConfirmModal
          log={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      <UpdatePrompt />
    </div>
  )
}