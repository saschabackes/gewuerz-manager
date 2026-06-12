import { useState } from 'react'
import useStore from '../../store/useStore'
import { useFreezer } from '../../modules/freezer/store'
import { useCellar } from '../../modules/cellar/store'

// ── Datensicherung ────────────────────────────────────────────────────────────

function ExportSection() {
  const { exportData, spices, categories, locations, household } = useStore()
  const freezerItems = useFreezer(s => s.items)
  const freezerStorages = useFreezer(s => s.storages)
  const cellarBottles = useCellar(s => s.bottles)
  const cellarRacks = useCellar(s => s.racks)
  const [done, setDone] = useState(false)

  function handleExport() {
    const spiceData = exportData()
    const data = {
      exportedAt: new Date().toISOString(),
      version: 2,
      haushalt: household?.name ?? '',
      modules: {
        spices: {
          kategorien: spiceData.kategorien,
          lagerorte: spiceData.lagerorte,
          gewuerze: spiceData.gewuerze,
        },
        freezer: {
          storages: freezerStorages.map(s => ({
            label: s.label,
            emoji: s.emoji,
            compartments: s.compartments.map(c => ({ label: c.label })),
          })),
          items: freezerItems.map(it => ({
            name: it.name,
            category: it.category ?? null,
            portions: it.portions ?? null,
            portionSize: it.portionSize ?? null,
            frozenAt: it.frozenAt ?? null,
            expiryDate: it.expiryDate ?? null,
            note: it.note ?? null,
            needsRestock: it.needsRestock ?? false,
          })),
        },
        cellar: {
          racks: cellarRacks.map(r => ({
            label: r.label,
            emoji: r.emoji,
            slots: r.slots,
            conditions: r.conditions ?? null,
          })),
          bottles: cellarBottles.map(b => ({
            name: b.name,
            winery: b.winery ?? null,
            vintage: b.vintage ?? null,
            region: b.region ?? null,
            country: b.country ?? null,
            grape: b.grape ?? null,
            color: b.color ?? null,
            sweetness: b.sweetness ?? null,
            wineType: b.wineType ?? null,
            alcohol: b.alcohol ?? null,
            alcoholFree: b.alcoholFree ?? false,
            classification: b.classification ?? null,
            drinkFrom: b.drinkFrom ?? null,
            drinkUntil: b.drinkUntil ?? null,
            price: b.price ?? null,
            retailer: b.retailer ?? null,
            note: b.note ?? null,
            rating: b.rating ?? null,
            restock: b.restock ?? false,
          })),
        },
      },
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `haushalt-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDone(true)
    setTimeout(() => setDone(false), 3000)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-gray-100">Datensicherung</h3>
      </div>

      <div className="card px-4 py-3">
        <div className="space-y-1 mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            <span className="font-semibold">{spices.length}</span> <span className="text-gray-400">Gewürze</span>
            {categories.length > 0 && <span className="text-gray-400"> · {categories.length} Kategorien</span>}
            {locations.length  > 0 && <span className="text-gray-400"> · {locations.length} Lagerorte</span>}
          </p>
          {freezerItems.length > 0 && (
            <p className="text-sm text-gray-700 dark:text-gray-200">
              <span className="font-semibold">{freezerItems.length}</span> <span className="text-gray-400">Tiefkühl-Einträge · {freezerStorages.length} Schränke</span>
            </p>
          )}
          {cellarBottles.length > 0 && (
            <p className="text-sm text-gray-700 dark:text-gray-200">
              <span className="font-semibold">{cellarBottles.length}</span> <span className="text-gray-400">Flaschen · {cellarRacks.length} Lagerorte</span>
            </p>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Haushalt „{household?.name ?? '…'}" · alle Module · JSON-Datei
        </p>
        <button
          onClick={handleExport}
          className={`w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold transition-colors ${
            done
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {done ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Exportiert
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Komplettes Backup exportieren
            </>
          )}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          Tipp: Einmal pro Woche exportieren als Backup
        </p>
      </div>
    </div>
  )
}


export default ExportSection
