import { useState } from 'react'
import { MODULES_ENABLED, APP_NAME } from '../branding'

const SLIDES_DEPOT = [
  {
    emoji: '🏠',
    title: 'Willkommen!',
    text: 'Depot hilft dir und deinem Haushalt, den Überblick über Gewürze, Tiefkühl-Vorräte und Weine zu behalten – was da ist, wo es liegt, was abläuft und was nachgekauft werden muss.',
  },
  {
    emoji: '➕',
    title: 'Produkte erfassen',
    text: 'Tippe auf den Plus-Button unten in der Mitte. Je nach aktivem Modul (Gewürze, TK, Wein) öffnet sich das passende Formular. Name reicht zum Start – der Rest kann später ergänzt werden.',
  },
  {
    emoji: '❄️',
    title: 'Tiefkühl & Wein',
    text: 'Neben Gewürzen verwaltest du auch Tiefkühl-Vorräte (Portionen, Einfrierdatum, mehrere Schränke) und Weine (Trinkfenster, Lagerbedingungen, Bewertungen). Wechsle unten zwischen den Modulen.',
  },
  {
    emoji: '📅',
    title: 'Ablauf & Einräumen',
    text: 'Jedes Modul hat einen Ablauf-Tab: MHD bei Gewürzen, Verfallsdaten bei TK, Trinkfenster bei Wein. Neue Einkäufe landen in der Einräumen-Queue und werden mit einem Tipp dem richtigen Lagerplatz zugeordnet.',
  },
  {
    emoji: '🛒',
    title: 'Zentrale Einkaufsliste',
    text: 'Gewürze, TK-Produkte und Weine können zum Nachkaufen markiert werden – alles landet auf einer zentralen Einkaufsliste. Bring!-Anbindung für die Familien-Einkaufsliste inklusive.',
  },
  {
    emoji: '📖',
    title: 'Kochen & Pairing',
    text: 'Speichere Rezepte per Link – die App erkennt Zutaten automatisch und zeigt, was du im Bestand hast. Beim Wein findest du passende Flaschen zu jedem Gericht. Der Kochen-Tab ist in allen Modulen verfügbar.',
  },
  {
    emoji: '🏠',
    title: 'Gemeinsam nutzen',
    text: 'Lade Familie oder Mitbewohner ein: alle sehen denselben Bestand, dieselbe Einkaufsliste und dieselben Rezepte. Änderungen synchronisieren sich automatisch.',
  },
  {
    emoji: '💡',
    title: 'Tipps & Hilfe',
    text: 'Oben im Header findest du Verlauf (Uhr), Hilfe (?) und Einstellungen (Zahnrad). In den Einstellungen verbindest du Bring! und Cookidoo, lädst Haushaltsmitglieder ein und kannst die Tour jederzeit neu starten.',
  },
]

const SLIDES_SPICE = [
  {
    emoji: '🌿',
    title: 'Willkommen!',
    text: 'Der Gewürzmanager hilft dir, den Überblick über deine Gewürze zu behalten – was da ist, wo es steht, was abläuft und was nachgekauft werden muss.',
  },
  {
    emoji: '➕',
    title: 'Gewürz hinzufügen',
    text: 'Tippe auf den Plus-Button. Name und Verpackungstyp reichen zum Start – Marke, Foto, MHD und mehr kannst du jederzeit ergänzen.',
  },
  {
    emoji: '📊',
    title: 'Füllstand & MHD',
    text: 'Tippe auf die Balken einer Karte, um den Füllstand zu aktualisieren. Der Ablauf-Tab zeigt dir, welche Gewürze bald ablaufen.',
  },
  {
    emoji: '🛒',
    title: 'Einkaufsliste',
    text: 'Gewürze mit niedrigem Füllstand zum Nachkaufen markieren – optional direkt in deine Bring!-Liste übernehmen.',
  },
  {
    emoji: '🏠',
    title: 'Gemeinsam nutzen',
    text: 'Lade Familie oder Mitbewohner ein: alle sehen denselben Bestand und dieselbe Einkaufsliste.',
  },
  {
    emoji: '💡',
    title: 'Tipps & Hilfe',
    text: 'Oben im Header findest du Verlauf (Uhr), Hilfe (?) und Einstellungen (Zahnrad). In den Einstellungen verbindest du Bring!, lädst Haushaltsmitglieder ein und kannst die Tour jederzeit neu starten.',
  },
]

const SLIDES = MODULES_ENABLED ? SLIDES_DEPOT : SLIDES_SPICE

export default function OnboardingView({ onFinish }) {
  const [i, setI] = useState(0)
  const last = i === SLIDES.length - 1
  const slide = SLIDES[i]

  return (
    <div className="fixed inset-0 z-[60] bg-gradient-to-br from-indigo-600 to-green-800 flex flex-col pt-safe pb-safe fade-enter">
      {/* Überspringen */}
      <div className="flex justify-end px-5 py-3 flex-none">
        {!last && (
          <button onClick={onFinish} className="text-indigo-100 text-sm font-medium hover:text-white transition-colors">
            Überspringen
          </button>
        )}
      </div>

      {/* Inhalt */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="text-7xl mb-8">{slide.emoji}</div>
        <h2 className="text-2xl font-bold text-white mb-4">{slide.title}</h2>
        <p className="text-indigo-50 leading-relaxed max-w-sm">{slide.text}</p>
      </div>

      {/* Punkte */}
      <div className="flex justify-center gap-2 mb-6 flex-none">
        {SLIDES.map((_, idx) => (
          <div
            key={idx}
            className={`h-2 rounded-full transition-all ${idx === i ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 px-6 pb-6 flex-none">
        {i > 0 && (
          <button
            onClick={() => setI(i - 1)}
            className="flex-1 bg-white/15 text-white rounded-2xl py-3.5 font-semibold text-sm hover:bg-white/25 transition-colors backdrop-blur-sm"
          >
            Zurück
          </button>
        )}
        <button
          onClick={() => last ? onFinish() : setI(i + 1)}
          className="flex-1 bg-white text-indigo-700 rounded-2xl py-3.5 font-bold text-sm hover:bg-indigo-50 transition-colors"
        >
          {last ? 'Los geht’s 🎉' : 'Weiter'}
        </button>
      </div>
    </div>
  )
}
