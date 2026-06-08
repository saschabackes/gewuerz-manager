import { useMemo } from 'react'
import useStore from '../store/useStore'
import { buildCookPlan } from '../utils/recipeParser'
import { formatMhdDate, getMhdStatus, MHD_STYLES } from '../utils/mhd'
import FillBar, { FILL_LABELS } from './FillBar'

// Zeigt für eine Zutatenliste, welche Gewürze aus dem Bestand passen
// und welches Glas zuerst zu nehmen ist (ältestes MHD → leerster → kleinste).
export default function CookPlan({ ingredients }) {
  const { spices, locations } = useStore()
  const plan = useMemo(() => buildCookPlan(ingredients ?? [], spices), [ingredients, spices])
  const locName = id => locations.find(l => l.id === id)?.name ?? null

  if (plan.matched.length === 0) {
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
    </div>
  )
}
