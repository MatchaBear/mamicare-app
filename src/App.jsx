import { useState, useEffect } from 'react'

// ─── Helpers ────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0]
const nowTime = () => new Date().toLocaleTimeString('id-ID', {
  hour: '2-digit', minute: '2-digit'
})

function loadLogs() {
  try { return JSON.parse(localStorage.getItem('mamicare_logs') || '[]') }
  catch { return [] }
}
function saveLogs(logs) {
  localStorage.setItem('mamicare_logs', JSON.stringify(logs))
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
            onClick={() => setMedName(p)}
            className={`px-4 py-2 rounded-full border-2 text-base font-medium transition-all ${medName === p
              ? 'bg-purple-500 text-white border-purple-500'
              : 'bg-white text-gray-600 border-gray-200'
              }`}
          >
            {p}
          </button>
        ))}
      </div>
      {/* Or type custom */}
      <input
        type="text"
        value={medName}
        onChange={e => setMedName(e.target.value)}
        placeholder="Atau ketik nama obat lain..."
        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 focus:outline-none focus:border-purple-400 mb-6"
      />

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

  const canSave = condition && dressingChanged !== null

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

      <p className="text-gray-500 text-lg mb-3">Tampilan luka? <span className="text-sm">(boleh pilih lebih dari satu)</span></p>
      <div className="grid grid-cols-2 gap-3 mb-6">
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
      <SaveButton canSave={canSave} onSave={() => onSave({ condition, appearance, dressingChanged, notes })} />
    </ModalShell>
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

// ─── Main App ────────────────────────────────────────────────
export default function App() {
  const [logs, setLogs] = useState(loadLogs)
  const [modal, setModal] = useState(null)       // 'drink' | 'meal' | 'med' | null
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => { saveLogs(logs) }, [logs])

  function addLog(entry) {
    setLogs(prev => [{
      id: Date.now(),
      date: today(),
      time: nowTime(),
      timestamp: Date.now(),
      ...entry,
    }, ...prev])
  }

  function deleteLog(id) {
    setLogs(prev => prev.filter(l => l.id !== id))
    setDeleteTarget(null)
  }

  // ── Save handlers ──
  function handleDrinkSave({ type, amount, notes }) {
    const typeLabels = { water: 'Air Putih', tea: 'Teh', juice: 'Jus', soup: 'Kuah/Sup' }
    addLog({ type: 'drink', amount, notes, summary: `${typeLabels[type]} · ${amount} gelas` })
    setModal(null)
  }

  function handleMealSave({ mealType, foodText, portion, notes }) {
    const mealLabels = { breakfast: 'Sarapan', lunch: 'Makan Siang', dinner: 'Makan Malam', snack: 'Camilan' }
    const portionLabels = { small: 'Sedikit', medium: 'Normal', large: 'Banyak' }
    addLog({
      type: 'meal',
      notes,
      summary: `${mealLabels[mealType]} · ${foodText} (${portionLabels[portion]})`,
    })
    setModal(null)
  }

  function handleMedSave({ medName, status, notes }) {
    const statusLabels = { taken: 'Sudah diminum', skipped: 'Tidak diminum', half: 'Setengah dosis' }
    addLog({
      type: 'med',
      notes,
      summary: `${medName} · ${statusLabels[status]}`,
    })
    setModal(null)
  }

  function handleWoundSave({ condition, appearance, dressingChanged, notes }) {
    const conditionLabels = { better: 'Lebih Baik 😊', same: 'Sama Saja 😐', worse: 'Memburuk 😟' }
    const appearanceLabels = {
      dry: 'Kering', wet: 'Basah', swollen: 'Bengkak',
      redness: 'Kemerahan', discharge: 'Ada Cairan', smell: 'Berbau'
    }
    const appearanceText = appearance.length > 0
      ? appearance.map(a => appearanceLabels[a]).join(', ')
      : 'Tidak ada keluhan khusus'

    addLog({
      type: 'wound',
      notes,
      dressingChanged,
      summary: `${conditionLabels[condition]} · ${appearanceText} · Perban: ${dressingChanged ? 'Diganti' : 'Belum diganti'}`,
    })
    setModal(null)
  }

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm">
        <p className="text-gray-400 text-sm capitalize">{dateStr}</p>
        <h1 className="text-2xl font-black text-gray-800">🌸 MamiCare</h1>
      </div>

      {/* Content */}
      <div className="px-4 pt-5 pb-32">
        <DrinkCard logs={logs} onAdd={() => setModal('drink')} />

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { id: 'meal', emoji: '🍽️', label: 'Makan', color: 'bg-orange-50 border-orange-300 text-orange-700' },
            { id: 'med', emoji: '💊', label: 'Obat', color: 'bg-purple-50 border-purple-300 text-purple-700' },
            { id: 'wound', emoji: '🩹', label: 'Luka', color: 'bg-rose-50 border-rose-300 text-rose-600' },
          ].map(btn => (
            <button
              key={btn.id}
              disabled={btn.disabled}
              onClick={() => !btn.disabled && setModal(btn.id)}
              className={`${btn.color} border-2 rounded-2xl py-5 flex flex-col items-center gap-1 ${btn.disabled ? 'opacity-40' : 'active:scale-95 transition-transform'}`}
            >
              <span className="text-3xl">{btn.emoji}</span>
              <span className="text-sm font-semibold">{btn.label}</span>
              {btn.disabled && <span className="text-xs opacity-70">Segera hadir</span>}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <h2 className="text-lg font-bold text-gray-700 mb-3">Catatan Hari Ini</h2>
        <TodayTimeline
          logs={logs}
          onDeleteRequest={setDeleteTarget}
        />
      </div>

      {/* Modals */}
      {modal === 'drink' && <DrinkModal onClose={() => setModal(null)} onSave={handleDrinkSave} />}
      {modal === 'meal' && <MealModal onClose={() => setModal(null)} onSave={handleMealSave} />}
      {modal === 'med' && <MedModal onClose={() => setModal(null)} onSave={handleMedSave} />}
      {modal === 'wound' && <WoundModal onClose={() => setModal(null)} onSave={handleWoundSave} />}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteConfirmModal
          log={deleteTarget}
          onConfirm={() => deleteLog(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}