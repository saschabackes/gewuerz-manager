import { useState } from 'react'
import useStore from '../store/useStore'

export default function SettingsView({ onClose }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-enter" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl sheet-enter max-h-[92vh] flex flex-col">
        {/* Griff */}
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

        {/* Inhalt */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-safe">
          <LocationsSection />
        </div>
      </div>
    </>
  )
}

// ── Lagerorte verwalten ───────────────────────────────────────────────────────

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
      ? `"${loc.name}" löschen? ${count} Gewürz${count !== 1 ? 'e verlieren' : ' verliert'} dabei die Lagerort-Zuweisung.`
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

      {/* Liste bestehender Lagerorte */}
      <div className="space-y-2 mb-4">
        {locations.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            Noch keine Lagerorte angelegt.
          </p>
        )}
        {locations.map(loc => {
          const count = spices.filter(s => s.locationId === loc.id).length
          if (editingId === loc.id) {
            return (
              <div key={loc.id} className="card p-3 space-y-2 ring-2 ring-green-500">
                <input
                  type="text"
                  className="input py-2 text-sm"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Name des Lagerorts"
                  autoFocus
                />
                <input
                  type="text"
                  className="input py-2 text-sm"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Beschreibung (optional)"
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(loc.id)} className="btn-primary flex-1 py-2 text-sm">
                    Speichern
                  </button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary flex-1 py-2 text-sm">
                    Abbrechen
                  </button>
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
                {loc.description && (
                  <div className="text-xs text-gray-400">{loc.description}</div>
                )}
                <div className="text-xs text-gray-400 mt-0.5">
                  {count === 0 ? 'Keine Gewürze' : `${count} Gewürz${count !== 1 ? 'e' : ''}`}
                </div>
              </div>
              <div className="flex gap-1 flex-none">
                <button
                  onClick={() => startEdit(loc)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(loc)}
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

      {/* Neuen Lagerort hinzufügen */}
      <form onSubmit={handleAdd} className="space-y-2 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Neuer Lagerort</p>
        <input
          type="text"
          className="input py-2.5 text-sm"
          placeholder="z.B. Oberschrank links, Kiste 1…"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <input
          type="text"
          className="input py-2.5 text-sm"
          placeholder="Beschreibung (optional)"
          value={newDesc}
          onChange={e => setNewDesc(e.target.value)}
        />
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
