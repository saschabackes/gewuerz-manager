import { useState } from 'react'
import useStore from '../store/useStore'
import SetupWizard from './SetupWizard'

function WelcomeStep() {
  return (
    <div className="space-y-4 text-center">
      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-5 text-left space-y-3">
        <p className="text-sm text-gray-700 dark:text-gray-200">
          <strong>Was du hier machen kannst:</strong>
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
          <li>🌿 Gewürze mit Foto, MHD und Füllstand erfassen</li>
          <li>📍 Lagerorte definieren (Schrank, Kiste, Schublade…)</li>
          <li>⏰ MHD-Ablauf im Blick behalten</li>
          <li>🛒 Automatische Nachkauf-Erinnerungen</li>
          <li>📖 Rezepte mit Gewürz-Verknüpfung</li>
        </ul>
      </div>
      <p className="text-xs text-gray-400">Im nächsten Schritt legst du deine Lagerorte an.</p>
    </div>
  )
}

function LocationStep() {
  const { locations, addLocation, updateLocation, deleteLocation } = useStore()
  const [newName, setNewName] = useState('')

  function add() {
    const n = newName.trim()
    if (!n) return
    addLocation({ name: n })
    setNewName('')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Wo stehen deine Gewürze? Leg die Orte an, damit du sie schnell findest.
      </p>

      {locations.length > 0 && (
        <div className="space-y-2">
          {locations.map(loc => (
            <div key={loc.id} className="flex gap-2 items-center bg-gray-50 dark:bg-gray-900/50 rounded-xl px-3 py-2">
              <span className="text-lg">📍</span>
              <input className="input py-1.5 text-sm flex-1"
                value={loc.name}
                onChange={e => updateLocation(loc.id, { name: e.target.value })} />
              <button onClick={() => { if (confirm(`"${loc.name}" löschen?`)) deleteLocation(loc.id) }}
                className="text-gray-300 hover:text-red-500 px-2">✕</button>
            </div>
          ))}
        </div>
      )}

      {locations.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-400">Noch keine Lagerorte.</p>
          <p className="text-xs text-gray-400 mt-1">Typische Orte: Vorratskiste, Gewürzschrank, Auszugschrank…</p>
        </div>
      )}

      <div className="flex gap-2">
        <input className="input py-2 text-sm flex-1"
          placeholder='z.B. "Vorratskiste 1"' value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }} />
        <button onClick={add} disabled={!newName.trim()}
          className="btn-primary text-sm px-4 disabled:opacity-40">
          +
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {['Vorratskiste 1','Vorratskiste 2','Gewürzschrank','Auszugschrank','Küchenregal'].filter(
          s => !locations.some(l => l.name === s)
        ).map(suggestion => (
          <button key={suggestion}
            onClick={() => addLocation({ name: suggestion })}
            className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full hover:bg-primary-100 dark:hover:bg-primary-900/30">
            + {suggestion}
          </button>
        ))}
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
          <li><strong>Foto-Scan:</strong> Fotografiere dein Gewürz — Name und Marke werden automatisch erkannt.</li>
          <li><strong>Füllstand:</strong> Tippe auf die Balken-Anzeige, um den Füllstand schnell zu ändern.</li>
          <li><strong>Nachkauf:</strong> Wenn alle Einheiten eines Gewürzes leer sind, erscheint es automatisch als Nachkauf-Empfehlung.</li>
          <li><strong>Filter:</strong> Filtere nach Verpackungstyp, Lagerort oder Kategorie.</li>
          <li><strong>MHD-Ablauf:</strong> Im Ablauf-Tab siehst du, was bald abläuft.</li>
        </ul>
      </div>
      <p className="text-xs text-gray-400 text-center">Du kannst den Assistenten jederzeit über ⚙️ Einstellungen erneut starten.</p>
    </div>
  )
}

export default function SpiceSetup({ onComplete }) {
  const steps = [
    { emoji: '🌿', title: 'Willkommen bei Gewürze', subtitle: 'Deine Gewürze im Griff', content: <WelcomeStep /> },
    { emoji: '📍', title: 'Deine Lagerorte', subtitle: 'Wo stehen deine Gewürze?', content: <LocationStep /> },
    { emoji: '🚀', title: 'Bereit!', subtitle: 'Ein paar Tipps zum Einstieg', content: <TipsStep /> },
  ]

  return <SetupWizard module="spice" steps={steps} onComplete={onComplete} onSkip={onComplete} />
}
