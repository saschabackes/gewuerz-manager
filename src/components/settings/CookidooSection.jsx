import { useState } from 'react'
import useStore from '../../store/useStore'

// ── Cookidoo ──────────────────────────────────────────────────────────────────

function CookidooSection() {
  const { cookidooSettings, connectCookidoo, disconnectCookidoo } = useStore()
  const [step, setStep]         = useState('idle')  // idle | login
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

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
          <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            Im „Kochen"-Bereich kannst du jetzt Cookidoo-Rezeptlinks direkt importieren.
          </p>
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
