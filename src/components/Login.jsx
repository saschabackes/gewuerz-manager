import { useState } from 'react'
import useStore from '../store/useStore'

export default function Login() {
  const { signIn, signUp, resetPassword } = useStore()
  const [mode, setMode] = useState('login')  // 'login' | 'register' | 'reset'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      if (mode === 'register') {
        if (!name.trim()) throw new Error('Bitte Namen eingeben')
        if (password.length < 6) throw new Error('Passwort muss mindestens 6 Zeichen haben')
        await signUp(name.trim(), email.trim(), password)
        setMessage('Konto erstellt! Du kannst dich jetzt anmelden.')
        setMode('login')
        setPassword('')
      } else if (mode === 'reset') {
        await resetPassword(email)
        setMessage('Reset-Mail gesendet! Bitte prüfe dein Postfach und klicke den Link.')
      } else {
        await signIn(email.trim(), password)
      }
    } catch (err) {
      const msg = err.message ?? String(err)
      if (msg.includes('Invalid login credentials'))
        setError('E-Mail oder Passwort falsch.')
      else if (msg.includes('already registered') || msg.includes('already been registered'))
        setError('Diese E-Mail ist bereits registriert.')
      else if (msg.includes('Email not confirmed'))
        setError('E-Mail noch nicht bestätigt. Bitte prüfe dein Postfach.')
      else
        setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(newMode) {
    setMode(newMode)
    setError('')
    setMessage('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex flex-col items-center justify-center p-6 pt-safe">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-3">🌿</div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Gewürz Manager</h1>
        <p className="text-green-200 mt-1 text-sm">Dein Gewürz-Vorrat im Überblick</p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          {mode === 'login' ? 'Anmelden' : mode === 'register' ? 'Neues Konto erstellen' : 'Passwort zurücksetzen'}
        </h2>
        {mode === 'reset' && (
          <p className="text-sm text-gray-500 mb-4">
            Gib deine E-Mail-Adresse ein. Du bekommst einen Link zum Zurücksetzen.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {mode === 'register' && (
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                placeholder="Dein Name"
                value={name}
                onChange={e => setName(e.target.value)}
                autoCapitalize="words"
                required
              />
            </div>
          )}

          <div>
            <label className="label">E-Mail</label>
            <input
              type="email"
              className="input"
              placeholder="deine@email.de"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Passwort</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="text-xs text-gray-400 hover:text-green-600 transition-colors"
                  >
                    Vergessen?
                  </button>
                )}
              </div>
              <input
                type="password"
                className="input"
                placeholder={mode === 'register' ? 'Mindestens 6 Zeichen' : 'Dein Passwort'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          {message && (
            <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : mode === 'login' ? 'Anmelden' : mode === 'register' ? 'Konto erstellen' : 'Reset-Mail senden'}
          </button>
        </form>

        <div className="mt-4 text-center space-y-2">
          {mode === 'login' && (
            <p className="text-sm text-gray-500">
              Noch kein Konto?{' '}
              <button onClick={() => switchMode('register')} className="text-green-600 font-semibold">
                Registrieren
              </button>
            </p>
          )}
          {mode === 'register' && (
            <p className="text-sm text-gray-500">
              Bereits registriert?{' '}
              <button onClick={() => switchMode('login')} className="text-green-600 font-semibold">
                Anmelden
              </button>
            </p>
          )}
          {mode === 'reset' && (
            <p className="text-sm text-gray-500">
              <button onClick={() => switchMode('login')} className="text-green-600 font-semibold">
                ← Zurück zur Anmeldung
              </button>
            </p>
          )}
        </div>
      </div>

      <p className="text-green-300 text-xs mt-6 text-center">
        Daten werden in der Cloud gespeichert · alle Geräte synchron
      </p>
    </div>
  )
}
