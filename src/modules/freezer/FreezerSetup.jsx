import { useState } from 'react'
import { useFreezer } from './store'
import SetupWizard from '../../components/SetupWizard'

const EMOJI_OPTIONS = ['🏠','🔻','❄️','🧊','📦','🏚️','🏬','🚪']

function WelcomeStep() {
  return (
    <div className="space-y-4 text-center">
      <div className="bg-sky-50 dark:bg-sky-900/30 rounded-2xl p-5 text-left space-y-3">
        <p className="text-sm text-gray-700 dark:text-gray-200">
          <strong>Was du hier machen kannst:</strong>
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
          <li>❄️ Gefrierschränke & Fächer anlegen</li>
          <li>📦 Einträge per Spracheingabe oder Formular hinzufügen</li>
          <li>⏰ Ablaufdaten & Portionen verwalten</li>
          <li>📥 Excel-Import für bestehende Listen</li>
          <li>🛒 Nachkauf-Erinnerungen</li>
        </ul>
      </div>
      <p className="text-xs text-gray-400">Im nächsten Schritt legst du deine Gefrierschränke an.</p>
    </div>
  )
}

function StorageStep() {
  const { storages, addStorage, renameStorage, removeStorage, addCompartment, renameCompartment, removeCompartment } = useFreezer()
  const [newLabel, setNewLabel] = useState('')
  const [newEmoji, setNewEmoji] = useState('📦')

  function add() {
    const l = newLabel.trim()
    if (!l) return
    addStorage(l, newEmoji)
    setNewLabel(''); setNewEmoji('📦')
  }

  return (
    <div className="space-y-4">
      {storages.map(s => (
        <div key={s.id} className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <select value={s.emoji} onChange={e => renameStorage(s.id, s.label, e.target.value)}
              className="bg-transparent text-xl">
              {EMOJI_OPTIONS.map(e => <option key={e}>{e}</option>)}
            </select>
            <input className="input py-1.5 text-sm flex-1"
              value={s.label} onChange={e => renameStorage(s.id, e.target.value, s.emoji)} />
            <button onClick={() => { if (confirm(`"${s.label}" löschen?`)) removeStorage(s.id) }}
              className="text-gray-300 hover:text-red-500 px-2">🗑️</button>
          </div>
          <p className="text-[10px] text-gray-400 uppercase font-bold mt-2 mb-1">Fächer / Schubladen</p>
          <div className="space-y-1.5">
            {s.compartments.map(c => (
              <div key={c.id} className="flex gap-2">
                <input className="input py-1.5 text-sm flex-1"
                  value={c.label} onChange={e => renameCompartment(s.id, c.id, e.target.value)} />
                <button onClick={() => { if (confirm(`"${c.label}" löschen?`)) removeCompartment(s.id, c.id) }}
                  className="text-gray-300 hover:text-red-500 px-2">✕</button>
              </div>
            ))}
            <button onClick={() => addCompartment(s.id, `Fach ${s.compartments.length + 1}`)}
              className="w-full text-xs text-primary-600 font-semibold py-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg">
              + Fach hinzufügen
            </button>
          </div>
        </div>
      ))}

      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">+ Neuer Gefrierschrank</p>
        <div className="flex gap-2">
          <select value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
            className="bg-gray-100 dark:bg-gray-700 rounded-lg px-2 text-lg">
            {EMOJI_OPTIONS.map(e => <option key={e}>{e}</option>)}
          </select>
          <input className="input py-2 text-sm flex-1"
            placeholder='z.B. "TK Garage"' value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add() }} />
          <button onClick={add} disabled={!newLabel.trim()}
            className="btn-primary text-sm px-4 disabled:opacity-40">
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
          <li><strong>Spracheingabe:</strong> Tippe z.B. „3 Lasagne Keller Korb 2" in die Quick-Add-Leiste — Menge und Ort werden automatisch erkannt.</li>
          <li><strong>Swipe links</strong> auf einem Eintrag zieht eine Portion ab.</li>
          <li><strong>Excel-Import:</strong> Hast du schon eine Liste? Nutze den 📥 Button, um sie zu importieren.</li>
          <li><strong>Ablaufdaten</strong> werden automatisch anhand der Kategorie berechnet.</li>
          <li><strong>🛒 Nachkaufen:</strong> Markiere Einträge, die auf die Einkaufsliste sollen.</li>
        </ul>
      </div>
      <p className="text-xs text-gray-400 text-center">Du kannst den Assistenten jederzeit über ⚙️ Einstellungen erneut starten.</p>
    </div>
  )
}

export default function FreezerSetup({ onComplete }) {
  const steps = [
    { emoji: '❄️', title: 'Willkommen beim TK-Modul', subtitle: 'Dein Gefrierschrank-Manager', content: <WelcomeStep /> },
    { emoji: '📦', title: 'Deine Gefrierschränke', subtitle: 'Passe die Schränke und Fächer an dein Zuhause an', content: <StorageStep /> },
    { emoji: '🚀', title: 'Bereit!', subtitle: 'Ein paar Tipps zum Einstieg', content: <TipsStep /> },
  ]

  return <SetupWizard module="freezer" steps={steps} onComplete={onComplete} onSkip={onComplete} />
}
