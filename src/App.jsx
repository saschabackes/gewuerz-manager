import { useState, useEffect } from 'react'
import useStore from './store/useStore'
import Login from './components/Login'
import Navigation from './components/Navigation'
import SpiceList from './components/SpiceList'
import SpiceForm from './components/SpiceForm'
import ExpiryView from './components/ExpiryView'
import SettingsView from './components/SettingsView'
import HelpView from './components/HelpView'
import ActivityView from './components/ActivityView'
import OnboardingView from './components/OnboardingView'
import InventoryReviewView from './components/InventoryReviewView'
import RecipesView from './components/RecipesView'
import SubTabs from './components/SubTabs'
import FreezerView from './modules/freezer/FreezerView'
import CellarView from './modules/cellar/CellarView'
import UnifiedShoppingList from './modules/shopping/UnifiedShoppingList'
import SpiceSettings from './components/SpiceSettings'
import SpiceSetup from './components/SpiceSetup'
import { useFreezer } from './modules/freezer/store'
import { useCellar } from './modules/cellar/store'
import { MODULES_ENABLED, APP_NAME } from './branding'
import { hasUnseenChangelog } from './changelog'
import ChangelogView from './components/ChangelogView'

export default function App() {
  const { user, authLoading, init } = useStore()
  const onboardingReplay = useStore(s => s.onboardingReplay)
  const finishOnboarding = useStore(s => s.finishOnboarding)
  const dataError = useStore(s => s.dataError)
  const currentUser = useStore(s => s.currentUser())
  const [module, setModule] = useState('spices')
  const [view, setView] = useState('bestand')

  function handleModuleAdd(modId) {
    if (modId === 'spices')  { setEditingSpice(null); setShowAddForm(true) }
    if (modId === 'freezer') { useFreezer.getState().openForm() }
    if (modId === 'cellar')  { useCellar.getState().openForm() }
  }
  function handleSpiceAddInline() { setEditingSpice(null); setShowAddForm(true) }
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSpice, setEditingSpice] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [formPrefill, setFormPrefill] = useState(null)
  const [showSpiceSettings, setShowSpiceSettings] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const reviewCount = useStore(s => s.pendingInventory.filter(p => p.status === 'ready').length)
  const resolvePending = useStore(s => s.resolvePending)
  const spiceSetupDone = useStore(s => s.spiceSetupDone)
  const completeSpiceSetup = useStore(s => s.completeSpiceSetup)

  const [pendingInvite, setPendingInvite] = useState(null)

  useEffect(() => {
    init()
    const params = new URLSearchParams(window.location.search)
    const invite = params.get('invite')
    if (invite) {
      setPendingInvite(invite.toUpperCase().replace(/[^A-Z0-9]/g, ''))
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

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
  // localStorage als Fallback, damit onAuthStateChange-Zwischenzustände keinen Flash erzeugen
  const onboardingDone = user.user_metadata?.onboarding_done || localStorage.getItem('depot_onboarding_done') === '1'
  const showOnboarding = !onboardingDone || onboardingReplay
  if (showOnboarding) {
    return <OnboardingView onFinish={finishOnboarding} />
  }

  // "Was ist neu?" automatisch zeigen nach Update (einmalig pro Version)
  useEffect(() => {
    if (hasUnseenChangelog()) setShowChangelog(true)
  }, [])

  function handleEditSpice(spice) {
    setEditingSpice(spice)
    setShowAddForm(true)
  }

  function handleFormClose() {
    setShowAddForm(false)
    setEditingSpice(null)
    setFormPrefill(null)
  }

  function handleNewPackage(item) {
    resolvePending(item.id)
    setFormPrefill({ name: item.name, brand: item.brand })
    setEditingSpice(null)
    setShowReview(false)
    setShowAddForm(true)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-800">
      <header
        className="bg-primary-600 text-white px-4 pb-3 flex items-center justify-between sticky top-0 z-30"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <div className="flex items-center gap-2">
          {MODULES_ENABLED
            ? <svg viewBox="0 0 40 40" width="28" height="28" className="flex-none"><rect x="6" y="10" width="28" height="4" rx="1.5" fill="currentColor" opacity="0.9"/><rect x="6" y="18" width="28" height="4" rx="1.5" fill="currentColor" opacity="0.7"/><rect x="6" y="26" width="28" height="4" rx="1.5" fill="currentColor" opacity="0.5"/></svg>
            : <span className="text-xl">🌿</span>
          }
          <h1 className="text-lg font-bold tracking-tight">{APP_NAME}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReview(true)}
            className="relative p-1.5 rounded-full bg-primary-700 hover:bg-primary-800 transition-colors"
            title="Einräumen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-4l-2 3H10l-2-3H4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {reviewCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center border border-primary-600">
                {reviewCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowActivity(true)}
            className="p-1.5 rounded-full bg-primary-700 hover:bg-primary-800 transition-colors"
            title="Verlauf"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="p-1.5 rounded-full bg-primary-700 hover:bg-primary-800 transition-colors"
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
            className="relative p-1.5 rounded-full bg-primary-700 hover:bg-primary-800 transition-colors"
            title="Einstellungen"
          >
            {/* Hinweispunkt: neue Version, Changelog noch nicht gesehen */}
            {!showSettings && hasUnseenChangelog() && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full border border-primary-600" />
            )}
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
        {module === 'spices' && !spiceSetupDone && (
          <SpiceSetup onComplete={completeSpiceSetup} />
        )}
        {module === 'spices' && spiceSetupDone && (
          <>
            <SubTabs
              tabs={[
                { id: 'bestand', label: '📦 Bestand' },
                { id: 'ablauf',  label: '⏰ Ablauf' },
              ]}
              active={view}
              onChange={setView}
              trailing={
                <button onClick={() => setShowSpiceSettings(true)}
                  className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-2 text-lg flex-none" title="Lagerorte & Kategorien">⚙️</button>
              }
            />
            {view === 'bestand' && <SpiceList onEdit={handleEditSpice} onAdd={handleSpiceAddInline} />}
            {view === 'ablauf'  && <ExpiryView onEdit={handleEditSpice} />}
          </>
        )}
        {module === 'freezer'  && <FreezerView />}
        {module === 'cellar'   && <CellarView />}
        {module === 'recipes'  && <RecipesView />}
        {module === 'shopping' && <UnifiedShoppingList />}
      </main>

      {/* Floating-+ für Module ohne eigenen Add-Button (Rezepte hat einen eigenen) */}
      {['spices', 'freezer', 'cellar'].includes(module) && (module !== 'spices' || spiceSetupDone) && (
        <button
          onClick={() => handleModuleAdd(module)}
          className="fixed bottom-24 right-5 bg-primary-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg active:opacity-80 transition-colors z-20"
          aria-label="Hinzufügen"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      )}

      {MODULES_ENABLED && (
        <Navigation currentModule={module} onModuleChange={setModule} />
      )}

      {showAddForm && (
        <SpiceForm spice={editingSpice} prefill={formPrefill} onClose={handleFormClose} />
      )}

      {showReview && (
        <InventoryReviewView onClose={() => setShowReview(false)} onNewPackage={handleNewPackage} />
      )}

      {showSpiceSettings && (
        <SpiceSettings onClose={() => setShowSpiceSettings(false)} />
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

      {pendingInvite && (
        <InviteJoinDialog code={pendingInvite} onClose={() => setPendingInvite(null)} />
      )}

      {showChangelog && (
        <ChangelogView onClose={() => setShowChangelog(false)} />
      )}
    </div>
  )
}

function InviteJoinDialog({ code, onClose }) {
  const { joinHousehold } = useStore()
  const [status, setStatus] = useState('confirm')
  const [error, setError] = useState('')
  const displayCode = code.length >= 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code

  async function handleJoin() {
    setStatus('joining')
    setError('')
    try {
      const name = await joinHousehold(code)
      setStatus('success')
      setTimeout(onClose, 2000)
    } catch (e) {
      setError(e.message)
      setStatus('confirm')
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[70] fade-enter" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[71] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 max-w-sm mx-auto sheet-enter">
        <div className="text-center mb-5">
          <div className="text-4xl mb-3">🏠</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Einladung zum Haushalt</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Du wurdest eingeladen, einem Haushalt beizutreten.
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-3 mb-5 text-center">
          <p className="text-xs text-gray-400 font-medium mb-1">Einladungscode</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-widest font-mono">{displayCode}</p>
        </div>

        {status === 'success' ? (
          <div className="text-center text-green-600 dark:text-green-400 font-semibold text-sm py-2">
            Beigetreten! Daten werden geladen…
          </div>
        ) : (
          <>
            {error && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl px-3 py-2 mb-3">{error}</div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleJoin}
                disabled={status === 'joining'}
                className="flex-1 btn-primary py-3 text-sm font-semibold disabled:opacity-50"
              >
                {status === 'joining' ? 'Trete bei…' : 'Beitreten'}
              </button>
              <button onClick={onClose} className="flex-1 btn-secondary py-3 text-sm font-semibold">
                Abbrechen
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">
              Du verlässt deinen aktuellen Haushalt und trittst dem neuen bei.
            </p>
          </>
        )}
      </div>
    </>
  )
}

// SpicesSubNav entfernt – jetzt nutzt alles die gemeinsame SubTabs-Komponente

// ── Ladebildschirm ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="text-5xl mb-5">🏠</div>
        <svg className="w-8 h-8 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
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
        className="flex items-center gap-1.5 bg-primary-700 rounded-full px-3 py-1.5 text-sm font-medium active:bg-primary-800 transition-colors"
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
