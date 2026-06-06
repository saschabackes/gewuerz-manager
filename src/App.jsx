import { useState, useMemo, useEffect } from 'react'
import useStore from './store/useStore'
import Login from './components/Login'
import Navigation from './components/Navigation'
import SpiceList from './components/SpiceList'
import SpiceForm from './components/SpiceForm'
import ExpiryView from './components/ExpiryView'
import ShoppingList from './components/ShoppingList'
import SettingsView from './components/SettingsView'
import HelpView from './components/HelpView'
import ActivityView from './components/ActivityView'
import OnboardingView from './components/OnboardingView'
import CookView from './components/CookView'
import { getMhdStatus } from './utils/mhd'
import { PACKAGING_TYPES } from './data/spices'

export default function App() {
  const { user, authLoading, init } = useStore()
  const onboardingReplay = useStore(s => s.onboardingReplay)
  const finishOnboarding = useStore(s => s.finishOnboarding)
  const dataError = useStore(s => s.dataError)
  const currentUser = useStore(s => s.currentUser())
  const [view, setView] = useState('spices')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSpice, setEditingSpice] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [showCook, setShowCook] = useState(false)

  useEffect(() => { init() }, [])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && useStore.getState().user) {
        useStore.getState().loadData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Supabase-Session wird geprüft → Ladebildschirm
  if (authLoading) return <LoadingScreen />

  // Nicht eingeloggt → Login anzeigen
  if (!user) return <Login />

  // Erstnutzer (oder erneut gestartet) → Willkommens-Tour
  const showOnboarding = !user.user_metadata?.onboarding_done || onboardingReplay
  if (showOnboarding) {
    return <OnboardingView onFinish={finishOnboarding} />
  }

  function handleEditSpice(spice) {
    setEditingSpice(spice)
    setShowAddForm(true)
  }

  function handleFormClose() {
    setShowAddForm(false)
    setEditingSpice(null)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-800">
      <header
        className="bg-green-600 text-white px-4 pb-3 flex items-center justify-between sticky top-0 z-30"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <h1 className="text-lg font-bold tracking-tight">Gewürz Manager</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCook(true)}
            className="p-1.5 rounded-full bg-green-700 hover:bg-green-800 transition-colors"
            title="Kochen"
          >
            <span className="block text-base leading-none w-4 h-4 flex items-center justify-center">🍲</span>
          </button>
          <button
            onClick={() => setShowActivity(true)}
            className="p-1.5 rounded-full bg-green-700 hover:bg-green-800 transition-colors"
            title="Aktivitätsverlauf"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="p-1.5 rounded-full bg-green-700 hover:bg-green-800 transition-colors"
            title="Hilfe"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="17" r=".5" fill="currentColor"/>
            </svg>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded-full bg-green-700 hover:bg-green-800 transition-colors"
            title="Einstellungen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <UserMenu />
        </div>
      </header>

      {dataError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-start gap-2">
          <span className="text-red-500 mt-0.5 flex-none">⚠️</span>
          <p className="text-xs text-red-700 flex-1">{dataError}</p>
          <button
            onClick={() => useStore.setState({ dataError: null })}
            className="text-red-400 hover:text-red-600 flex-none text-lg leading-none"
          >×</button>
        </div>
      )}

      <main className="flex-1 overflow-hidden flex flex-col pb-20">
        {view === 'spices'   && <SpiceList onEdit={handleEditSpice} onAdd={() => { setEditingSpice(null); setShowAddForm(true) }} />}
        {view === 'mhd'      && <ExpiryView onEdit={handleEditSpice} />}
        {view === 'shopping' && <ShoppingList />}
        {view === 'stats'    && <StatsView />}
      </main>

      <Navigation current={view} onChange={setView} onAdd={() => { setEditingSpice(null); setShowAddForm(true) }} />

      {showAddForm && (
        <SpiceForm spice={editingSpice} onClose={handleFormClose} />
      )}

      {showSettings && (
        <SettingsView onClose={() => setShowSettings(false)} />
      )}

      {showHelp && (
        <HelpView onClose={() => setShowHelp(false)} />
      )}

      {showActivity && (
        <ActivityView onClose={() => setShowActivity(false)} />
      )}

      {showCook && (
        <CookView onClose={() => setShowCook(false)} />
      )}
    </div>
  )
}

// ── Ladebildschirm ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="text-5xl mb-5">🌿</div>
        <svg className="w-8 h-8 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    </div>
  )
}

// ── Statistik ─────────────────────────────────────────────────────────────────

function StatsView() {
  const { spices } = useStore()

  const stats = useMemo(() => {
    const byType = {}
    PACKAGING_TYPES.forEach(t => { byType[t.id] = 0 })
    const mhdStatus = { expired: 0, critical: 0, warning: 0, ok: 0, none: 0 }

    spices.forEach(s => {
      byType[s.packagingType] = (byType[s.packagingType] ?? 0) + 1
      const { status } = getMhdStatus(s.expiryDate)
      mhdStatus[status] = (mhdStatus[status] ?? 0) + 1
    })
    return { total: spices.length, byType, mhdStatus }
  }, [spices])

  const mhdRows = [
    { key: 'expired',  label: 'Abgelaufen',        bg: 'bg-red-100',    text: 'text-red-700'    },
    { key: 'critical', label: 'Kritisch (< 1 Monat)', bg: 'bg-orange-100', text: 'text-orange-700' },
    { key: 'warning',  label: 'Bald (1–3 Monate)', bg: 'bg-yellow-100', text: 'text-yellow-700' },
    { key: 'ok',       label: 'Frisch (> 3 Monate)', bg: 'bg-green-100',  text: 'text-green-700'  },
    { key: 'none',     label: 'Kein MHD',           bg: 'bg-gray-100 dark:bg-gray-700',   text: 'text-gray-600'   },
  ]

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div className="card p-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3">Gesamtübersicht</h2>
        <div className="text-4xl font-bold text-green-600 mb-1">{stats.total}</div>
        <div className="text-sm text-gray-500">Gewürze insgesamt</div>
      </div>

      <div className="card p-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3">Nach Verpackungstyp</h2>
        <div className="space-y-2">
          {PACKAGING_TYPES.map(t => {
            const count = stats.byType[t.id] ?? 0
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
            return (
              <div key={t.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">{t.label}</span>
                  <span className="text-gray-500">{count}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-3">MHD-Status</h2>
        <div className="space-y-2">
          {mhdRows.map(row => (
            <div key={row.key} className={`flex items-center justify-between rounded-xl px-3 py-2 ${row.bg}`}>
              <span className={`text-sm font-medium ${row.text}`}>{row.label}</span>
              <span className={`text-lg font-bold ${row.text}`}>{stats.mhdStatus[row.key] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Benutzermenü ──────────────────────────────────────────────────────────────

function UserMenu() {
  const { signOut } = useStore()
  const currentUser = useStore(s => s.currentUser())
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 bg-green-700 rounded-full px-3 py-1.5 text-sm font-medium active:bg-green-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
        </svg>
        <span className="max-w-[80px] truncate">{currentUser?.name}</span>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50 min-w-[180px] fade-enter">
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 font-medium">Angemeldet als</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{currentUser?.name}</p>
              <p className="text-xs text-gray-400 truncate">{currentUser?.email}</p>
            </div>
            <button
              onClick={() => { signOut(); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Abmelden
            </button>
          </div>
        </>
      )}
    </div>
  )
}
