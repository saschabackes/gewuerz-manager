import { useState, useMemo, useRef } from 'react'
import { useFreezer, CATEGORIES } from './store'
import FreezerForm from './FreezerForm'
import FreezerSetup from './FreezerSetup'
import QuickAddBar from './QuickAddBar'
import StorageSettings from './StorageSettings'
import ExcelImport from './ExcelImport'
import SubTabs from '../../components/SubTabs'
import SelectionBar from '../../components/SelectionBar'

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
  const { storages, items, consumePortion, removeItem, toggleRestock,
          setupDone, completeSetup, formOpen, formPrefill, openForm, closeForm,
          bulkDeleteItems, updateItem } = useFreezer()
  const [tab, setTab] = useState('bestand')
  const [activeStorageId, setActiveStorageId] = useState(storages[0]?.id)
  const [showSettings, setShowSettings] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [editingItem, setEditingItem] = useState(null)

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

  if (!setupDone) {
    return <FreezerSetup onComplete={completeSetup} />
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">❄️ Tiefkühl</p>
            <p className="text-xs text-gray-400">
              {items.length} Eintrag{items.length === 1 ? '' : 'e'} · {totalPortions} Portionen · {storages.length} Schrank{storages.length===1?'':'e'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setSelectMode(m => !m); setSelected(new Set()) }}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                selectMode ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {selectMode ? 'Fertig' : 'Auswählen'}
            </button>
            <button onClick={() => setShowImport(true)}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-2 text-lg" title="Excel-Import">📥</button>
            <button onClick={() => setShowSettings(true)}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-2 text-lg" title="Schränke verwalten">⚙️</button>
          </div>
        </div>
      </div>

      <SubTabs
        tabs={[
          { id: 'bestand', label: '📦 Bestand' },
          { id: 'ablauf',  label: '⏰ Ablauf' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <QuickAddBar />

      {items.length === 0 && (
        <div className="m-4 p-5 rounded-2xl bg-white dark:bg-gray-800 text-center">
          <p className="text-3xl mb-2">❄️</p>
          <p className="text-gray-700 dark:text-gray-200 font-medium">Noch nichts im TK.</p>
          <p className="text-xs text-gray-400 mt-1">Tippe auf + um den ersten Eintrag anzulegen.</p>
        </div>
      )}

      {/* Schubladen-Ansicht (pro Storage) */}
      {tab === 'bestand' && (
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
                    active ? 'bg-primary-700 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
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
                      className="text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-semibold px-2.5 py-1 rounded-full"
                    >+ Eintrag</button>
                  </div>
                  {(byCompartment[c.id] || []).length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Leer</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {byCompartment[c.id].map(it => <ItemRow key={it.id} item={it} onConsume={consumePortion} onRemove={removeItem} onRestock={toggleRestock} onEdit={() => setEditingItem(it)}
                        selectMode={selectMode} isSelected={selected.has(it.id)} onToggleSelect={() => setSelected(prev => { const next = new Set(prev); next.has(it.id) ? next.delete(it.id) : next.add(it.id); return next })} />)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Expiry-Ansicht */}
      {tab === 'ablauf' && items.length > 0 && (
        <div className="px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm">
            <ul className="space-y-1.5">
              {byExpiry.map(it => {
                const st = storages.find(s => s.id === it.storageId)
                const c = st?.compartments.find(c => c.id === it.compartmentId)
                return <ItemRow key={it.id} item={it} onConsume={consumePortion} onRemove={removeItem} onRestock={toggleRestock} onEdit={() => setEditingItem(it)}
                  location={`${st?.emoji || ''} ${c?.label || ''}`}
                  selectMode={selectMode} isSelected={selected.has(it.id)} onToggleSelect={() => setSelected(prev => { const next = new Set(prev); next.has(it.id) ? next.delete(it.id) : next.add(it.id); return next })} />
              })}
            </ul>
          </div>
        </div>
      )}



      {formOpen && (
        <FreezerForm prefilled={formPrefill} onClose={closeForm} />
      )}
      {showSettings && (
        <StorageSettings onClose={() => setShowSettings(false)} />
      )}
      {showImport && (
        <ExcelImport onClose={() => setShowImport(false)} />
      )}
      {editingItem && (
        <FreezerEditSheet item={editingItem} storages={storages} onClose={() => setEditingItem(null)}
          onSave={(patch) => { updateItem(editingItem.id, patch); setEditingItem(null) }} />
      )}

      {selectMode && (
        <SelectionBar
          count={selected.size}
          onDelete={() => { bulkDeleteItems([...selected]); setSelected(new Set()); setSelectMode(false) }}
          onCancel={() => { setSelected(new Set()); setSelectMode(false) }}
        />
      )}
    </div>
  )
}

function ItemRow({ item, onConsume, onRemove, onRestock, onEdit, location, selectMode, isSelected, onToggleSelect }) {
  const badge = expiryBadge(item)
  const [touchX, setTouchX] = useState(null)
  const [dx, setDx] = useState(0)

  function onTouchStart(e)  { if (selectMode) return; setTouchX(e.touches[0].clientX); setDx(0) }
  function onTouchMove(e)   { if (touchX !== null) setDx(e.touches[0].clientX - touchX) }
  function onTouchEnd()     {
    if (dx < -70) { onConsume(item.id) }
    setTouchX(null); setDx(0)
  }

  const swipeBg = dx < -20 ? 'bg-primary-100 dark:bg-primary-900/40' : ''

  return (
    <li className={`relative overflow-hidden rounded-lg ${swipeBg}`}
        onClick={selectMode ? onToggleSelect : undefined}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="flex items-center gap-2 py-1.5"
        style={{ transform: dx < 0 ? `translateX(${Math.max(dx, -80)}px)` : 'none', transition: touchX===null ? 'transform 0.2s' : 'none' }}>
        {selectMode && (
          <div className={`flex-none w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            isSelected ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300 dark:border-gray-600'
          }`}>
            {isSelected && <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
        )}
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
        {!selectMode && <>
          <button onClick={() => onEdit?.()} className="flex-none text-gray-400 hover:text-gray-600 px-1" title="Bearbeiten">✎</button>
          <button onClick={() => onRestock?.(item.id)}
            className={`flex-none text-xs font-semibold px-2 py-1 rounded-full ${
              item.needsRestock ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
            }`}
            title="In Einkaufsliste">🛒</button>
          <button onClick={() => onConsume(item.id)}
            className="flex-none text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-semibold px-2.5 py-1 rounded-full"
            title="Eine Portion verbraucht">−1</button>
          <button onClick={() => { if (confirm('Eintrag löschen?')) onRemove(item.id) }}
            className="flex-none text-gray-300 hover:text-red-500 px-1" title="Löschen">✕</button>
        </>}
      </div>
    </li>
  )
}

function FreezerEditSheet({ item, storages, onClose, onSave }) {
  const [name, setName] = useState(item.name)
  const [category, setCategory] = useState(item.category)
  const [storageId, setStorageId] = useState(item.storageId)
  const [compartmentId, setCompartmentId] = useState(item.compartmentId)
  const [portions, setPortions] = useState(item.portions)
  const [portionSize, setPortionSize] = useState(item.portionSize || '')
  const [note, setNote] = useState(item.note || '')

  const storage = storages.find(s => s.id === storageId)
  const compartments = storage?.compartments || []

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-center pt-3"><div className="w-10 h-1.5 rounded-full bg-gray-200" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-lg font-bold">✎ Eintrag bearbeiten</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input text-sm" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Kategorie</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    category === c.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>{c.emoji} {c.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Portionen</label>
              <input type="number" min="1" className="input text-sm" value={portions} onChange={e => setPortions(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Portionsgröße</label>
              <input className="input text-sm" value={portionSize} onChange={e => setPortionSize(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">📦 Lagerort</label>
            <div className="flex flex-wrap gap-1.5">
              {storages.map(s => (
                <button key={s.id} type="button"
                  onClick={() => { setStorageId(s.id); setCompartmentId(s.compartments[0]?.id) }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold ${
                    storageId === s.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>{s.emoji} {s.label}</button>
              ))}
            </div>
            {compartments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {compartments.map(c => (
                  <button key={c.id} type="button" onClick={() => setCompartmentId(c.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      compartmentId === c.id ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>{c.label}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label">Notiz</label>
            <input className="input text-sm" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2 pb-4">
            <button onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={() => onSave({ name, category, storageId, compartmentId, portions, portionSize, note })}
              className="btn-primary flex-1">Speichern</button>
          </div>
        </div>
      </div>
    </>
  )
}
