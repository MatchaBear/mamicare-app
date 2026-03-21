import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  RefreshCw,
  X,
} from 'lucide-react'
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
 * - DrinkModal / MealModal / MedModal / GlucoseModal / MedicationPlanModal / WoundModal: form entry screens
 * - DrinkCard / GlucoseCard / MedicationPlanCard: home summary cards
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
 *    - Generates safe numeric IDs to match the current Supabase `bigint` column.
 *    - Uses crypto-backed randomness when available to reduce cross-device collisions.
 *
 * 7. Cleaned up wording mismatch in wound form:
 *    - "Other appearance" text is now clearly optional in the UI and logic.
 *
 * 8. Structured metadata compatibility layer:
 *    - New care flows in this branch need more structure than `summary` text alone.
 *    - To stay compatible with the current production `logs` table, structured fields
 *      are packed into the existing `notes` column with a hidden metadata prefix.
 *    - This keeps the branch shippable before a dedicated DB migration lands.
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

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = () => toDateInputValue(new Date())

const nowTime = () =>
  new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })

function nowInputTime() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function buildTimestampFromDateTime(dateStr, timeStr) {
  const safeDate = dateStr || today()
  const safeTime = timeStr || nowInputTime()
  const parsed = new Date(`${safeDate}T${safeTime}:00`)
  const timestamp = parsed.getTime()
  return Number.isFinite(timestamp) ? timestamp : Date.now()
}

function buildPastRecordPayload(isPastRecord, entryDate, entryTime, lateReason) {
  if (!isPastRecord) return {}

  return {
    entryDate,
    entryTime,
    lateReason,
  }
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function parseDateInputValue(dateStr) {
  if (typeof dateStr !== 'string') return null

  const [year, month, day] = dateStr.split('-').map(Number)

  if (!year || !month || !day) return null

  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseTimeInputValue(timeStr) {
  const fallback = nowInputTime()
  const [fallbackHour, fallbackMinute] = fallback.split(':').map(Number)
  const [rawHour, rawMinute] = typeof timeStr === 'string'
    ? timeStr.split(':').map(Number)
    : []

  const hour =
    Number.isInteger(rawHour) && rawHour >= 0 && rawHour <= 23
      ? rawHour
      : fallbackHour
  const minute =
    Number.isInteger(rawMinute) && rawMinute >= 0 && rawMinute <= 59
      ? rawMinute
      : fallbackMinute

  return { hour, minute }
}

function toTimeValue(hour, minute) {
  return `${pad2(hour)}:${pad2(minute)}`
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function shiftMonth(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function formatPickerDateValue(dateStr) {
  const date = parseDateInputValue(dateStr)
  if (!date) return 'Pilih tanggal'

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatPickerTimeValue(timeStr) {
  const { hour, minute } = parseTimeInputValue(timeStr)
  return `${pad2(hour)}:${pad2(minute)}`
}

function formatPickerMonthLabel(date) {
  return date.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })
}

function getCalendarCells(viewMonth, maxDateStr) {
  const firstDay = startOfMonth(viewMonth)
  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0
  ).getDate()
  const maxDate = parseDateInputValue(maxDateStr)
  const offset = (firstDay.getDay() + 6) % 7
  const cells = []

  for (let i = 0; i < offset; i += 1) {
    cells.push({ type: 'empty', key: `empty-${i}` })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    const dateStr = toDateInputValue(date)
    const isDisabled = maxDate ? date > maxDate : false

    cells.push({
      type: 'day',
      key: dateStr,
      day,
      dateStr,
      isDisabled,
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ type: 'empty', key: `tail-${cells.length}` })
  }

  return cells
}

function generateId() {
  const base = Date.now() * 4096

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const random = new Uint16Array(1)
    crypto.getRandomValues(random)
    return base + (random[0] % 4096)
  }

  return base + Math.floor(Math.random() * 4096)
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
const MAX_PULL_Y = 96
const REFRESH_HOLD_Y = 64
const MIN_REFRESH_MS = 420
const DRAG_ACTIVATION_PX = 8
const AXIS_LOCK_RATIO = 1.15
const RELEASE_ANIM_MS = 280
const NOTE_META_PREFIX = '[[MC_META]]'
const LOCAL_REVIEW_LOGS_KEY = 'mamicare_review_logs'
const PRODUCTION_HOSTNAMES = new Set([
  'mamicare-app.vercel.app',
  'mamicare.ai',
  'www.mamicare.ai',
])

const TYPE_CONFIG = {
  drink: { emoji: '💧', label: 'Minum' },
  meal: { emoji: '🍽️', label: 'Makan' },
  med: { emoji: '💊', label: 'Obat' },
  wound: { emoji: '🩹', label: 'Luka' },
  glucose: { emoji: '🩸', label: 'Gula Darah' },
  med_plan: { emoji: '🗓️', label: 'Jadwal Obat' },
}

const MEDICATION_PRESETS = [
  'Metformin',
  'Glibenclamide',
  'Glimepiride',
  'Insulin',
  'Acarbose',
  'Vitamin B12',
]

const GLUCOSE_CONTEXT_OPTIONS = [
  { id: 'fasting', label: '🌅 Puasa' },
  { id: 'before_meal', label: '🍽️ Sebelum Makan' },
  { id: 'after_meal', label: '⏱️ 2 Jam Sesudah Makan' },
  { id: 'bedtime', label: '🌙 Sebelum Tidur' },
  { id: 'random', label: '🕒 Sewaktu' },
]

const GLUCOSE_CONTEXT_LABELS = {
  fasting: 'Puasa',
  before_meal: 'Sebelum makan',
  after_meal: '2 jam sesudah makan',
  bedtime: 'Sebelum tidur',
  random: 'Sewaktu',
}

const GLUCOSE_SYMPTOM_OPTIONS = [
  { id: 'weak', label: 'Lemas' },
  { id: 'dizzy', label: 'Pusing' },
  { id: 'shaky', label: 'Gemetar' },
  { id: 'sweaty', label: 'Berkeringat' },
  { id: 'nausea', label: 'Mual' },
  { id: 'none', label: 'Tidak ada keluhan' },
]

const GLUCOSE_SYMPTOM_LABELS = {
  weak: 'Lemas',
  dizzy: 'Pusing',
  shaky: 'Gemetar',
  sweaty: 'Berkeringat',
  nausea: 'Mual',
  none: 'Tidak ada keluhan',
}

const MED_PLAN_FREQUENCY_OPTIONS = [
  { id: 'once_daily', label: '1x sehari' },
  { id: 'twice_daily', label: '2x sehari' },
  { id: 'three_daily', label: '3x sehari' },
  { id: 'as_needed', label: 'Sesuai perlu' },
]

const MED_PLAN_FREQUENCY_LABELS = {
  once_daily: '1x sehari',
  twice_daily: '2x sehari',
  three_daily: '3x sehari',
  as_needed: 'Sesuai perlu',
}

const MED_PLAN_STATUS_OPTIONS = [
  { id: 'active', label: '✅ Aktif' },
  { id: 'stopped', label: '⏸️ Dihentikan' },
]

const MED_PLAN_STATUS_LABELS = {
  active: 'Aktif',
  stopped: 'Dihentikan',
}

const DEFAULT_GLUCOSE_TARGETS = {
  lowThreshold: 80,
  preMealHigh: 130,
  postMealHigh: 180,
}

const VISIBLE_LOG_TYPES = new Set([
  'drink',
  'meal',
  'med',
  'wound',
  'glucose',
  'med_plan',
])

function rubberBandDistance(offset, dimension) {
  if (offset <= 0) return 0

  const constant = 0.55
  return (offset * constant * dimension) / (dimension + constant * offset)
}

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || { emoji: '📌', label: 'Catatan' }
}

function isVisibleLogType(type) {
  return VISIBLE_LOG_TYPES.has(type)
}

function unpackStoredNotes(storedNotes) {
  const value = typeof storedNotes === 'string' ? storedNotes : ''

  if (!value.startsWith(NOTE_META_PREFIX)) {
    return { notes: value, meta: {} }
  }

  const payload = value.slice(NOTE_META_PREFIX.length)
  const newlineIndex = payload.indexOf('\n')
  const metaText = newlineIndex === -1 ? payload : payload.slice(0, newlineIndex)
  const noteText = newlineIndex === -1 ? '' : payload.slice(newlineIndex + 1)

  try {
    const meta = JSON.parse(metaText)
    return {
      notes: noteText.trim(),
      meta: meta && typeof meta === 'object' ? meta : {},
    }
  } catch {
    return { notes: value, meta: {} }
  }
}

function packStoredNotes(notes, meta) {
  const cleanNotes = typeof notes === 'string' ? notes.trim() : ''
  const cleanMeta =
    meta && typeof meta === 'object'
      ? Object.fromEntries(
          Object.entries(meta).filter(([, value]) => value !== undefined)
        )
      : {}

  if (Object.keys(cleanMeta).length === 0) return cleanNotes

  const packedMeta = `${NOTE_META_PREFIX}${JSON.stringify(cleanMeta)}`
  return cleanNotes ? `${packedMeta}\n${cleanNotes}` : packedMeta
}

function normalizeLog(log) {
  const { notes, meta } = unpackStoredNotes(log.notes)
  return { ...log, notes, meta }
}

function serializeLog(log) {
  const { meta, notes, ...rest } = log
  return {
    ...rest,
    notes: packStoredNotes(notes, meta),
  }
}

function toPositiveNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function getLatestGlucoseTarget(logs) {
  return [...logs]
    .filter(log => log.type === 'glucose_target')
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))[0]
}

