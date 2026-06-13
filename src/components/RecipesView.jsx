import { useState, useMemo, useCallback } from 'react'
import useStore from '../store/useStore'
import { useFreezer } from '../modules/freezer/store'
import { useCellar } from '../modules/cellar/store'
import { computeRecipeAvailability } from '../utils/inventoryMatch'
import RecipeForm from './RecipeForm'
import RecipeDetail from './RecipeDetail'

const SORT_OPTIONS = [
  { id: 'newest',  label: 'Neueste' },
  { id: 'alpha',   label: 'A–Z' },
  { id: 'avail',   label: 'Verfügbarkeit' },
]

export default function RecipesView() {
  const { recipes, toggleFavorite } = useStore()
  const spices = useStore(s => s.spices)
  const freezerItems = useFreezer(s => s.items)
  const bottles = useCellar(s => s.bottles)

  const [mode, setMode]       = useState('list')
  const [selectedId, setSelectedId] = useState(null)
  const [editing, setEditing] = useState(null)
  const [search, setSearch]   = useState('')
  const [activeFilters, setActiveFilters] = useState({
    tag: null,
    source: null,
    favorite: false,
    available: false,
  })
  const [sortBy, setSortBy]   = useState('newest')
  const [showFilters, setShowFilters] = useState(false)

  const selected = recipes.find(r => r.id === selectedId)

  // Availability map
  const availMap = useMemo(() => {
    const map = {}
    recipes.forEach(r => {
      if (!r.ingredients?.length) { map[r.id] = null; return }
      map[r.id] = computeRecipeAvailability(r, spices, freezerItems, bottles)
    })
    return map
  }, [recipes, spices, freezerItems, bottles])

  // All unique tags
  const allTags = useMemo(() => {
    const s = new Set()
    recipes.forEach(r => (r.tags ?? []).forEach(t => s.add(t)))
    return [...s].sort((a, b) => a.localeCompare(b, 'de'))
  }, [recipes])

  // All unique sources
  const allSources = useMemo(() => {
    const s = new Set()
    recipes.forEach(r => s.add(r.sourceType || 'manual'))
    return [...s].sort()
  }, [recipes])

  const SOURCE_LABELS = { youtube: 'YouTube', cookidoo: 'Cookidoo', kptncook: 'KptnCook', web: 'Web', manual: 'Manuell' }

  // Filter + Sort
  const filtered = useMemo(() => {
    let list = recipes
    const { tag, source, favorite, available } = activeFilters

    if (favorite) list = list.filter(r => r.favorite)
    if (tag) list = list.filter(r => (r.tags ?? []).includes(tag))
    if (source) list = list.filter(r => (r.sourceType || 'manual') === source)
    if (available) list = list.filter(r => {
      const a = availMap[r.id]
      return a && a.percentage >= 50
    })

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.author ?? '').toLowerCase().includes(q) ||
        (r.tags ?? []).some(t => t.toLowerCase().includes(q))
      )
    }

    const sorted = [...list]
    if (sortBy === 'alpha') sorted.sort((a, b) => a.title.localeCompare(b.title, 'de'))
    else if (sortBy === 'avail') sorted.sort((a, b) => (availMap[b.id]?.percentage ?? -1) - (availMap[a.id]?.percentage ?? -1))
    else sorted.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

    return sorted
  }, [recipes, search, activeFilters, sortBy, availMap])

  const activeCount = (activeFilters.tag ? 1 : 0) + (activeFilters.source ? 1 : 0) + (activeFilters.favorite ? 1 : 0) + (activeFilters.available ? 1 : 0)

  const setFilter = useCallback((key, value) => {
    setActiveFilters(f => ({ ...f, [key]: value }))
  }, [])

  // ── Detail ──
  if (mode === 'detail' && selected) {
    return (
      <RecipeDetail
        recipe={selected}
        onBack={() => setMode('list')}
        onEdit={(r) => { setEditing(r); setMode('form') }}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search + Filter toggle */}
      <div className="px-4 pt-3 pb-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
            </svg>
            <input type="search" className="input pl-9 py-2.5 bg-gray-50 dark:bg-gray-800" placeholder="Rezept suchen…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex-none px-3 py-2 rounded-xl transition-colors relative ${
              showFilters || activeCount > 0
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 4h18M7 9h10M10 14h4" strokeLinecap="round"/>
            </svg>
            {activeCount > 0 && !showFilters && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 space-y-3">
          {/* Favorites + Available */}
          <div className="flex gap-2">
            <FilterChip
              active={activeFilters.favorite}
              onClick={() => setFilter('favorite', !activeFilters.favorite)}
              label="★ Favoriten"
            />
            <FilterChip
              active={activeFilters.available}
              onClick={() => setFilter('available', !activeFilters.available)}
              label="🍳 Kann ich kochen"
            />
          </div>

          {/* Source filter */}
          {allSources.length > 1 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Quelle</p>
              <div className="flex gap-1.5 flex-wrap">
                {allSources.map(s => (
                  <FilterChip
                    key={s}
                    active={activeFilters.source === s}
                    onClick={() => setFilter('source', activeFilters.source === s ? null : s)}
                    label={SOURCE_LABELS[s] || s}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Kategorie</p>
              <div className="flex gap-1.5 flex-wrap max-h-24 overflow-y-auto">
                {allTags.map(t => (
                  <FilterChip
                    key={t}
                    active={activeFilters.tag === t}
                    onClick={() => setFilter('tag', activeFilters.tag === t ? null : t)}
                    label={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sort */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Sortierung</p>
            <div className="flex gap-1.5">
              {SORT_OPTIONS.map(o => (
                <FilterChip key={o.id} active={sortBy === o.id} onClick={() => setSortBy(o.id)} label={o.label} />
              ))}
            </div>
          </div>

          {/* Reset */}
          {activeCount > 0 && (
            <button
              onClick={() => setActiveFilters({ tag: null, source: null, favorite: false, available: false })}
              className="text-xs text-red-500 font-semibold"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Active filter pills (when panel closed) */}
      {!showFilters && activeCount > 0 && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-2 flex gap-1.5 flex-wrap">
          {activeFilters.favorite && <ActivePill label="★ Favoriten" onRemove={() => setFilter('favorite', false)} />}
          {activeFilters.available && <ActivePill label="🍳 Kann ich kochen" onRemove={() => setFilter('available', false)} />}
          {activeFilters.source && <ActivePill label={SOURCE_LABELS[activeFilters.source] || activeFilters.source} onRemove={() => setFilter('source', null)} />}
          {activeFilters.tag && <ActivePill label={activeFilters.tag} onRemove={() => setFilter('tag', null)} />}
        </div>
      )}

      {/* Recipe count */}
      <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-900/40 flex items-center justify-between">
        <span className="text-[11px] text-gray-400 font-medium">{filtered.length} von {recipes.length} Rezepten</span>
        <span className="text-[11px] text-gray-400">{SORT_OPTIONS.find(o => o.id === sortBy)?.label}</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">📖</div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">
              {recipes.length === 0 ? 'Noch keine Rezepte' : 'Keine Treffer'}
            </h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              {recipes.length === 0
                ? 'Speichere Rezepte aus YouTube, Cookidoo oder anderen Quellen.'
                : 'Andere Suche oder Filter probieren.'}
            </p>
            {recipes.length === 0 && (
              <button onClick={() => { setEditing(null); setMode('form') }} className="btn-primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Rezept hinzufügen
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const avail = availMap[r.id]
              return (
                <div key={r.id} className="card flex gap-3 p-2.5 hover:ring-2 hover:ring-green-300 transition-all relative">
                  <button onClick={() => { setSelectedId(r.id); setMode('detail') }}
                    className="flex gap-3 flex-1 min-w-0 text-left">
                    <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-none">
                      {r.thumbnailUrl
                        ? <img src={r.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl">📖</div>}
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">{r.title}</p>
                      {r.author && <p className="text-xs text-gray-400 mt-0.5">{r.author}</p>}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.tags?.slice(0, 2).map(t => (
                          <span key={t} className="text-[10px] bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded-full px-2 py-0.5">{t}</span>
                        ))}
                        {avail && (
                          <>
                            {avail.totalFound > 0 && (
                              <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full px-2 py-0.5">
                                ✓{avail.totalFound}
                              </span>
                            )}
                            {avail.totalMissing > 0 && (
                              <span className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full px-2 py-0.5">
                                ✗{avail.totalMissing}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                  {/* Favorite button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(r.id) }}
                    className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span className={`text-base ${r.favorite ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}`}>
                      {r.favorite ? '★' : '☆'}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <div className="h-2" />
      </div>

      {/* + Button */}
      <button
        onClick={() => { setEditing(null); setMode('form') }}
        className="fixed bottom-24 right-5 bg-primary-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg active:opacity-80 transition-colors z-20"
        aria-label="Rezept hinzufügen"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {/* Form */}
      {mode === 'form' && (
        <RecipeForm
          recipe={editing}
          onClose={() => setMode(editing ? 'detail' : 'list')}
          onSaved={(id) => { setSelectedId(id); }}
        />
      )}
    </div>
  )
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? 'bg-primary-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
      }`}
    >
      {label}
    </button>
  )
}

function ActivePill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded-full pl-2.5 pr-1 py-1 text-xs font-semibold">
      {label}
      <button onClick={onRemove} className="hover:text-red-500 p-0.5">✕</button>
    </span>
  )
}
