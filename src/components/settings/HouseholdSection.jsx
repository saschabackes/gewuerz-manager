import { useState } from 'react'
import useStore from '../../store/useStore'
import { APP_URL } from '../../branding'

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
    const inviteLink = `${APP_URL}?invite=${household?.inviteCode || ''}`
    const text = `Tritt meinem Haushalt bei!\n\n${inviteLink}`
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
        <div className="w-7 h-7 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-gray-100">Haushalt</h3>
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
              <p className="font-semibold text-gray-900 dark:text-gray-100">{household?.name ?? '…'}</p>
            </div>
            <button onClick={startEditName} className="p-1.5 rounded-lg hover:bg-gray-100 dark:bg-gray-700 text-gray-400 transition-colors">
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
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-widest font-mono">{displayCode}</p>
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
              className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-xl px-3 py-2 transition-colors hover:bg-gray-200"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-green-600 dark:text-green-400">Kopiert</span>
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
      <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-4 mb-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Anderem Haushalt beitreten</p>
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
          <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl px-3 py-2">{joinError}</div>
        )}
        {joinSuccess && (
          <div className="mt-2 text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 rounded-xl px-3 py-2">{joinSuccess}</div>
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
        <div className="bg-red-50 dark:bg-red-900/30 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">Haushalt wirklich verlassen?</p>
          <p className="text-xs text-red-600 dark:text-red-400 mb-3">
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


export default HouseholdSection
