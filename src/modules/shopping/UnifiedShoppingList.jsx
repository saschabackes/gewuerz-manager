// Zentrale Einkaufsliste – inkl. Einräumen-Queue
import useStore from '../../store/useStore'
import { useFreezer } from '../freezer/store'
import { useCellar } from '../cellar/store'

export default function UnifiedShoppingList() {
  const spicesShop  = useStore(s => s.shoppingItems || [])
  const removeSpiceShopping = useStore(s => s.deleteShoppingItem)

  const freezerItems   = useFreezer(s => s.items)
  const freezerPending = useFreezer(s => s.pending)
  const markBoughtTK   = useFreezer(s => s.markBought)
  const openTKForm     = useFreezer(s => s.openForm)
  const removeTKPend   = useFreezer(s => s.removePending)

  const cellarBottles  = useCellar(s => s.bottles)
  const cellarPending  = useCellar(s => s.pending)
  const markBoughtWine = useCellar(s => s.markBought)
  const openCellarForm = useCellar(s => s.openForm)
  const removeWnPend   = useCellar(s => s.removePending)

  const tkRestock = freezerItems.filter(i => i.needsRestock)
  const wnRestock = cellarBottles.filter(b => b.restock)
  const openToShop = spicesShop.length + tkRestock.length + wnRestock.length
  const openToStore = freezerPending.length + cellarPending.length

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">🛒 Einkaufsliste</p>
        <p className="text-xs text-gray-400">
          {openToShop} einzukaufen · {openToStore} einzuräumen
        </p>
      </div>

      {openToShop + openToStore === 0 && (
        <div className="m-4 p-6 rounded-2xl bg-white dark:bg-gray-800 text-center">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-gray-700 dark:text-gray-200 font-medium">Alles im Bestand!</p>
        </div>
      )}

      {/* ── Einräumen-Queue (priorisiert oben) ─────────────────────────── */}
      {openToStore > 0 && (
        <Section title="📦 Einräumen" count={openToStore} hint="Frisch eingekauft – nur noch ablegen" accent>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {freezerPending.map(p => (
              <li key={p.id} className="py-2.5 flex items-center gap-2">
                {p.photoData
                  ? <img src={p.photoData} alt="" className="w-9 h-9 rounded object-cover" />
                  : <span className="text-lg">❄️</span>}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{p.name}</p>
                  <p className="text-[10px] text-gray-400">Tiefkühl{p.portionSize ? ` · ${p.portionSize}` : ''}</p>
                </div>
                <button onClick={() => openTKForm({ pendingId: p.id, name: p.name, category: p.category, portionSize: p.portionSize, storageId: p.storageId, compartmentId: p.compartmentId, photoData: p.photoData })}
                  className="text-xs bg-indigo-600 text-white font-semibold px-3 py-1.5 rounded-full">
                  📦 Einräumen
                </button>
                <button onClick={() => removeTKPend(p.id)}
                  className="text-gray-300 hover:text-red-500 px-1">✕</button>
              </li>
            ))}
            {cellarPending.map(p => (
              <li key={p.id} className="py-2.5 flex items-center gap-2">
                {p.photoData
                  ? <img src={p.photoData} alt="" className="w-8 h-10 rounded object-cover" />
                  : <span className="text-lg">{p.color === 'weiß' ? '🥂' : p.color === 'schaum' ? '🍾' : p.color === 'rosé' ? '🌸' : '🍷'}</span>}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                    {p.name} {p.vintage && <span className="text-xs text-gray-400">{p.vintage}</span>}
                  </p>
                  <p className="text-[10px] text-gray-400">Wein{p.winery ? ` · ${p.winery}` : ''}</p>
                </div>
                <button onClick={() => openCellarForm({ pendingId: p.id, fromBottleId: p.fromBottleId,
                  name: p.name, winery: p.winery, vintage: p.vintage, region: p.region, country: p.country,
                  grape: p.grape, color: p.color, alcoholFree: p.alcoholFree,
                  drinkFrom: p.drinkFrom, drinkUntil: p.drinkUntil,
                  rackId: p.rackId, slot: p.slot, photoData: p.photoData })}
                  className="text-xs bg-indigo-600 text-white font-semibold px-3 py-1.5 rounded-full">
                  📦 Einräumen
                </button>
                <button onClick={() => removeWnPend(p.id)}
                  className="text-gray-300 hover:text-red-500 px-1">✕</button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Gewürze (Supabase) ─────────────────────────────────────────── */}
      {spicesShop.length > 0 && (
        <Section title="🌿 Gewürze einkaufen" count={spicesShop.length} hint="Sync mit Haushalt (Supabase)">
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

      {/* ── TK ─────────────────────────────────────────────────────────── */}
      {tkRestock.length > 0 && (
        <Section title="❄️ Tiefkühl nachkaufen" count={tkRestock.length}>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {tkRestock.map(it => (
              <li key={it.id} className="py-2.5 flex items-center gap-2">
                {it.photoData
                  ? <img src={it.photoData} alt="" className="w-8 h-8 rounded object-cover" />
                  : <span className="text-lg">❄️</span>}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{it.name}</p>
                  <p className="text-xs text-gray-400">
                    {it.portionSize ? `~${it.portionSize}` : ''}
                  </p>
                </div>
                <button onClick={() => markBoughtTK(it.id)}
                  className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold px-2.5 py-1 rounded-full">
                  ✓ gekauft
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ── Wein ───────────────────────────────────────────────────────── */}
      {wnRestock.length > 0 && (
        <Section title="🍷 Wein nachkaufen" count={wnRestock.length}>
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
                <button onClick={() => markBoughtWine(b.id)}
                  className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold px-2.5 py-1 rounded-full">
                  ✓ gekauft
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(openToShop > 0 || openToStore > 0) && (
        <div className="px-4 pt-4 text-center text-xs text-gray-400">
          ✓ gekauft = wandert in „Einräumen" – dort öffnet sich das vorausgefüllte Formular für den richtigen Lagerplatz.
        </div>
      )}
    </div>
  )
}

function Section({ title, count, hint, accent, children }) {
  return (
    <div className={`m-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden ${accent ? 'ring-2 ring-indigo-500/40' : ''}`}>
      <div className={`px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between ${accent ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
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
