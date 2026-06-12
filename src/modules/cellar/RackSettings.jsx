import { useState } from 'react'
import { useCellar, CONDITION_OPTIONS, qualityScore, qualityLabel } from './store'

const COND_KEYS = [
  { key: 'temperature', label: '🌡️ Temperatur' },
  { key: 'light',       label: '💡 Licht' },
  { key: 'humidity',    label: '💧 Feuchte' },
  { key: 'vibration',   label: '🔇 Ruhe' },
]

const EMOJI_OPTIONS = ['🍷','🛋️','🔻','🧊','🏠','🍾','🗄️','📦']

export default function RackSettings({ onClose }) {
  const { racks, addRack, renameRack, removeRack, addSlot, renameSlot, removeSlot, setRackConditions } = useCellar()
  const [newLabel, setNewLabel] = useState('')
  const [newEmoji, setNewEmoji] = useState('🍷')

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-enter" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl sheet-enter max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">🍷 Weinlager verwalten</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {racks.map(r => {
            const score = qualityScore(r.conditions)
            const ql = qualityLabel(score)
            return (
              <div key={r.id} className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <select value={r.emoji} onChange={e => renameRack(r.id, r.label, e.target.value)} className="bg-transparent text-xl">
                    {EMOJI_OPTIONS.map(e => <option key={e}>{e}</option>)}
                  </select>
                  <input className="input py-1.5 text-sm flex-1"
                    value={r.label} onChange={e => renameRack(r.id, e.target.value, r.emoji)} />
                  <button onClick={() => { if (confirm(`Regal "${r.label}" + Inhalte löschen?`)) removeRack(r.id) }}
                    className="text-gray-300 hover:text-red-500 px-2">🗑️</button>
                </div>

                <p className="text-[10px] text-gray-400 uppercase font-bold mt-2 mb-1">Fächer</p>
                <div className="flex flex-wrap gap-1.5">
                  {r.slots.map(s => (
                    <div key={s} className="flex items-center bg-white dark:bg-gray-800 rounded-full pl-2 pr-1 py-0.5 gap-1 text-xs">
                      <span>{s}</span>
                      <button onClick={() => {
                        const nl = prompt('Neuer Name für ' + s, s)
                        if (nl && nl !== s) renameSlot(r.id, s, nl)
                      }} className="text-gray-400">✎</button>
                      <button onClick={() => { if (confirm(`Fach "${s}" + Inhalte löschen?`)) removeSlot(r.id, s) }}
                        className="text-gray-300 hover:text-red-500">✕</button>
                    </div>
                  ))}
                  <button onClick={() => {
                    const l = prompt('Bezeichnung des Fachs', String(r.slots.length + 1))
                    if (l) addSlot(r.id, l)
                  }} className="text-xs text-indigo-600 font-semibold px-2 py-0.5">+ Fach</button>
                </div>

                <div className="flex items-center justify-between mt-3 mb-1">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Lagerbedingungen</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ql.cls}`}>
                    {score}/100 · {ql.label}
                  </span>
                </div>
                <div className="space-y-2">
                  {COND_KEYS.map(({ key, label }) => {
                    const current = r.conditions?.[key]
                    return (
                      <div key={key}>
                        <p className="text-[11px] text-gray-500 dark:text-gray-300 mb-0.5">{label}</p>
                        <div className="flex flex-wrap gap-1">
                          {CONDITION_OPTIONS[key].map(opt => (
                            <button key={opt.id}
                              onClick={() => setRackConditions(r.id, { [key]: opt.id })}
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                current === opt.id
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                              }`}
                            >{opt.label}</button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 italic">
                  Beeinflusst das effektive Trinkfenster der Flaschen in diesem Regal.
                </p>
              </div>
            )
          })}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">+ Neues Regal</p>
            <div className="flex gap-2">
              <select value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
                className="bg-gray-100 dark:bg-gray-700 rounded-lg px-2 text-lg">
                {EMOJI_OPTIONS.map(e => <option key={e}>{e}</option>)}
              </select>
              <input className="input py-2 text-sm flex-1"
                placeholder='z.B. "Regal Garage"' value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newLabel.trim()) { addRack(newLabel, newEmoji); setNewLabel('') } }} />
              <button onClick={() => { if (newLabel.trim()) { addRack(newLabel, newEmoji); setNewLabel('') } }}
                disabled={!newLabel.trim()}
                className="btn-primary text-sm px-4 disabled:opacity-40" style={{ backgroundColor: '#0D7377' }}>
                Anlegen
              </button>
            </div>
          </div>

          <div className="pt-4 pb-4">
            <button onClick={onClose} className="btn-primary w-full" style={{ backgroundColor: '#0D7377' }}>Fertig</button>
          </div>
        </div>
      </div>
    </>
  )
}
