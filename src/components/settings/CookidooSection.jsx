import { useState } from 'react'
import useStore from '../../store/useStore'

// ── Cookidoo ──────────────────────────────────────────────────────────────────

function CookidooSection() {
  const { cookidooSettings, connectCookidoo, disconnectCookidoo, fetchCookidooCollections, syncCookidooFavorites } = useStore()
  const [step, setStep]         = useState('idle')  // idle | login
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [collections, setCollections] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [loadingCollections, setLoadingCollections] = useState(false)
  const [syncing, setSyncing]   = useState(false)
  const [syncProgress, setSyncProgress] = useState(null)
  const [syncResult, setSyncResult]     = useState(null)

  async function handleConnect(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await connectCookidoo(email.trim(), password)
      setStep('idle'); setEmail(''); setPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Cookidoo-Verbindung trennen?')) return
    await disconnectCookidoo()
    setStep('idle')
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center text-base leading-none">🥄</div>
        <h3 className="font-bold text-gray-800 dark:text-gray-100">Cookidoo</h3>
      </div>

      {cookidooSettings?.email && step === 'idle' && (
        <div className="card px-4 py-3 mb-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cookidoo</span>
                <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold rounded-full px-2 py-0.5">Verbunden</span>
              </div>
              <p className="text-xs text-gray-400">{cookidooSettings.email}</p>
            </div>
            <button onClick={handleDisconnect} className="text-xs text-red-500 font-semibold px-3 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex-none">
              Trennen
            </button>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            {!collections && !syncing && (
              <button
                onClick={async () => {
                  setLoadingCollections(true); setSyncResult(null)
                  try {
                    const cols = await fetchCookidooCollections()
                    setCollections(cols)
                    setSelectedIds(new Set(cols.map(c => c.id)))
                  } catch (e) {
                    setSyncResult({ error: e.message })
                  } finally {
                    setLoadingCollections(false)
                  }
                }}
                disabled={loadingCollections}
                className="btn-primary w-full py-2 text-sm disabled:opacity-50"
              >
                {loadingCollections ? 'Lade Listen…' : 'Rezepte synchronisieren'}
              </button>
            )}

            {collections && !syncing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-400">Listen auswählen:</p>
                  <button
                    onClick={() => setSelectedIds(prev => prev.size === collections.length ? new Set() : new Set(collections.map(c => c.id)))}
                    className="text-xs text-primary-600 dark:text-primary-400 font-semibold"
                  >
                    {selectedIds.size === collections.length ? 'Alle abwählen' : 'Alle auswählen'}
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 -mx-1 px-1">
                  {collections.map(c => (
                    <label key={c.id} className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => setSelectedIds(prev => {
                          const next = new Set(prev)
                          next.has(c.id) ? next.delete(c.id) : next.add(c.id)
                          return next
                        })}
                        className="w-4 h-4 rounded accent-primary-600"
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-100 flex-1 truncate">{c.title || 'Ohne Titel'}</span>
                      <span className="text-xs text-gray-400 flex-none">{c.recipeCount}</span>
                    </label>
                  ))}
                </div>
                {collections.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">Keine Listen gefunden</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={async () => {
                      setSyncing(true); setSyncProgress(null); setSyncResult(null)
                      try {
                        const result = await syncCookidooFavorites([...selectedIds], (done, total) => setSyncProgress({ done, total }))
                        setSyncResult(result)
                        setCollections(null)
                      } catch (e) {
                        setSyncResult({ error: e.message })
                      } finally {
                        setSyncing(false); setSyncProgress(null)
                      }
                    }}
                    disabled={selectedIds.size === 0}
                    className="btn-primary flex-1 py-2 text-sm disabled:opacity-50"
                  >
                    {selectedIds.size > 0 ? `${selectedIds.size} Listen importieren` : 'Keine ausgewählt'}
                  </button>
                  <button
                    onClick={() => { setCollections(null); setSelectedIds(new Set()) }}
                    className="btn-secondary px-3 py-2 text-sm"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}

            {syncing && (
              <div className="text-center py-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {syncProgress ? `${syncProgress.done} von ${syncProgress.total} importiert…` : 'Lade Rezepte…'}
                </p>
              </div>
            )}

            {syncResult && !syncResult.error && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 text-center">
                {syncResult.imported > 0
                  ? `${syncResult.imported} neue Rezepte importiert${syncResult.skipped > 0 ? `, ${syncResult.skipped} bereits vorhanden` : ''}`
                  : 'Alle Rezepte sind bereits vorhanden'}
              </p>
            )}
            {syncResult?.error && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 text-center">{syncResult.error}</p>
            )}
          </div>
        </div>
      )}

      {!cookidooSettings?.email && step === 'idle' && (
        <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Mit Cookidoo verbinden</p>
          <p className="text-xs text-gray-400 mb-3">
            Verknüpfe dein Cookidoo-Konto, um beim Kochen Rezeptlinks direkt einzulesen.
          </p>
          <button onClick={() => setStep('login')} className="btn-primary w-full py-2.5 text-sm">Cookidoo verknüpfen</button>
        </div>
      )}

      {step === 'login' && (
        <form onSubmit={handleConnect} className="border border-dashed border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 space-y-3 bg-emerald-50/30 dark:bg-emerald-900/20">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Cookidoo-Konto anmelden</p>
          <input type="email" className="input py-2.5 text-sm" placeholder="E-Mail" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <input type="password" className="input py-2.5 text-sm" placeholder="Passwort" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          <p className="text-xs text-gray-400">
            Dein Passwort wird in deinem Konto gespeichert, damit der Login automatisch funktioniert. Nur du hast Zugriff darauf.
          </p>
          {error && <p className="text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/30 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={loading || !email || !password} className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">
              {loading ? 'Verbinde…' : 'Verbinden'}
            </button>
            <button type="button" onClick={() => { setStep('idle'); setError('') }} className="btn-secondary flex-1 py-2.5 text-sm">Abbrechen</button>
          </div>
        </form>
      )}
    </div>
  )
}


export default CookidooSection
