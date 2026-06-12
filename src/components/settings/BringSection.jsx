import { useState } from 'react'
import useStore from '../../store/useStore'

// ── Bring! ────────────────────────────────────────────────────────────────────

function BringSection() {
  const { bringSettings, connectBring, setBringList, disconnectBring } = useStore()
  const [step, setStep]         = useState('idle')   // idle | login | selectList
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [lists, setLists]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await connectBring(email, password)
      setLists(result)
      setStep('selectList')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectList(listUuid, listName) {
    setLoading(true)
    try {
      await setBringList(listUuid, listName)
      setStep('idle')
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Bring!-Verbindung wirklich trennen? Einkaufsartikel werden dann wieder in der eingebauten Liste gespeichert.')) return
    await disconnectBring()
    setStep('idle')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center text-base leading-none">
          🛍
        </div>
        <h3 className="font-bold text-gray-800 dark:text-gray-100">Einkaufsliste</h3>
      </div>

      {/* Verbunden */}
      {bringSettings?.listUuid && step === 'idle' && (
        <div className="card px-4 py-3 mb-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Bring!</span>
                <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold rounded-full px-2 py-0.5">Aktiv</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Liste: <span className="font-medium text-gray-700 dark:text-gray-200">{bringSettings.listName}</span></p>
              <p className="text-xs text-gray-400">{bringSettings.email}</p>
            </div>
            <button
              onClick={handleDisconnect}
              className="text-xs text-red-500 font-semibold px-3 py-1.5 rounded-xl hover:bg-red-50 dark:bg-red-900/30 transition-colors flex-none"
            >
              Trennen
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            "Einkaufen"-Aktionen schreiben direkt in diese Bring!-Liste.
          </p>
        </div>
      )}

      {/* Nicht verbunden – Hinweis + Formular starten */}
      {!bringSettings?.listUuid && step === 'idle' && (
        <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Mit Bring! verbinden</p>
          <p className="text-xs text-gray-400 mb-3">
            Nutze deine bestehende Bring!-Liste statt der eingebauten Einkaufsliste.
            Funktioniert auch mit Alexa: „Öffne Bring und füge … hinzu".
          </p>
          <button
            onClick={() => setStep('login')}
            className="btn-primary w-full py-2.5 text-sm"
          >
            Bring! verknüpfen
          </button>
        </div>
      )}

      {/* Login-Formular */}
      {step === 'login' && (
        <form onSubmit={handleLogin} className="border border-dashed border-orange-200 rounded-2xl p-4 space-y-3 bg-orange-50/30 dark:bg-orange-900/30">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Bring!-Konto anmelden</p>
          <input
            type="email"
            className="input py-2.5 text-sm"
            placeholder="E-Mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            className="input py-2.5 text-sm"
            placeholder="Passwort"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50"
            >
              {loading ? 'Verbinde…' : 'Anmelden'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('idle'); setError('') }}
              className="btn-secondary flex-1 py-2.5 text-sm"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Listauswahl */}
      {step === 'selectList' && (
        <div className="border border-dashed border-orange-200 rounded-2xl p-4 bg-orange-50/30 dark:bg-orange-900/30">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Welche Liste verwenden?</p>
          {lists.length === 0 && (
            <p className="text-sm text-gray-400">Keine Listen gefunden.</p>
          )}
          <div className="space-y-2">
            {lists.map(list => (
              <button
                key={list.listUuid}
                onClick={() => handleSelectList(list.listUuid, list.name)}
                disabled={loading}
                className="w-full text-left card px-4 py-3 flex items-center justify-between hover:ring-2 hover:ring-orange-300 transition-all disabled:opacity-50"
              >
                <span className="font-medium text-gray-800 dark:text-gray-100 text-sm">{list.name}</span>
                <svg className="w-4 h-4 text-gray-400 flex-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setStep('login'); setError('') }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-300 mt-3 w-full text-center transition-colors"
          >
            Zurück
          </button>
          {error && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl px-3 py-2 mt-2">{error}</p>}
        </div>
      )}
    </div>
  )
}



export default BringSection
