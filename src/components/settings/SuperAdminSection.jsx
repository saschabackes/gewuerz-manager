import { useState, useEffect } from 'react'
import { MODULES_ENABLED } from '../../branding'
import { superListUsers, superBanUser, superResetPassword, superDeleteUser, superBackup, superStats } from '../../lib/userAdmin'
import { getLastSeen, markSeen } from './lastSeen'

const SUPER_ADMIN_EMAIL = (import.meta.env.VITE_SUPER_ADMIN_EMAIL || '').toLowerCase()

function avatarColor(name = '') {
  const palette = ['bg-green-400','bg-blue-400','bg-purple-400','bg-pink-400','bg-orange-400','bg-teal-400']
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

function initials(name = '') {
  return name.split(' ').map(p => p[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function householdLabel(u) {
  if (!u.householdName || u.householdName === '—' || u.role === '—') return 'Kein Haushalt'
  if (u.role === 'owner') {
    if ((u.householdSize ?? 1) <= 1) return 'Eigener Haushalt'
    return `Inhaber · ${u.householdName} (${u.householdSize} Mitglieder)`
  }
  return `Mitglied · ${u.householdName}`
}

// ── Super-Admin (App-Betreiber) ───────────────────────────────────────────────

function SuperAdminSection() {
  const [users, setUsers]     = useState([])
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [search, setSearch]   = useState('')
  const [expanded, setExpanded] = useState(null)
  const [busy, setBusy]       = useState(false)
  // Zeitpunkt des letzten Besuchs einmalig festhalten (für „Neu"-Markierung)
  const [seenBefore] = useState(() => getLastSeen())

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [u, s] = await Promise.all([superListUsers(), superStats().catch(() => null)])
      setUsers(Array.isArray(u) ? u : [])
      setStats(s)
      markSeen()  // Besuch vermerken → Tab-Badge ist beim nächsten Öffnen zurückgesetzt
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function act(fn, reload = true) {
    setBusy(true)
    try {
      await fn()
      if (reload) await loadAll()
      setExpanded(null)
    } catch (e) {
      alert('Fehler: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleBackup() {
    setBusy(true)
    try {
      const data = await superBackup()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${MODULES_ENABLED ? 'depot' : 'gewuerzmanager'}-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Backup fehlgeschlagen: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  const isNew = u => u.createdAt && u.createdAt > seenBefore

  const filtered = users
    .filter(u => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) || (u.householdName || '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      // Neue zuerst, dann nach Registrierungsdatum absteigend
      if (isNew(a) !== isNew(b)) return isNew(a) ? -1 : 1
      return (b.createdAt || '').localeCompare(a.createdAt || '')
    })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-gray-100">Betreiber-Bereich</h3>
        <button
          onClick={loadAll}
          disabled={loading}
          className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 dark:bg-gray-700 text-gray-400 transition-colors disabled:opacity-50"
          title="Aktualisieren"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card px-3 py-3 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{users.length}</div>
          <div className="text-xs text-gray-400 font-medium mt-0.5">Nutzer</div>
        </div>
        <div className="card px-3 py-3 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.households ?? '—'}</div>
          <div className="text-xs text-gray-400 font-medium mt-0.5">Haushalte</div>
        </div>
        <div className="card px-3 py-3 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats?.spices ?? '—'}</div>
          <div className="text-xs text-gray-400 font-medium mt-0.5">Gewürze</div>
        </div>
      </div>

      {/* Voll-Backup */}
      <button
        onClick={handleBackup}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white rounded-2xl py-3 text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Komplettes Backup herunterladen
      </button>

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl px-3 py-2">{error}</div>
      )}

      {/* Suche */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
        </svg>
        <input
          type="search"
          className="input pl-9 py-2.5 bg-gray-50 dark:bg-gray-800 text-sm"
          placeholder="Nach Name, E-Mail, Haushalt…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Nutzerliste */}
      {loading && users.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Lade Nutzer…</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const isOpen = expanded === u.id
            return (
              <div key={u.id} className={`card overflow-hidden ${u.isBanned ? 'opacity-60' : ''}`}>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex-none flex items-center justify-center text-white font-bold text-xs ${avatarColor(u.name)}`}>
                    {initials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{u.name}</span>
                      {u.email.toLowerCase() === SUPER_ADMIN_EMAIL && (
                        <span className="text-xs bg-primary-600 text-white font-semibold rounded-full px-2 py-0.5">Betreiber</span>
                      )}
                      {isNew(u) && <span className="text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-semibold rounded-full px-2 py-0.5">Neu</span>}
                      {u.isBanned && <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold rounded-full px-2 py-0.5">Gesperrt</span>}
                      {!u.confirmed && <span className="text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 font-semibold rounded-full px-2 py-0.5">Unbestätigt</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    <p className="text-xs text-gray-400">
                      {householdLabel(u)}
                      {u.lastSignIn ? ` · zuletzt ${fmtDate(u.lastSignIn)}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpanded(e => e === u.id ? null : u.id)}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:bg-gray-700 text-gray-400 transition-colors flex-none"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                    </svg>
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800 grid grid-cols-2 gap-2">
                    <button
                      disabled={busy}
                      onClick={() => { if (confirm(`Passwort-Reset-Mail an ${u.email}?`)) act(() => superResetPassword(u.email), false) }}
                      className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-xl px-3 py-2.5 hover:bg-blue-100 dark:bg-blue-900/40 transition-colors disabled:opacity-50"
                    >
                      Passwort reset
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        const msg = u.isBanned ? `${u.name} entsperren?` : `${u.name} sperren?`
                        if (confirm(msg)) act(() => superBanUser(u.id, !u.isBanned))
                      }}
                      className={`flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-2.5 transition-colors disabled:opacity-50 ${
                        u.isBanned ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:bg-green-900/40' : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:bg-red-900/40'
                      }`}
                    >
                      {u.isBanned ? 'Entsperren' : 'Sperren'}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (confirm(`${u.name} (${u.email}) ENDGÜLTIG löschen? Das Konto wird komplett entfernt und kann nicht wiederhergestellt werden.`))
                          act(() => superDeleteUser(u.id))
                      }}
                      className="col-span-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-red-600 rounded-xl px-3 py-2.5 hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Konto löschen
                    </button>
                  </div>
                )}
              </div>
            )
          })}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Keine Nutzer gefunden.</p>
          )}
        </div>
      )}
    </div>
  )
}


export default SuperAdminSection
