import { useState, useMemo } from 'react'
import { useCellar, drinkStatus } from './store'
import { DISH_CATEGORIES, rankWinesForDish, detectDishes, dishById } from './pairing'

const COLOR_EMOJI = { rot: '🍷', weiß: '🥂', rosé: '🌸', schaum: '🍾' }

export default function PairingFinder({ onOpenWine }) {
  const bottles = useCellar(s => s.bottles)
  const racks   = useCellar(s => s.racks)
  const inStock = bottles.filter(b => b.count > 0)
  const [selected, setSelected]   = useState(null) // dish id
  const [query, setQuery]         = useState('')
  const [onlyDrink, setOnlyDrink] = useState(true)

  // Quick-Filter: häufige Dishes oben
  const QUICK = ['rind_lamm','geflügel','fisch_zart','pasta_tomate','pizza','käse_hart','aperitif','dessert_fruit']

  const detected = useMemo(() => detectDishes(query), [query])
  const activeDishes = selected ? [selected] : detected

  const results = useMemo(() => {
    if (activeDishes.length === 0) return null
    // Pro Wein das Maximum über alle erkannten Dishes
    const map = new Map()
    activeDishes.forEach(did => {
      rankWinesForDish(inStock, did, { onlyInDrinkWindow: onlyDrink }).forEach(r => {
        const cur = map.get(r.wine.id)
        if (!cur || cur.score < r.score) map.set(r.wine.id, { ...r, dishId: did })
      })
    })
    return [...map.values()].sort((a,b) => b.score - a.score)
  }, [activeDishes, inStock, onlyDrink])

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Eingabe */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm">
        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2">🍽️ Welcher Wein passt zu meinem Essen?</p>
        <input
          className="input text-sm"
          placeholder='z.B. "Sonntagsbraten mit Rotkohl"'
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null) }}
        />
        {detected.length > 0 && !selected && (
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5">
            ✓ erkannt: {detected.map(id => dishById(id)?.label).join(', ')}
          </p>
        )}

        <p className="text-[10px] text-gray-400 font-bold uppercase mt-3 mb-1">Oder direkt wählen</p>
        <div className="flex flex-wrap gap-1.5">
          {DISH_CATEGORIES.filter(d => QUICK.includes(d.id)).map(d => (
            <button key={d.id}
              onClick={() => { setSelected(d.id === selected ? null : d.id); setQuery('') }}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                selected === d.id ? 'bg-rose-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>{d.emoji} {d.label}</button>
          ))}
        </div>
        <details className="mt-2">
          <summary className="text-[11px] text-gray-400 cursor-pointer">+ alle Kategorien</summary>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {DISH_CATEGORIES.filter(d => !QUICK.includes(d.id)).map(d => (
              <button key={d.id}
                onClick={() => { setSelected(d.id === selected ? null : d.id); setQuery('') }}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  selected === d.id ? 'bg-rose-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>{d.emoji} {d.label}</button>
            ))}
          </div>
        </details>

        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 mt-3">
          <input type="checkbox" checked={onlyDrink} onChange={e => setOnlyDrink(e.target.checked)} />
          Nur Weine im aktuellen Trinkfenster
        </label>
      </div>

      {/* Ergebnisse */}
      {results === null && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 text-center">
          <p className="text-3xl mb-2">🍷</p>
          <p className="text-sm text-gray-500 dark:text-gray-300">Wähle ein Gericht oder tippe ein, was du heute kochst.</p>
        </div>
      )}

      {results && results.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 text-center">
          <p className="text-3xl mb-2">🤔</p>
          <p className="text-sm text-gray-500 dark:text-gray-300">Kein passender Wein im Bestand – Trinkfenster-Filter probieren?</p>
        </div>
      )}

      {results && results.length > 0 && (
        <p className="text-xs text-gray-400 px-1">{results.length} Wein{results.length===1?'':'e'} im Bestand passt{results.length===1?'':'en'}</p>
      )}

      {results?.map(({ wine, score, checks, marked, dishId }) => {
        const rack = racks.find(r => r.id === wine.rackId)
        const status = drinkStatus(wine)
        return (
          <button key={wine.id} onClick={() => onOpenWine(wine.id)}
            className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm active:scale-[0.99] transition-transform">
            <div className="flex items-start gap-3">
              {wine.photoData
                ? <img src={wine.photoData} alt="" className="w-12 h-16 rounded object-cover flex-none" />
                : <div className="text-3xl flex-none w-12 text-center">{COLOR_EMOJI[wine.color] || '🍷'}</div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{wine.name} <span className="text-xs text-gray-400 font-normal">{wine.vintage}</span></p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{wine.winery}{wine.region && ` · ${wine.region}`}</p>
                  </div>
                  <ScoreBadge score={score} marked={marked} />
                </div>

                {/* Begründung */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {checks?.slice(0,4).map((c,i) => (
                    <span key={i}
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        c.ok
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                      }`}>{c.ok ? '✓' : '·'} {c.k}: {c.got}</span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                    {rack?.emoji} {rack?.label} · {wine.slot || '—'} · {wine.count}×
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${status.cls}`}>{status.label}</span>
                  {wine.rating > 0 && <span className="text-[10px]">{'⭐'.repeat(wine.rating)}</span>}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ScoreBadge({ score, marked }) {
  const color =
    score >= 80 ? 'bg-emerald-600' :
    score >= 60 ? 'bg-lime-500' :
    score >= 40 ? 'bg-amber-500' : 'bg-gray-400'
  return (
    <div className={`${color} text-white text-xs font-bold rounded-full w-12 h-12 flex flex-col items-center justify-center flex-none`}>
      <span className="text-sm leading-none">{score}</span>
      <span className="text-[9px] opacity-90 leading-none">{marked ? '★' : 'Match'}</span>
    </div>
  )
}
