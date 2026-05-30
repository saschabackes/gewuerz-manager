import { useState, useEffect } from 'react'
import useStore from '../store/useStore'
import { CATEGORY_COLORS } from '../data/spices'
import { adminGetMembers, adminResetPassword, adminBanUser, adminRemoveMember, adminChangeRole } from '../lib/userAdmin'

export default function SettingsView({ onClose }) {
  const { household } = useStore()
  const isOwner = household?.role === 'owner'
  const [tab, setTab] = useState('settings')  // 'settings' | 'admin'

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-enter" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl sheet-enter max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Einstellungen
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Tabs — nur für Owner */}
        {isOwner && (
          <div className="flex gap-1 px-5 pt-3 pb-1 flex-none">
            <button
              onClick={() => setTab('settings')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === 'settings'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Einstellungen
            </button>
            <button
              onClick={() => setTab('admin')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === 'admin'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Verwaltung
            </button>
          </div>
        )}

        {/* Einstellungen-Tab */}
        {tab === 'settings' && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-safe">
            <HouseholdSection />
            <div className="border-t border-gray-100" />
            <LocationsSection />
            <div className="border-t border-gray-100" />
            <CategoriesSection />
            <div className="border-t border-gray-100" />
            <BringSection />
            <div className="border-t border-gray-100" />
            <ExportSection />
          </div>
        )}

        {/* Verwaltungs-Tab (nur Owner) */}
        {tab === 'admin' && isOwner && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-safe">
            <MembersSection />
          </div>
        )}
      </div>
    </>
  )
}

// ── Haushalt ──────────────────────────────────────────────────────────────────

