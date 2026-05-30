import { useState, useMemo } from 'react'
import useStore from '../store/useStore'
import { getMhdStatus, MHD_STYLES, formatMhdDate, formatAmount } from '../utils/mhd'
import { PACKAGING_TYPES, PACKAGING_COLORS, CATEGORY_COLORS } from '../data/spices'
import FillBar, { FILL_LABELS } from './FillBar'

const FILTERS = [
  { id: 'all', label: 'Alle' },
  { id: 'fertigstreuer', label: 'Fertigstreuer' },
  { id: 'nachfuell', label: 'Nachfüll' },
  { id: 'ganz', label: 'Ganz' },
  { id: 'metallstreuer', label: 'Metallstreuer' },
]

export default function SpiceList({ onEdit, onAdd }) {
  const { spices: allSpices, addShoppingItem, locations, categories: allCategories, dataLoading, updateFillLevel } = useStore()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState('name') // name | mhd
  const [expandedId, setExpandedId]         = useState(null)
  const [zoomedImage, setZoomedImage]       = useState(null)
  const [showReorderOnly, setShowReorderOnly] = useState(false)

  // Nachkaufen-Logik: Gruppe braucht Nachkauf wenn ALLE Einheiten ≤ level 1
  const reorderNeeded = useMemo(() => {
    const groups = {}
    allSpices.forEach(s => {
      const key = s.name.toLowerCase().trim()
      if (!groups[key]) groups[key] = []
      groups[key].push(s)
    })
    const names = new Set()
    Object.entries(groups).forEach(([key, group]) => {
      if (group.every(s => (s.fillLevel ?? 4) <= 1)) names.add(key)
    })
    return names
  }, [allSpices])

  const stats = useMemo(() => {
    const expired  = allSpices.filter(s => getMhdStatus(s.expiryDate).status === 'expired').length
    const critical = allSpices.filter(s => getMhdStatus(s.expiryDate).status === 'critical').length
    return { total: allSpices.length, expired, critical }
  }, [allSpices])

  // Kategorien, die tatsächlich in Verwendung sind (aus DB)
  const usedCategories = useMemo(() =>
    allCategories.filter(cat => allSpices.some(s => s.category === cat.id)),
    [allCategories, allSpices]
  )

  const filtered = useMemo(() => {
    let list = allSpices
    if (filter !== 'all') list = list.filter(s => s.packagingType === filter)
    if (categoryFilter !== 'all') list = list.filter(s => s.category === categoryFilter)
    if (locationFilter === 'none') list = list.filter(s => !s.locationId)
    else if (locationFilter !== 'all') list = list.filter(s => s.locationId === locationFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q))
    }
    if (showReorderOnly) {
      list = list.filter(s => reorderNeeded.has(s.name.toLowerCase().trim()))
    }
    if (sort === 'mhd') {
      list = [...list].sort((a, b) => {
        const da = a.expiryDate ? new Date(a.expiryDate) : new Date('9999-12-31')
        const db = b.expiryDate ? new Date(b.expiryDate) : new Date('9999-12-31')
        return da - db
      })
    } else {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'de'))
    }
    return list
  }, [allSpices, filter, categoryFilter, locationFilter, search, sort, showReorderOnly, reorderNeeded])

  return (
    <div className="flex flex-col h-full">
      {/* Stats strip */}
      {stats.total > 0 && (
        <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex gap-4 text-sm">
          <span className="text-gray-500">{stats.total} Gewürze</span>
          {stats.expired > 0 && (
            <span className="text-red-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              {stats.expired} abgelaufen
            </span>
          )}
          {stats.critical > 0 && (
            <span className="text-orange-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              {stats.critical} bald
            </span>
          )}
          {reorderNeeded.size > 0 && (
            <button
              onClick={() => setShowReorderOnly(v => !v)}
              className={`font-medium flex items-center gap-1 rounded-full px-2 py-0.5 -mx-2 transition-colors ${
                showReorderOnly
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-orange-600 hover:text-orange-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              {reorderNeeded.size} nachkaufen
            </button>
          )}
        </div>
      )}

      {/* Search bar */}
      <div className="px-4 pt-3 pb-2 bg-white border-b border-gray-100">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input
            type="search"
            className="input pl-9 py-2.5 bg-gray-50"
            placeholder="Gewürz suchen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter pills + sort */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-none rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filter === f.id
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="flex-none border-l border-gray-200 mx-1" />
        <button
          onClick={() => setSort(s => s === 'name' ? 'mhd' : 'name')}
          className="flex-none flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-600"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round"/>
          </svg>
          {sort === 'name' ? 'A–Z' : 'MHD'}
        </button>
      </div>

      {/* Kategorie-Filter (nur wenn mind. eine Kategorie vergeben) */}
      {usedCategories.length > 0 && (
        <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`flex-none rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              categoryFilter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Alle
          </button>
          {usedCategories.map(cat => {
            const col = CATEGORY_COLORS[cat.color] ?? CATEGORY_COLORS.gray
            const active = categoryFilter === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(f => f === cat.id ? 'all' : cat.id)}
                className={`flex-none rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  active ? `${col.bg} ${col.text} ring-1 ring-current` : 'bg-gray-100 text-gray-600'
                }`}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Lagerort-Filter (nur anzeigen wenn Lagerorte vorhanden) */}
      {locations.length > 0 && (
        <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setLocationFilter('all')}
            className={`flex-none rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              locationFilter === 'all' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Alle Orte
          </button>
          {locations.map(loc => (
            <button
              key={loc.id}
              onClick={() => setLocationFilter(l => l === loc.id ? 'all' : loc.id)}
              className={`flex-none rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                locationFilter === loc.id ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {loc.name}
            </button>
          ))}
          <button
            onClick={() => setLocationFilter(l => l === 'none' ? 'all' : 'none')}
            className={`flex-none rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              locationFilter === 'none' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Kein Ort
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {dataLoading && allSpices.length === 0 ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState search={search} onAdd={onAdd} />
        ) : (
          filtered.map(spice => (
            <SpiceCard
              key={spice.id}
              spice={spice}
              expanded={expandedId === spice.id}
              onToggle={() => setExpandedId(id => id === spice.id ? null : spice.id)}
              onEdit={() => { onEdit(spice); setExpandedId(null) }}
              onAddToShopping={() => addShoppingItem(spice.name, '', true)}
              onZoomImage={(url, name) => setZoomedImage({ url, name })}
              needsReorder={reorderNeeded.has(spice.name.toLowerCase().trim())}
              onFillChange={level => updateFillLevel(spice.id, level)}
            />
          ))
        )}
        <div className="h-2" />
      </div>

      {/* Bild-Lightbox */}
      {zoomedImage && (
        <ImageLightbox
          url={zoomedImage.url}
          name={zoomedImage.name}
          onClose={() => setZoomedImage(null)}
        />
      )}
    </div>
  )
}

function SpiceCard({ spice, expanded, onToggle, onEdit, onAddToShopping, onZoomImage, needsReorder, onFillChange }) {
  const { deleteSpice, locations, categories } = useStore()
  const mhd = getMhdStatus(spice.expiryDate)
  const mhdStyle = MHD_STYLES[mhd.status]
  const pkgColor = PACKAGING_COLORS[spice.packagingType] ?? PACKAGING_COLORS.fertigstreuer
  const pkgLabel = PACKAGING_TYPES.find(t => t.id === spice.packagingType)?.label ?? spice.packagingType
  const location = locations.find(l => l.id === spice.locationId)

  return (
    <div className={`card overflow-hidden transition-all ${expanded ? 'ring-2 ring-green-500' : ''}`}>
      <button className="w-full text-left p-4" onClick={onToggle}>
        <div className="flex items-start justify-between gap-3">
          {/* Thumbnail – klickbar zum Vergrößern */}
          {spice.imageUrl && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onZoomImage(spice.imageUrl, spice.name) }}
              className="flex-none w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 relative group flex-shrink-0"
            >
              <img src={spice.imageUrl} alt={spice.name} className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/25 opacity-0 group-active:opacity-100 transition-opacity flex items-center justify-center">
                <svg className="w-4 h-4 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0zm-3-3v6m-3-3h6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-base leading-tight">{spice.name}</h3>
              <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${pkgColor.bg} ${pkgColor.text}`}>
                {pkgLabel}
              </span>
              {spice.category && (() => {
                const cat = categories.find(c => c.id === spice.category)
                const col = cat ? (CATEGORY_COLORS[cat.color] ?? CATEGORY_COLORS.gray) : null
                return cat ? (
                  <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${col.bg} ${col.text}`}>
                    {cat.name}
                  </span>
                ) : null
              })()}
              {needsReorder && (
                <span className="text-xs bg-orange-100 text-orange-700 font-semibold rounded-full px-2 py-0.5">
                  ↓ Nachkaufen
                </span>
              )}
            </div>
            {spice.brand && (
              <p className="text-xs text-gray-400 font-medium mt-0.5">{spice.brand}</p>
            )}
            <p className="text-sm text-gray-500 mt-0.5">{formatAmount(spice)}</p>
            {location && (
              <span className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {location.name}
              </span>
            )}
          </div>
          <div className="flex-none flex flex-col items-end gap-1.5">
            {mhd.status !== 'none' ? (
              <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${mhdStyle.bg} ${mhdStyle.text}`}>
                {mhd.status === 'expired' ? '⚠ ' : ''}{formatMhdDate(spice.expiryDate)}
              </span>
            ) : (
              <span className="text-xs text-gray-300">Kein MHD</span>
            )}
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {/* Füllstand — Tippen cycelt eine Stufe runter, bei 0 zurück auf 4 */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                const cur = spice.fillLevel ?? 4
                onFillChange(cur === 0 ? 4 : cur - 1)
              }}
              title={`Füllstand: ${FILL_LABELS[spice.fillLevel ?? 4]} – Tippen zum Ändern`}
              className="mt-0.5 p-0.5 rounded hover:bg-gray-100 transition-colors"
            >
              <FillBar level={spice.fillLevel ?? 4} />
            </button>
          </div>
        </div>
        {spice.barcode && (
          <p className="text-xs text-gray-400 mt-1">Barcode: {spice.barcode}</p>
        )}
        {spice.notes && (
          <p className="text-xs text-gray-500 mt-1 italic">{spice.notes}</p>
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 flex gap-2 flex-wrap bg-gray-50">
          <button onClick={onEdit} className="btn-secondary py-2 px-3 text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Bearbeiten
          </button>
          <button onClick={onAddToShopping} className="btn-secondary py-2 px-3 text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Einkaufen
          </button>
          <button
            onClick={() => { if (confirm(`"${spice.name}" wirklich löschen?`)) deleteSpice(spice.id) }}
            className="btn-danger py-2 px-3 text-xs ml-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Löschen
          </button>
        </div>
      )}
    </div>
  )
}

function ImageLightbox({ url, name, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-50 fade-enter"
        onClick={onClose}
      />
      {/* Content */}
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-xs">
          <img
            src={url}
            alt={name}
            className="w-full max-h-[65vh] object-contain rounded-2xl shadow-2xl bg-white/5"
          />
          {name && (
            <p className="text-white text-center font-semibold mt-3 text-sm drop-shadow">{name}</p>
          )}
          <button
            onClick={onClose}
            className="mt-4 w-full bg-white/15 hover:bg-white/25 text-white rounded-2xl py-3 text-sm font-semibold transition-colors backdrop-blur-sm"
          >
            Schließen
          </button>
        </div>
      </div>
    </>
  )
}

function LoadingSkeleton() {
  return (
    <>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="h-4 bg-gray-200 rounded-full w-32" />
                <div className="h-4 bg-gray-100 rounded-full w-16" />
              </div>
              <div className="h-3 bg-gray-100 rounded-full w-20" />
            </div>
            <div className="h-5 bg-gray-100 rounded-full w-14" />
          </div>
        </div>
      ))}
    </>
  )
}

function EmptyState({ search, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{search ? '🔍' : '🌿'}</div>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">
        {search ? 'Keine Gewürze gefunden' : 'Noch keine Gewürze'}
      </h3>
      <p className="text-sm text-gray-400 mb-6">
        {search ? `Keine Treffer für "${search}"` : 'Füge dein erstes Gewürz hinzu'}
      </p>
      {!search && (
        <button onClick={onAdd} className="btn-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Gewürz hinzufügen
        </button>
      )}
    </div>
  )
}
