import { useState } from 'react'
import { useFreezer } from './store'

const EMOJI_OPTIONS = ['🏠','🔻','❄️','🧊','📦','🏚️','🏬','🚪']

export default function StorageSettings({ onClose }) {
  const { storages, addStorage, renameStorage, removeStorage, addCompartment, renameCompartment, removeCompartment } = useFreezer()
  const [newStorageLabel, setNewStorageLabel] = useState('')
  const [newStorageEmoji, setNewStorageEmoji] = useState('📦')

  function add() {
    const l = newStorageLabel.trim()
    if (!l) return
    addStorage(l, newStorageEmoji)
    setNewStorageLabel(''); setNewStorageEmoji('📦')
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-enter" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl sheet-enter max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">📦 Gefrierschränke verwalten</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {storages.map(s => (
            <div key={s.id} className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <select value={s.emoji} onChange={e => renameStorage(s.id, s.label, e.target.value)}
                  className="bg-transparent text-xl">
                  {EMOJI_OPTIONS.map(e => <option key={e}>{e}</option>)}
                </select>
                <input className="input py-1.5 text-sm flex-1"
                  value={s.label} onChange={e => renameStorage(s.id, e.target.value, s.emoji)} />
                <button onClick={() => { if (confirm(`Gefrierschrank "${s.label}" + alle Inhalte löschen?`)) removeStorage(s.id) }}
                  className="text-gray-300 hover:text-red-500 px-2">🗑️</button>
              </div>

              <p className="text-[10px] text-gray-400 uppercase font-bold mt-2 mb-1">Fächer</p>
              <div className="space-y-1.5">
                {s.compartments.map(c => (
                  <div key={c.id} className="flex gap-2">
                    <input className="input py-1.5 text-sm flex-1"
                      value={c.label} onChange={e => renameCompartment(s.id, c.id, e.target.value)} />
                    <button onClick={() => { if (confirm(`Fach "${c.label}" + Inhalte löschen?`)) removeCompartment(s.id, c.id) }}
                      className="text-gray-300 hover:text-red-500 px-2">✕</button>
                  </div>
                ))}
                <button onClick={() => addCompartment(s.id, `Fach ${s.compartments.length + 1}`)}
                  className="w-full text-xs text-indigo-600 font-semibold py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg">
                  + Fach hinzufügen
                </button>
              </div>
            </div>
          ))}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">+ Neuer Gefrierschrank</p>
            <div className="flex gap-2">
              <select value={newStorageEmoji} onChange={e => setNewStorageEmoji(e.target.value)}
                className="bg-gray-100 dark:bg-gray-700 rounded-lg px-2 text-lg">
                {EMOJI_OPTIONS.map(e => <option key={e}>{e}</option>)}
              </select>
              <input className="input py-2 text-sm flex-1"
                placeholder='z.B. "TK Garage"' value={newStorageLabel}
                onChange={e => setNewStorageLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') add() }} />
              <button onClick={add} disabled={!newStorageLabel.trim()}
                className="btn-primary text-sm px-4 disabled:opacity-40" style={{ backgroundColor: '#0284c7' }}>
                Anlegen
              </button>
            </div>
          </div>

          <div className="pt-4 pb-4">
            <button onClick={onClose}
              className="btn-primary w-full" style={{ backgroundColor: '#0284c7' }}>Fertig</button>
          </div>
        </div>
      </div>
    </>
  )
}
