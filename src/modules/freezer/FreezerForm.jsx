import { useState } from 'react'
import { useFreezer, CATEGORIES, FREEZER_SHELF_LIFE } from './store'

export default function FreezerForm({ drawers, prefilledDrawer, onClose }) {
  const addItem = useFreezer(s => s.addItem)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('sonstiges')
  const [drawerId, setDrawerId] = useState(prefilledDrawer || drawers[0]?.id || 'd1')
  const [portions, setPortions] = useState(1)
  const [portionSize, setPortionSize] = useState('')
  const [frozenAt, setFrozenAt] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')

  function save() {
    if (!name.trim()) return
    addItem({ name, category, drawerId, portions, portionSize, frozenAt, note })
    onClose()
  }

  const shelfMonths = Math.round((FREEZER_SHELF_LIFE[category] ?? 180) / 30)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-enter" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl sheet-enter max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">❄️ Eintrag im Tiefkühl</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="label">Was?</label>
            <input className="input py-2.5 text-sm" placeholder="z.B. Hähnchenbrust"
              value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>

          <div>
            <label className="label">Kategorie</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    category === c.id ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >{c.emoji} {c.label}</button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Empfohlene Haltbarkeit: ~{shelfMonths} Monate
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Portionen</label>
              <input type="number" min="1" className="input py-2.5 text-sm" value={portions}
                onChange={e => setPortions(e.target.value)} />
            </div>
            <div>
              <label className="label">Portionsgröße</label>
              <input className="input py-2.5 text-sm" placeholder="z.B. 150 g"
                value={portionSize} onChange={e => setPortionSize(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Schublade</label>
            <div className="flex gap-1.5">
              {drawers.map(d => (
                <button key={d.id}
                  onClick={() => setDrawerId(d.id)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold ${
                    drawerId === d.id ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >{d.label.replace('Schublade ', 'S')}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Einfrierdatum</label>
            <input type="date" className="input py-2.5 text-sm" value={frozenAt}
              onChange={e => setFrozenAt(e.target.value)} />
          </div>

          <div>
            <label className="label">Notiz (optional)</label>
            <input className="input py-2 text-sm" value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2 pb-4">
            <button onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={save} disabled={!name.trim()}
              className="btn-primary flex-1 disabled:opacity-50" style={{ backgroundColor: '#0284c7' }}>
              Speichern
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
