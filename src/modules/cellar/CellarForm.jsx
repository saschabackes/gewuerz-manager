import { useState, useRef, useEffect } from 'react'
import { useCellar } from './store'
import { WINE_COUNTRIES_TOP, WINE_COUNTRIES_MORE, isSparkling, CountryPicker } from './wineConstants'

const COLORS = [
  { id: 'rot',    label: '🍷 Rot' },
  { id: 'weiß',   label: '🥂 Weiß' },
  { id: 'rosé',   label: '🌸 Rosé' },
  { id: 'schaum', label: '🍾 Schaum' },
]

const WINE_TYPES = [
  { id: 'wein',      label: '🍷 Wein' },
  { id: 'sekt',      label: '🍾 Sekt' },
  { id: 'schorle',   label: '🍹 Schorle' },
  { id: 'gluehwein', label: '☕ Glühwein' },
  { id: 'sonstige',  label: '🥤 Sonstige' },
]

const SWEETNESS = [
  { id: 'trocken',     label: 'Trocken' },
  { id: 'halbtrocken', label: 'Halbtrocken' },
  { id: 'lieblich',    label: 'Lieblich' },
  { id: 'süß',         label: 'Süß' },
]

const SWEETNESS_SPARKLING = [
  { id: 'brut nature', label: 'Brut Nature' },
  { id: 'extra brut',  label: 'Extra Brut' },
  { id: 'brut',        label: 'Brut' },
  { id: 'extra dry',   label: 'Extra Dry' },
  { id: 'trocken',     label: 'Trocken' },
  { id: 'halbtrocken', label: 'Halbtrocken' },
  { id: 'süß',         label: 'Süß' },
]


function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 text-sm font-semibold text-gray-700 dark:text-gray-200">
        <span>{title}</span>
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && <div className="px-4 py-3 space-y-3">{children}</div>}
    </div>
  )
}

