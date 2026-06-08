import { useMemo, useState } from 'react'
import useStore from '../store/useStore'
import { buildCookPlan } from '../utils/recipeParser'
import { formatMhdDate, getMhdStatus, MHD_STYLES } from '../utils/mhd'
import FillBar, { FILL_LABELS } from './FillBar'

// Menge/Einheit am Zeilenanfang entfernen → sauberer Einkaufs-Name
function cleanName(s) {
  return (s || '')
    .replace(/^optional:\s*/i, '')
    .replace(/^\s*[\d¼½¾⅓⅔/.,]+\s*/, '')
    .replace(/^(g|kg|ml|l|tl|el|prise[n]?|stangen?|zehen?|knolle[n]?|stück|bund|dose[n]?|pck\.?)\s+/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
}

// Zeigt für eine Zutatenliste, welche Gewürze aus dem Bestand passen,
// welches Glas zuerst (MHD/Füllstand), und was im Bestand fehlt (→ Einkauf).
export default function CookPlan({ ingredients }) {
  const { spices, locations, addShoppingItem } = useStore()
  const [added, setAdded] = useState(new Set())
  const plan = useMemo(() => buildCookPlan(ingredients ?? [], spices), [ingredients, spices])
  const locName = id => locations.find(l => l.id === id)?.name ?? null

  // Fehlende Gewürze: sauberer Name, ohne Duplikate
  const missing = useMemo(() => {
    const seen = new Set()
    const out = []
    ;(plan.unmatched ?? []).forEach(raw => {
      const name = cleanName(raw)
      const key = name.toLowerCase()
      if (name && !seen.has(key)) { seen.add(key); out.push(name) }
    })
    return out
  }, [plan])

  function addMissing(name) {
    addShoppingItem(name, '', true)
    setAdded(a => new Set(a).add(name.toLowerCase()))
  }

  if (plan.matched.length === 0 && missing.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-2">
        Keine deiner Gewürze in diesem Rezept erkannt.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {plan.matched.map((m, idx) => (
        <div key={idx} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3">
          <div className="flex items-center gap-2 mb-2">
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
                      {sp.form && (
                        <span className="text-[10px] font-medium rounded-full px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                          {sp.form === 'ganz' ? 'ganz' : 'gemahlen'}
                        </span>
                      )}
                      {sp.brand && <span className="text-xs text-gray-400">· {sp.brand}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {loc && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {loc}
                        </span>
                      )}
                      {mhd.status !== 'none' && (
                        <span className={`text-xs font-semibold rounded-full px-1.5 py-0.5 ${mhdStyle.bg} ${mhdStyle.text}`}>
                          {mhd.status === 'expired' ? '⚠ ' : ''}{formatMhdDate(sp.expiryDate)}
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
          {m.jars.length > 1 && (
            <p className="text-xs text-gray-400 mt-1.5">Reicht das erste Glas nicht, nimm das nächste.</p>
          )}
        </div>
      ))}

      {/* Fehlt im Bestand → Einkauf */}
      {missing.length > 0 && (
        <div className="rounded-xl border border-dashed border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/15 p-3">
          <p className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wide mb-2">
            Fehlt im Bestand
          </p>
          <div className="space-y-1.5">
            {missing.map(name => {
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
