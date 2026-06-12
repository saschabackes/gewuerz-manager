import { useState } from 'react'
import { useCellar, CONDITION_OPTIONS, qualityScore, qualityLabel } from './store'
import SetupWizard from '../../components/SetupWizard'

const EMOJI_OPTIONS = ['🍷','🛋️','🔻','🧊','🏠','🍾','🗄️','📦']
const COND_KEYS = [
  { key: 'temperature', label: '🌡️ Temperatur' },
  { key: 'light',       label: '💡 Licht' },
  { key: 'humidity',    label: '💧 Feuchte' },
  { key: 'vibration',   label: '🔇 Ruhe' },
]

function WelcomeStep() {
  return (
    <div className="space-y-4 text-center">
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-5 text-left space-y-3">
        <p className="text-sm text-gray-700 dark:text-gray-200">
          <strong>Was du hier machen kannst:</strong>
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
          <li>🍷 Weinregale & Fächer verwalten</li>
          <li>🌡️ Lagerbedingungen bewerten</li>
          <li>📊 Trinkfenster-Empfehlungen</li>
          <li>📥 Excel-Import für bestehende Sammlungen</li>
          <li>🍽️ Food-Pairing-Finder</li>
          <li>📝 Verkostungsnotizen & Bewertungen</li>
        </ul>
      </div>
      <p className="text-xs text-gray-400">Im nächsten Schritt legst du deine Weinlager an.</p>
    </div>
  )
}

function RackStep() {
  const { racks, addRack, renameRack, removeRack, addSlot, renameSlot, removeSlot, setRackConditions } = useCellar()
  const [newLabel, setNewLabel] = useState('')
  const [newEmoji, setNewEmoji] = useState('🍷')
  const [expandedRack, setExpandedRack] = useState(null)

  function add() {
    const l = newLabel.trim()
    if (!l) return
    addRack(l, newEmoji)
    setNewLabel(''); setNewEmoji('🍷')
  }

  return (
    <div className="space-y-4">
      {racks.map(r => {
        const score = qualityScore(r.conditions)
        const ql = qualityLabel(score)
        const expanded = expandedRack === r.id
        return (
          <div key={r.id} className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <select value={r.emoji} onChange={e => renameRack(r.id, r.label, e.target.value)}
                className="bg-transparent text-xl">
                {EMOJI_OPTIONS.map(e => <option key={e}>{e}</option>)}
              </select>
              <input className="input py-1.5 text-sm flex-1"
                value={r.label} onChange={e => renameRack(r.id, e.target.value, r.emoji)} />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ql.cls}`}>{score}%</span>
              <button onClick={() => { if (confirm(`"${r.label}" + Flaschen löschen?`)) removeRack(r.id) }}
                className="text-gray-300 hover:text-red-500 px-1">🗑️</button>
            </div>

            {/* Conditions */}
            <button onClick={() => setExpandedRack(expanded ? null : r.id)}
              className="text-[10px] text-indigo-600 font-semibold mb-1">
              {expanded ? '▼' : '▶'} Lagerbedingungen
            </button>
            {expanded && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {COND_KEYS.map(ck => (
                  <div key={ck.key}>
                    <p className="text-[10px] text-gray-400 font-bold mb-0.5">{ck.label}</p>
                    <select value={r.conditions?.[ck.key] || 'normal'}
                      onChange={e => setRackConditions(r.id, { [ck.key]: e.target.value })}
                      className="input text-xs py-1 w-full">
                      {CONDITION_OPTIONS[ck.key].map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[10px] text-gray-400 uppercase font-bold mt-2 mb-1">Fächer / Plätze</p>
            <div className="flex flex-wrap gap-1.5">
              {r.slots.map((sl, si) => (
                <div key={si} className="flex items-center bg-white dark:bg-gray-800 rounded-lg px-2 py-1 text-xs">
                  <input className="bg-transparent w-12 text-center text-xs"
                    value={sl} onChange={e => renameSlot(r.id, sl, e.target.value)} />
                  <button onClick={() => removeSlot(r.id, sl)}
                    className="text-gray-300 hover:text-red-500 ml-1">✕</button>
                </div>
              ))}
              <button onClick={() => addSlot(r.id, `${r.slots.length + 1}`)}
                className="text-xs text-indigo-600 font-semibold px-2 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg">
                +
              </button>
            </div>
          </div>
        )
      })}

      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">+ Neues Weinlager</p>
        <div className="flex gap-2">
          <select value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
            className="bg-gray-100 dark:bg-gray-700 rounded-lg px-2 text-lg">
            {EMOJI_OPTIONS.map(e => <option key={e}>{e}</option>)}
          </select>
          <input className="input py-2 text-sm flex-1"
            placeholder='z.B. "Regal Diele"' value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add() }} />
          <button onClick={add} disabled={!newLabel.trim()}
            className="btn-primary text-sm px-4 disabled:opacity-40" style={{ backgroundColor: '#0D7377' }}>
            +
          </button>
        </div>
      </div>
    </div>
  )
}

function TipsStep() {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 space-y-3">
        <p className="font-bold text-sm text-gray-800 dark:text-gray-100">💡 Tipps für den Start</p>
        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
          <li><strong>Lagerbedingungen</strong> beeinflussen das Trinkfenster — bewerte sie für genauere Empfehlungen.</li>
          <li><strong>Food Pairing:</strong> Öffne eine Flasche und sieh, was dazu passt.</li>
          <li><strong>Excel-Import:</strong> Hast du schon eine Sammlung? Nutze den 📥 Button.</li>
          <li><strong>Trinkfenster:</strong> Im Ablauf-Tab siehst du, welche Flaschen bald getrunken werden sollten.</li>
          <li><strong>Bewertung:</strong> Beim Trinken kannst du gleich Notizen und Sterne hinterlassen.</li>
        </ul>
      </div>
      <p className="text-xs text-gray-400 text-center">Du kannst den Assistenten jederzeit über ⚙️ Einstellungen erneut starten.</p>
    </div>
  )
}

export default function CellarSetup({ onComplete }) {
  const steps = [
    { emoji: '🍷', title: 'Willkommen beim Weinkeller', subtitle: 'Dein Weinlager-Manager', content: <WelcomeStep /> },
    { emoji: '🗄️', title: 'Deine Weinlager', subtitle: 'Regale, Kühlschränke und Lagerbedingungen einrichten', content: <RackStep /> },
    { emoji: '🚀', title: 'Bereit!', subtitle: 'Ein paar Tipps zum Einstieg', content: <TipsStep /> },
  ]

  return <SetupWizard module="cellar" steps={steps} onComplete={onComplete} onSkip={onComplete} />
}
