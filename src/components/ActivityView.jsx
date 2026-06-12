import { useEffect } from 'react'
import useStore from '../store/useStore'

const ACTIONS = {
  spice_added:    { emoji: '🌿', bg: 'bg-green-100 dark:bg-green-900/40',   text: (e) => <>hat <b>{e.target}</b> hinzugefügt</> },
  spice_updated:  { emoji: '✏️', bg: 'bg-blue-100 dark:bg-blue-900/40',     text: (e) => <>hat <b>{e.target}</b> bearbeitet</> },
  spice_deleted:  { emoji: '🗑️', bg: 'bg-red-100 dark:bg-red-900/40',       text: (e) => <>hat <b>{e.target}</b> gelöscht</> },
  fill_changed:   { emoji: '📊', bg: 'bg-amber-100 dark:bg-amber-900/40',   text: (e) => <><b>{e.target}</b> → {e.detail}</> },
  shopping_added: { emoji: '🛒', bg: 'bg-purple-100 dark:bg-purple-900/40', text: (e) => <>hat <b>{e.target}</b> zum Einkauf hinzugefügt</> },
  freezer_added:  { emoji: '❄️', bg: 'bg-sky-100 dark:bg-sky-900/40',       text: (e) => <>hat <b>{e.target}</b> eingefroren{e.detail ? ` (${e.detail})` : ''}</> },
  freezer_consumed:{ emoji: '🍽️', bg: 'bg-sky-100 dark:bg-sky-900/40',      text: (e) => <>hat eine Portion <b>{e.target}</b> verbraucht</> },
  freezer_deleted:{ emoji: '🗑️', bg: 'bg-red-100 dark:bg-red-900/40',       text: (e) => <>hat <b>{e.target}</b> aus dem TK entfernt</> },
  wine_added:     { emoji: '🍷', bg: 'bg-purple-100 dark:bg-purple-900/40', text: (e) => <>hat <b>{e.target}</b> eingelagert{e.detail ? ` (${e.detail})` : ''}</> },
  wine_consumed:  { emoji: '🥂', bg: 'bg-purple-100 dark:bg-purple-900/40', text: (e) => <>hat <b>{e.target}</b> getrunken</> },
  wine_deleted:   { emoji: '🗑️', bg: 'bg-red-100 dark:bg-red-900/40',       text: (e) => <>hat <b>{e.target}</b> aus dem Keller entfernt</> },
  wine_updated:   { emoji: '✏️', bg: 'bg-purple-100 dark:bg-purple-900/40', text: (e) => <>hat <b>{e.target}</b> bearbeitet</> },
}

function avatarColor(name = '') {
  const palette = ['bg-green-400', 'bg-blue-400', 'bg-purple-400', 'bg-pink-400', 'bg-orange-400', 'bg-teal-400']
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return palette[hash % palette.length]
}
function initials(name = '') {
  return name.split(' ').map(p => p[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}
function timeStr(iso) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}
function dayLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yest = new Date(); yest.setDate(today.getDate() - 1)
  const sameDay = (a, b) => a.toDateString() === b.toDateString()
  if (sameDay(d, today)) return 'Heute'
  if (sameDay(d, yest))  return 'Gestern'
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })
}

export default function ActivityView({ onClose }) {
  const { activityLog, loadActivity } = useStore()

  useEffect(() => { loadActivity() }, [])

  // Nach Tag gruppieren (Reihenfolge bleibt: neueste zuerst)
  const groups = []
  let current = null
  activityLog.forEach(e => {
    const label = dayLabel(e.createdAt)
    if (!current || current.label !== label) {
      current = { label, items: [] }
      groups.push(current)
    }
    current.items.push(e)
  })

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-enter" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl sheet-enter max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Aktivitätsverlauf
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 pb-safe">
          {activityLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">🕓</div>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">Noch keine Aktivitäten</h3>
              <p className="text-sm text-gray-400">
                Änderungen an Gewürzen, TK-Vorräten und Weinen erscheinen hier.
              </p>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.label} className="mb-5">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                  {group.label}
                </h3>
                <div className="space-y-1.5">
                  {group.items.map(e => {
                    const a = ACTIONS[e.action] ?? { emoji: '•', bg: 'bg-gray-100 dark:bg-gray-700', text: () => e.action }
                    return (
                      <div key={e.id} className="card px-3 py-2.5 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex-none flex items-center justify-center text-base ${a.bg}`}>
                          {a.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 dark:text-gray-200 leading-tight">
                            <span className="font-semibold">{e.userName}</span>{' '}
                            {a.text(e)}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{timeStr(e.createdAt)} Uhr</p>
                        </div>
                        <div className={`w-7 h-7 rounded-full flex-none flex items-center justify-center text-white font-bold text-[10px] ${avatarColor(e.userName)}`}>
                          {initials(e.userName)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
