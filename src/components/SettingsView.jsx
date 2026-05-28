import { useState } from 'react'
import useStore from '../store/useStore'

export default function SettingsView({ onClose }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-enter" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl sheet-enter max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>
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
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-safe">
          <HouseholdSection />
          <div className="border-t border-gray-100" />
          <LocationsSection />
        </div>
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
