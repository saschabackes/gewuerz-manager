// Zentrale Einkaufsliste – aggregiert aus allen Modulen.
// Gewürze:  Supabase-Store (shoppingItems) – Quelle der Wahrheit aus produktiver App
// Tiefkühl: LocalStorage  (items mit needsRestock)
// Wein:     LocalStorage  (bottles mit restock)

import { useState } from 'react'
import useStore from '../../store/useStore'
import { useFreezer } from '../freezer/store'
import { useCellar } from '../cellar/store'

export default function UnifiedShoppingList() {
  const spicesShop  = useStore(s => s.shoppingItems || [])
  const removeSpiceShopping = useStore(s => s.deleteShoppingItem)

  const freezerItems = useFreezer(s => s.items)
  const toggleFreezerRestock = useFreezer(s => s.toggleRestock)

  const cellarBottles = useCellar(s => s.bottles)
  const toggleCellarRestock = useCellar(s => s.toggleRestock)

  const [tab, setTab] = useState('open') // open | done

  const tkRestock = freezerItems.filter(i => i.needsRestock)
  const wnRestock = cellarBottles.filter(b => b.restock)
  const totalItems = spicesShop.length + tkRestock.length + wnRestock.length

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-emerald-50/30 dark:bg-gray-900">
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white px-5 py-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">🛒 Einkaufsliste</h2>
        <p className="text-emerald-100 text-sm">
          {totalItems} Position{totalItems===1?'':'en'} – Gewürze, Tiefkühl & Wein
        </p>
      </div>

      {totalItems === 0 && (
        <div className="m-4 p-6 rounded-2xl bg-white dark:bg-gray-800 text-center">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-gray-700 dark:text-gray-200 font-medium">Alles im Bestand!</p>
          <p className="text-xs text-gray-400 mt-1">Markiere in TK oder Weinkeller etwas zum Nachkaufen, dann landet es hier.</p>
        </div>
      )}

      {/* Gewürze (Supabase) */}
      {spicesShop.length > 0 && (
        <Section title="🌿 Gewürze" count={spicesShop.length} hint="Synchron mit dem Haushalt (Supabase)">
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {spicesShop.map(it => (
              <li key={it.id} className="py-2.5 flex items-center gap-2">
                <span className="text-lg">🌿</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-100">{it.name}</p>
                  {it.brand && <p className="text-xs text-gray-400">{it.brand}</p>}
                </div>
                <button onClick={() => removeSpiceShopping?.(it.id)}
                  className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold px-2.5 py-1 rounded-full">
                  ✓ gekauft
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Tiefkühl */}
      {tkRestock.length > 0 && (
        <Section title="❄️ Tiefkühl" count={tkRestock.length} hint="Im Prototyp lokal gespeichert">
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {tkRestock.map(it => (
              <li key={it.id} className="py-2.5 flex items-center gap-2">
                {it.photoData
                  ? <img src={it.photoData} alt="" className="w-8 h-8 rounded object-cover" />
                  : <span className="text-lg">❄️</span>}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{it.name}</p>
                  <p className="text-xs text-gray-400">
                    {it.portions ? `${it.portions}× ${it.portionSize || 'Portion'}` : ''}
                    {it.note && ` · ${it.note}`}
                  </p>
                </div>
                <button onClick={() => toggleFreezerRestock(it.id)}
                  className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold px-2.5 py-1 rounded-full">
                  ✓ gekauft
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Wein */}
      {wnRestock.length > 0 && (
        <Section title="🍷 Wein" count={wnRestock.length} hint="Im Prototyp lokal gespeichert">
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {wnRestock.map(b => (
              <li key={b.id} className="py-2.5 flex items-center gap-2">
                {b.photoData
                  ? <img src={b.photoData} alt="" className="w-8 h-10 rounded object-cover" />
                  : <span className="text-lg">{b.color === 'weiß' ? '🥂' : b.color === 'schaum' ? '🍾' : b.color === 'rosé' ? '🌸' : '🍷'}</span>}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                    {b.name} <span className="text-xs text-gray-400 font-normal">{b.vintage}</span>
                    {b.alcoholFree && <span className="ml-1.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded">🚫 0%</span>}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {b.winery}{b.region && ` · ${b.region}`}
                    {b.priceEur != null && ` · ${b.priceEur.toFixed(2)} €`}
                  </p>
                </div>
                <button onClick={() => toggleCellarRestock(b.id)}
                  className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold px-2.5 py-1 rounded-full">
                  ✓ gekauft
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="px-4 pt-4 text-center text-xs text-gray-400">
        Du kannst Positionen im jeweiligen Modul hinzufügen: ❄️ TK → 🛒-Icon · 🍷 Wein → „+ nachkaufen" in der Detailansicht
      </div>
    </div>
  )
}

function Section({ title, count, hint, children }) {
  return (
    <div className="m-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{title}</p>
          {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
        </div>
        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="px-4">{children}</div>
    </div>
  )
}
