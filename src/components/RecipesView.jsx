import { useState, useMemo } from 'react'
import useStore from '../store/useStore'
import { useFreezer } from '../modules/freezer/store'
import { useCellar } from '../modules/cellar/store'
import { buildCookPlan } from '../utils/recipeParser'
import RecipeForm from './RecipeForm'
import RecipeDetail from './RecipeDetail'

function useRecipeStock(recipes) {
  const spices = useStore(s => s.spices)
  const freezerItems = useFreezer(s => s.items)
  const bottles = useCellar(s => s.bottles)

  return useMemo(() => {
    const map = {}
    recipes.forEach(r => {
      if (!r.ingredients?.length) { map[r.id] = null; return }
      const plan = buildCookPlan(r.ingredients, spices)
      const spiceFound = plan.matched.length
      const spiceMissing = plan.unmatched.length
      map[r.id] = { found: spiceFound, missing: spiceMissing }
    })
    return map
  }, [recipes, spices, freezerItems, bottles])
}

export default function RecipesView() {
  const { recipes } = useStore()
  const [mode, setMode]       = useState('list')   // list | detail | form
  const [selectedId, setSelectedId] = useState(null)
  const [editing, setEditing] = useState(null)
  const [search, setSearch]   = useState('')
  const [tagFilter, setTagFilter] = useState(null)

  const stockMap = useRecipeStock(recipes)
  const selected = recipes.find(r => r.id === selectedId)

  const allTags = useMemo(() => {
    const s = new Set()
    recipes.forEach(r => (r.tags ?? []).forEach(t => s.add(t)))
    return [...s].sort((a, b) => a.localeCompare(b, 'de'))
  }, [recipes])

  const filtered = useMemo(() => {
    let list = recipes
    if (tagFilter) list = list.filter(r => (r.tags ?? []).includes(tagFilter))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.author ?? '').toLowerCase().includes(q) ||
        (r.tags ?? []).some(t => t.toLowerCase().includes(q))
      )
    }
    return list
  }, [recipes, search, tagFilter])

  // ── Detail ──
  if (mode === 'detail' && selected) {
    return (
      <>
        <RecipeDetail
          recipe={selected}
          onBack={() => setMode('list')}
          onEdit={(r) => { setEditing(r); setMode('form') }}
        />
        {/* Form als Overlay über Detail */}
        {/* (kein zusätzliches State-Handling nötig, form-mode greift unten) */}
      </>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Suche */}
      <div className="px-4 pt-3 pb-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input type="search" className="input pl-9 py-2.5 bg-gray-50 dark:bg-gray-800" placeholder="Rezept suchen…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Tag-Filter */}
      {allTags.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
          <button onClick={() => setTagFilter(null)}
            className={`flex-none rounded-full px-3 py-1 text-xs font-semibold transition-colors ${tagFilter === null ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
            Alle
          </button>
          {allTags.map(t => (
            <button key={t} onClick={() => setTagFilter(f => f === t ? null : t)}
              className={`flex-none rounded-full px-3 py-1 text-xs font-semibold transition-colors ${tagFilter === t ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">📖</div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">
              {recipes.length === 0 ? 'Noch keine Rezepte' : 'Keine Treffer'}
            </h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              {recipes.length === 0
                ? 'Speichere YouTube-Shorts & Co. als Rezepte – mit Kategorien, Zutaten und Schritten.'
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
            {filtered.map(r => (
              <button key={r.id} onClick={() => { setSelectedId(r.id); setMode('detail') }}
                className="card w-full text-left flex gap-3 p-2.5 hover:ring-2 hover:ring-green-300 transition-all">
                <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-none">
                  {r.thumbnailUrl
                    ? <img src={r.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">📖</div>}
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">{r.title}</p>
                  {r.author && <p className="text-xs text-gray-400 mt-0.5">{r.author}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {r.tags?.slice(0, 3).map(t => (
                      <span key={t} className="text-[10px] bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded-full px-2 py-0.5">{t}</span>
                    ))}
                    {stockMap[r.id] && (
                      <>
                        {stockMap[r.id].found > 0 && (
                          <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full px-2 py-0.5">✓{stockMap[r.id].found}</span>
                        )}
                        {stockMap[r.id].missing > 0 && (
                          <span className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full px-2 py-0.5">✗{stockMap[r.id].missing}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
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

      {/* Formular */}
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