function getGlucoseTargets(logs) {
  const latestTarget = getLatestGlucoseTarget(logs)
  const meta = latestTarget?.meta || {}

  return {
    lowThreshold: toPositiveNumber(
      meta.lowThreshold,
      DEFAULT_GLUCOSE_TARGETS.lowThreshold
    ),
    preMealHigh: toPositiveNumber(
      meta.preMealHigh,
      DEFAULT_GLUCOSE_TARGETS.preMealHigh
    ),
    postMealHigh: toPositiveNumber(
      meta.postMealHigh,
      DEFAULT_GLUCOSE_TARGETS.postMealHigh
    ),
  }
}

function formatGlucoseTargetSummary(targets) {
  return `${targets.lowThreshold}-${targets.preMealHigh} mg/dL sebelum makan · <${targets.postMealHigh} mg/dL sesudah makan`
}

function getGlucoseTargetHigh(context, targets = DEFAULT_GLUCOSE_TARGETS) {
  if (context === 'after_meal') return targets.postMealHigh
  if (context === 'random') return targets.postMealHigh
  if (context === 'bedtime') return targets.postMealHigh
  return targets.preMealHigh
}

function getGlucoseSeverity(reading, context, targets = DEFAULT_GLUCOSE_TARGETS) {
  const value = Number(reading)

  if (!Number.isFinite(value)) return 'unknown'
  if (value < 70) return 'urgent-low'
  if (value < targets.lowThreshold) return 'low'
  if (value >= 250) return 'urgent-high'
  if (value > getGlucoseTargetHigh(context, targets)) return 'high'
  return 'ok'
}

function getGlucoseUi(severity) {
  if (severity === 'unknown') {
    return {
      badge: 'bg-gray-100 text-gray-600',
      accent: 'from-gray-50 to-slate-100 border-gray-200',
      label: 'Belum ada data',
    }
  }

  if (severity === 'urgent-low') {
    return {
      badge: 'bg-red-100 text-red-700',
      accent: 'from-red-50 to-rose-100 border-red-200',
      label: 'Terlalu rendah',
    }
  }

  if (severity === 'low') {
    return {
      badge: 'bg-amber-100 text-amber-700',
      accent: 'from-amber-50 to-yellow-100 border-amber-200',
      label: 'Sedikit rendah',
    }
  }

  if (severity === 'urgent-high') {
    return {
      badge: 'bg-red-100 text-red-700',
      accent: 'from-red-50 to-orange-100 border-red-200',
      label: 'Terlalu tinggi',
    }
  }

  if (severity === 'high') {
    return {
      badge: 'bg-amber-100 text-amber-700',
      accent: 'from-amber-50 to-orange-100 border-amber-200',
      label: 'Di atas target',
    }
  }

  return {
    badge: 'bg-emerald-100 text-emerald-700',
    accent: 'from-emerald-50 to-teal-100 border-emerald-200',
    label: 'Dalam target',
  }
}

function getMedicationPlanDisplay(meta = {}) {
  const frequencyText = MED_PLAN_FREQUENCY_LABELS[meta.frequency] || null
  const statusText = MED_PLAN_STATUS_LABELS[meta.planStatus] || 'Aktif'

  return {
    medicationName: meta.medicationName || 'Obat tanpa nama',
    dosageText: meta.dosageText || 'Dosis belum diisi',
    prescribedBy: meta.prescribedBy || '',
    scheduleText: meta.scheduleText || '',
    frequencyText,
    statusText,
  }
}

function getActiveMedicationPlans(logs) {
  const latestByMedication = new Map()

  const sortedPlans = [...logs]
    .filter(log => log.type === 'med_plan')
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))

  sortedPlans.forEach(log => {
    const key = (log.meta?.medicationName || log.summary || '')
      .trim()
      .toLowerCase()

    if (!key || latestByMedication.has(key)) return
    latestByMedication.set(key, log)
  })

  return [...latestByMedication.values()].filter(
    log => (log.meta?.planStatus || 'active') === 'active'
  )
}

function formatLogMetaDescription(log) {
  const meta = log.meta || {}
  const parts = []

  if (log.type === 'glucose') {
    const symptoms = Array.isArray(meta.symptoms)
      ? meta.symptoms
          .map(symptom => GLUCOSE_SYMPTOM_LABELS[symptom])
          .filter(Boolean)
      : []

    if (symptoms.length > 0) {
      parts.push(`Keluhan: ${symptoms.join(', ')}`)
    }
  }

  if (log.type === 'med_plan') {
    const display = getMedicationPlanDisplay(meta)
    if (display.prescribedBy) parts.push(`👨‍⚕️ ${display.prescribedBy}`)
    if (display.scheduleText) parts.push(`🕒 ${display.scheduleText}`)
  }

  if (meta.lateEntryReason) {
    parts.push(`🗓️ Ditambah belakangan: ${meta.lateEntryReason}`)
  }

  return parts.join(' · ')
}

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

function getLocalReviewLogsStorageKey() {
  if (typeof window === 'undefined') return LOCAL_REVIEW_LOGS_KEY
  return `${LOCAL_REVIEW_LOGS_KEY}:${window.location.hostname}`
}

function getRemoteSyncEnabled() {
  if (typeof window === 'undefined') return true
  return PRODUCTION_HOSTNAMES.has(window.location.hostname)
}

