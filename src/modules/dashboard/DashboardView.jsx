import { useState, useCallback } from 'react'
import useDashboardData from './useDashboardData'
import { MHD_STYLES } from '../../utils/mhd'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

const MODULE_CARDS = [
  { id: 'spices',  key: 'spices',  label: 'Gewürze', emoji: '🌿' },
  { id: 'freezer', key: 'freezer', label: 'TK',      emoji: '❄️' },
  { id: 'cellar',  key: 'cellar',  label: 'Wein',    emoji: '🍷' },
  { id: 'recipes', key: 'recipes', label: 'Rezepte', emoji: '📖' },
]

const ALL_SECTIONS = [
  { id: 'counts',    label: 'Module',              emoji: '📊' },
  { id: 'attention', label: 'Braucht Aufmerksamkeit', emoji: '⚠️' },
  { id: 'cooking',   label: 'Heute kochen',        emoji: '🍳' },
  { id: 'activity',  label: 'Letzte Aktivität',    emoji: '🕐' },
]

const STORAGE_KEY = 'depot_dashboard_config'

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

function getConfig() {
  const saved = loadConfig()
  if (saved?.order && saved?.visible) return saved
  return { order: ALL_SECTIONS.map(s => s.id), visible: Object.fromEntries(ALL_SECTIONS.map(s => [s.id, true])) }
}

