import { useState, useMemo } from 'react'
import { useCellar, drinkStatus } from './store'
import CellarForm from './CellarForm'

const COLOR_EMOJI = { rot: '🍷', weiß: '🥂', rosé: '🌸', schaum: '🍾' }

export default function CellarView() {
  const { bottles, drinkOne, removeBottle, seedDemoData, clear } = useCellar()
  const [tab, setTab] = useState('all') // all | drink-now | by-color
  const [showForm, setShowForm] = useState(false)

  const filtered = useMemo(() => {
    if (tab === 'drink-now') {
      const y = new Date().getFullYear()
      return bottles.filter(b => y >= b.drinkFrom && y <= b.drinkUntil)
                    .sort((a,b) => a.drinkUntil - b.drinkUntil)
    }
    return [...bottles].sort((a,b) => a.drinkUntil - b.drinkUntil)
  }, [bottles, tab])

  const totalBottles = bottles.reduce((s, b) => s + b.count, 0)

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-rose-50/40 dark:bg-gray-900">
      <div className="bg-gradient-to-br from-rose-600 to-rose-800 text-white px-5 py-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">🍷 Weinkeller</h2>
        <p className="text-rose-100 text-sm">
          {bottles.length} Position{bottles.length === 1 ? '' : 'en'}, {totalBottles} Flaschen
        </p>
      </div>

      <div className="flex gap-2 px-4 py-3">
        {[
          { id: 'all',       label: '🍷 Alle' },
          { id: 'drink-now', label: '⭐ Jetzt trinken' },
        ].map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-rose-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {bottles.length === 0 && (
        <div className="m-4 p-5 rounded-2xl bg-white dark:bg-gray-800 text-center">
          <p className="text-gray-700 dark:text-gray-200 font-medium">Noch keine Flaschen im Keller.</p>
          <p className="text-xs text-gray-400 mt-1 mb-3">Lade ein paar Beispielflaschen oder leg eine eigene an.</p>
          <button onClick={seedDemoData}
            className="bg-rose-600 text-white text-sm font-semibold px-4 py-2 rounded-xl">
            🎲 Demoflaschen laden
          </button>
        </div>
      )}

      <div className="px-4 space-y-2.5">
        {filtered.map(b => {
          const status = drinkStatus(b)
          return (
            <div key={b.id} className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="text-3xl flex-none">{COLOR_EMOJI[b.color] || '🍷'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-800 dark:text-gray-100 truncate">{b.name}</span>
                    <span className="text-xs text-gray-400">{b.vintage}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {b.winery && <span>{b.winery} · </span>}
                    {b.region && <span>{b.region}</span>}
                    {b.grape && <span> · {b.grape}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">📦 {b.slot || '—'}</span>
                    <span className="text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{b.count}× im Bestand</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${status.cls}`}>{status.label}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-2.5">
                <button onClick={() => {
                  const r = prompt('Wie war\'s? Bewertung 1–5 (oder leer lassen)')
                  const rating = r ? Math.max(1, Math.min(5, Number(r))) : undefined
                  drinkOne(b.id, rating)
                }}
                  className="flex-1 text-xs bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-semibold py-1.5 rounded-lg">
                  🥂 Getrunken
                </button>
                <button onClick={() => { if (confirm('Flasche/Position entfernen?')) removeBottle(b.id) }}
                  className="text-xs text-gray-400 hover:text-red-500 px-2">✕</button>
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-rose-600 text-white text-3xl shadow-xl active:bg-rose-700"
        aria-label="Flasche hinzufügen">+</button>

      {bottles.length > 0 && (
        <div className="px-4 pt-4 text-center">
          <button onClick={() => { if (confirm('Alle Keller-Einträge im Prototyp löschen?')) clear() }}
            className="text-xs text-gray-400 hover:text-red-500">
            🗑️ Prototyp-Daten zurücksetzen
          </button>
        </div>
      )}

      {showForm && <CellarForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
