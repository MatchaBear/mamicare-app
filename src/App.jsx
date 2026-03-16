import { useState, useEffect } from 'react'

// ─── Helpers ───────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0]
const nowTime = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

function loadLogs() {
  try {
    return JSON.parse(localStorage.getItem('mamicare_logs') || '[]')
  } catch { return [] }
}

function saveLogs(logs) {
  localStorage.setItem('mamicare_logs', JSON.stringify(logs))
}

// ─── Components ────────────────────────────────────────────

function DrinkModal({ onClose, onSave }) {
  const [type, setType] = useState(null)
  const [amount, setAmount] = useState(null)

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

  const canSave = type && amount

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end z-50" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-3xl p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-5">💧 Catat Minum</h2>

        <p className="text-gray-500 text-lg mb-3">Minuman apa?</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {drinkTypes.map(d => (
            <button
              key={d.id}
              onClick={() => setType(d.id)}
              className={`py-4 text-lg rounded-2xl border-2 font-medium transition-all ${type === d.id
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'bg-white text-gray-700 border-gray-200'
                }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <p className="text-gray-500 text-lg mb-3">Berapa banyak?</p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {amounts.map(a => (
            <button
              key={a.id}
              onClick={() => setAmount(a.id)}
              className={`py-4 text-lg rounded-2xl border-2 font-medium transition-all ${amount === a.id
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'bg-white text-gray-700 border-gray-200'
                }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => canSave && onSave({ type, amount })}
          className={`w-full py-5 text-xl font-bold rounded-2xl transition-all ${canSave
              ? 'bg-sky-500 text-white active:bg-sky-600'
              : 'bg-gray-100 text-gray-400'
            }`}
        >
          ✅ SIMPAN
        </button>
      </div>
    </div>
  )
}

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
          <p className="text-4xl font-black mt-1">{totalCups} <span className="text-2xl font-normal">/ {goal} gelas</span></p>
        </div>
        <span className="text-5xl">💧</span>
      </div>

      {/* Progress bar */}
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

function TodayTimeline({ logs }) {
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
        <div key={log.id} className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm">
          <span className="text-3xl">{icons[log.type]}</span>
          <div className="flex-1">
            <p className="font-semibold text-gray-800">{labels[log.type]}</p>
            <p className="text-gray-500 text-sm">{log.summary}</p>
          </div>
          <p className="text-gray-400 text-sm">{log.time}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Main App ──────────────────────────────────────────────

export default function App() {
  const [logs, setLogs] = useState(loadLogs)
  const [showDrink, setShowDrink] = useState(false)

  useEffect(() => { saveLogs(logs) }, [logs])

  function addLog(entry) {
    const newLog = {
      id: Date.now(),
      date: today(),
      time: nowTime(),
      timestamp: Date.now(),
      ...entry,
    }
    setLogs(prev => [newLog, ...prev])
  }

  function handleDrinkSave({ type, amount }) {
    const typeLabels = { water: 'Air Putih', tea: 'Teh', juice: 'Jus', soup: 'Kuah/Sup' }
    addLog({
      type: 'drink',
      drinkType: type,
      amount,
      summary: `${typeLabels[type]} · ${amount} gelas`,
    })
    setShowDrink(false)
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

      {/* Main content */}
      <div className="px-4 pt-5 pb-32">
        <DrinkCard logs={logs} onAdd={() => setShowDrink(true)} />

        {/* Quick action buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { emoji: '🍽️', label: 'Makan', color: 'bg-orange-50 border-orange-200 text-orange-700', disabled: true },
            { emoji: '💊', label: 'Obat', color: 'bg-purple-50 border-purple-200 text-purple-700', disabled: true },
            { emoji: '🩹', label: 'Luka', color: 'bg-rose-50 border-rose-200 text-rose-700', disabled: true },
          ].map(btn => (
            <button
              key={btn.label}
              disabled={btn.disabled}
              className={`${btn.color} border-2 rounded-2xl py-5 flex flex-col items-center gap-1 opacity-50`}
            >
              <span className="text-3xl">{btn.emoji}</span>
              <span className="text-sm font-semibold">{btn.label}</span>
              <span className="text-xs opacity-70">Segera hadir</span>
            </button>
          ))}
        </div>

        {/* Timeline */}
        <h2 className="text-lg font-bold text-gray-700 mb-3">Catatan Hari Ini</h2>
        <TodayTimeline logs={logs} />
      </div>

      {/* Drink Modal */}
      {showDrink && (
        <DrinkModal
          onClose={() => setShowDrink(false)}
          onSave={handleDrinkSave}
        />
      )}
    </div>
  )
}