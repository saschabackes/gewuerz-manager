import { useState } from 'react'
import useStore from '../store/useStore'
import { parseRecipeText, buildCookPlan } from '../utils/recipeParser'
import { formatMhdDate, getMhdStatus, MHD_STYLES } from '../utils/mhd'
import FillBar, { FILL_LABELS } from './FillBar'

export default function CookView({ onClose }) {
  const { spices, locations, addShoppingItem } = useStore()
  const [text, setText]       = useState('')
  const [plan, setPlan]       = useState(null)   // { matched, unmatched }
  const [dismissed, setDismissed] = useState(new Set())  // ignorierte Rezeptzeilen
  const [added, setAdded]     = useState(new Set())      // auf Einkauf gesetzt

  function locName(id) {
    return locations.find(l => l.id === id)?.name ?? null
  }

  function evaluate() {
    const ingredients = parseRecipeText(text)
    setPlan(buildCookPlan(ingredients, spices))
    setDismissed(new Set())
  }

  function reset() {
    setText('')
    setPlan(null)
    setDismissed(new Set())
    setAdded(new Set())
  }

  const visibleMatched = plan ? plan.matched.filter(m => !dismissed.has(m.recipeName)) : []

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-enter" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl sheet-enter max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="text-xl">🍲</span> Kochen
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 pb-safe">
          {!plan ? (
            /* ── Eingabe ── */
            <>
              <div className="bg-sky-50 dark:bg-sky-950/40 rounded-2xl px-4 py-3 mb-4">
                <p className="text-sm text-sky-800 dark:text-sky-200 leading-relaxed">
                  Füge die Zutatenliste deines Rezepts ein (z.B. aus Cookidoo oder einer Website kopiert).
                  Der Gewürz-Manager sucht heraus, welche deiner Gewürze du verwenden kannst – und welches Glas zuerst.
                </p>
              </div>
              <textarea
                className="input resize-none text-sm font-mono"
                rows={12}
                placeholder={'Zutaten hier einfügen…\n\nz.B.\nSalz\n10 Prisen\n\nPfeffer\n6 Prisen'}
                value={text}
                onChange={e => setText(e.target.value)}
              />
              <button
                onClick={evaluate}
                disabled={!text.trim()}
                className="btn-primary w-full mt-4 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Rezept auswerten
              </button>
            </>
          ) : (
            /* ── Ergebnis ── */
            <>
              {visibleMatched.length === 0 && (
                <div className="text-center py-10">
                  <div className="text-5xl mb-3">🤔</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Keine deiner Gewürze im Rezept erkannt.
                  </p>
                </div>
              )}

              {visibleMatched.map((m, idx) => (
                <div key={idx} className="card p-4 mb-3">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100">{m.recipeName}</h3>
                      {m.amount && (
                        <span className="text-xs text-gray-400">Rezept: {m.amount}</span>
                      )}
                    </div>
                    <button
                      onClick={() => setDismissed(d => new Set(d).add(m.recipeName))}
                      className="text-xs text-gray-400 hover:text-red-500 flex-none px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      title="Nicht mein Gewürz"
                    >
                      ✕ ignorieren
                    </button>
                  </div>

                  <div className="space-y-2">
                    {m.jars.map((sp, j) => {
                      const loc = locName(sp.locationId)
                      const mhd = getMhdStatus(sp.expiryDate)
                      const mhdStyle = MHD_STYLES[mhd.status]
                      return (
                        <div
                          key={sp.id}
                          className={`rounded-xl px-3 py-2.5 flex items-center gap-3 border ${
                            j === 0
                              ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                              : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {j === 0 && (
                                <span className="text-xs bg-green-600 text-white font-bold rounded-full px-2 py-0.5">zuerst</span>
                              )}
                              <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{sp.name}</span>
                              {sp.brand && <span className="text-xs text-gray-400">· {sp.brand}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                    <p className="text-xs text-gray-400 mt-2">
                      Reicht das erste Glas nicht, nimm das nächste in dieser Reihenfolge.
                    </p>
                  )}
                </div>
              ))}

              {/* Nicht zugeordnete Zutaten */}
              {plan.unmatched.length > 0 && (
                <details className="card p-4 mb-3">
                  <summary className="text-sm font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">
                    {plan.unmatched.length} weitere Zutaten (nicht in deiner Sammlung)
                  </summary>
                  <div className="mt-3 space-y-1.5">
                    {plan.unmatched.map((name, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{name}</span>
                        <button
                          onClick={() => { addShoppingItem(name, '', true); setAdded(a => new Set(a).add(name)) }}
                          disabled={added.has(name)}
                          className="text-xs font-semibold text-green-600 dark:text-green-400 px-2 py-1 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors disabled:opacity-40"
                        >
                          {added.has(name) ? '✓ Einkauf' : '+ Einkauf'}
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Tipp: Falls ein Gewürz hier auftaucht, das du eigentlich hast, prüfe die Schreibweise in deiner Sammlung.
                  </p>
                </details>
              )}

              <button onClick={reset} className="btn-secondary w-full mt-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Neues Rezept
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