export default function DashboardView({ onNavigate }) {
  const data = useDashboardData()
  const [config, setConfig] = useState(getConfig)
  const [editing, setEditing] = useState(false)

  const updateConfig = useCallback((fn) => {
    setConfig(prev => {
      const next = fn(prev)
      saveConfig(next)
      return next
    })
  }, [])

  const toggleSection = (id) => {
    updateConfig(c => ({ ...c, visible: { ...c.visible, [id]: !c.visible[id] } }))
  }

  const moveSection = (id, dir) => {
    updateConfig(c => {
      const order = [...c.order]
      const idx = order.indexOf(id)
      const target = idx + dir
      if (target < 0 || target >= order.length) return c
      ;[order[idx], order[target]] = [order[target], order[idx]]
      return { ...c, order }
    })
  }

  const sections = config.order.map(id => ALL_SECTIONS.find(s => s.id === id)).filter(Boolean)

  return (
    <div className="px-4 py-4 space-y-5 overflow-y-auto flex-1">
      {/* Edit toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setEditing(e => !e)}
          className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
            editing ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}
        >
          {editing ? 'Fertig' : 'Anpassen'}
        </button>
      </div>

      {editing ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 mb-1">Sektionen ein-/ausblenden und Reihenfolge ändern</p>
          {sections.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-xl px-3 py-2.5 shadow-sm">
              <button
                onClick={() => toggleSection(s.id)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-none transition-colors ${
                  config.visible[s.id]
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'border-gray-300 dark:border-gray-500'
                }`}
              >
                {config.visible[s.id] && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <span className="text-base">{s.emoji}</span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1">{s.label}</span>
              <div className="flex gap-0.5">
                <button
                  onClick={() => moveSection(s.id, -1)}
                  disabled={idx === 0}
                  className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button
                  onClick={() => moveSection(s.id, 1)}
                  disabled={idx === sections.length - 1}
                  className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        sections.map(s => {
          if (!config.visible[s.id]) return null
          switch (s.id) {
            case 'counts':    return <CountsSection key={s.id} counts={data.counts} onNavigate={onNavigate} />
            case 'attention': return data.attention.length > 0 ? <AttentionSection key={s.id} items={data.attention} /> : null
            case 'cooking':   return <CookingSection key={s.id} suggestions={data.suggestions} counts={data.counts} onNavigate={onNavigate} />
            case 'activity':  return data.recentActivity.length > 0 ? <ActivitySection key={s.id} items={data.recentActivity} /> : null
            default: return null
          }
        })
      )}
    </div>
  )
}

function CountsSection({ counts, onNavigate }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {MODULE_CARDS.map(m => (
        <button
          key={m.id}
          onClick={() => onNavigate(m.id)}
          className="bg-white dark:bg-gray-700 rounded-2xl p-3 text-center shadow-sm active:scale-95 transition-transform"
        >
          <div className="text-2xl mb-1">{m.emoji}</div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{counts[m.key]}</div>
          <div className="text-[10px] text-gray-400 font-medium">{m.label}</div>
        </button>
      ))}
    </div>
  )
}

function AttentionSection({ items }) {
  return (
    <section>
      <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-1.5">
        <span>⚠️</span> Braucht Aufmerksamkeit
      </h2>
      <div className="space-y-1.5">
        {items.map(item => {
          const style = MHD_STYLES[item.status] || MHD_STYLES.critical
          return (
            <div key={item.id} className="flex items-center gap-2.5 bg-white dark:bg-gray-700 rounded-xl px-3 py-2.5 shadow-sm">
              <span className="text-lg flex-none">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.name}</p>
              </div>
              <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 flex-none ${style.bg} ${style.text}`}>
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function CookingSection({ suggestions, counts, onNavigate }) {
  if (suggestions.length === 0) {
    if (counts.recipes === 0) {
      return (
        <section className="text-center py-6">
          <p className="text-3xl mb-2">📖</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Speichere Rezepte unter "Kochen", um hier Vorschläge zu erhalten.
          </p>
        </section>
      )
    }
    return null
  }

  return (
    <section>
      <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-1.5">
        <span>🍳</span> Heute kochen
      </h2>
      <div className="space-y-2">
        {suggestions.map(s => (
          <button
            key={s.recipe.id}
            onClick={() => onNavigate('recipes', s.recipe.id)}
            className="w-full bg-white dark:bg-gray-700 rounded-xl shadow-sm overflow-hidden flex items-stretch text-left active:scale-[0.98] transition-transform"
          >
            {s.recipe.thumbnailUrl ? (
              <img src={s.recipe.thumbnailUrl} alt="" className="w-20 h-20 object-cover flex-none" />
            ) : (
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-600 flex items-center justify-center flex-none text-2xl">📖</div>
            )}
            <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-center">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{s.recipe.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <AvailBar found={s.totalFound} missing={s.totalMissing} />
                <span className="text-[11px] text-gray-500 dark:text-gray-400 flex-none">
                  {s.totalFound}/{s.totalFound + s.totalMissing}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {s.matchedExpiring > 0 && (
                  <span className="text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full px-1.5 py-0.5">
                    {s.matchedExpiring}x bald ablaufend
                  </span>
                )}
                {s.winePairing && (
                  <span className="text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full px-1.5 py-0.5">
                    🍷 {s.winePairing.wine.name}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

function ActivitySection({ items }) {
  return (
    <section>
      <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-1.5">
        <span>🕐</span> Letzte Aktivität
      </h2>
      <div className="space-y-1">
        {items.map(a => (
          <div key={a.id} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">{a.userName}</span>
            <span className="truncate flex-1">{actionLabel(a.action)} {a.target}</span>
            <span className="flex-none">{timeAgo(a.createdAt)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function AvailBar({ found, missing }) {
  const total = found + missing
  const pct = total > 0 ? (found / total) * 100 : 0
  return (
    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

const ACTION_LABELS = {
  spice_added: 'hat hinzugefügt:',
  spice_updated: 'hat aktualisiert:',
  spice_deleted: 'hat gelöscht:',
  fill_changed: 'Füllstand geändert:',
  shopping_added: 'auf Einkaufsliste:',
  shopping_checked: 'abgehakt:',
  shopping_deleted: 'entfernt:',
  freezer_added: 'eingefroren:',
  freezer_removed: 'entnommen:',
  cellar_added: 'eingelagert:',
  cellar_removed: 'entnommen:',
  recipe_added: 'Rezept gespeichert:',
}
function actionLabel(action) { return ACTION_LABELS[action] || action }

function timeAgo(dateStr) {
  if (!dateStr) return ''
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: de })
  } catch { return '' }
}
