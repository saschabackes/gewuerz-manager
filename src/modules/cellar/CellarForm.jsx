import { useState, useRef } from 'react'
import { useCellar } from './store'

const COLORS = [
  { id: 'rot',    label: '🍷 Rot' },
  { id: 'weiß',   label: '🥂 Weiß' },
  { id: 'rosé',   label: '🌸 Rosé' },
  { id: 'schaum', label: '🍾 Schaum' },
]

export default function CellarForm({ prefilled, onClose }) {
  const { racks, addBottle, restockBottle, removePending, lastUsedRack } = useCellar()
  const startRackId = prefilled?.rackId || lastUsedRack?.rackId || racks[0]?.id
  const startSlot   = prefilled?.slot   || lastUsedRack?.slot   || racks.find(r => r.id === startRackId)?.slots[0] || ''
  const pendingId = prefilled?.pendingId || null
  const fromBottleId = prefilled?.fromBottleId || null

  const [name, setName] = useState(prefilled?.name || '')
  const [winery, setWinery] = useState(prefilled?.winery || '')
  const [vintage, setVintage] = useState(prefilled?.vintage || new Date().getFullYear() - 2)
  const [region, setRegion] = useState(prefilled?.region || '')
  const [grape, setGrape] = useState(prefilled?.grape || '')
  const [color, setColor] = useState(prefilled?.color || 'rot')
  const [drinkFrom, setDrinkFrom] = useState(prefilled?.drinkFrom || new Date().getFullYear())
  const [drinkUntil, setDrinkUntil] = useState(prefilled?.drinkUntil || new Date().getFullYear() + 5)
  const [rackId, setRackId] = useState(startRackId)
  const [slot, setSlot] = useState(startSlot)
  const [count, setCount] = useState(1)
  const [note, setNote] = useState('')
  const [photoData, setPhotoData] = useState(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [hint, setHint] = useState('')
  const photoRef = useRef(null)

  const rack = racks.find(r => r.id === rackId)

  async function handlePhoto(e) {
    const file = e.target.files?.[0]; if (!file) return
    const img = new Image(); const url = URL.createObjectURL(file)
    await new Promise(res => { img.onload = res; img.src = url })
    const canvas = document.createElement('canvas')
    const max = 800
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    canvas.width = img.width * scale; canvas.height = img.height * scale
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    setPhotoData(canvas.toDataURL('image/jpeg', 0.7))
    URL.revokeObjectURL(url)
  }

  function save() {
    if (!name.trim()) return
    if (fromBottleId) {
      // Bekannten Wein nachstocken (gleiche Position) – ohne Duplikat
      restockBottle(fromBottleId, count)
    } else {
      addBottle({ name, winery, vintage, region, grape, color, drinkFrom, drinkUntil, rackId, slot, count, note, photoData })
    }
    if (pendingId) removePending(pendingId)
    if (bulkMode) {
      setHint(`✓ „${name}" gespeichert – nächste?`)
      setName(''); setWinery(''); setNote(''); setPhotoData(null); setCount(1)
      setTimeout(() => setHint(''), 2200)
    } else onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-enter" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl sheet-enter max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {pendingId ? (fromBottleId ? '📦 Wein einräumen' : '📦 Neue Flasche einräumen') : '🍷 Neue Flasche'}
          </h2>
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
                <button key={c.id} type="button" onClick={() => setColor(c.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
                    color === c.id ? 'bg-rose-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>{c.label}</button>
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

          <div>
            <label className="label">Wohin? (Regal)</label>
            <div className="flex flex-wrap gap-1.5">
              {racks.map(r => (
                <button key={r.id} type="button"
                  onClick={() => { setRackId(r.id); setSlot(r.slots[0] || '') }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold ${
                    rackId === r.id ? 'bg-rose-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >{r.emoji} {r.label}</button>
              ))}
            </div>
            {rack && rack.slots.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {rack.slots.map(s => (
                  <button key={s} type="button" onClick={() => setSlot(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      slot === s ? 'bg-rose-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>{s}</button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Anzahl Flaschen</label>
            <input type="number" min="1" className="input py-2.5 text-sm" value={count}
              onChange={e => setCount(e.target.value)} />
          </div>

          {/* Foto */}
          <div>
            <label className="label">Etikett-Foto (optional)</label>
            <div className="flex items-center gap-3">
              <input ref={photoRef} type="file" accept="image/*" capture="environment"
                onChange={handlePhoto} className="hidden" />
              <button onClick={() => photoRef.current?.click()}
                className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg font-semibold">
                📷 Etikett fotografieren
              </button>
              {photoData && (
                <div className="relative">
                  <img src={photoData} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  <button onClick={() => setPhotoData(null)}
                    className="absolute -top-1 -right-1 bg-gray-800 text-white rounded-full w-5 h-5 text-xs">✕</button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="label">Notiz</label>
            <input className="input py-2 text-sm" value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 bg-rose-50 dark:bg-rose-900/30 px-3 py-2 rounded-xl">
            <input type="checkbox" checked={bulkMode} onChange={e => setBulkMode(e.target.checked)} />
            <span><b>Einlager-Modus</b> – Form bleibt offen für die nächste Flasche</span>
          </label>

          {hint && <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">{hint}</p>}

          <div className="flex gap-3 pt-2 pb-4">
            <button onClick={onClose} className="btn-secondary flex-1">Schließen</button>
            <button onClick={save} disabled={!name.trim()}
              className="btn-primary flex-1 disabled:opacity-50" style={{ backgroundColor: '#e11d48' }}>
              {bulkMode ? 'Speichern + nächstes' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
