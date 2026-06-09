import { useState } from 'react'
import { useCellar } from './store'

const COLORS = [
  { id: 'rot',    label: '🍷 Rot' },
  { id: 'weiß',   label: '🥂 Weiß' },
  { id: 'rosé',   label: '🌸 Rosé' },
  { id: 'schaum', label: '🍾 Schaumwein' },
]

export default function CellarForm({ onClose }) {
  const addBottle = useCellar(s => s.addBottle)
  const [name, setName] = useState('')
  const [winery, setWinery] = useState('')
  const [vintage, setVintage] = useState(new Date().getFullYear() - 2)
  const [region, setRegion] = useState('')
  const [grape, setGrape] = useState('')
  const [color, setColor] = useState('rot')
  const [drinkFrom, setDrinkFrom] = useState(new Date().getFullYear())
  const [drinkUntil, setDrinkUntil] = useState(new Date().getFullYear() + 5)
  const [slot, setSlot] = useState('')
  const [count, setCount] = useState(1)
  const [note, setNote] = useState('')

  function save() {
    if (!name.trim()) return
    addBottle({ name, winery, vintage, region, grape, color, drinkFrom, drinkUntil, slot, count, note })
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-enter" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl sheet-enter max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">🍷 Neue Flasche</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input py-2.5 text-sm" placeholder="z.B. Barolo"
              value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Weingut</label>
              <input className="input py-2.5 text-sm" value={winery} onChange={e => setWinery(e.target.value)} />
            </div>
            <div>
              <label className="label">Jahrgang</label>
              <input type="number" className="input py-2.5 text-sm" value={vintage}
                onChange={e => setVintage(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Region</label>
              <input className="input py-2.5 text-sm" value={region} onChange={e => setRegion(e.target.value)} />
            </div>
            <div>
              <label className="label">Rebsorte</label>
              <input className="input py-2.5 text-sm" value={grape} onChange={e => setGrape(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Farbe</label>
            <div className="flex gap-1.5">
              {COLORS.map(c => (
                <button key={c.id}
                  onClick={() => setColor(c.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
                    color === c.id ? 'bg-rose-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >{c.label}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Trinken ab</label>
              <input type="number" className="input py-2.5 text-sm" value={drinkFrom}
                onChange={e => setDrinkFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Trinken bis</label>
              <input type="number" className="input py-2.5 text-sm" value={drinkUntil}
                onChange={e => setDrinkUntil(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Regalplatz</label>
              <input className="input py-2.5 text-sm" placeholder="z.B. A/3"
                value={slot} onChange={e => setSlot(e.target.value)} />
            </div>
            <div>
              <label className="label">Anzahl Flaschen</label>
              <input type="number" min="1" className="input py-2.5 text-sm" value={count}
                onChange={e => setCount(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Notiz</label>
            <input className="input py-2 text-sm" value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2 pb-4">
            <button onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={save} disabled={!name.trim()}
              className="btn-primary flex-1 disabled:opacity-50" style={{ backgroundColor: '#e11d48' }}>
              Speichern
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