function loadLocalReviewLogs() {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(getLocalReviewLogsStorageKey())
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map(item => normalizeLog(item))
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
  } catch (error) {
    console.error('Gagal memuat catatan lokal:', error)
    return []
  }
}

function storeLocalReviewLogs(logs) {
  if (typeof window === 'undefined') return

  const key = getLocalReviewLogsStorageKey()

  if (!Array.isArray(logs) || logs.length === 0) {
    localStorage.removeItem(key)
    return
  }

  localStorage.setItem(
    key,
    JSON.stringify(logs.map(log => serializeLog(log)))
  )
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

async function loadLogs({ remoteSyncEnabled }) {
  if (!remoteSyncEnabled) {
    return loadLocalReviewLogs()
  }

  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error) {
    console.error('Failed to load logs:', error)
    return []
  }

  return (data || []).map(normalizeLog)
}

async function saveLog(log, { remoteSyncEnabled }) {
  if (!remoteSyncEnabled) {
    const nextLogs = upsertLogInState(loadLocalReviewLogs(), log)
    storeLocalReviewLogs(nextLogs)
    return
  }

  const { error } = await supabase.from('logs').upsert(serializeLog(log))

  if (error) {
    console.error('Failed to save log:', error)
    throw error
  }
}

async function deleteLog(id, { remoteSyncEnabled }) {
  if (!remoteSyncEnabled) {
    const nextLogs = loadLocalReviewLogs().filter(log => log.id !== id)
    storeLocalReviewLogs(nextLogs)
    return
  }

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

function ReviewModeBanner() {
  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
      <p className="text-sm font-semibold text-amber-800">Mode Tinjauan Lokal</p>
      <p className="mt-1 text-sm leading-relaxed text-amber-700">
        Catatan di cabang ini hanya tersimpan di perangkat ini. Database utama tidak disentuh.
      </p>
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

function PickerTriggerField({
  label,
  value,
  icon,
  tone = 'sky',
  active = false,
  onClick,
}) {
  const accentClass =
    tone === 'sky'
      ? 'text-sky-500 bg-sky-50'
      : 'text-indigo-500 bg-indigo-50'

  return (
    <div>
      <p className="mb-2 text-sm text-gray-500">{label}</p>
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-2xl border-2 bg-white px-4 py-3 shadow-sm transition-all ${
          active
            ? 'border-sky-300 shadow-sky-100'
            : 'border-gray-200 hover:border-sky-200'
        }`}
      >
        <span className="grid grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-3">
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${accentClass} opacity-0`}>
            {icon}
          </span>

          <span className="block truncate text-center text-lg font-semibold text-gray-800">
            {value}
          </span>

          <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${accentClass}`}>
            {icon}
          </span>
        </span>
      </button>
    </div>
  )
}

function DatePickerPanel({
  value,
  viewMonth,
  onViewMonthChange,
  onChange,
  onClose,
}) {
  const selectedDate = value || today()
  const selectedMonth = parseDateInputValue(selectedDate) || new Date()
  const maxMonth = startOfMonth(new Date())
  const prevMonth = shiftMonth(viewMonth, -1)
  const nextMonth = shiftMonth(viewMonth, 1)
  const canGoNext = nextMonth <= maxMonth
  const weekdayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
  const cells = getCalendarCells(viewMonth, today())

  return (
    <div className="mt-3 rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onViewMonthChange(prevMonth)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-600"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="min-w-0 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">
            Kalender
          </p>
          <p className="truncate text-lg font-bold capitalize text-gray-800">
            {formatPickerMonthLabel(viewMonth)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => canGoNext && onViewMonthChange(nextMonth)}
          disabled={!canGoNext}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-600 disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {weekdayLabels.map(label => (
          <div
            key={label}
            className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(cell => {
          if (cell.type === 'empty') {
            return <div key={cell.key} className="aspect-square" />
          }

          const isSelected = cell.dateStr === selectedDate

          return (
            <button
              key={cell.key}
              type="button"
              disabled={cell.isDisabled}
              onClick={() => {
                onChange(cell.dateStr)
                onClose()
              }}
              className={`aspect-square rounded-2xl text-sm font-semibold transition-all ${
                isSelected
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-200'
                  : cell.isDisabled
                    ? 'text-gray-300'
                    : 'text-gray-700 hover:bg-sky-50'
              }`}
            >
              {cell.day}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            const currentDate = today()
            onChange(currentDate)
            onViewMonthChange(startOfMonth(parseDateInputValue(currentDate) || new Date()))
            onClose()
          }}
          className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
            selectedMonth.getFullYear() === new Date().getFullYear() &&
            selectedMonth.getMonth() === new Date().getMonth() &&
            selectedDate === today()
              ? 'border-sky-200 bg-sky-50 text-sky-700'
              : 'border-gray-200 bg-gray-50 text-gray-600'
          }`}
        >
          Hari ini
        </button>

        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600"
        >
          Tutup
        </button>
      </div>
    </div>
  )
}

