import { useMemo, useState } from 'react'
import useStore from '../store/useStore'
import { useFreezer } from '../modules/freezer/store'
import { useCellar } from '../modules/cellar/store'
import { computeRecipeAvailability } from '../utils/inventoryMatch'
import { formatMhdDate, getMhdStatus, MHD_STYLES } from '../utils/mhd'
import FillBar, { FILL_LABELS } from './FillBar'

export default function InventoryCheck({ ingredients }) {
  const spices = useStore(s => s.spices)
  const locations = useStore(s => s.locations)
  const addShoppingItem = useStore(s => s.addShoppingItem)
  const freezerItems = useFreezer(s => s.items)
  const bottles = useCellar(s => s.bottles)

  const [added, setAdded] = useState(new Set())
  const [expanded, setExpanded] = useState(true)

  const result = useMemo(() => {
    const r = computeRecipeAvailability({ ingredients }, spices, freezerItems, bottles)
    return { spicePlan: r.spicePlan, freezerMatches: r.freezerMatches, wineMatches: r.wineMatches, missing: r.missing, totalFound: r.totalFound, totalMissing: r.totalMissing }
  }, [ingredients, spices, freezerItems, bottles])

  const locName = id => locations.find(l => l.id === id)?.name ?? null

  function addMissing(name) {
    addShoppingItem(name, '', true)
    setAdded(a => new Set(a).add(name.toLowerCase()))
  }

  function addAllMissing() {
    result.missing.forEach(name => {
      if (!added.has(name.toLowerCase())) {
        addShoppingItem(name, '', true)
      }
    })
    setAdded(new Set(result.missing.map(n => n.toLowerCase())))
  }

  const hasAny = result.totalFound > 0 || result.totalMissing > 0

  if (!hasAny) {
    return (
      <p className="text-sm text-gray-400 py-2">
        Keine Zutaten im Bestand erkannt.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {result.totalFound > 0 && (
          <span className="text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full px-2.5 py-1">
            ✓ {result.totalFound} vorhanden
          </span>
        )}
        {result.totalMissing > 0 && (
          <span className="text-xs font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full px-2.5 py-1">
            ✗ {result.totalMissing} fehlt
          </span>
        )}
      </div>

      {/* Spice matches */}
      {result.spicePlan.matched.map((m, idx) => (
        <div key={'sp' + idx} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">🌿</span>
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{m.recipeName}</span>
          </div>
          <div className="space-y-1.5">
            {m.jars.map((sp, j) => {
              const loc = locName(sp.locationId)
              const mhd = getMhdStatus(sp.expiryDate)
              const mhdStyle = MHD_STYLES[mhd.status]
              return (
                <div key={sp.id}
                  className={`rounded-lg px-3 py-2 flex items-center gap-3 ${
                    j === 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700'
                            : 'bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {j === 0 && <span className="text-[10px] bg-green-600 text-white font-bold rounded-full px-1.5 py-0.5">zuerst</span>}
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{sp.name}</span>
                      {sp.brand && <span className="text-xs text-gray-400">· {sp.brand}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {loc && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
                          📦 {loc}
                        </span>
                      )}
                      {mhd.status !== 'none' && (
                        <span className={`text-xs font-semibold rounded-full px-1.5 py-0.5 ${mhdStyle.bg} ${mhdStyle.text}`}>
                          {formatMhdDate(sp.expiryDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-none flex flex-col items-center gap-0.5">
                    <FillBar level={sp.fillLevel ?? 4} />
                    <span className="text-[10px] text-gray-400">{FILL_LABELS[sp.fillLevel ?? 4]}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Freezer matches */}
      {result.freezerMatches.map((m, idx) => (
        <div key={'tk' + idx} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">❄️</span>
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{m.recipeName}</span>
          </div>
          <div className="space-y-1.5">
            {m.items.map(item => (
              <div key={item.id} className="rounded-lg px-3 py-2 bg-sky-50 dark:bg-sky-900/20 border border-sky-300 dark:border-sky-700 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.name}</span>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                    <span>{item.portions}× {item.portionSize || 'Portion'}</span>
                  </div>
                </div>
                <span className="text-[10px] bg-sky-600 text-white font-bold rounded-full px-1.5 py-0.5">TK</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Wine matches */}
      {result.wineMatches.map((m, idx) => (
        <div key={'wn' + idx} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">🍷</span>
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{m.recipeName}</span>
          </div>
          <div className="space-y-1.5">
            {m.bottles.map(b => (
              <div key={b.id} className="rounded-lg px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{b.name}</span>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {b.grape && <span>{b.grape} · </span>}
                    <span>{b.vintage}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                  b.color === 'rot' ? 'bg-red-600 text-white' :
                  b.color === 'weiß' ? 'bg-amber-500 text-white' :
                  'bg-pink-500 text-white'
                }`}>{b.color === 'rot' ? 'Rot' : b.color === 'weiß' ? 'Weiß' : 'Rosé'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Missing → shopping */}
      {result.missing.length > 0 && (
        <div className="rounded-xl border border-dashed border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/15 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wide">
              Fehlt im Bestand
            </p>
            {result.missing.length > 1 && (
              <button
                onClick={addAllMissing}
                disabled={result.missing.every(n => added.has(n.toLowerCase()))}
                className="text-[11px] font-semibold rounded-lg px-2 py-1 bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
              >
                Alle auf Einkaufsliste
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {result.missing.map(name => {
              const done = added.has(name.toLowerCase())
              return (
                <div key={name} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-200">{name}</span>
                  <button
                    onClick={() => addMissing(name)}
                    disabled={done}
                    className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 transition-colors flex-none ${
                      done
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {done ? '✓ Einkauf' : '+ Einkauf'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