function HouseholdSection() {
  const { household, joinHousehold, leaveHousehold, updateHouseholdName } = useStore()
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [joinSuccess, setJoinSuccess] = useState('')
  const [copied, setCopied] = useState(false)
  const [showLeave, setShowLeave] = useState(false)

  // Code als XXXX-XXXX anzeigen
  const displayCode = household?.inviteCode
    ? `${household.inviteCode.slice(0, 4)}-${household.inviteCode.slice(4)}`
    : '—'

  function copyCode() {
    navigator.clipboard?.writeText(household?.inviteCode ?? '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function shareCode() {
    const text = `Tritt meinem Gewürz-Haushalt bei!\nEinladungscode: ${displayCode}\n\nhttps://gewuerzmanager.netlify.app`
    if (navigator.share) {
      navigator.share({ text })
    } else {
      navigator.clipboard?.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    setJoinError('')
    setJoinSuccess('')
    setJoining(true)
    try {
      const name = await joinHousehold(joinCode)
      setJoinSuccess(`Du bist jetzt Mitglied von „${name}". Daten werden geladen…`)
      setJoinCode('')
    } catch (err) {
      setJoinError(err.message)
    } finally {
      setJoining(false)
    }
  }

  function startEditName() {
    setNewName(household?.name ?? '')
    setEditingName(true)
  }

  async function saveEditName() {
    await updateHouseholdName(newName)
    setEditingName(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="font-bold text-gray-800">Haushalt</h3>
      </div>

      {/* Haushaltsname */}
      <div className="card px-4 py-3 mb-3">
        {editingName ? (
          <div className="space-y-2">
            <input
              type="text"
              className="input py-2 text-sm"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && saveEditName()}
            />
            <div className="flex gap-2">
              <button onClick={saveEditName} className="btn-primary flex-1 py-2 text-sm">Speichern</button>
              <button onClick={() => setEditingName(false)} className="btn-secondary flex-1 py-2 text-sm">Abbrechen</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Haushaltsname</p>
              <p className="font-semibold text-gray-900">{household?.name ?? '…'}</p>
            </div>
            <button onClick={startEditName} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Einladungscode */}
      <div className="card px-4 py-3 mb-4">
        <p className="text-xs text-gray-400 font-medium mb-2">Einladungscode</p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-2xl font-bold text-gray-900 tracking-widest font-mono">{displayCode}</p>
            <p className="text-xs text-gray-400 mt-0.5">Teile diesen Code mit Familienmitgliedern</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={shareCode}
              className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-semibold rounded-xl px-3 py-2 transition-colors hover:bg-green-700"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Teilen
            </button>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl px-3 py-2 transition-colors hover:bg-gray-200"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-green-600">Kopiert</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Kopieren
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Haushalt beitreten */}
      <div className="border border-dashed border-gray-200 rounded-2xl p-4 mb-3">
        <p className="text-sm font-semibold text-gray-700 mb-1">Anderem Haushalt beitreten</p>
        <p className="text-xs text-gray-400 mb-3">
          Du verlässt deinen aktuellen Haushalt und siehst fortan die Daten des neuen Haushalts.
        </p>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            className="input flex-1 py-2.5 text-sm font-mono tracking-wider uppercase"
            placeholder="XXXX-XXXX"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            maxLength={8}
          />
          <button
            type="submit"
            disabled={joinCode.length < 8 || joining}
            className="btn-primary px-4 py-2.5 text-sm flex-none disabled:opacity-50"
          >
            {joining ? '…' : 'Beitreten'}
          </button>
        </form>

        {joinError && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{joinError}</div>
        )}
        {joinSuccess && (
          <div className="mt-2 text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">{joinSuccess}</div>
        )}
      </div>

      {/* Haushalt verlassen */}
      {!showLeave ? (
        <button
          onClick={() => setShowLeave(true)}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors w-full text-center py-1"
        >
          Haushalt verlassen und privaten Haushalt erstellen
        </button>
      ) : (
        <div className="bg-red-50 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Haushalt wirklich verlassen?</p>
          <p className="text-xs text-red-600 mb-3">
            Du verlässt „{household?.name}" und bekommst einen neuen leeren privaten Haushalt. Bestehende Daten bleiben im alten Haushalt.
          </p>
          <div className="flex gap-2">
            <button onClick={leaveHousehold} className="btn-danger flex-1 py-2 text-sm">Verlassen</button>
            <button onClick={() => setShowLeave(false)} className="btn-secondary flex-1 py-2 text-sm">Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  )
}

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
        <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="font-bold text-gray-800">Mitglieder</h3>
        {members.length > 0 && (
          <span className="ml-auto text-xs text-gray-400 font-medium">{members.length} Personen</span>
        )}
      </div>

      {loading && (
        <p className="text-sm text-gray-400 text-center py-4">Lade Mitglieder…</p>
      )}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-3">{error}</div>
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
                    <span className="font-semibold text-gray-900 text-sm">{m.name}</span>
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                      m.role === 'owner'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {m.role === 'owner' ? 'Inhaber' : 'Mitglied'}
                    </span>
                    {m.isBanned && (
                      <span className="text-xs bg-red-100 text-red-600 font-semibold rounded-full px-2 py-0.5">Gesperrt</span>
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
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors flex-none"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Action-Panel */}
              {isOpen && !isMe && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 grid grid-cols-2 gap-2">
                  {/* Passwort zurücksetzen */}
                  <button
                    disabled={!!busy}
                    onClick={() => {
                      if (!confirm(`Passwort-Reset-Mail an ${m.email} senden?`)) return
                      handleAction(() => adminResetPassword(household.id, m.email))
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-xl px-3 py-2.5 hover:bg-blue-100 transition-colors disabled:opacity-50"
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
                        ? 'text-green-700 bg-green-50 hover:bg-green-100'
                        : 'text-red-700 bg-red-50 hover:bg-red-100'
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
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-xl px-3 py-2.5 hover:bg-indigo-100 transition-colors disabled:opacity-50"
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
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-xl px-3 py-2.5 hover:bg-gray-200 transition-colors disabled:opacity-50"
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
        <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center text-base leading-none">
          🛍
        </div>
        <h3 className="font-bold text-gray-800">Einkaufsliste</h3>
      </div>

      {/* Verbunden */}
      {bringSettings?.listUuid && step === 'idle' && (
        <div className="card px-4 py-3 mb-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm font-semibold text-gray-900">Bring!</span>
                <span className="text-xs bg-green-100 text-green-700 font-semibold rounded-full px-2 py-0.5">Aktiv</span>
              </div>
              <p className="text-xs text-gray-500">Liste: <span className="font-medium text-gray-700">{bringSettings.listName}</span></p>
              <p className="text-xs text-gray-400">{bringSettings.email}</p>
            </div>
            <button
              onClick={handleDisconnect}
              className="text-xs text-red-500 font-semibold px-3 py-1.5 rounded-xl hover:bg-red-50 transition-colors flex-none"
            >
              Trennen
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
            "Einkaufen"-Aktionen schreiben direkt in diese Bring!-Liste.
          </p>
        </div>
      )}

      {/* Nicht verbunden – Hinweis + Formular starten */}
      {!bringSettings?.listUuid && step === 'idle' && (
        <div className="border border-dashed border-gray-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">Mit Bring! verbinden</p>
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
        <form onSubmit={handleLogin} className="border border-dashed border-orange-200 rounded-2xl p-4 space-y-3 bg-orange-50/30">
          <p className="text-sm font-semibold text-gray-700">Bring!-Konto anmelden</p>
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
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
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
        <div className="border border-dashed border-orange-200 rounded-2xl p-4 bg-orange-50/30">
          <p className="text-sm font-semibold text-gray-700 mb-3">Welche Liste verwenden?</p>
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
                <span className="font-medium text-gray-800 text-sm">{list.name}</span>
                <svg className="w-4 h-4 text-gray-400 flex-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setStep('login'); setError('') }}
            className="text-xs text-gray-400 hover:text-gray-600 mt-3 w-full text-center transition-colors"
          >
            Zurück
          </button>
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-2">{error}</p>}
        </div>
      )}
    </div>
  )
}

// ── Farbwähler ────────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(CATEGORY_COLORS).map(([key, cls]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          title={key}
          className={`w-7 h-7 rounded-full transition-all ${cls.bg} border-2 ${
            value === key
              ? 'border-gray-500 scale-110 shadow'
              : 'border-transparent hover:scale-105'
          }`}
        />
      ))}
    </div>
  )
}

// ── Kategorien ────────────────────────────────────────────────────────────────

function CategoriesSection() {
  const { categories, spices, addCategory, updateCategory, deleteCategory } = useStore()
  const [newName, setNewName]   = useState('')
  const [newColor, setNewColor] = useState('green')
  const [editingId, setEditingId]   = useState(null)
  const [editName, setEditName]     = useState('')
  const [editColor, setEditColor]   = useState('green')

  function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    addCategory({ name: newName.trim(), color: newColor, sortOrder: categories.length })
    setNewName('')
    setNewColor('green')
  }

  function startEdit(cat) {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color)
  }

  function saveEdit(id) {
    if (editName.trim()) updateCategory(id, { name: editName.trim(), color: editColor })
    setEditingId(null)
  }

  function handleDelete(cat) {
    const count = spices.filter(s => s.category === cat.id).length
    const msg = count > 0
      ? `"${cat.name}" löschen? ${count} Gewürz${count !== 1 ? 'e verlieren' : ' verliert'} die Kategorie-Zuweisung.`
      : `"${cat.name}" wirklich löschen?`
    if (confirm(msg)) deleteCategory(cat.id)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="font-bold text-gray-800">Kategorien</h3>
        {categories.length > 0 && (
          <span className="ml-auto text-xs text-gray-400 font-medium">{categories.length} Kategorien</span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {categories.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Noch keine Kategorien angelegt.</p>
        )}
        {categories.map(cat => {
          const count = spices.filter(s => s.category === cat.id).length
          const cls   = CATEGORY_COLORS[cat.color] ?? CATEGORY_COLORS.gray
          if (editingId === cat.id) {
            return (
              <div key={cat.id} className="card p-3 space-y-3 ring-2 ring-green-500">
                <input
                  type="text"
                  className="input py-2 text-sm"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Name"
                  autoFocus
                />
                <div>
                  <p className="text-xs text-gray-400 mb-2">Farbe</p>
                  <ColorPicker value={editColor} onChange={setEditColor} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(cat.id)} className="btn-primary flex-1 py-2 text-sm">Speichern</button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary flex-1 py-2 text-sm">Abbrechen</button>
                </div>
              </div>
            )
          }
          return (
            <div key={cat.id} className="card px-4 py-3 flex items-center gap-3">
              <div className={`w-8 h-8 ${cls.bg} rounded-lg flex-none`} />
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm ${cls.text}`}>{cat.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {count === 0 ? 'Keine Gewürze' : `${count} Gewürz${count !== 1 ? 'e' : ''}`}
                </div>
              </div>
              <div className="flex gap-1 flex-none">
                <button
                  onClick={() => startEdit(cat)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleAdd} className="space-y-3 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Neue Kategorie</p>
        <input
          type="text"
          className="input py-2.5 text-sm"
          placeholder="z.B. Kräuter, Asiatisch, Scharf…"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <div>
          <p className="text-xs text-gray-400 mb-2">Farbe</p>
          <ColorPicker value={newColor} onChange={setNewColor} />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={!newName.trim()}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Kategorie hinzufügen
        </button>
      </form>
    </div>
  )
}

// ── Datensicherung ────────────────────────────────────────────────────────────

function ExportSection() {
  const { exportData, spices, categories, locations, household } = useStore()
  const [done, setDone] = useState(false)

  function handleExport() {
    const data = exportData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `gewuerze-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDone(true)
    setTimeout(() => setDone(false), 3000)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="font-bold text-gray-800">Datensicherung</h3>
      </div>

      <div className="card px-4 py-3">
        <p className="text-sm text-gray-700 mb-0.5">
          <span className="font-semibold">{spices.length} Gewürze</span>
          {categories.length > 0 && <span className="text-gray-400"> · {categories.length} Kategorien</span>}
          {locations.length  > 0 && <span className="text-gray-400"> · {locations.length} Lagerorte</span>}
        </p>
        <p className="text-xs text-gray-400 mb-3">
          Haushalt „{household?.name ?? '…'}" · JSON-Datei, lokal gespeichert
        </p>
        <button
          onClick={handleExport}
          className={`w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold transition-colors ${
            done
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {done ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Exportiert
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Daten exportieren
            </>
          )}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          Tipp: Einmal pro Woche exportieren als Backup
        </p>
      </div>
    </div>
  )
}

// ── Lagerorte ─────────────────────────────────────────────────────────────────

function LocationsSection() {
  const { locations, spices, addLocation, updateLocation, deleteLocation } = useStore()
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    addLocation({ name: newName.trim(), description: newDesc.trim(), sortOrder: locations.length })
    setNewName('')
    setNewDesc('')
  }

  function startEdit(loc) {
    setEditingId(loc.id)
    setEditName(loc.name)
    setEditDesc(loc.description)
  }

  function saveEdit(id) {
    if (editName.trim()) {
      updateLocation(id, { name: editName.trim(), description: editDesc.trim(), sortOrder: locations.find(l => l.id === id)?.sortOrder ?? 0 })
    }
    setEditingId(null)
  }

  function handleDelete(loc) {
    const count = spices.filter(s => s.locationId === loc.id).length
    const msg = count > 0
      ? `"${loc.name}" löschen? ${count} Gewürz${count !== 1 ? 'e verlieren' : ' verliert'} die Lagerort-Zuweisung.`
      : `"${loc.name}" wirklich löschen?`
    if (confirm(msg)) deleteLocation(loc.id)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="font-bold text-gray-800">Lagerorte</h3>
        {locations.length > 0 && (
          <span className="ml-auto text-xs text-gray-400 font-medium">{locations.length} Orte</span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {locations.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Noch keine Lagerorte angelegt.</p>
        )}
        {locations.map(loc => {
          const count = spices.filter(s => s.locationId === loc.id).length
          if (editingId === loc.id) {
            return (
              <div key={loc.id} className="card p-3 space-y-2 ring-2 ring-green-500">
                <input type="text" className="input py-2 text-sm" value={editName}
                  onChange={e => setEditName(e.target.value)} placeholder="Name" autoFocus />
                <input type="text" className="input py-2 text-sm" value={editDesc}
                  onChange={e => setEditDesc(e.target.value)} placeholder="Beschreibung (optional)" />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(loc.id)} className="btn-primary flex-1 py-2 text-sm">Speichern</button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary flex-1 py-2 text-sm">Abbrechen</button>
                </div>
              </div>
            )
          }
          return (
            <div key={loc.id} className="card px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-none">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm">{loc.name}</div>
                {loc.description && <div className="text-xs text-gray-400">{loc.description}</div>}
                <div className="text-xs text-gray-400 mt-0.5">
                  {count === 0 ? 'Keine Gewürze' : `${count} Gewürz${count !== 1 ? 'e' : ''}`}
                </div>
              </div>
              <div className="flex gap-1 flex-none">
                <button onClick={() => startEdit(loc)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button onClick={() => handleDelete(loc)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleAdd} className="space-y-2 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Neuer Lagerort</p>
        <input type="text" className="input py-2.5 text-sm" placeholder="z.B. Oberschrank links, Kiste 1…"
          value={newName} onChange={e => setNewName(e.target.value)} />
        <input type="text" className="input py-2.5 text-sm" placeholder="Beschreibung (optional)"
          value={newDesc} onChange={e => setNewDesc(e.target.value)} />
        <button type="submit" className="btn-primary w-full" disabled={!newName.trim()}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Lagerort hinzufügen
        </button>
      </form>
    </div>
  )
}