function TimePickerPanel({ value, onChange, onClose }) {
  const { hour, minute } = parseTimeInputValue(value)
  const hours = Array.from({ length: 24 }, (_, index) => index)
  const minutes = Array.from({ length: 60 }, (_, index) => index)

  function updateHour(nextHour) {
    onChange(toTimeValue(nextHour, minute))
  }

  function updateMinute(nextMinute) {
    onChange(toTimeValue(hour, nextMinute))
  }

  return (
    <div className="mt-3 rounded-3xl border border-indigo-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
            Waktu
          </p>
          <p className="text-lg font-bold text-gray-800">Pilih jam kejadian</p>
        </div>

        <button
          type="button"
          onClick={() => onChange(nowInputTime())}
          className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700"
        >
          Sekarang
        </button>
      </div>

      <div className="mb-4 rounded-3xl bg-gradient-to-br from-indigo-50 to-sky-50 px-4 py-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
          Jam Terpilih
        </p>
        <p className="mt-1 text-3xl font-black tracking-[0.18em] text-gray-800">
          {formatPickerTimeValue(value)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gray-50 p-3">
          <p className="mb-3 text-center text-sm font-semibold text-gray-500">Jam</p>
          <div className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto pr-1">
            {hours.map(optionHour => {
              const selected = optionHour === hour

              return (
                <button
                  key={optionHour}
                  type="button"
                  onClick={() => updateHour(optionHour)}
                  className={`rounded-2xl px-2 py-2 text-sm font-semibold transition-all ${
                    selected
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200'
                      : 'bg-white text-gray-700 hover:bg-indigo-50'
                  }`}
                >
                  {pad2(optionHour)}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-gray-50 p-3">
          <p className="mb-3 text-center text-sm font-semibold text-gray-500">Menit</p>
          <div className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto pr-1">
            {minutes.map(optionMinute => {
              const selected = optionMinute === minute

              return (
                <button
                  key={optionMinute}
                  type="button"
                  onClick={() => updateMinute(optionMinute)}
                  className={`rounded-2xl px-2 py-2 text-sm font-semibold transition-all ${
                    selected
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-200'
                      : 'bg-white text-gray-700 hover:bg-sky-50'
                  }`}
                >
                  {pad2(optionMinute)}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-2xl bg-gray-800 px-4 py-3 text-sm font-semibold text-white"
        >
          <Check size={16} />
          Selesai
        </button>
      </div>
    </div>
  )
}

function EntryTimingFields({
  enabled,
  onEnabledChange,
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  lateReason,
  onLateReasonChange,
}) {
  const [activePicker, setActivePicker] = useState(null)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const selectedDate = parseDateInputValue(dateValue) || new Date()
    return startOfMonth(selectedDate)
  })

  useEffect(() => {
    if (!enabled) {
      setActivePicker(null)
      return
    }

    const selectedDate = parseDateInputValue(dateValue)
    if (selectedDate) {
      setCalendarMonth(startOfMonth(selectedDate))
    }
  }, [dateValue, enabled])

  return (
    <div className="mb-6">
      <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => onEnabledChange(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-sky-500 focus:ring-sky-400"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-sky-50">
              <CalendarDays size={16} className="text-sky-500" />
            </div>

            <p className="font-semibold text-gray-700">Buat catatan lampau</p>
          </div>

          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            Centang kalau kejadian ini sebenarnya terjadi di waktu sebelumnya.
          </p>
        </div>
      </label>

      {enabled ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
          <p className="mb-3 text-sm text-gray-500">
            Isi waktu kejadian yang sebenarnya, lalu tambahkan alasan kenapa baru dicatat sekarang.
          </p>

          <div className="mb-5 space-y-4">
            <div>
              <PickerTriggerField
                label="Tanggal"
                value={formatPickerDateValue(dateValue)}
                icon={<CalendarDays size={16} />}
                tone="sky"
                active={activePicker === 'date'}
                onClick={() =>
                  setActivePicker(current => (current === 'date' ? null : 'date'))
                }
              />

              {activePicker === 'date' ? (
                <DatePickerPanel
                  value={dateValue}
                  viewMonth={calendarMonth}
                  onViewMonthChange={setCalendarMonth}
                  onChange={onDateChange}
                  onClose={() => setActivePicker(null)}
                />
              ) : null}
            </div>

            <div>
              <PickerTriggerField
                label="Jam"
                value={formatPickerTimeValue(timeValue)}
                icon={<Clock3 size={16} />}
                tone="indigo"
                active={activePicker === 'time'}
                onClick={() =>
                  setActivePicker(current => (current === 'time' ? null : 'time'))
                }
              />

              {activePicker === 'time' ? (
                <TimePickerPanel
                  value={timeValue}
                  onChange={onTimeChange}
                  onClose={() => setActivePicker(null)}
                />
              ) : null}
            </div>
          </div>

          <label className="block">
            <p className="mb-2 text-sm text-gray-500">
              Alasan baru dicatat sekarang <span className="text-gray-400">(opsional)</span>
            </p>
            <input
              type="text"
              value={lateReason}
              onChange={e => onLateReasonChange(e.target.value)}
              placeholder="Contoh: baru sempat diinput malam hari"
              className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-base text-gray-700 focus:border-sky-400 focus:outline-none"
            />
          </label>
        </div>
      ) : null}
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

function ToggleChipGroup({ options, selectedIds, onToggle, color = 'sky' }) {
  const activeClassMap = {
    sky: 'bg-sky-500 text-white border-sky-500',
    rose: 'bg-rose-500 text-white border-rose-500',
    purple: 'bg-purple-500 text-white border-purple-500',
    red: 'bg-red-500 text-white border-red-500',
  }

  const activeClass = activeClassMap[color] || activeClassMap.sky

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {options.map(opt => {
        const selected = selectedIds.includes(opt.id)

        return (
          <button
            key={opt.id}
            onClick={() => onToggle(opt.id)}
            className={`px-4 py-2 rounded-full border-2 text-base font-medium transition-all ${
              selected
                ? activeClass
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
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
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
        <p className="text-5xl text-center mb-4">{getTypeConfig(log.type).emoji}</p>

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
  const [isPastRecord, setIsPastRecord] = useState(false)
  const [entryDate, setEntryDate] = useState(today())
  const [entryTime, setEntryTime] = useState(nowInputTime())
  const [lateReason, setLateReason] = useState('')

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

      <EntryTimingFields
        enabled={isPastRecord}
        onEnabledChange={setIsPastRecord}
        dateValue={entryDate}
        timeValue={entryTime}
        onDateChange={setEntryDate}
        onTimeChange={setEntryTime}
        lateReason={lateReason}
        onLateReasonChange={setLateReason}
      />

      <NotesField value={notes} onChange={setNotes} />

      <SaveButton
        canSave={drinkKind && amount}
        saving={saving}
        onSave={() =>
          onSave({
            type: drinkKind,
            amount,
            notes,
            ...buildPastRecordPayload(
              isPastRecord,
              entryDate,
              entryTime,
              lateReason
            ),
          })
        }
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
  const [isPastRecord, setIsPastRecord] = useState(false)
  const [entryDate, setEntryDate] = useState(today())
  const [entryTime, setEntryTime] = useState(nowInputTime())
  const [lateReason, setLateReason] = useState('')

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

      <EntryTimingFields
        enabled={isPastRecord}
        onEnabledChange={setIsPastRecord}
        dateValue={entryDate}
        timeValue={entryTime}
        onDateChange={setEntryDate}
        onTimeChange={setEntryTime}
        lateReason={lateReason}
        onLateReasonChange={setLateReason}
      />

      <NotesField value={notes} onChange={setNotes} />

      <SaveButton
        canSave={canSave}
        saving={saving}
        onSave={() =>
          onSave({
            mealType,
            foodText,
            portion,
            notes,
            ...buildPastRecordPayload(
              isPastRecord,
              entryDate,
              entryTime,
              lateReason
            ),
          })
        }
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
  const [isPastRecord, setIsPastRecord] = useState(false)
  const [entryDate, setEntryDate] = useState(today())
  const [entryTime, setEntryTime] = useState(nowInputTime())
  const [lateReason, setLateReason] = useState('')

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
        {MEDICATION_PRESETS.map(preset => (
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

      <EntryTimingFields
        enabled={isPastRecord}
        onEnabledChange={setIsPastRecord}
        dateValue={entryDate}
        timeValue={entryTime}
        onDateChange={setEntryDate}
        onTimeChange={setEntryTime}
        lateReason={lateReason}
        onLateReasonChange={setLateReason}
      />

      <NotesField value={notes} onChange={setNotes} />

      <SaveButton
        canSave={canSave}
        saving={saving}
        onSave={() =>
          onSave({
            medName,
            status,
            notes,
            ...buildPastRecordPayload(
              isPastRecord,
              entryDate,
              entryTime,
              lateReason
            ),
          })
        }
      />
    </ModalShell>
  )
}

function GlucoseModal({ onClose, onSave, saving = false }) {
  const [reading, setReading] = useState('')
  const [context, setContext] = useState(null)
  const [symptoms, setSymptoms] = useState([])
  const [notes, setNotes] = useState('')
  const [isPastRecord, setIsPastRecord] = useState(false)
  const [entryDate, setEntryDate] = useState(today())
  const [entryTime, setEntryTime] = useState(nowInputTime())
  const [lateReason, setLateReason] = useState('')

  function toggleSymptom(id) {
    setSymptoms(prev => {
      if (id === 'none') {
        return prev.includes('none') ? [] : ['none']
      }

      const next = prev.filter(item => item !== 'none')
      return next.includes(id)
        ? next.filter(item => item !== id)
        : [...next, id]
    })
  }

  const canSave = Number(reading) > 0 && context

  return (
    <ModalShell onClose={onClose} title="🩸 Catat Gula Darah">
      <p className="text-gray-500 text-lg mb-3">Hasil berapa mg/dL?</p>
      <div className="mb-6">
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={reading}
            onChange={e => setReading(e.target.value)}
            placeholder="Contoh: 128"
            className="w-full border-2 border-gray-200 rounded-2xl p-4 pr-24 text-2xl font-bold text-gray-700 focus:outline-none focus:border-red-400"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
            mg/dL
          </span>
        </div>
      </div>

      <p className="text-gray-500 text-lg mb-3">Cek kapan?</p>
      <OptionGroup
        options={GLUCOSE_CONTEXT_OPTIONS}
        selected={context}
        onSelect={setContext}
        cols={1}
      />

      <p className="text-gray-500 text-lg mb-3">
        Ada keluhan? <span className="text-sm">(boleh pilih lebih dari satu)</span>
      </p>
      <ToggleChipGroup
        options={GLUCOSE_SYMPTOM_OPTIONS}
        selectedIds={symptoms}
        onToggle={toggleSymptom}
        color="red"
      />

      <EntryTimingFields
        enabled={isPastRecord}
        onEnabledChange={setIsPastRecord}
        dateValue={entryDate}
        timeValue={entryTime}
        onDateChange={setEntryDate}
        onTimeChange={setEntryTime}
        lateReason={lateReason}
        onLateReasonChange={setLateReason}
      />

      <NotesField value={notes} onChange={setNotes} />

      <SaveButton
        canSave={canSave}
        saving={saving}
        onSave={() =>
          onSave({
            reading,
            context,
            symptoms,
            notes,
            ...buildPastRecordPayload(
              isPastRecord,
              entryDate,
              entryTime,
              lateReason
            ),
          })
        }
      />
    </ModalShell>
  )
}

function GlucoseTargetModal({
  onClose,
  onSave,
  saving = false,
  initialTargets = DEFAULT_GLUCOSE_TARGETS,
}) {
  const [lowThreshold, setLowThreshold] = useState(
    String(initialTargets.lowThreshold)
  )
  const [preMealHigh, setPreMealHigh] = useState(
    String(initialTargets.preMealHigh)
  )
  const [postMealHigh, setPostMealHigh] = useState(
    String(initialTargets.postMealHigh)
  )
  const [notes, setNotes] = useState('')
  const [isPastRecord, setIsPastRecord] = useState(false)
  const [entryDate, setEntryDate] = useState(today())
  const [entryTime, setEntryTime] = useState(nowInputTime())
  const [lateReason, setLateReason] = useState('')

  const lowValue = Number(lowThreshold)
  const preMealValue = Number(preMealHigh)
  const postMealValue = Number(postMealHigh)
  const canSave =
    Number.isFinite(lowValue) &&
    Number.isFinite(preMealValue) &&
    Number.isFinite(postMealValue) &&
    lowValue > 0 &&
    preMealValue > lowValue &&
    postMealValue >= preMealValue

  return (
    <ModalShell onClose={onClose} title="🎯 Atur Target Gula">
      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
        <p className="font-semibold text-gray-800 mb-1">Target khusus Nyok</p>
        <p className="text-gray-500 text-sm">
          Angka ini sebaiknya mengikuti arahan dokter. Kalau belum ada target khusus,
          pakai angka default dulu.
        </p>
      </div>

      <p className="text-gray-500 text-lg mb-3">Batas rendah peringatan</p>
      <div className="relative mb-6">
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={lowThreshold}
          onChange={e => setLowThreshold(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-2xl p-4 pr-24 text-xl font-bold text-gray-700 focus:outline-none focus:border-red-400"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
          mg/dL
        </span>
      </div>

      <p className="text-gray-500 text-lg mb-3">Target maksimal sebelum makan</p>
      <div className="relative mb-6">
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={preMealHigh}
          onChange={e => setPreMealHigh(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-2xl p-4 pr-24 text-xl font-bold text-gray-700 focus:outline-none focus:border-red-400"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
          mg/dL
        </span>
      </div>

      <p className="text-gray-500 text-lg mb-3">Target maksimal sesudah makan</p>
      <div className="relative mb-6">
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={postMealHigh}
          onChange={e => setPostMealHigh(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-2xl p-4 pr-24 text-xl font-bold text-gray-700 focus:outline-none focus:border-red-400"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
          mg/dL
        </span>
      </div>

      <EntryTimingFields
        enabled={isPastRecord}
        onEnabledChange={setIsPastRecord}
        dateValue={entryDate}
        timeValue={entryTime}
        onDateChange={setEntryDate}
        onTimeChange={setEntryTime}
        lateReason={lateReason}
        onLateReasonChange={setLateReason}
      />

      <NotesField value={notes} onChange={setNotes} />

      <SaveButton
        canSave={canSave}
        saving={saving}
        onSave={() =>
          onSave({
            lowThreshold: lowValue,
            preMealHigh: preMealValue,
            postMealHigh: postMealValue,
            notes,
            ...buildPastRecordPayload(
              isPastRecord,
              entryDate,
              entryTime,
              lateReason
            ),
          })
        }
      />
    </ModalShell>
  )
}

function MedicationPlanModal({ onClose, onSave, saving = false }) {
  const [medicationName, setMedicationName] = useState('')
  const [isOther, setIsOther] = useState(false)
  const [dosageText, setDosageText] = useState('')
  const [prescribedBy, setPrescribedBy] = useState('')
  const [frequency, setFrequency] = useState(null)
  const [scheduleText, setScheduleText] = useState('')
  const [planStatus, setPlanStatus] = useState('active')
  const [notes, setNotes] = useState('')
  const [isPastRecord, setIsPastRecord] = useState(false)
  const [entryDate, setEntryDate] = useState(today())
  const [entryTime, setEntryTime] = useState(nowInputTime())
  const [lateReason, setLateReason] = useState('')

  const canSave =
    medicationName.trim().length > 0 &&
    dosageText.trim().length > 0 &&
    prescribedBy.trim().length > 0 &&
    (planStatus === 'stopped' || (frequency && scheduleText.trim().length > 0))

  return (
    <ModalShell onClose={onClose} title="🗓️ Atur Jadwal Obat">
      <p className="text-gray-500 text-lg mb-3">Obat yang diresepkan?</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {MEDICATION_PRESETS.map(preset => (
          <button
            key={preset}
            onClick={() => {
              setMedicationName(preset)
              setIsOther(false)
            }}
            className={`px-4 py-2 rounded-full border-2 text-base font-medium transition-all ${
              medicationName === preset && !isOther
                ? 'bg-purple-500 text-white border-purple-500'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {preset}
          </button>
        ))}

        <button
          onClick={() => {
            setMedicationName('')
            setIsOther(true)
          }}
          className={`px-4 py-2 rounded-full border-2 text-base font-medium transition-all ${
            isOther
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
          value={medicationName}
          onChange={e => setMedicationName(e.target.value)}
          placeholder="Nama obat..."
          className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 focus:outline-none focus:border-purple-400 mb-6"
        />
      )}

      <p className="text-gray-500 text-lg mb-3">Dosis yang diresepkan?</p>
      <input
        type="text"
        value={dosageText}
        onChange={e => setDosageText(e.target.value)}
        placeholder="Contoh: 500 mg atau 10 unit"
        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 focus:outline-none focus:border-purple-400 mb-6"
      />

      <p className="text-gray-500 text-lg mb-3">Diresepkan oleh siapa?</p>
      <input
        type="text"
        value={prescribedBy}
        onChange={e => setPrescribedBy(e.target.value)}
        placeholder="Contoh: dr. Andi, Sp.PD"
        className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 focus:outline-none focus:border-purple-400 mb-6"
      />

      <p className="text-gray-500 text-lg mb-3">Status resep saat ini?</p>
      <OptionGroup
        options={MED_PLAN_STATUS_OPTIONS}
        selected={planStatus}
        onSelect={setPlanStatus}
        cols={1}
      />

      {planStatus === 'active' ? (
        <>
          <p className="text-gray-500 text-lg mb-3">Seberapa sering diminum?</p>
          <OptionGroup
            options={MED_PLAN_FREQUENCY_OPTIONS}
            selected={frequency}
            onSelect={setFrequency}
            cols={2}
          />

          <p className="text-gray-500 text-lg mb-3">Kapan diminum?</p>
          <textarea
            value={scheduleText}
            onChange={e => setScheduleText(e.target.value)}
            placeholder="Contoh: Sesudah sarapan jam 07:00 dan sesudah makan malam jam 19:00"
            rows={3}
            className="w-full border-2 border-gray-200 rounded-2xl p-4 text-lg text-gray-700 resize-none focus:outline-none focus:border-purple-400 mb-6"
          />
        </>
      ) : null}

      <EntryTimingFields
        enabled={isPastRecord}
        onEnabledChange={setIsPastRecord}
        dateValue={entryDate}
        timeValue={entryTime}
        onDateChange={setEntryDate}
        onTimeChange={setEntryTime}
        lateReason={lateReason}
        onLateReasonChange={setLateReason}
      />

      <NotesField value={notes} onChange={setNotes} />

      <SaveButton
        canSave={canSave}
        saving={saving}
        onSave={() =>
          onSave({
            medicationName,
            dosageText,
            prescribedBy,
            frequency,
            scheduleText,
            planStatus,
            notes,
            ...buildPastRecordPayload(
              isPastRecord,
              entryDate,
              entryTime,
              lateReason
            ),
          })
        }
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
  const [isPastRecord, setIsPastRecord] = useState(false)
  const [entryDate, setEntryDate] = useState(today())
  const [entryTime, setEntryTime] = useState(nowInputTime())
  const [lateReason, setLateReason] = useState('')

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

      <EntryTimingFields
        enabled={isPastRecord}
        onEnabledChange={setIsPastRecord}
        dateValue={entryDate}
        timeValue={entryTime}
        onDateChange={setEntryDate}
        onTimeChange={setEntryTime}
        lateReason={lateReason}
        onLateReasonChange={setLateReason}
      />

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
            ...buildPastRecordPayload(
              isPastRecord,
              entryDate,
              entryTime,
              lateReason
            ),
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

function GlucoseCard({ logs, onAdd, onEditTargets }) {
  const todayGlucoseLogs = logs
    .filter(log => log.type === 'glucose' && log.date === today())
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))

  const targets = getGlucoseTargets(logs)
  const latestToday = todayGlucoseLogs[0] || null
  const latestMeta = latestToday?.meta || {}
  const reading = Number(latestMeta.readingMgDl)
  const hasReading = Number.isFinite(reading)
  const severity = getGlucoseSeverity(reading, latestMeta.context, targets)
  const ui = getGlucoseUi(severity)

  return (
    <div
      className={`bg-gradient-to-br ${ui.accent} border rounded-3xl p-5 mb-4 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">
            Gula Darah Hari Ini
          </p>

          {latestToday ? (
            <>
              <p className="text-4xl font-black text-gray-800 mt-1">
                {hasReading ? reading : '—'}{' '}
                <span className="text-xl font-bold text-gray-500">mg/dL</span>
              </p>
              <p className="text-gray-500 mt-1">
                {GLUCOSE_CONTEXT_LABELS[latestMeta.context] || 'Cek gula'}
                {' · '}
                {latestToday.time}
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-black text-gray-800 mt-1">
                Belum dicek
              </p>
              <p className="text-gray-500 mt-1">
                Catat hasil cek gula darah supaya keluarga bisa ikut memantau.
              </p>
            </>
          )}
        </div>

        <span className="text-4xl">🩸</span>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${ui.badge}`}>
          {latestToday ? ui.label : 'Belum ada data hari ini'}
        </span>

        <span className="text-sm text-gray-500">
          {todayGlucoseLogs.length}x cek hari ini
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Target aktif: {formatGlucoseTargetSummary(targets)}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onAdd}
          className="bg-white/75 hover:bg-white active:bg-white/90 border border-white rounded-2xl py-3 text-base font-semibold text-gray-700 transition-all"
        >
          + Catat Gula
        </button>

        <button
          onClick={onEditTargets}
          className="bg-white/55 hover:bg-white/70 active:bg-white/85 border border-white rounded-2xl py-3 text-base font-semibold text-gray-600 transition-all"
        >
          🎯 Atur Target
        </button>
      </div>
    </div>
  )
}

function MedicationPlanCard({ logs, onAdd }) {
  const activePlans = getActiveMedicationPlans(logs)

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">
            Resep Obat Saat Ini
          </p>
          <h3 className="text-2xl font-black text-gray-800 mt-1">
            Jadwal Obat
          </h3>
        </div>

        <span className="text-4xl">🗓️</span>
      </div>

      {activePlans.length === 0 ? (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 mb-4">
          <p className="font-semibold text-gray-800 mb-1">
            Belum ada resep aktif
          </p>
          <p className="text-gray-500">
            Simpan obat yang sedang diresepkan dokter, dosisnya, dan kapan harus diminum.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {activePlans.map(plan => {
            const display = getMedicationPlanDisplay(plan.meta)

            return (
              <div
                key={plan.id}
                className="bg-purple-50 border border-purple-100 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {display.medicationName}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {display.dosageText}
                      {display.frequencyText ? ` · ${display.frequencyText}` : ''}
                    </p>
                  </div>

                  <span className="bg-white text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">
                    {display.statusText}
                  </span>
                </div>

                {display.scheduleText ? (
                  <p className="text-gray-600 text-sm mt-2">🕒 {display.scheduleText}</p>
                ) : null}

                {display.prescribedBy ? (
                  <p className="text-gray-500 text-sm mt-1">👨‍⚕️ {display.prescribedBy}</p>
                ) : null}

                {plan.notes ? (
                  <p className="text-gray-400 text-sm italic mt-1">📝 {plan.notes}</p>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      <button
        onClick={onAdd}
        className="w-full bg-purple-50 hover:bg-purple-100 active:bg-purple-200 border border-purple-200 rounded-2xl py-3 text-lg font-semibold text-purple-700 transition-all"
      >
        + Atur Jadwal Obat
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
    .filter(l => l.date === today() && isVisibleLogType(l.type))
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))

  if (todayLogs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-4xl mb-2">📋</p>
        <p className="text-lg">Belum ada catatan hari ini</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {todayLogs.map(log => (
        <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getTypeConfig(log.type).emoji}</span>

            <div className="flex-1">
              <p className="font-semibold text-gray-800">{getTypeConfig(log.type).label}</p>
              <p className="text-gray-500 text-sm">{log.summary}</p>

              {formatLogMetaDescription(log) ? (
                <p className="text-gray-400 text-sm mt-1">{formatLogMetaDescription(log)}</p>
              ) : null}

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
  const grouped = useMemo(() => {
    return logs
      .filter(log => isVisibleLogType(log.type))
      .reduce((acc, log) => {
      if (!acc[log.date]) acc[log.date] = []
      acc[log.date].push(log)
      return acc
      }, {})
  }, [logs])

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  function formatDate(dateStr) {
    const date = new Date(`${dateStr}T00:00:00`)
    const todayStr = today()
    const yesterdayStr = toDateInputValue(new Date(Date.now() - 86400000))

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
    const glucoseCount = dayLogs.filter(l => l.type === 'glucose').length
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

        {glucoseCount > 0 && (
          <span className="bg-red-100 text-red-700 text-xs font-medium px-3 py-1 rounded-full">
            🩸 {glucoseCount}x cek gula
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
                <span className="text-2xl mt-0.5">{getTypeConfig(log.type).emoji}</span>

                <div className="flex-1">
                  <p className="font-semibold text-gray-700">{getTypeConfig(log.type).label}</p>
                  <p className="text-gray-500 text-sm">{log.summary}</p>

                  {formatLogMetaDescription(log) ? (
                    <p className="text-gray-400 text-sm mt-0.5">
                      {formatLogMetaDescription(log)}
                    </p>
                  ) : null}

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
 * - Content rubber-bands downward with iOS-like resistance.
 * - Touch is captured on the fixed viewport wrapper, not the browser scroller.
 * - Browser/native pull-to-refresh is blocked locally via `preventDefault()`
 *   while the custom downward gesture is active.
 */

export default function App() {
  const pullViewportRef = useRef(null)
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
  const remoteSyncEnabled = getRemoteSyncEnabled()

  /* ---------------- Pull-to-refresh state ---------------- */
  const [pullRaw, setPullRaw] = useState(0)
  const [pullReleaseOffset, setPullReleaseOffset] = useState(null)

  const touchStartXRef = useRef(0)
  const touchStartYRef = useRef(0)
  const touchActiveRef = useRef(false)
  const isPullingRef = useRef(false)
  const pullRawRef = useRef(0)
  const handleRefreshRef = useRef(null)
  const pullRefreshActiveRef = useRef(false)
  const refreshingRef = useRef(false)

  refreshingRef.current = refreshing

  /* ---------------- Initial load + realtime ---------------- */
  useEffect(() => {
    let isMounted = true

    async function init() {
      try {
        const data = await loadLogs({ remoteSyncEnabled })
        if (isMounted) setLogs(data)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    init()

    if (!remoteSyncEnabled) {
      return () => {
        isMounted = false
      }
    }

    const channel = supabase
      .channel('logs-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'logs' },
        payload => {
          if (payload.eventType === 'INSERT') {
            setLogs(prev => upsertLogInState(prev, normalizeLog(payload.new)))
          }

          if (payload.eventType === 'UPDATE') {
            setLogs(prev => upsertLogInState(prev, normalizeLog(payload.new)))
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
  }, [remoteSyncEnabled])

  async function handleRefresh() {
    if (refreshingRef.current) return

    const startedAt = Date.now()
    setRefreshing(true)

    try {
      const data = await loadLogs({ remoteSyncEnabled })
      setLogs(data)
    } finally {
      const elapsed = Date.now() - startedAt

      if (elapsed < MIN_REFRESH_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_REFRESH_MS - elapsed))
      }

      setRefreshing(false)

      if (pullRefreshActiveRef.current) {
        pullRefreshActiveRef.current = false
        setPullReleaseOffset(0)
      }
    }
  }

  handleRefreshRef.current = handleRefresh

  useEffect(() => {
    if (pullReleaseOffset === null || pullRaw > 0 || refreshing) return

    const timeoutId = window.setTimeout(() => {
      setPullReleaseOffset(current => (current === 0 ? null : current))
    }, RELEASE_ANIM_MS)

    return () => window.clearTimeout(timeoutId)
  }, [pullRaw, pullReleaseOffset, refreshing])

  /* ---------------- Viewport-level touch handlers ---------------- */
  useEffect(() => {
    if (loading || !currentUser || screen !== 'home') return

    const viewportEl = pullViewportRef.current
    const scrollEl = scrollRef.current
    if (!viewportEl || !scrollEl) return

    function resetPull() {
      touchActiveRef.current = false
      isPullingRef.current = false
      pullRawRef.current = 0
      setPullRaw(0)
    }

    function onTouchStart(e) {
      if (refreshingRef.current || e.touches.length !== 1) {
        resetPull()
        return
      }

      const touch = e.touches[0]

      touchActiveRef.current = true
      touchStartXRef.current = touch.clientX
      touchStartYRef.current = touch.clientY
      isPullingRef.current = false
      pullRawRef.current = 0
      setPullRaw(0)

      if (!refreshingRef.current) {
        setPullReleaseOffset(null)
      }
    }

    function onTouchMove(e) {
      if (refreshingRef.current || !touchActiveRef.current) return

      if (e.touches.length !== 1) {
        resetPull()
        return
      }

      const touch = e.touches[0]

      if (!isPullingRef.current && scrollEl.scrollTop > 0.5) {
        touchStartXRef.current = touch.clientX
        touchStartYRef.current = touch.clientY
        return
      }

      const diffY = touch.clientY - touchStartYRef.current
      const diffX = Math.abs(touch.clientX - touchStartXRef.current)

      if (!isPullingRef.current) {
        if (Math.abs(diffY) < DRAG_ACTIVATION_PX) return
        if (diffY <= 0 || diffY < diffX * AXIS_LOCK_RATIO) return
        if (scrollEl.scrollTop > 0.5) return

        isPullingRef.current = true
        setPullReleaseOffset(null)
      }

      e.preventDefault()

      const nextPull = Math.max(diffY, 0)
      pullRawRef.current = nextPull
      setPullRaw(nextPull)
    }

    function finishPull(allowRefresh) {
      const shouldRefresh =
        allowRefresh &&
        isPullingRef.current &&
        pullRawRef.current >= TRIGGER_PX &&
        !refreshingRef.current

      if (shouldRefresh) {
        pullRefreshActiveRef.current = true
        setPullReleaseOffset(REFRESH_HOLD_Y)
        handleRefreshRef.current?.()
      } else if (pullRawRef.current > 0) {
        setPullReleaseOffset(0)
      }

      resetPull()
    }

    function onTouchEnd() {
      finishPull(true)
    }

    function onTouchCancel() {
      finishPull(false)
    }

    viewportEl.addEventListener('touchstart', onTouchStart, {
      passive: true,
      capture: true,
    })
    viewportEl.addEventListener('touchmove', onTouchMove, {
      passive: false,
      capture: true,
    })
    viewportEl.addEventListener('touchend', onTouchEnd, {
      passive: true,
      capture: true,
    })
    viewportEl.addEventListener('touchcancel', onTouchCancel, {
      passive: true,
      capture: true,
    })

    return () => {
      viewportEl.removeEventListener('touchstart', onTouchStart, true)
      viewportEl.removeEventListener('touchmove', onTouchMove, true)
      viewportEl.removeEventListener('touchend', onTouchEnd, true)
      viewportEl.removeEventListener('touchcancel', onTouchCancel, true)
    }
  }, [currentUser, loading, screen])

  /* ---------------- Derived pull values ---------------- */
  const pullViewportHeight =
    pullViewportRef.current?.clientHeight ||
    (typeof window === 'undefined' ? 640 : window.innerHeight || 640)
  const dragOffset = Math.min(
    rubberBandDistance(pullRaw, pullViewportHeight),
    MAX_PULL_Y
  )
  const pullOffset = pullReleaseOffset ?? dragOffset
  const pullProgress = Math.min(pullRaw / TRIGGER_PX, 1)
  const pullTransition =
    pullRaw === 0
      ? `transform ${RELEASE_ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
      : 'none'
  const holdingOffset = refreshing || (pullReleaseOffset ?? 0) > 0
  const indicatorOffset = holdingOffset ? 0 : pullOffset - MAX_PULL_Y
  const indicatorScale = holdingOffset ? 1 : 0.92 + pullProgress * 0.08
  const showPullIndicator =
    refreshing || pullRaw > 0 || pullReleaseOffset !== null
  const isArmed = pullRaw >= TRIGGER_PX

  /* ---------------- Actions ---------------- */
  async function addLog(entry) {
    const user = USERS.find(u => u.id === currentUser)
    const {
      entryDate,
      entryTime,
      lateReason,
      meta: entryMeta,
      ...restEntry
    } = entry
    const finalDate = entryDate || today()
    const finalTime = entryTime || nowInputTime()
    const finalTimestamp = buildTimestampFromDateTime(finalDate, finalTime)

    const newLog = {
      id: generateId(),
      date: finalDate,
      time: finalTime,
      timestamp: finalTimestamp,
      logged_by: user ? `${user.emoji} ${user.name}` : 'Unknown',
      device_info: getDeviceInfo(),
      ...restEntry,
      meta: {
        ...(entryMeta || {}),
        ...(lateReason?.trim()
          ? { lateEntryReason: lateReason.trim() }
          : {}),
      },
    }

    setSaving(true)

    try {
      // Optimistic local update
      setLogs(prev => upsertLogInState(prev, newLog))

      await saveLog(newLog, { remoteSyncEnabled })
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
      await deleteLog(id, { remoteSyncEnabled })
      setDeleteTarget(null)
    } catch (error) {
      // Roll back if delete failed
      setLogs(previousLogs)
    } finally {
      setDeleting(false)
    }
  }

  /* ---------------- Save handlers per modal ---------------- */
  function handleDrinkSave({ type, amount, notes, ...timing }) {
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
      ...timing,
    })

    setModal(null)
  }

  function handleMealSave({ mealType, foodText, portion, notes, ...timing }) {
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
      ...timing,
    })

    setModal(null)
  }

  function handleMedSave({ medName, status, notes, ...timing }) {
    const statusLabels = {
      taken: 'Sudah diminum',
      skipped: 'Tidak diminum',
      half: 'Setengah dosis',
    }

    addLog({
      type: 'med',
      notes,
      summary: `${medName} · ${statusLabels[status]}`,
      ...timing,
    })

    setModal(null)
  }

  function handleGlucoseSave({
    reading,
    context,
    symptoms,
    notes,
    ...timing
  }) {
    const readingMgDl = Number(reading)
    const severity = getGlucoseSeverity(
      readingMgDl,
      context,
      getGlucoseTargets(logs)
    )

    addLog({
      type: 'glucose',
      notes,
      summary: `${readingMgDl} mg/dL · ${
        GLUCOSE_CONTEXT_LABELS[context] || 'Cek gula'
      }`,
      meta: {
        schema: 'mamicare-care-v1',
        readingMgDl,
        context,
        symptoms,
        severity,
      },
      ...timing,
    })

    setModal(null)
  }

  function handleGlucoseTargetSave({
    lowThreshold,
    preMealHigh,
    postMealHigh,
    notes,
    ...timing
  }) {
    addLog({
      type: 'glucose_target',
      notes,
      summary: `Target gula diperbarui · ${lowThreshold}-${preMealHigh} / <${postMealHigh} mg/dL`,
      meta: {
        schema: 'mamicare-care-v1',
        lowThreshold,
        preMealHigh,
        postMealHigh,
      },
      ...timing,
    })

    setModal(null)
  }

  function handleMedicationPlanSave({
    medicationName,
    dosageText,
    prescribedBy,
    frequency,
    scheduleText,
    planStatus,
    notes,
    ...timing
  }) {
    const frequencyText = MED_PLAN_FREQUENCY_LABELS[frequency]
    const summary =
      planStatus === 'stopped'
        ? `${medicationName} · Dihentikan`
        : `${medicationName} · ${dosageText}${
            frequencyText ? ` · ${frequencyText}` : ''
          }`

    addLog({
      type: 'med_plan',
      notes,
      summary,
      meta: {
        schema: 'mamicare-care-v1',
        medicationName,
        dosageText,
        prescribedBy,
        frequency,
        scheduleText,
        planStatus,
      },
      ...timing,
    })

    setModal(null)
  }

  function handleWoundSave({
    condition,
    appearance,
    appearanceOther,
    dressingChanged,
    notes,
    ...timing
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
      ...timing,
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

      <div
        className="flex-1 min-h-0 relative overflow-hidden bg-gray-50"
        ref={pullViewportRef}
        style={{ overscrollBehaviorY: 'none' }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center overflow-hidden"
          style={{ height: MAX_PULL_Y + 20 }}
        >
          <div
            className="mt-2 flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md"
            style={{
              opacity: showPullIndicator ? 1 : 0,
              transform: `translateY(${indicatorOffset}px) scale(${indicatorScale})`,
              transition:
                pullRaw === 0
                  ? `transform ${RELEASE_ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease`
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
                      transform: `rotate(${pullProgress * 220}deg)`,
                      transition: 'transform 0.08s',
                    }
              }
            />

            <span className="text-sm text-gray-500">
              {refreshing
                ? 'Memperbarui...'
                : isArmed
                  ? '🙌 Lepaskan untuk refresh'
                  : 'Tarik untuk refresh'}
            </span>
          </div>
        </div>

        {/* Scroll viewport stays fixed; pull lives entirely in this local wrapper */}
        <div
          className="flex-1 min-h-0 h-full overflow-y-auto px-4"
          ref={scrollRef}
          style={{
            overscrollBehaviorY: 'none',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: `calc(${SAFE_BOTTOM_PAD} + 72px)`,
          }}
        >
          <div
            className="pt-5"
            style={{
              transform: `translateY(${pullOffset}px)`,
              transition: pullTransition,
              willChange: pullRaw > 0 ? 'transform' : undefined,
            }}
          >
            {!remoteSyncEnabled ? <ReviewModeBanner /> : null}

            <DrinkCard logs={logs} onAdd={() => setModal('drink')} />
            <GlucoseCard
              logs={logs}
              onAdd={() => setModal('glucose')}
              onEditTargets={() => setModal('glucose_target')}
            />

            <div className="grid grid-cols-2 gap-3 mb-6">
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
                {
                  id: 'glucose',
                  emoji: '🩸',
                  label: 'Gula Darah',
                  color: 'bg-red-50 border-red-300 text-red-600',
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

            <MedicationPlanCard logs={logs} onAdd={() => setModal('med_plan')} />

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

      {modal === 'glucose' && (
        <GlucoseModal
          onClose={() => setModal(null)}
          onSave={handleGlucoseSave}
          saving={saving}
        />
      )}

      {modal === 'glucose_target' && (
        <GlucoseTargetModal
          onClose={() => setModal(null)}
          onSave={handleGlucoseTargetSave}
          saving={saving}
          initialTargets={getGlucoseTargets(logs)}
        />
      )}

      {modal === 'med_plan' && (
        <MedicationPlanModal
          onClose={() => setModal(null)}
          onSave={handleMedicationPlanSave}
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
