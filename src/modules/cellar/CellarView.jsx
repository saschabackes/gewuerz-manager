import { useState, useMemo } from 'react'
import { useCellar, drinkStatus } from './store'
import CellarForm from './CellarForm'
import RackSettings from './RackSettings'
import WineDetail from './WineDetail'
import PairingFinder from './PairingFinder'
import ExcelImport from './ExcelImport'

const COLOR_EMOJI = { rot: '🍷', weiß: '🥂', rosé: '🌸', schaum: '🍾' }

export default function CellarView() {
  const { racks, bottles, drinkOne, removeBottle, seedDemoData, clear, resetSetup, recentNames, quickAddByName, lastUsedRack,
          formOpen, formPrefill, openForm, closeForm } = useCellar()
  const [tab, setTab] = useState('all') // all | drink-now | rack | memory | pairing
  const [memoryFilter, setMemoryFilter] = useState('all') // all | loved | stocked | empty
  const [activeRackId, setActiveRackId] = useState(racks[0]?.id)
  const [showSettings, setShowSettings] = useState(false)
  const [showImport, setShowImport]   = useState(false)
  const [hint, setHint] = useState('')
  const [detailId, setDetailId] = useState(null)
  const detailBottle = bottles.find(b => b.id === detailId)
  const [alcoholFilter, setAlcoholFilter] = useState('all') // all | alc | free

  const activeRack = racks.find(r => r.id === activeRackId) || racks[0]

  const filtered = useMemo(() => {
    let arr = bottles
    if (alcoholFilter === 'alc')  arr = arr.filter(b => !b.alcoholFree)
    if (alcoholFilter === 'free') arr = arr.filter(b => b.alcoholFree)
    if (tab === 'drink-now') {
      const y = new Date().getFullYear()
      return arr.filter(b => y >= b.drinkFrom && y <= b.drinkUntil && b.count > 0)
                .sort((a,b) => a.drinkUntil - b.drinkUntil)
    }
    if (tab === 'rack' && activeRack) {
      return arr.filter(b => b.rackId === activeRack.id && b.count > 0)
                .sort((a,b) => a.slot.localeCompare(b.slot))
    }
    // Standard "Alle": ausverkaufte ausblenden – diese leben in der Historie
    return arr.filter(b => b.count > 0).sort((a,b) => a.drinkUntil - b.drinkUntil)
  }, [bottles, tab, activeRack, alcoholFilter])

  // Erinnerungen: bewertet ODER mind. 1× getrunken (egal ob noch Bestand)
  const memories = useMemo(() => {
    let arr = bottles.filter(b => (b.rating > 0) || (b.history?.length > 0))
    if (alcoholFilter === 'alc')  arr = arr.filter(b => !b.alcoholFree)
    if (alcoholFilter === 'free') arr = arr.filter(b => b.alcoholFree)
    if (memoryFilter === 'loved')   arr = arr.filter(b => (b.rating || 0) >= 4)
    if (memoryFilter === 'stocked') arr = arr.filter(b => b.count > 0)
    if (memoryFilter === 'empty')   arr = arr.filter(b => b.count <= 0)
    const lastTasted = (b) => {
      const h = b.history || []
      return h.length ? new Date(h[h.length-1].date).getTime() : 0
    }
    return arr.sort((a,b) => {
      const r = (b.rating||0) - (a.rating||0)
      if (r !== 0) return r
      return lastTasted(b) - lastTasted(a)
    })
  }, [bottles, memoryFilter, alcoholFilter])

  const totalBottles = bottles.reduce((s, b) => s + b.count, 0)
  const lastRack = racks.find(r => r.id === lastUsedRack?.rackId)

  function quickAdd(name) {
    quickAddByName(name)
    setHint(`✓ +1 ${name} → ${lastRack?.emoji || ''} ${lastRack?.label || 'Default'}`)
    setTimeout(() => setHint(''), 2200)
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-rose-50/40 dark:bg-gray-900">
      <div className="bg-gradient-to-br from-rose-600 to-rose-800 text-white px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">🍷 Weinkeller</h2>
            <p className="text-rose-100 text-sm">
              {bottles.length} Position{bottles.length===1?'':'en'} · {totalBottles} Flaschen · {racks.length} Lager
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowImport(true)}
              className="bg-white/20 hover:bg-white/30 rounded-full p-2 text-lg" title="Excel-Import">📥</button>
            <button onClick={() => setShowSettings(true)}
              className="bg-white/20 hover:bg-white/30 rounded-full p-2 text-lg" title="Regale verwalten">⚙️</button>
          </div>
        </div>
      </div>

      {/* Quick-Add */}
      {recentNames.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-3 py-2.5 space-y-1">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <span className="flex-none text-[10px] text-gray-400 font-bold self-center pr-1">+1 IN {lastRack?.label?.toUpperCase() || 'DEFAULT'}:</span>
            {recentNames.slice(0,10).map(n => (
              <button key={n} onClick={() => quickAdd(n)}
                className="flex-none text-xs bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-semibold px-2.5 py-1 rounded-full active:scale-95">
                + {n}
              </button>
            ))}
          </div>
          {hint && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{hint}</p>}
        </div>
      )}

      <div className="flex gap-1.5 px-3 py-3 overflow-x-auto no-scrollbar">
        {[
          { id: 'all',       label: '🍷 Bestand' },
          { id: 'drink-now', label: '⭐ Jetzt' },
          { id: 'rack',      label: '🗄️ Regal' },
          { id: 'memory',    label: '💎 Probiert' },
          { id: 'pairing',   label: '🍽️ Pairing' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-none px-3.5 py-2 rounded-xl text-sm font-semibold ${
              tab === t.id ? 'bg-rose-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300'
            }`}>{t.label}</button>
        ))}
      </div>

      {tab !== 'pairing' && tab !== 'memory' && (
        <div className="flex gap-1.5 px-4 pb-2">
          {[
            { id: 'all',  label: 'Alle' },
            { id: 'alc',  label: '🍷 Mit Alkohol' },
            { id: 'free', label: '🚫 Alkoholfrei' },
          ].map(f => (
            <button key={f.id} onClick={() => setAlcoholFilter(f.id)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                alcoholFilter === f.id ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>{f.label}</button>
          ))}
        </div>
      )}

      {tab === 'memory' && (
        <div className="flex gap-1.5 px-4 pb-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all',     label: 'Alle probiert',  count: bottles.filter(b => b.rating > 0 || b.history?.length).length },
            { id: 'loved',   label: '⭐⭐⭐⭐+ Lieblinge', count: bottles.filter(b => (b.rating||0) >= 4).length },
            { id: 'stocked', label: 'Im Bestand',     count: bottles.filter(b => (b.rating > 0 || b.history?.length) && b.count > 0).length },
            { id: 'empty',   label: 'Ausgetrunken',   count: bottles.filter(b => (b.rating > 0 || b.history?.length) && b.count <= 0).length },
          ].map(f => (
            <button key={f.id} onClick={() => setMemoryFilter(f.id)}
              className={`flex-none text-xs font-semibold px-2.5 py-1 rounded-full ${
                memoryFilter === f.id ? 'bg-rose-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>
              {f.label} <span className="opacity-70">·{f.count}</span>
            </button>
          ))}
        </div>
      )}

      {tab === 'rack' && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 pb-3">
          {racks.map(r => {
            const count = bottles.filter(b => b.rackId === r.id).reduce((s,b)=>s+b.count,0)
            const active = activeRack?.id === r.id
            return (
              <button key={r.id} onClick={() => setActiveRackId(r.id)}
                className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                  active ? 'bg-rose-700 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}>
                <span>{r.emoji}</span><span>{r.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/30' : 'bg-gray-100 dark:bg-gray-700'}`}>{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {bottles.length === 0 && (
        <div className="m-4 p-5 rounded-2xl bg-white dark:bg-gray-800 text-center">
          <p className="text-gray-700 dark:text-gray-200 font-medium">Noch keine Flaschen.</p>
          <p className="text-xs text-gray-400 mt-1 mb-3">Demoflaschen laden oder eigene anlegen.</p>
          <button onClick={seedDemoData}
            className="bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-xl">🎲 Demoflaschen laden</button>
        </div>
      )}

      {tab === 'memory' && (
        <div className="px-4 space-y-2.5">
          {memories.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 text-center">
              <p className="text-3xl mb-2">💎</p>
              <p className="text-sm text-gray-500 dark:text-gray-300">
                Noch nichts probiert. Sobald du eine Flasche getrunken & bewertet hast, taucht sie hier auf – auch nach dem Ausverkauf.
              </p>
            </div>
          )}
          {memories.map(b => <MemoryCard key={b.id} b={b} racks={racks} onOpen={() => setDetailId(b.id)} onRestock={() => useCellar.getState().toggleRestock(b.id)} />)}
        </div>
      )}

      {tab !== 'pairing' && tab !== 'memory' && (
        <div className="px-4 space-y-2.5">
          {filtered.map(b => {
            const status = drinkStatus(b)
            const r = racks.find(r => r.id === b.rackId)
            return (
              <button key={b.id} onClick={() => setDetailId(b.id)}
                className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm active:scale-[0.99] transition-transform">
                <div className="flex items-start gap-3">
                  {b.photoData
                    ? <img src={b.photoData} alt="" className="w-12 h-16 rounded object-cover flex-none" />
                    : <div className="text-3xl flex-none w-12 text-center">{COLOR_EMOJI[b.color] || '🍷'}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800 dark:text-gray-100 truncate">{b.name}</span>
                      <span className="text-xs text-gray-400">{b.vintage}</span>
                      {b.rating > 0 && <span className="text-xs">{'⭐'.repeat(b.rating)}</span>}
                      {b.alcoholFree && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded">🚫 0%</span>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {b.winery && <span>{b.winery} · </span>}{b.region}{b.grape && <span> · {b.grape}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                        {r?.emoji} {r?.label || '—'} · {b.slot || '—'}
                      </span>
                      <span className="text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{b.count}× Bestand</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${status.cls}`}>{status.label}</span>
                      {b.restock && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">+ nachkaufen</span>}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {tab === 'pairing' && (
        <PairingFinder onOpenWine={(id) => setDetailId(id)} />
      )}

      {bottles.length > 0 && (
        <div className="px-4 pt-4 text-center space-x-3">
          <button onClick={() => { if (confirm('Alle Flaschen löschen?')) clear() }}
            className="text-xs text-gray-400 hover:text-red-500">🗑️ Items zurücksetzen</button>
          <button onClick={() => { if (confirm('Regale + Inhalte komplett zurücksetzen?')) resetSetup() }}
            className="text-xs text-gray-400 hover:text-red-500">↺ Komplett-Reset</button>
        </div>
      )}

      {formOpen && <CellarForm prefilled={formPrefill} onClose={closeForm} />}
      {showSettings && <RackSettings onClose={() => setShowSettings(false)} />}
      {showImport   && <ExcelImport  onClose={() => setShowImport(false)} />}

      {detailBottle && (
        <WineDetail
          bottle={detailBottle}
          onClose={() => setDetailId(null)}
          onOpenPairing={() => { setDetailId(null); setTab('pairing') }}
        />
      )}
    </div>
  )
}

// ── Memory-Card (für "💎 Probiert") ──────────────────────────────────────────
function MemoryCard({ b, racks, onOpen, onRestock }) {
  const COLOR_EMOJI = { rot: '🍷', weiß: '🥂', rosé: '🌸', schaum: '🍾' }
  const lastTaste = b.history?.length ? b.history[b.history.length - 1] : null
  const r = racks.find(r => r.id === b.rackId)
  const empty = b.count <= 0
  const fmtAgo = (d) => {
    if (!d) return ''
    const days = Math.round((Date.now() - new Date(d).getTime()) / 86400000)
    if (days <= 1) return 'gestern'
    if (days < 30) return `vor ${days} Tagen`
    if (days < 365) return `vor ${Math.round(days/30)} Monaten`
    return `vor ${Math.round(days/365)} J`
  }
  return (
    <div className={`rounded-2xl p-3 shadow-sm ${empty ? 'bg-gray-50 dark:bg-gray-800/60' : 'bg-white dark:bg-gray-800'}`}>
      <button onClick={onOpen} className="w-full text-left flex items-start gap-3">
        {b.photoData
          ? <img src={b.photoData} alt="" className={`w-12 h-16 rounded object-cover flex-none ${empty ? 'opacity-60' : ''}`} />
          : <div className={`text-3xl flex-none w-12 text-center ${empty ? 'opacity-50' : ''}`}>{COLOR_EMOJI[b.color] || '🍷'}</div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-800 dark:text-gray-100 truncate">{b.name}</span>
            <span className="text-xs text-gray-400">{b.vintage}</span>
            {b.rating > 0 && <span className="text-xs">{'⭐'.repeat(b.rating)}</span>}
            {b.alcoholFree && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded">🚫 0%</span>}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {b.winery}{b.region && ` · ${b.region}`}{b.grape && ` · ${b.grape}`}
          </p>
          {lastTaste && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 italic truncate">
              📒 {fmtAgo(lastTaste.date)}
              {lastTaste.occasion && ` · „${lastTaste.occasion}"`}
              {lastTaste.note     && ` · ${lastTaste.note}`}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {empty
              ? <span className="text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded">AUSGETRUNKEN</span>
              : <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">{b.count}× im Bestand</span>}
            {r && <span className="text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{r.emoji} {r.label}</span>}
            {b.history?.length > 0 && <span className="text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{b.history.length}× getrunken</span>}
            {b.priceEur != null && <span className="text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{b.priceEur.toFixed(0)} €</span>}
          </div>
        </div>
      </button>
      <div className="mt-2.5 flex gap-2">
        <button onClick={(e) => { e.stopPropagation(); onRestock() }}
          className={`flex-1 text-xs font-semibold py-1.5 rounded-lg ${
            b.restock
              ? 'bg-emerald-600 text-white'
              : empty
                ? 'bg-rose-600 text-white'
                : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
          }`}>
          {b.restock ? '✓ auf Einkaufsliste' : empty ? '🔄 Wieder kaufen' : '+ Einkaufsliste'}
        </button>
      </div>
    </div>
  )
}
