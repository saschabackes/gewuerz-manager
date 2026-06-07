import { useState, useEffect, useRef } from 'react'
import useStore from '../store/useStore'
import { COMMON_SPICES, PACKAGING_TYPES, PACKAGING_COLORS } from '../data/spices'
import BarcodeScanner from './BarcodeScanner'
import { searchProductImages } from '../utils/productLookup'
import FillBar, { FILL_LABELS } from './FillBar'

const DEFAULT_FORM = {
  name: '',
  brand: '',
  imageUrl: '',
  packagingType: 'fertigstreuer',
  amountGrams: '',
  units: '',
  expiryDate: '',
  barcode: '',
  notes: '',
  locationId: '',
  category: '',
  fillLevel: 4,
}

export default function SpiceForm({ spice, prefill, onClose }) {
  const { addSpice, updateSpice, locations, categories } = useStore()
  const isEdit = !!spice

  const [form, setForm] = useState(() => spice ? {
    name: spice.name ?? '',
    brand: spice.brand ?? '',
    imageUrl: spice.imageUrl ?? '',
    packagingType: spice.packagingType ?? 'fertigstreuer',
    amountGrams: spice.amountGrams ?? '',
    units: spice.units ?? '',
    expiryDate: spice.expiryDate ?? '',
    barcode: spice.barcode ?? '',
    notes: spice.notes ?? '',
    locationId: spice.locationId ?? '',
    category: spice.category ?? '',
    fillLevel: spice.fillLevel ?? 4,
  } : { ...DEFAULT_FORM, name: prefill?.name ?? '', brand: prefill?.brand ?? '' })

  const [suggestions, setSuggestions]       = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showScanner, setShowScanner]         = useState(false)
  const [lookupStatus, setLookupStatus]       = useState(null)
  const [error, setError]                     = useState('')
  const [imageResults, setImageResults]       = useState([])   // Suchergebnisse
  const [imageSearching, setImageSearching]   = useState(false)
  const [imageSearchDone, setImageSearchDone] = useState(false)
  const nameRef = useRef(null)
  const gramsRef = useRef(null)
  const imageFileRef = useRef(null)
  const suggestionTimeout = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 350)
    return () => clearTimeout(t)
  }, [])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleNameChange(e) {
    const val = e.target.value
    set('name', val)
    if (val.trim().length >= 1) {
      const q = val.toLowerCase()
      setSuggestions(COMMON_SPICES.filter(s => s.toLowerCase().includes(q)).slice(0, 8))
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  // Foto aufnehmen / Bild von Gerät laden → auf 300px verkleinern und als base64 speichern
  function handleImageFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 300
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      set('imageUrl', canvas.toDataURL('image/jpeg', 0.75))
      URL.revokeObjectURL(objectUrl)
    }
    img.src = objectUrl
    e.target.value = ''
  }

  async function handleImageSearch() {
    if (!form.name.trim()) return
    setImageSearching(true)
    setImageResults([])
    setImageSearchDone(false)
    try {
      const results = await searchProductImages(form.name.trim(), form.brand.trim())
      setImageResults(results)
      setImageSearchDone(true)
    } finally {
      setImageSearching(false)
    }
  }

  function selectSearchImage(fullUrl) {
    set('imageUrl', fullUrl)
    setImageResults([])
    setImageSearchDone(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Bitte Gewürzname eingeben'); return }

    const needsGrams = form.packagingType === 'fertigstreuer' || form.packagingType === 'nachfuell'
    const needsUnits = form.packagingType === 'fertigstreuer' || form.packagingType === 'ganz' || form.packagingType === 'metallstreuer'
    if (needsGrams && !form.amountGrams) { setError('Bitte Grammzahl eingeben'); return }
    if (needsUnits && !form.units) { setError('Bitte Anzahl eingeben'); return }

    const data = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      imageUrl: form.imageUrl || null,
      packagingType: form.packagingType,
      amountGrams: needsGrams ? Number(form.amountGrams) : null,
      units: needsUnits ? Number(form.units) : null,
      expiryDate: form.expiryDate || null,
      barcode: form.barcode.trim() || null,
      notes: form.notes.trim() || null,
      locationId: form.locationId || null,
      category: form.category || null,
      fillLevel: form.fillLevel ?? 4,
    }

    if (isEdit) updateSpice(spice.id, data)
    else addSpice(data)
    onClose()
  }

  const showGrams = form.packagingType === 'fertigstreuer' || form.packagingType === 'nachfuell'
  const showUnits = form.packagingType === 'fertigstreuer' || form.packagingType === 'ganz' || form.packagingType === 'metallstreuer'

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-enter" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl sheet-enter max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {isEdit ? 'Gewürz bearbeiten' : 'Gewürz hinzufügen'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:bg-gray-700 transition-colors">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-safe">

          {/* ── Produktbild ─────────────────────────────────────── */}
          <div>
            <label className="label">Produktbild (optional)</label>
            <div className="flex gap-3 items-start">
              {/* Vorschau */}
              <div className="flex-none w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Produktbild" className="w-full h-full object-contain" />
                ) : (
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              {/* Aktionen */}
              <div className="flex-1 space-y-2">
                {/* Foto aufnehmen / aus Galerie */}
                <button
                  type="button"
                  onClick={() => imageFileRef.current?.click()}
                  className="btn-secondary w-full py-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                  Foto / Galerie
                </button>
                <input ref={imageFileRef} type="file" accept="image/*" capture="environment"
                  className="hidden" onChange={handleImageFile} />

                {/* Bild-URL manuell */}
                <input
                  type="url"
                  className="input py-2 text-sm"
                  placeholder="oder Bild-URL einfügen"
                  value={form.imageUrl.startsWith('data:') ? '' : form.imageUrl}
                  onChange={e => set('imageUrl', e.target.value)}
                />

                {/* Foto aus Produktdatenbank suchen */}
                <button
                  type="button"
                  disabled={!form.name.trim() || imageSearching}
                  onClick={handleImageSearch}
                  className="btn-secondary w-full py-2 text-sm disabled:opacity-40"
                >
                  {imageSearching ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Suche…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
                      </svg>
                      Foto aus Datenbank suchen
                    </span>
                  )}
                </button>

                {/* Bild entfernen */}
                {form.imageUrl && (
                  <button type="button" onClick={() => set('imageUrl', '')}
                    className="text-xs text-red-400 hover:text-red-600 dark:text-red-400 transition-colors">
                    Bild entfernen
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Bildsuchergebnisse ─────────────────────────────── */}
          {imageResults.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Bild auswählen:</p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {imageResults.map((r, i) => (
                  <div key={i} className="flex-none w-20 text-center">
                    <button
                      type="button"
                      onClick={() => selectSearchImage(r.fullUrl)}
                      title={[r.brand, r.name].filter(Boolean).join(' – ')}
                      className="w-20 h-20 rounded-xl border-2 border-transparent hover:border-green-400 active:border-green-500 overflow-hidden bg-gray-50 dark:bg-gray-800 transition-all shadow-sm block"
                    >
                      <img src={r.thumbUrl} alt={r.name} className="w-full h-full object-contain" loading="lazy" />
                    </button>
                    {r.brand && (
                      <p className="text-[10px] text-gray-400 truncate mt-1 leading-tight">{r.brand}</p>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setImageResults([])}
                className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-300 mt-1.5 transition-colors"
              >
                Schließen
              </button>
            </div>
          )}
          {imageSearchDone && imageResults.length === 0 && (
            <p className="text-xs text-gray-400 text-center -mt-2 pb-1">
              Kein Bild gefunden – bitte manuell hochladen oder URL einfügen.
            </p>
          )}

          {/* ── Name + Hersteller ───────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Gewürz *</label>
              <div className="relative">
                <input
                  ref={nameRef}
                  type="text"
                  className="input"
                  placeholder="Name eingeben…"
                  value={form.name}
                  onChange={handleNameChange}
                  onBlur={() => { suggestionTimeout.current = setTimeout(() => setShowSuggestions(false), 150) }}
                  autoComplete="off"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 mt-1 max-h-48 overflow-y-auto"
                    onMouseDown={() => clearTimeout(suggestionTimeout.current)}
                  >
                    {suggestions.map(s => (
                      <button key={s} type="button"
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 dark:bg-green-900/30 transition-colors first:rounded-t-xl last:rounded-b-xl"
                        onClick={() => { set('name', s); setShowSuggestions(false) }}
                      >{s}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-2">
              <label className="label">Hersteller / Marke</label>
              <input
                type="text"
                className="input"
                placeholder="z.B. Ostmann, Edora, Fuchs…"
                value={form.brand}
                onChange={e => set('brand', e.target.value)}
              />
            </div>
          </div>

          {/* ── Verpackungstyp ──────────────────────────────────── */}
          <div>
            <label className="label">Verpackungstyp *</label>
            <div className="grid grid-cols-2 gap-2">
              {PACKAGING_TYPES.map(t => {
                const col = PACKAGING_COLORS[t.id]
                const active = form.packagingType === t.id
                return (
                  <button key={t.id} type="button" onClick={() => set('packagingType', t.id)}
                    className={`rounded-xl p-3 text-left transition-all border-2 ${
                      active ? `${col.bg} ${col.text} border-current` : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                    }`}>
                    <div className="font-semibold text-sm">{t.label}</div>
                    <div className="text-xs mt-0.5 opacity-70 leading-tight">{t.description}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Mengen ──────────────────────────────────────────── */}
          <div className="space-y-3">
            {showGrams && (
              <div>
                <label className="label">
                  {form.packagingType === 'fertigstreuer' ? 'Gramm pro Packung *' : 'Menge in Gramm *'}
                </label>
                <div className="relative">
                  <input
                    ref={gramsRef}
                    type="number"
                    className={`input pr-10 ${lookupStatus === 'found-no-weight' ? 'ring-2 ring-blue-400' : ''}`}
                    placeholder="z.B. 25"
                    min="0" step="0.1"
                    value={form.amountGrams}
                    onChange={e => set('amountGrams', e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">g</span>
                </div>
              </div>
            )}
            {showUnits && (
              <div>
                <label className="label">
                  {form.packagingType === 'fertigstreuer' ? 'Anzahl Einheiten *' :
                   form.packagingType === 'ganz' ? 'Stückzahl *' : 'Anzahl Streuer *'}
                </label>
                <input type="number" className="input" placeholder="z.B. 2"
                  min="0" step="1" value={form.units}
                  onChange={e => set('units', e.target.value)} />
              </div>
            )}
          </div>

          {/* ── MHD ─────────────────────────────────────────────── */}
          <div>
            <label className="label">Mindesthaltbarkeitsdatum</label>
            <input type="date" className="input" value={form.expiryDate}
              onChange={e => set('expiryDate', e.target.value)} />
          </div>

          {/* ── Füllstand ───────────────────────────────────────── */}
          <div>
            <label className="label">Füllstand</label>
            <div className="flex gap-2">
              {[4, 3, 2, 1, 0].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => set('fillLevel', lvl)}
                  className={`flex-1 py-2.5 rounded-xl flex flex-col items-center gap-1.5 border-2 transition-all ${
                    form.fillLevel === lvl
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                      : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <FillBar level={lvl} />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium leading-none">
                    {FILL_LABELS[lvl]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Barcode ─────────────────────────────────────────── */}
          <div>
            <label className="label">Barcode (optional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="EAN/Barcode-Nummer"
                value={form.barcode}
                onChange={e => set('barcode', e.target.value)}
                inputMode="numeric"
              />
              <button type="button" onClick={() => setShowScanner(true)}
                className="btn-secondary py-3 px-3 flex-none" title="Barcode scannen">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M3 9V6a1 1 0 011-1h3M3 15v3a1 1 0 001 1h3m11-13h3a1 1 0 011 1v3m-4 11h3a1 1 0 001-1v-3" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="7" y1="7" x2="7" y2="17" strokeWidth="2"/>
                  <line x1="10" y1="7" x2="10" y2="17" strokeWidth="1.5"/>
                  <line x1="13" y1="7" x2="13" y2="17" strokeWidth="2.5"/>
                  <line x1="16" y1="7" x2="16" y2="17" strokeWidth="1.5"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ── Lagerort ────────────────────────────────────────── */}
          {locations.length > 0 && (
            <div>
              <label className="label">Lagerort (optional)</label>
              <select
                className="input"
                value={form.locationId}
                onChange={e => set('locationId', e.target.value)}
              >
                <option value="">— Kein Lagerort —</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* ── Kategorie ───────────────────────────────────────── */}
          {categories.length > 0 && (
            <div>
              <label className="label">Kategorie (optional)</label>
              <select
                className="input"
                value={form.category}
                onChange={e => set('category', e.target.value)}
              >
                <option value="">— Keine Kategorie —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* ── Notizen ─────────────────────────────────────────── */}
          <div>
            <label className="label">Notizen (optional)</label>
            <textarea className="input resize-none" rows={2}
              placeholder="Zusätzliche Informationen…"
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          {/* ── Lookup-Status ───────────────────────────────────── */}
          {lookupStatus === 'found' && (
            <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              Produkt gefunden – alle Felder ausgefüllt. Bitte prüfen.
            </div>
          )}
          {lookupStatus === 'found-no-weight' && (
            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
              Produkt gefunden, aber kein Gewicht in der Datenbank – bitte von der Packung ablesen.
            </div>
          )}
          {lookupStatus === 'notfound' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              Produkt nicht in Datenbank – Barcode gespeichert, bitte Felder manuell ausfüllen.
            </div>
          )}

          {/* ── Fehler ──────────────────────────────────────────── */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          {/* ── Buttons ─────────────────────────────────────────── */}
          <div className="flex gap-3 pt-2 pb-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
            <button type="submit" className="btn-primary flex-1">{isEdit ? 'Speichern' : 'Hinzufügen'}</button>
          </div>
        </form>
      </div>

      {showScanner && (
        <BarcodeScanner
          onDetected={(barcode, productData) => {
            set('barcode', barcode)
            if (productData) {
              if (productData.name)          set('name', productData.name)
              if (productData.brand)         set('brand', productData.brand)
              if (productData.imageUrl)      set('imageUrl', productData.imageUrl)
              if (productData.packagingType) set('packagingType', productData.packagingType)
              if (productData.amountGrams)   set('amountGrams', String(productData.amountGrams))
              if (productData.units)         set('units', String(productData.units))
              setLookupStatus(productData.weightMissing ? 'found-no-weight' : 'found')
              if (productData.weightMissing) setTimeout(() => gramsRef.current?.focus(), 100)
            } else {
              setLookupStatus('notfound')
            }
            setShowScanner(false)
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  )
}
