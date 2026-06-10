import { useState, useMemo, useRef } from 'react'
import { useFreezer, CATEGORIES } from './store'
import FreezerForm from './FreezerForm'
import QuickAddBar from './QuickAddBar'
import StorageSettings from './StorageSettings'

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.round((new Date(dateStr).getTime() - Date.now()) / (1000*60*60*24))
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
  const { storages, items, consumePortion, removeItem, toggleRestock, seedDemoData, clear, resetSetup,
          formOpen, formPrefill, openForm, closeForm } = useFreezer()
  const [tab, setTab] = useState('drawers') // drawers | expiry
  const [activeStorageId, setActiveStorageId] = useState(storages[0]?.id)
  const [showSettings, setShowSettings] = useState(false)

  const activeStorage = storages.find(s => s.id === activeStorageId) || storages[0]
  const drawersOfActive = activeStorage?.compartments || []

  const byCompartment = useMemo(() => {
    const map = Object.fromEntries(drawersOfActive.map(c => [c.id, []]))
    items.filter(it => it.storageId === activeStorage?.id).forEach(it => {
      (map[it.compartmentId] ||= []).push(it)
    })
    Object.values(map).forEach(arr => arr.sort((a,b) => new Date(a.expiryDate) - new Date(b.expiryDate)))
    return map
  }, [drawersOfActive, items, activeStorage])

  const byExpiry = useMemo(
    () => [...items].sort((a,b) => new Date(a.expiryDate) - new Date(b.expiryDate)),
    [items]
  )
  const totalPortions = items.reduce((s,i) => s + i.portions, 0)

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-sky-50/50 dark:bg-gray-900">
      <div className="bg-gradient-to-br from-sky-500 to-sky-700 text-white px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">❄️ Tiefkühl</h2>
            <p className="text-sky-100 text-sm">
              {items.length} Eintrag{items.length === 1 ? '' : 'e'} · {totalPortions} Portionen · {storages.length} Schrank{storages.length===1?'':'e'}
            </p>
          </div>
          <button onClick={() => setShowSettings(true)}
            className="bg-white/20 hover:bg-white/30 rounded-full p-2 text-lg" title="Schränke verwalten">⚙️</button>
        </div>
      </div>

      <QuickAddBar />

      {/* Sub-Tabs */}
      <div className="flex gap-2 px-4 py-3">
        {['drawers','expiry'].map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === t ? 'bg-sky-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300'
            }`}
          >{t === 'drawers' ? '🗃️ Schränke' : '⏰ Was muss weg?'}</button>
        ))}
      </div>

      {items.length === 0 && (
        <div className="m-4 p-5 rounded-2xl bg-white dark:bg-gray-800 text-center">
          <p className="text-gray-700 dark:text-gray-200 font-medium">Noch nichts im TK.</p>
          <p className="text-xs text-gray-400 mt-1 mb-3">Lade Demodaten oder leg den ersten Eintrag an.</p>
          <button onClick={seedDemoData}
            className="bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-xl">🎲 Demodaten laden</button>
        </div>
      )}

      {/* Schubladen-Ansicht (pro Storage) */}
      {tab === 'drawers' && (
        <>
          {/* Storage-Switcher */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-3">
            {storages.map(s => {
              const count = items.filter(it => it.storageId === s.id).length
              const active = activeStorage?.id === s.id
              return (
                <button key={s.id}
                  onClick={() => setActiveStorageId(s.id)}
                  className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    active ? 'bg-sky-700 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <span>{s.emoji}</span>
                  <span>{s.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/30' : 'bg-gray-100 dark:bg-gray-700'}`}>{count}</span>
                </button>
              )
            })}
          </div>

          {activeStorage && (
            <div className="px-4 space-y-3">
              {drawersOfActive.map(c => (
                <div key={c.id} className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-gray-800 dark:text-gray-100">{c.label}</div>
                    <button
                      onClick={() => openForm({ storageId: activeStorage.id, compartmentId: c.id })}
                      className="text-xs bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-semibold px-2.5 py-1 rounded-full"
                    >+ Eintrag</button>
                  </div>
                  {(byCompartment[c.id] || []).length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Leer</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {byCompartment[c.id].map(it => <ItemRow key={it.id} item={it} onConsume={consumePortion} onRemove={removeItem} onRestock={toggleRestock} />)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Expiry-Ansicht */}
      {tab === 'expiry' && items.length > 0 && (
        <div className="px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm">
            <ul className="space-y-1.5">
              {byExpiry.map(it => {
                const st = storages.find(s => s.id === it.storageId)
                const c = st?.compartments.find(c => c.id === it.compartmentId)
                return <ItemRow key={it.id} item={it} onConsume={consumePortion} onRemove={removeItem} onRestock={toggleRestock}
                  location={`${st?.emoji || ''} ${c?.label || ''}`} />
              })}
            </ul>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="px-4 pt-4 text-center space-x-3">
          <button onClick={() => { if (confirm('Alle TK-Einträge löschen?')) clear() }}
            className="text-xs text-gray-400 hover:text-red-500">🗑️ Items zurücksetzen</button>
          <button onClick={() => { if (confirm('Schränke + Inhalte komplett zurücksetzen?')) resetSetup() }}
            className="text-xs text-gray-400 hover:text-red-500">↺ Komplett-Reset</button>
        </div>
      )}

      {formOpen && (
        <FreezerForm prefilled={formPrefill} onClose={closeForm} />
      )}
      {showSettings && (
        <StorageSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

function ItemRow({ item, onConsume, onRemove, onRestock, location }) {
  const badge = expiryBadge(item)
  const [touchX, setTouchX] = useState(null)
  const [dx, setDx] = useState(0)

  function onTouchStart(e)  { setTouchX(e.touches[0].clientX); setDx(0) }
  function onTouchMove(e)   { if (touchX !== null) setDx(e.touches[0].clientX - touchX) }
  function onTouchEnd()     {
    if (dx < -70) { onConsume(item.id) } // Swipe links → -1 Portion
    setTouchX(null); setDx(0)
  }

  const swipeBg = dx < -20 ? 'bg-sky-100 dark:bg-sky-900/40' : ''

  return (
    <li className={`relative overflow-hidden rounded-lg ${swipeBg}`}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="flex items-center gap-2 py-1.5"
        style={{ transform: dx < 0 ? `translateX(${Math.max(dx, -80)}px)` : 'none', transition: touchX===null ? 'transform 0.2s' : 'none' }}>
        {item.photoData && <img src={item.photoData} className="w-9 h-9 rounded object-cover flex-none" alt="" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800 dark:text-gray-100 truncate">{item.name}</span>
            <span className="text-xs text-gray-400">{catLabel(item.category)}</span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
            <span>{item.portions}× {item.portionSize || 'Portion'}</span>
            <span>eingefr. {item.frozenAt}</span>
            {location && <span>📦 {location}</span>}
            {badge && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.text}</span>}
            {item.needsRestock && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded">🛒 nachkaufen</span>}
          </div>
        </div>
        <button onClick={() => onRestock?.(item.id)}
          className={`flex-none text-xs font-semibold px-2 py-1 rounded-full ${
            item.needsRestock ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
          }`}
          title="In Einkaufsliste">🛒</button>
        <button onClick={() => onConsume(item.id)}
          className="flex-none text-xs bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-semibold px-2.5 py-1 rounded-full"
          title="Eine Portion verbraucht">−1</button>
        <button onClick={() => { if (confirm('Eintrag löschen?')) onRemove(item.id) }}
          className="flex-none text-gray-300 hover:text-red-500 px-1" title="Löschen">✕</button>
      </div>
    </li>
  )
}
