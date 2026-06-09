import { useState, useMemo } from 'react'
import { useFreezer, CATEGORIES } from './store'
import FreezerForm from './FreezerForm'

function daysUntil(dateStr) {
  if (!dateStr) return null
  const ms = new Date(dateStr).getTime() - Date.now()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function expiryBadge(item) {
  const d = daysUntil(item.expiryDate)
  if (d === null) return null
  if (d < 0)   return { text: `${-d} T überfällig`, cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }
  if (d <= 14) return { text: `noch ${d} T`,        cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' }
  if (d <= 60) return { text: `noch ${d} T`,        cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' }
  return            { text: `noch ${d} T`,        cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
}

function catLabel(id) {
  const c = CATEGORIES.find(c => c.id === id)
  return c ? `${c.emoji} ${c.label}` : id
}

export default function FreezerView() {
  const { drawers, items, consumePortion, removeItem, seedDemoData, clear } = useFreezer()
  const [tab, setTab] = useState('drawers') // drawers | expiry
  const [showForm, setShowForm] = useState(false)
  const [prefilledDrawer, setPrefilledDrawer] = useState(null)

  const byDrawer = useMemo(() => {
    const map = Object.fromEntries(drawers.map(d => [d.id, []]))
    items.forEach(it => { (map[it.drawerId] ||= []).push(it) })
    Object.values(map).forEach(arr => arr.sort((a,b) => new Date(a.expiryDate) - new Date(b.expiryDate)))
    return map
  }, [drawers, items])

  const byExpiry = useMemo(
    () => [...items].sort((a,b) => new Date(a.expiryDate) - new Date(b.expiryDate)),
    [items]
  )

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-sky-50/50 dark:bg-gray-900">
      <div className="bg-gradient-to-br from-sky-500 to-sky-700 text-white px-5 py-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">❄️ Tiefkühl</h2>
        <p className="text-sky-100 text-sm">
          {items.length} Eintrag{items.length === 1 ? '' : 'e'}, {items.reduce((s,i)=>s+i.portions,0)} Portionen
        </p>
      </div>

      {/* Sub-Tabs */}
      <div className="flex gap-2 px-4 py-3">
        {['drawers','expiry'].map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === t
                ? 'bg-sky-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300'
            }`}
          >
            {t === 'drawers' ? '🗃️ Schubladen' : '⏰ Was muss weg?'}
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <div className="m-4 p-5 rounded-2xl bg-white dark:bg-gray-800 text-center">
          <p className="text-gray-700 dark:text-gray-200 font-medium">Noch nichts im TK.</p>
          <p className="text-xs text-gray-400 mt-1 mb-3">Lade Demodaten oder leg den ersten Eintrag an.</p>
          <button onClick={seedDemoData}
            className="bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-xl">
            🎲 Demodaten laden
          </button>
        </div>
      )}

      {/* Schubladen-Ansicht */}
      {tab === 'drawers' && (
        <div className="px-4 space-y-3">
          {drawers.map(d => (
            <div key={d.id} className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-gray-800 dark:text-gray-100">{d.label}</div>
                <button
                  onClick={() => { setPrefilledDrawer(d.id); setShowForm(true) }}
                  className="text-xs bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-semibold px-2.5 py-1 rounded-full"
                >+ Eintrag</button>
              </div>
              {(byDrawer[d.id] || []).length === 0 ? (
                <p className="text-xs text-gray-400 italic">Leer</p>
              ) : (
                <ul className="space-y-1.5">
                  {byDrawer[d.id].map(it => <ItemRow key={it.id} item={it} onConsume={consumePortion} onRemove={removeItem} />)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ablauf-Ansicht */}
      {tab === 'expiry' && items.length > 0 && (
        <div className="px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm">
            <ul className="space-y-1.5">
              {byExpiry.map(it => <ItemRow key={it.id} item={it} onConsume={consumePortion} onRemove={removeItem} showDrawer />)}
            </ul>
          </div>
        </div>
      )}

      {/* Float-Button */}
      <button
        onClick={() => { setPrefilledDrawer(null); setShowForm(true) }}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-sky-600 text-white text-3xl shadow-xl active:bg-sky-700"
        aria-label="Eintrag hinzufügen"
      >+</button>

      {items.length > 0 && (
        <div className="px-4 pt-4 text-center">
          <button onClick={() => { if (confirm('Alle TK-Einträge im Prototyp löschen?')) clear() }}
            className="text-xs text-gray-400 hover:text-red-500">
            🗑️ Prototyp-Daten zurücksetzen
          </button>
        </div>
      )}

      {showForm && (
        <FreezerForm
          drawers={drawers}
          prefilledDrawer={prefilledDrawer}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

function ItemRow({ item, onConsume, onRemove, showDrawer }) {
  const badge = expiryBadge(item)
  return (
    <li className="flex items-center gap-2 py-1.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800 dark:text-gray-100 truncate">{item.name}</span>
          <span className="text-xs text-gray-400">{catLabel(item.category)}</span>
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
          <span>{item.portions}× {item.portionSize || 'Portion'}</span>
          <span>eingefr. {item.frozenAt}</span>
          {showDrawer && <span>📦 {item.drawerId}</span>}
          {badge && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.text}</span>}
        </div>
      </div>
      <button onClick={() => onConsume(item.id)}
        className="flex-none text-xs bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-semibold px-2.5 py-1 rounded-full"
        title="Eine Portion verbraucht">−1</button>
      <button onClick={() => { if (confirm('Eintrag löschen?')) onRemove(item.id) }}
        className="flex-none text-gray-300 hover:text-red-500 px-1"
        title="Löschen">✕</button>
    </li>
  )
}
