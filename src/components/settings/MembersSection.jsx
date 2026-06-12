import { useState, useEffect } from 'react'
import useStore from '../../store/useStore'
import { adminGetMembers, adminResetPassword, adminBanUser, adminRemoveMember, adminChangeRole } from '../../lib/userAdmin'

// ── Mitgliederverwaltung ──────────────────────────────────────────────────────

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

// Klartext-Beschreibung der Haushaltszugehörigkeit (Betreiber-Ansicht).
// „Inhaber" wird nur bei tatsächlich geteilten Haushalten angezeigt – ein
// allein wohnender Nutzer ist schlicht in seinem „eigenen Haushalt".
function householdLabel(u) {
  if (!u.householdName || u.householdName === '—' || u.role === '—') return 'Kein Haushalt'
  if (u.role === 'owner') {
    if ((u.householdSize ?? 1) <= 1) return 'Eigener Haushalt'
    return `Inhaber · ${u.householdName} (${u.householdSize} Mitglieder)`
  }
  return `Mitglied · ${u.householdName}`
}

function MembersSection() {
  const { household, user } = useStore()
  const isOwner = household?.role === 'owner'

  const [members, setMembers]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [expanded, setExpanded]   = useState(null)  // user id with actions open
  const [busy, setBusy]           = useState(null)   // user id currently processing

  useEffect(() => {
    if (isOwner && household?.id) loadMembers()
  }, [isOwner, household?.id])

  async function loadMembers() {
    setLoading(true)
    setError('')
    try {
      const data = await adminGetMembers(household.id)
      setMembers(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(fn, successMsg) {
    setBusy(true)
    try {
      await fn()
      await loadMembers()
      setExpanded(null)
    } catch (e) {
      alert('Fehler: ' + e.message)
    } finally {
      setBusy(null)
    }
  }

  if (!isOwner) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-gray-100">Mitglieder</h3>
        {members.length > 0 && (
          <span className="ml-auto text-xs text-gray-400 font-medium">{members.length} Personen</span>
        )}
      </div>

      {loading && (
        <p className="text-sm text-gray-400 text-center py-4">Lade Mitglieder…</p>
      )}
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl px-3 py-2 mb-3">{error}</div>
      )}

      <div className="space-y-2">
        {members.map(m => {
          const isMe    = m.id === user?.id
          const isOpen  = expanded === m.id
          return (
            <div key={m.id} className={`card overflow-hidden ${m.isBanned ? 'opacity-60' : ''}`}>
              <div className="px-4 py-3 flex items-center gap-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex-none flex items-center justify-center text-white font-bold text-sm ${avatarColor(m.name)}`}>
                  {initials(m.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{m.name}</span>
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                      m.role === 'owner'
                        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                      {m.role === 'owner' ? 'Inhaber' : 'Mitglied'}
                    </span>
                    {m.isBanned && (
                      <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold rounded-full px-2 py-0.5">Gesperrt</span>
                    )}
                    {isMe && (
                      <span className="text-xs text-gray-400">(du)</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{m.email}</p>
                  <p className="text-xs text-gray-400">
                    Beigetreten {fmtDate(m.joinedAt)}
                    {m.lastSignIn ? ` · Zuletzt ${fmtDate(m.lastSignIn)}` : ''}
                  </p>
                </div>

                {/* Actions-Toggle (nur für andere) */}
                {!isMe && (
                  <button
                    onClick={() => setExpanded(e => e === m.id ? null : m.id)}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:bg-gray-700 text-gray-400 transition-colors flex-none"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Action-Panel */}
              {isOpen && !isMe && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-800 grid grid-cols-2 gap-2">
                  {/* Passwort zurücksetzen */}
                  <button
                    disabled={!!busy}
                    onClick={() => {
                      if (!confirm(`Passwort-Reset-Mail an ${m.email} senden?`)) return
                      handleAction(() => adminResetPassword(household.id, m.email))
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded-xl px-3 py-2.5 hover:bg-blue-100 dark:bg-blue-900/40 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Passwort reset
                  </button>

                  {/* Sperren / Entsperren */}
                  <button
                    disabled={!!busy}
                    onClick={() => {
                      const msg = m.isBanned
                        ? `${m.name} entsperren?`
                        : `${m.name} sperren? Die Person kann sich dann nicht mehr anmelden.`
                      if (!confirm(msg)) return
                      handleAction(() => adminBanUser(household.id, m.id, !m.isBanned))
                    }}
                    className={`flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-2.5 transition-colors disabled:opacity-50 ${
                      m.isBanned
                        ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:bg-green-900/40'
                        : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:bg-red-900/40'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      {m.isBanned
                        ? <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round"/>
                        : <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" strokeLinecap="round" strokeLinejoin="round"/>
                      }
                    </svg>
                    {m.isBanned ? 'Entsperren' : 'Sperren'}
                  </button>

                  {/* Rolle ändern */}
                  <button
                    disabled={!!busy}
                    onClick={() => {
                      const newRole = m.role === 'owner' ? 'member' : 'owner'
                      const msg = newRole === 'owner'
                        ? `${m.name} zum Inhaber machen? Diese Person kann dann ebenfalls Mitglieder verwalten.`
                        : `${m.name} zum einfachen Mitglied zurückstufen?`
                      if (!confirm(msg)) return
                      handleAction(() => adminChangeRole(household.id, m.id, newRole))
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30 rounded-xl px-3 py-2.5 hover:bg-primary-100 dark:bg-primary-900/40 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {m.role === 'owner' ? 'Zu Mitglied' : 'Zu Inhaber'}
                  </button>

                  {/* Aus Haushalt entfernen */}
                  <button
                    disabled={!!busy}
                    onClick={() => {
                      if (!confirm(`${m.name} aus dem Haushalt entfernen? Die Person verliert den Zugriff auf alle Daten.`)) return
                      handleAction(() => adminRemoveMember(household.id, m.id))
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2.5 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5 flex-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6h13m5-4l-3 3m0 0l-3-3m3 3V10" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Entfernen
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!loading && members.length === 0 && !error && (
        <p className="text-sm text-gray-400 text-center py-4">Noch keine anderen Mitglieder.</p>
      )}
    </div>
  )
}


export default MembersSection
