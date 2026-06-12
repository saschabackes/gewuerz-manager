import { useState } from 'react'
import * as XLSX from 'xlsx'
import { useFreezer, CATEGORIES, autoCategory } from './store'
import { TARGETS, autoMapColumns, looksLikeHeader, rowToItem } from './excelMapping'

export default function ExcelImport({ onClose }) {
  const { storages, addItem } = useFreezer()
  const [step, setStep] = useState('pick')
  const [error, setError] = useState('')
  const [wb, setWb] = useState(null)
  const [sheetName, setSheetName] = useState('')
  const [rawRows, setRawRows] = useState([])
  const [hasHeader, setHasHeader] = useState(true)
  const [mapping, setMapping] = useState([])
  const [targetStorageId, setTargetStorageId] = useState(storages[0]?.id)
  const [targetCompartmentId, setTargetCompartmentId] = useState(storages[0]?.compartments[0]?.id)

  const targetStorage = storages.find(s => s.id === targetStorageId)

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
      setStep('map')
    } catch (err) {
      setError('Datei konnte nicht gelesen werden: ' + err.message)
    }
  }

  function loadSheet(book, name) {
    const ws = book.Sheets[name]
    const arr = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' })
    const maxLen = arr.reduce((m, r) => Math.max(m, r.length), 0)
    const padded = arr.map(r => Array.from({ length: maxLen }, (_, i) => r[i] ?? ''))
    setRawRows(padded)
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
  const preview = dataRows.slice(0, 5).map(r => rowToItem(r, mapping))

  function doImport() {
    let n = 0
    const defaultCompartment = targetStorage?.compartments[0]?.id
    dataRows.forEach(r => {
      const item = rowToItem(r, mapping)
      if (!item.name) return

      let storageId = targetStorageId
      let compartmentId = targetCompartmentId || defaultCompartment
      if (item.storageLabel) {
        const match = storages.find(s => s.label.toLowerCase().includes(item.storageLabel.toLowerCase()))
        if (match) {
          storageId = match.id
          if (item.compartment) {
            const cm = match.compartments.find(c => c.label.toLowerCase().includes(item.compartment.toLowerCase()))
            if (cm) compartmentId = cm.id
          } else {
            compartmentId = match.compartments[0]?.id
          }
        }
      }

      const category = item.category || autoCategory(item.name)
      addItem({
        name: item.name,
        category,
        portions: item.portions,
        portionSize: item.portionSize,
        frozenAt: item.frozenAt || undefined,
        storageId,
        compartmentId,
        note: item.note,
      })
      n++
    })
    alert(`✓ ${n} Eintrag${n === 1 ? '' : 'e'} importiert`)
    onClose()
  }

  const catLabel = (id) => CATEGORIES.find(c => c.id === id)?.label || id

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[55]" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-10 z-[60] bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl flex flex-col">
        <div className="flex justify-center pt-3"><div className="w-10 h-1.5 rounded-full bg-gray-200" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">📥 TK-Import aus Excel</h2>
          <button onClick={onClose} className="p-2 text-gray-500">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 'pick' && (
            <div className="space-y-3 text-center py-10">
              <p className="text-6xl">📑</p>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">.xlsx oder .csv hochladen</h3>
              <p className="text-sm text-gray-500 dark:text-gray-300 max-w-md mx-auto">
                Lade eine Excel-Datei mit deinen TK-Einträgen hoch. Spalten werden automatisch erkannt —
                du kannst die Zuordnung im nächsten Schritt anpassen.
              </p>
              <label className="inline-block">
                <span className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer inline-block">
                  Datei auswählen
                </span>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              </label>
              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>
          )}

          {step === 'map' && (
            <div className="space-y-4">
              {wb?.SheetNames?.length > 1 && (
                <div>
                  <label className="label">Arbeitsblatt</label>
                  <select className="input text-sm" value={sheetName} onChange={e => changeSheet(e.target.value)}>
                    {wb.SheetNames.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 rounded-xl text-sm">
                <input type="checkbox" checked={hasHeader} onChange={e => changeHasHeader(e.target.checked)} />
                Erste Zeile enthält Spaltennamen
                <span className="text-[10px] text-gray-400 ml-auto">{rawRows.length} Zeilen gelesen</span>
              </label>

              <div>
                <p className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-2">Spalten zuordnen</p>
                <p className="text-[11px] text-gray-400 mb-2">
                  Automatisch zugeordnet — bitte prüfen und ggf. korrigieren.
                </p>
                <div className="space-y-2">
                  {mapping.map((m, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{m.header || `Spalte ${i + 1}`}</span>
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

              <div>
                <p className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-2">Vorschau (erste 5 Zeilen)</p>
                <div className="space-y-1.5">
                  {preview.map((item, i) => (
                    <div key={i} className="bg-sky-50 dark:bg-sky-900/30 rounded-lg p-2 text-xs">
                      <p className="font-bold text-gray-800 dark:text-gray-100">
                        {item.name || <span className="text-red-600">⚠️ Kein Name</span>}
                        {item.portions > 1 && <span className="text-gray-400 font-normal"> {item.portions}×</span>}
                        {item.portionSize && <span className="text-gray-400 font-normal"> {item.portionSize}</span>}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300">
                        {item.category && `${catLabel(item.category)} · `}
                        {item.frozenAt && `eingefr. ${item.frozenAt} · `}
                        {item.storageLabel && `📦 ${item.storageLabel} `}
                        {item.compartment && `/ ${item.compartment}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Standard-Gefrierschrank für nicht zugeordnete Einträge</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {storages.map(s => (
                    <button key={s.id} onClick={() => { setTargetStorageId(s.id); setTargetCompartmentId(s.compartments[0]?.id) }}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        targetStorageId === s.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>{s.emoji} {s.label}</button>
                  ))}
                </div>
                {targetStorage && (
                  <div className="flex flex-wrap gap-1.5">
                    {targetStorage.compartments.map(c => (
                      <button key={c.id} onClick={() => setTargetCompartmentId(c.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          targetCompartmentId === c.id ? 'bg-sky-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>{c.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {step === 'map' && (
          <div className="border-t dark:border-gray-700 px-5 py-3 flex gap-2">
            <button onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={doImport} className="btn-primary flex-1" style={{ backgroundColor: '#0D7377' }}>
              {dataRows.length} importieren
            </button>
          </div>
        )}
      </div>
    </>
  )
}
