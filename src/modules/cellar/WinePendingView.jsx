import { useState } from 'react'
import { useCellar } from './store'

const COLOR_EMOJI = { rot: '🍷', weiß: '🥂', rosé: '🌸', schaum: '🍾' }

export default function WinePendingView({ onClose }) {
  const { pending, racks, addBottle, removePending, clearPending } = useCellar()
  const defaultRackId = racks[0]?.id || ''
  const defaultSlot = racks[0]?.slots?.[0] || ''

  const [assignments, setAssignments] = useState(() => {
    const map = {}
    pending.forEach(p => {
      map[p.id] = {
        rackId: p.rackId || defaultRackId,
        slot: p.slot || (racks.find(r => r.id === p.rackId)?.slots?.[0]) || defaultSlot,
      }
    })
    return map
  })

  const [expandedId, setExpandedId] = useState(null)

  function setRack(pid, rackId) {
    const rack = racks.find(r => r.id === rackId)
    setAssignments(a => ({ ...a, [pid]: { rackId, slot: rack?.slots?.[0] || '' } }))
  }

  function setSlot(pid, slot) {
    setAssignments(a => ({ ...a, [pid]: { ...a[pid], slot } }))
  }

  function shelveOne(p) {
    const a = assignments[p.id] || { rackId: defaultRackId, slot: defaultSlot }
    addBottle({
      name: p.name, winery: p.winery, vintage: p.vintage,
      region: p.region, country: p.country, grape: p.grape,
      color: p.color, wineType: p.wineType, sweetness: p.sweetness,
      classification: p.classification, alcohol: p.alcohol,
      alcoholFree: p.alcoholFree,
      drinkFrom: p.drinkFrom, drinkUntil: p.drinkUntil,
      count: p.count || 1, priceEur: p.priceEur,
      retailer: p.retailer, note: p.note,
      rackId: a.rackId, slot: a.slot,
    })
    removePending(p.id)
  }

  function shelveAll() {
    pending.forEach(p => shelveOne(p))
    onClose()
  }

  function discardAll() {
    clearPending()
    onClose()
  }

  if (pending.length === 0) return null

  const unassigned = pending.filter(p => !assignments[p.id]?.rackId)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[55]" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-10 z-[60] bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl flex flex-col">
        <div className="flex justify-center pt-3"><div className="w-10 h-1.5 rounded-full bg-gray-200" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">📦 Weine einräumen</h2>
            <p className="text-xs text-gray-500">{pending.length} Flasche{pending.length === 1 ? '' : 'n'} warten</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
        </div>

        {unassigned.length > 0 && (
          <div className="mx-5 mt-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2">
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              {unassigned.length} Wein{unassigned.length === 1 ? '' : 'e'} ohne Lagerort — bitte Regal zuweisen.
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
          {pending.map(p => {
            const a = assignments[p.id] || {}
            const rack = racks.find(r => r.id === a.rackId)
            const expanded = expandedId === p.id

            return (
              <div key={p.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-3"
                >
                  <span className="text-2xl flex-none">{COLOR_EMOJI[p.color] || '🍷'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{p.name}</span>
                      {p.vintage && <span className="text-xs text-gray-400">{p.vintage}</span>}
                      {(p.count || 1) > 1 && <span className="text-xs text-gray-400">{p.count}×</span>}
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">
                      {p.winery}{p.region && ` · ${p.region}`}{p.grape && ` · ${p.grape}`}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {rack ? (
                        <span className="text-[10px] font-semibold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded">
                          {rack.emoji} {rack.label}{a.slot ? ` · ${a.slot}` : ''}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                          Kein Regal
                        </span>
                      )}
                      {p.rackLabel && !a.rackId && (
                        <span className="text-[10px] text-gray-400 italic">Excel: „{p.rackLabel}"</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
                </button>

                {expanded && (
                  <div className="px-3 pb-3 space-y-2">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Regal</p>
                      <div className="flex flex-wrap gap-1.5">
                        {racks.map(r => (
                          <button key={r.id} onClick={() => setRack(p.id, r.id)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold ${
                              a.rackId === r.id
                                ? 'bg-primary-600 text-white'
                                : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                            }`}
                          >{r.emoji} {r.label}</button>
                        ))}
                      </div>
                    </div>

                    {rack && rack.slots.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Fach</p>
                        <div className="flex flex-wrap gap-1.5">
                          {rack.slots.map(s => (
                            <button key={s} onClick={() => setSlot(p.id, s)}
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                a.slot === s
                                  ? 'bg-primary-500 text-white'
                                  : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                              }`}>{s}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button onClick={() => shelveOne(p)}
                        className="flex-1 text-xs font-semibold py-2 rounded-xl bg-primary-600 text-white">
                        Einräumen
                      </button>
                      <button onClick={() => removePending(p.id)}
                        className="text-xs font-semibold py-2 px-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        Verwerfen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-3 flex gap-2">
          <button onClick={discardAll}
            className="btn-secondary flex-none px-4 text-sm">Alle verwerfen</button>
          <button onClick={shelveAll}
            className="btn-primary flex-1 text-sm">
            Alle {pending.length} einräumen
          </button>
        </div>
      </div>
    </>
  )
}
