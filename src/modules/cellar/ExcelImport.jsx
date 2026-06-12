import { useState } from 'react'
import * as XLSX from 'xlsx'
import { useCellar } from './store'
import { TARGETS, autoMapColumns, looksLikeHeader, rowToWine } from './excelMapping'

export default function ExcelImport({ onClose }) {
  const { racks, addBottle } = useCellar()
  const [step, setStep] = useState('pick')   // pick | sheet | map | confirm
  const [error, setError] = useState('')
  const [wb, setWb] = useState(null)
  const [sheetName, setSheetName] = useState('')
  const [rawRows, setRawRows] = useState([])
  const [hasHeader, setHasHeader] = useState(true)
  const [mapping, setMapping] = useState([])
  const [targetRackId, setTargetRackId] = useState(racks[0]?.id)

  async function handleFile(e) {
    setError('')
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const book = XLSX.read(buf, { type: 'array' })
      setWb(book)
      const first = book.SheetNames[0]
      setSheetName(first)
      loadSheet(book, first)
      setStep('sheet')
    } catch (err) {
      setError('Datei konnte nicht gelesen werden: ' + err.message)
    }
  }

  function loadSheet(book, name) {
    const ws = book.Sheets[name]
    const arr = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' })
    // Leere Spalten am Ende kappen
    const maxLen = arr.reduce((m, r) => Math.max(m, r.length), 0)
    const padded = arr.map(r => Array.from({ length: maxLen }, (_, i) => r[i] ?? ''))
    setRawRows(padded)
    // Header-Vermutung
    const header = padded[0] || []
    const samples = padded.slice(1, 6)
    const headerGuess = looksLikeHeader(header, samples)
    setHasHeader(headerGuess)
    proposeMapping(padded, headerGuess)
  }

  function proposeMapping(rows, withHeader) {
    const header = withHeader ? rows[0] : rows[0].map((_, i) => `Spalte ${i + 1}`)
    const dataRows = withHeader ? rows.slice(1) : rows
    setMapping(autoMapColumns(header, dataRows))
  }

  function changeSheet(name) {
    setSheetName(name)
    loadSheet(wb, name)
  }

  function changeHasHeader(v) {
    setHasHeader(v)
    proposeMapping(rawRows, v)
  }

  function changeMappingTarget(idx, target) {
    setMapping(m => m.map((c, i) => i === idx ? { ...c, target } : c))
  }

  const dataRows = hasHeader ? rawRows.slice(1) : rawRows
  const preview = dataRows.slice(0, 5).map(r => rowToWine(r, mapping))

  function doImport() {
    let n = 0
    const rack = racks.find(r => r.id === targetRackId)
    dataRows.forEach(r => {
      const w = rowToWine(r, mapping)
      if (!w.name) return
      addBottle({
        rackId: targetRackId,
        slot: w.slot || (rack?.slots[0] || ''),
        count: w.count || 1,
        ...w,
      })
      n++
    })
    alert(`✓ ${n} Wein${n===1?'':'e'} importiert`)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[55]" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-10 z-[60] bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl flex flex-col">
        <div className="flex justify-center pt-3"><div className="w-10 h-1.5 rounded-full bg-gray-200" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-bold">📥 Wein-Import aus Excel</h2>
          <button onClick={onClose} className="p-2">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 'pick' && (
            <div className="space-y-3 text-center py-10">
              <p className="text-6xl">📑</p>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">.xlsx oder .csv hochladen</h3>
              <p className="text-sm text-gray-500 dark:text-gray-300 max-w-md mx-auto">
                Egal wie deine Excel aufgebaut ist – wir versuchen, die Spalten automatisch zu erkennen.
                Beim nächsten Schritt kannst du alle Zuordnungen prüfen und korrigieren.
              </p>
              <label className="inline-block">
                <span className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer inline-block">
                  Datei auswählen
                </span>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              </label>
              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>
          )}

          {step !== 'pick' && (
            <div className="space-y-4">
              {/* Sheet-Wahl */}
              {wb?.SheetNames?.length > 1 && (
                <div>
                  <label className="label">Arbeitsblatt</label>
                  <select className="input text-sm" value={sheetName} onChange={e => changeSheet(e.target.value)}>
                    {wb.SheetNames.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
              )}

              {/* Header-Frage */}
              <label className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 rounded-xl text-sm">
                <input type="checkbox" checked={hasHeader} onChange={e => changeHasHeader(e.target.checked)} />
                Erste Zeile enthält Spaltennamen
                <span className="text-[10px] text-gray-400 ml-auto">{rawRows.length} Zeilen gelesen</span>
              </label>

              {/* Mapping-Tabelle */}
              <div>
                <p className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-2">Spalten zuordnen</p>
                <p className="text-[11px] text-gray-400 mb-2">
                  Wir haben automatisch zugeordnet – bitte prüfen und ggf. korrigieren. Spalten ohne Zuordnung werden ignoriert.
                </p>
                <div className="space-y-2">
                  {mapping.map((m, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{m.header || `Spalte ${i+1}`}</span>
                        <select value={m.target} onChange={e => changeMappingTarget(i, e.target.value)}
                          className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1">
                          {TARGETS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                      </div>
                      {m.samples.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                          <span className="font-bold uppercase">Beispiele:</span>
                          {m.samples.map((s, k) => (
                            <span key={k} className="bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded">{String(s)}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Vorschau */}
              <div>
                <p className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-2">Vorschau (erste 5 Zeilen)</p>
                <div className="space-y-1.5">
                  {preview.map((w, i) => (
                    <div key={i} className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-2 text-xs">
                      <p className="font-bold text-gray-800 dark:text-gray-100">
                        {w.name || <span className="text-red-600">⚠️ Kein Name</span>}
                        {w.vintage && <span className="text-gray-400 font-normal"> {w.vintage}</span>}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300">
                        {w.winery && `${w.winery} · `}{w.region}{w.grape && ` · ${w.grape}`}{w.color && ` · ${w.color}`}
                        {w.alcoholFree && ' · 🚫 alkoholfrei'}
                        {w.count > 1 && ` · ${w.count}×`}
                        {w.priceEur != null && ` · ${w.priceEur} €`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ziel-Regal */}
              <div>
                <label className="label">Welches Regal nutzen für nicht zugeordnete Flaschen?</label>
                <div className="flex flex-wrap gap-1.5">
                  {racks.map(r => (
                    <button key={r.id} onClick={() => setTargetRackId(r.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        targetRackId === r.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>{r.emoji} {r.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {step !== 'pick' && (
          <div className="border-t px-5 py-3 flex gap-2">
            <button onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={doImport} className="btn-primary flex-1">
              {dataRows.length} importieren
            </button>
          </div>
        )}
      </div>
    </>
  )
}