export default function CellarForm({ prefilled, onClose }) {
  const { racks, addBottle, restockBottle, removePending, lastUsedRack } = useCellar()
  const pendingId = prefilled?.pendingId || null
  const fromBottleId = prefilled?.fromBottleId || null

  const [name, setName] = useState(prefilled?.name || '')
  const [winery, setWinery] = useState(prefilled?.winery || '')
  const [vintage, setVintage] = useState(prefilled?.vintage || new Date().getFullYear() - 2)
  const [region, setRegion] = useState(prefilled?.region || '')
  const [country, setCountry] = useState(prefilled?.country || '')
  const [grape, setGrape] = useState(prefilled?.grape || '')
  const [color, setColor] = useState(prefilled?.color || 'rot')
  const [wineType, setWineType] = useState(prefilled?.wineType || 'wein')
  const [sweetness, setSweetness] = useState(prefilled?.sweetness || '')
  const [classification, setClassification] = useState(prefilled?.classification || '')
  const [drinkFrom, setDrinkFrom] = useState(prefilled?.drinkFrom || new Date().getFullYear())
  const [drinkUntil, setDrinkUntil] = useState(prefilled?.drinkUntil || new Date().getFullYear() + 5)
  const [note, setNote] = useState('')
  const [photoData, setPhotoData] = useState(null)
  const [barcode, setBarcode] = useState('')
  const [barMsg, setBarMsg] = useState('')

  const [retailer, setRetailer] = useState('')
  const [priceEur, setPriceEur] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [link, setLink] = useState('')

  const startRackId = prefilled?.rackId || lastUsedRack?.rackId || racks[0]?.id
  const startSlot = prefilled?.slot || lastUsedRack?.slot || racks.find(r => r.id === startRackId)?.slots[0] || ''
  const [count, setCount] = useState(1)
  const [locations, setLocations] = useState([{ rackId: startRackId, slot: startSlot }])

  const [bulkMode, setBulkMode] = useState(false)
  const [hint, setHint] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeMsg, setAnalyzeMsg] = useState('')
  const photoRef = useRef(null)
  const barcodeRef = useRef(null)

  useEffect(() => {
    const n = Math.max(1, Number(count) || 1)
    setLocations(prev => {
      if (n === prev.length) return prev
      if (n > prev.length) {
        const last = prev[prev.length - 1] || { rackId: startRackId, slot: startSlot }
        return [...prev, ...Array(n - prev.length).fill(null).map(() => ({ ...last }))]
      }
      return prev.slice(0, n)
    })
  }, [count])

  function updateLocation(idx, field, value) {
    setLocations(prev => prev.map((loc, i) => {
      if (i !== idx) return loc
      if (field === 'rackId') {
        const rack = racks.find(r => r.id === value)
        return { rackId: value, slot: rack?.slots[0] || '' }
      }
      return { ...loc, [field]: value }
    }))
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]; if (!file) return
    const img = new Image(); const url = URL.createObjectURL(file)
    await new Promise(res => { img.onload = res; img.src = url })
    const canvas = document.createElement('canvas')
    const max = 800
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    canvas.width = img.width * scale; canvas.height = img.height * scale
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    setPhotoData(dataUrl)
    URL.revokeObjectURL(url)
    tryBarcodeFromImage(canvas)
    analyzeLabel(dataUrl)
  }

  async function analyzeLabel(imageDataUrl) {
    setAnalyzing(true)
    setAnalyzeMsg('Etikett wird analysiert…')
    try {
      const res = await fetch('/.netlify/functions/analyze-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl }),
      })
      const json = await res.json()
      if (!json.ok) {
        setAnalyzeMsg(`Analyse fehlgeschlagen: ${json.error}`)
        return
      }
      const d = json.data
      if (d.name && !name)       setName(d.name)
      if (d.winery && !winery)   setWinery(d.winery)
      if (d.vintage)             setVintage(d.vintage)
      if (d.region && !region)   setRegion(d.region)
      if (d.country && !country) setCountry(d.country)
      if (d.grape && !grape)     setGrape(d.grape)
      if (d.color)               setColor(d.color)
      if (d.sweetness)           setSweetness(d.sweetness)
      if (d.wineType)            setWineType(d.wineType)
      if (d.classification)     setClassification(d.classification)
      const filled = [d.name, d.winery, d.region, d.grape].filter(Boolean)
      setAnalyzeMsg(`✅ ${filled.length} Felder erkannt` + (d.classification ? ` · ${d.classification}` : ''))
    } catch {
      setAnalyzeMsg('Analyse nicht verfügbar (nur mit netlify dev)')
    } finally {
      setAnalyzing(false)
    }
  }

  async function tryBarcodeFromImage(canvas) {
    if (!('BarcodeDetector' in window)) return
    try {
      const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
      const results = await detector.detect(canvas)
      if (results.length > 0) {
        setBarcode(results[0].rawValue)
        setBarMsg(`Barcode erkannt: ${results[0].rawValue}`)
      }
    } catch { /* ignore */ }
  }

  async function handleBarcodeScan() {
    if (!('BarcodeDetector' in window)) {
      setBarMsg('Barcode-Scan wird von diesem Browser nicht unterstützt. Nutze Chrome auf Android.')
      return
    }
    barcodeRef.current?.click()
  }

  async function handleBarcodePhoto(e) {
    const file = e.target.files?.[0]; if (!file) return
    const img = new Image(); const url = URL.createObjectURL(file)
    await new Promise(res => { img.onload = res; img.src = url })
    const canvas = document.createElement('canvas')
    canvas.width = img.width; canvas.height = img.height
    canvas.getContext('2d').drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    try {
      const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
      const results = await detector.detect(canvas)
      if (results.length > 0) {
        setBarcode(results[0].rawValue)
        setBarMsg(`✅ Barcode erkannt: ${results[0].rawValue}`)
      } else {
        setBarMsg('Kein Barcode erkannt. Versuche es nochmal mit besserem Fokus.')
      }
    } catch {
      setBarMsg('Barcode-Erkennung fehlgeschlagen.')
    }
  }

  function save() {
    if (!name.trim()) return
    if (fromBottleId) {
      restockBottle(fromBottleId, count)
    } else {
      addBottle({
        name, winery, vintage, region, country, grape, color, wineType, sweetness, classification,
        drinkFrom, drinkUntil, note, photoData, barcode,
        retailer, priceEur, purchaseDate, link,
        locations: locations.map(l => ({ rackId: l.rackId, slot: l.slot, count: 1 })),
      })
    }
    if (pendingId) removePending(pendingId)
    if (bulkMode) {
      setHint(`✓ „${name}" gespeichert – nächste?`)
      setName(''); setWinery(''); setCountry(''); setClassification(''); setNote(''); setPhotoData(null); setBarcode('')
      setCount(1); setRetailer(''); setPriceEur(''); setLink('')
      setTimeout(() => setHint(''), 2200)
    } else onClose()
  }

  const isSpark = isSparkling(color, wineType)

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

          {/* ── 1. Erfassung: Foto & Barcode ───────────────────────────── */}
          <div className="bg-gradient-to-br from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-primary-900 dark:text-primary-200">📸 Etikett erfassen</p>
            <p className="text-xs text-primary-700 dark:text-primary-300">Fotografiere das Etikett – wir extrahieren so viel wie möglich automatisch.</p>

            <div className="flex gap-2">
              <input ref={photoRef} type="file" accept="image/*" capture="environment"
                onChange={handlePhoto} className="hidden" />
              <input ref={barcodeRef} type="file" accept="image/*" capture="environment"
                onChange={handleBarcodePhoto} className="hidden" />
              <button onClick={() => photoRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white text-sm font-semibold px-4 py-3 rounded-xl active:bg-primary-700">
                📷 Etikett fotografieren
              </button>
              <button onClick={handleBarcodeScan}
                className="flex-none flex items-center justify-center gap-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 active:bg-gray-50">
                ⊞ Barcode
              </button>
            </div>

            {photoData && (
              <div className="relative inline-block">
                <img src={photoData} alt="Etikett" className="w-full max-h-40 rounded-xl object-cover" />
                <button onClick={() => { setPhotoData(null); setAnalyzeMsg('') }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 text-sm flex items-center justify-center">✕</button>
              </div>
            )}

            {analyzing && (
              <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2.5 rounded-xl">
                <svg className="w-4 h-4 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span className="text-xs font-medium text-primary-700 dark:text-primary-300">Etikett wird analysiert…</span>
              </div>
            )}
            {analyzeMsg && !analyzing && (
              <p className="text-xs font-medium text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-700 px-3 py-2 rounded-xl">{analyzeMsg}</p>
            )}

            {barcode && (
              <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg">
                <span className="text-xs font-mono text-gray-600 dark:text-gray-300">EAN: {barcode}</span>
              </div>
            )}
            {barMsg && <p className="text-xs text-primary-600 dark:text-primary-400">{barMsg}</p>}
          </div>

          {/* ── 2. Grunddaten ──────────────────────────────────────────── */}
          <Section title="🍷 Grunddaten" defaultOpen={true}>
            <div>
              <label className="label">Name *</label>
              <input className="input py-2.5 text-sm" placeholder="z.B. Spätburgunder, Riesling Kabinett…"
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
            <div>
              <label className="label">Land</label>
              <CountryPicker value={country} onChange={setCountry} />
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
                      color === c.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>{c.label}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Art</label>
              <div className="flex gap-1.5 flex-wrap">
                {WINE_TYPES.map(t => (
                  <button key={t.id} type="button" onClick={() => setWineType(t.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                      wineType === t.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>{t.label}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Geschmack</label>
              <div className="flex gap-1.5 flex-wrap">
                {(isSparkling(color, wineType) ? SWEETNESS_SPARKLING : SWEETNESS).map(s => (
                  <button key={s.id} type="button"
                    onClick={() => setSweetness(prev => prev === s.id ? '' : s.id)}
                    className={`flex-1 min-w-[60px] py-2 rounded-xl text-xs font-semibold ${
                      sweetness === s.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>{s.label}</button>
                ))}
              </div>
            </div>
          </Section>

          {/* ── 3. Lagerort ────────────────────────────────────────────── */}
          <Section title="📦 Lagerort & Anzahl" defaultOpen={true}>
            <div>
              <label className="label">Anzahl Flaschen</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setCount(c => Math.max(1, c - 1))}
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 text-lg font-bold text-gray-600 dark:text-gray-300 active:bg-gray-200">−</button>
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100 w-8 text-center">{count}</span>
                <button type="button" onClick={() => setCount(c => c + 1)}
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 text-lg font-bold text-gray-600 dark:text-gray-300 active:bg-gray-200">+</button>
              </div>
            </div>

            {locations.map((loc, idx) => {
              const rack = racks.find(r => r.id === loc.rackId)
              return (
                <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 space-y-2">
                  {count > 1 && (
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Flasche {idx + 1}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {racks.map(r => (
                      <button key={r.id} type="button"
                        onClick={() => updateLocation(idx, 'rackId', r.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold ${
                          loc.rackId === r.id ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                        }`}
                      >{r.emoji} {r.label}</button>
                    ))}
                  </div>
                  {rack && rack.slots.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {rack.slots.map(s => (
                        <button key={s} type="button" onClick={() => updateLocation(idx, 'slot', s)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            loc.slot === s ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                          }`}>{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </Section>

          {/* ── 4. Trinkfenster ────────────────────────────────────────── */}
          <Section title="🗓️ Trinkfenster" defaultOpen={false}>
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
          </Section>

          {/* ── 5. Optionale Details ───────────────────────────────────── */}
          <Section title="💡 Optionale Details" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Händler</label>
                <input className="input py-2.5 text-sm" placeholder="z.B. Jacques', REWE…"
                  value={retailer} onChange={e => setRetailer(e.target.value)} />
              </div>
              <div>
                <label className="label">Preis (€)</label>
                <input type="number" step="0.01" className="input py-2.5 text-sm" placeholder="0.00"
                  value={priceEur} onChange={e => setPriceEur(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Kaufdatum</label>
                <input type="date" className="input py-2.5 text-sm"
                  value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Link zum Wein</label>
                <input type="url" className="input py-2.5 text-sm" placeholder="https://…"
                  value={link} onChange={e => setLink(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Notiz</label>
              <input className="input py-2 text-sm" value={note} onChange={e => setNote(e.target.value)} />
            </div>
          </Section>

          {/* ── Einlager-Modus & Speichern ─────────────────────────────── */}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 bg-primary-50 dark:bg-primary-900/30 px-3 py-2 rounded-xl">
            <input type="checkbox" checked={bulkMode} onChange={e => setBulkMode(e.target.checked)} />
            <span><b>Einlager-Modus</b> – Form bleibt offen für die nächste Flasche</span>
          </label>

          {hint && <p className="text-primary-600 dark:text-primary-400 text-sm font-medium">{hint}</p>}

          <div className="flex gap-3 pt-2 pb-4">
            <button onClick={onClose} className="btn-secondary flex-1">Schließen</button>
            <button onClick={save} disabled={!name.trim()}
              className="btn-primary flex-1 disabled:opacity-50">
              {bulkMode ? 'Speichern + nächstes' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

