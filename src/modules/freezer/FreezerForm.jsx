import { useState, useRef } from 'react'
import { useFreezer, CATEGORIES, FREEZER_SHELF_LIFE, autoCategory } from './store'

export default function FreezerForm({ prefilled, onClose }) {
  const { storages, addItem, lastUsedCompartment } = useFreezer()
  const startStorageId = prefilled?.storageId
    || lastUsedCompartment?.storageId
    || storages[0]?.id
  const startCompartmentId = prefilled?.compartmentId
    || lastUsedCompartment?.compartmentId
    || storages.find(s => s.id === startStorageId)?.compartments[0]?.id

  const [name, setName] = useState('')
  const [category, setCategory] = useState('sonstiges')
  const [autoCat, setAutoCat] = useState(true)
  const [storageId, setStorageId] = useState(startStorageId)
  const [compartmentId, setCompartmentId] = useState(startCompartmentId)
  const [portions, setPortions] = useState(1)
  const [portionSize, setPortionSize] = useState('')
  const [frozenAt, setFrozenAt] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [photoData, setPhotoData] = useState(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [hint, setHint] = useState('')
  const photoRef = useRef(null)

  const storage = storages.find(s => s.id === storageId)
  const compartments = storage?.compartments || []
  const shelfMonths = Math.round((FREEZER_SHELF_LIFE[category] ?? 180) / 30)

  function handleNameChange(v) {
    setName(v)
    if (autoCat && v.trim()) setCategory(autoCategory(v))
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    // Auf max 800px komprimieren als JPEG-DataURL (klein für LocalStorage)
    const img = new Image()
    const url = URL.createObjectURL(file)
    await new Promise(res => { img.onload = res; img.src = url })
    const canvas = document.createElement('canvas')
    const max = 800
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    canvas.width = img.width * scale
    canvas.height = img.height * scale
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    setPhotoData(canvas.toDataURL('image/jpeg', 0.7))
    URL.revokeObjectURL(url)
  }

  function save() {
    if (!name.trim()) return
    addItem({ name, category, storageId, compartmentId, portions, portionSize, frozenAt, note, photoData })
    if (bulkMode) {
      setHint(`✓ „${name}" gespeichert – nächster Eintrag?`)
      setName(''); setPortions(1); setPortionSize(''); setNote(''); setPhotoData(null)
      setTimeout(() => setHint(''), 2200)
    } else {
      onClose()
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-enter" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl sheet-enter max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">❄️ Im Tiefkühl ablegen</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="label">Was?</label>
            <input className="input py-2.5 text-sm" placeholder="z.B. Hähnchenbrust, Lasagne, Fischstäbchen"
              value={name} onChange={e => handleNameChange(e.target.value)} autoFocus />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="label !mb-0">Kategorie</label>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-300">
                <input type="checkbox" checked={autoCat} onChange={e => setAutoCat(e.target.checked)} />
                Auto aus Name
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {CATEGORIES.map(c => (
                <button key={c.id} type="button"
                  onClick={() => { setAutoCat(false); setCategory(c.id) }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    category === c.id ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >{c.emoji} {c.label}</button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">Empfohlene Haltbarkeit: ~{shelfMonths} Monate</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Portionen</label>
              <input type="number" min="1" className="input py-2.5 text-sm" value={portions}
                onChange={e => setPortions(e.target.value)} />
            </div>
            <div>
              <label className="label">Portionsgröße</label>
              <input className="input py-2.5 text-sm" placeholder="z.B. 150 g / Stück / Glas"
                value={portionSize} onChange={e => setPortionSize(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Wohin? (Gefrierschrank)</label>
            <div className="flex flex-wrap gap-1.5">
              {storages.map(s => (
                <button key={s.id} type="button"
                  onClick={() => { setStorageId(s.id); setCompartmentId(s.compartments[0]?.id) }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    storageId === s.id ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >{s.emoji} {s.label}</button>
              ))}
            </div>
            {compartments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {compartments.map(c => (
                  <button key={c.id} type="button"
                    onClick={() => setCompartmentId(c.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      compartmentId === c.id ? 'bg-sky-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >{c.label}</button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Einfrierdatum</label>
            <input type="date" className="input py-2.5 text-sm" value={frozenAt}
              onChange={e => setFrozenAt(e.target.value)} />
          </div>

          {/* Foto */}
          <div>
            <label className="label">Foto (optional)</label>
            <div className="flex items-center gap-3">
              <input ref={photoRef} type="file" accept="image/*" capture="environment"
                onChange={handlePhoto} className="hidden" />
              <button onClick={() => photoRef.current?.click()}
                className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg font-semibold">
                📷 Foto aufnehmen
              </button>
              {photoData && (
                <div className="relative">
                  <img src={photoData} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  <button onClick={() => setPhotoData(null)}
                    className="absolute -top-1 -right-1 bg-gray-800 text-white rounded-full w-5 h-5 text-xs">✕</button>
                </div>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Gut für selbst Eingemachtes, Hundefutter, alles ohne Etikett.</p>
          </div>

          <div>
            <label className="label">Notiz</label>
            <input className="input py-2 text-sm" value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 bg-sky-50 dark:bg-sky-900/30 px-3 py-2 rounded-xl">
            <input type="checkbox" checked={bulkMode} onChange={e => setBulkMode(e.target.checked)} />
            <span><b>Wocheneinkauf-Modus</b> – Form bleibt nach Speichern offen</span>
          </label>

          {hint && <p className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">{hint}</p>}

          <div className="flex gap-3 pt-2 pb-4">
            <button onClick={onClose} className="btn-secondary flex-1">Schließen</button>
            <button onClick={save} disabled={!name.trim()}
              className="btn-primary flex-1 disabled:opacity-50" style={{ backgroundColor: '#0284c7' }}>
              {bulkMode ? 'Speichern + nächstes' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
