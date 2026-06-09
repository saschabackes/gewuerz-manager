import { useState } from 'react'

const SLIDES = [
  {
    emoji: '🌿',
    title: 'Willkommen!',
    text: 'Der Gewürz-Manager hilft dir und deinem Haushalt, den Überblick über alle Gewürze zu behalten – was da ist, wo es liegt, was abläuft und was nachgekauft werden muss.',
  },
  {
    emoji: '➕',
    title: 'Gewürze erfassen',
    text: 'Tippe auf den grünen Plus-Button unten in der Mitte. Name + Verpackungstyp reichen. Bei Pfeffer & Co. unterscheidest du zwischen „ganz" und „gemahlen". Ein passendes Produktfoto wird automatisch gesucht.',
  },
  {
    emoji: '📊',
    title: 'Füllstand im Blick',
    text: 'Die Balken auf jeder Karte zeigen, wie voll ein Gewürz ist. Antippen schaltet eine Stufe runter. Geht etwas zur Neige, schlägt die App automatisch Nachkaufen vor.',
  },
  {
    emoji: '📅',
    title: 'Ablauf & Einräumen',
    text: 'Hinterlege Mindesthaltbarkeitsdaten – die App warnt rechtzeitig. Neue Päckchen vom Einkauf landen oben im „Einräumen"-Symbol und werden mit einem Tipp dem Bestand hinzugefügt.',
  },
  {
    emoji: '🛒',
    title: 'Einkaufsliste & Bring!',
    text: 'Fehlendes landet per Tipp auf der Einkaufsliste. Mit deinem Bring!-Account synchronisiert sich alles direkt mit der Familien-Einkaufsliste – in beide Richtungen.',
  },
  {
    emoji: '📖',
    title: 'Rezepte & Kochen',
    text: 'Speichere Rezepte per Link (Cookidoo, YouTube, Chefkoch oder beliebige Webseite) – Titel, Zutaten und Schritte werden automatisch erkannt. Beim Kochen siehst du sofort, welche Gewürze du hast und welches Glas du am besten zuerst nimmst (älteste MHD zuerst).',
  },
  {
    emoji: '🏠',
    title: 'Gemeinsam nutzen',
    text: 'Lade Familie oder Mitbewohner ein: alle sehen denselben Bestand, dieselbe Einkaufsliste und dieselben Rezepte. Änderungen synchronisieren sich automatisch.',
  },
  {
    emoji: '💡',
    title: 'Tipps & Hilfe',
    text: 'Oben im Header findest du jederzeit Aktivitätsverlauf (Uhr), Hilfe (?) und Einstellungen (Zahnrad). In den Einstellungen verbindest du Bring! und Cookidoo, lädst Haushaltsmitglieder ein und kannst die Tour jederzeit neu starten.',
  },
]

export default function OnboardingView({ onFinish }) {
  const [i, setI] = useState(0)
  const last = i === SLIDES.length - 1
  const slide = SLIDES[i]

  return (
    <div className="fixed inset-0 z-[60] bg-gradient-to-br from-green-600 to-green-800 flex flex-col pt-safe pb-safe fade-enter">
      {/* Überspringen */}
      <div className="flex justify-end px-5 py-3 flex-none">
        {!last && (
          <button onClick={onFinish} className="text-green-100 text-sm font-medium hover:text-white transition-colors">
            Überspringen
          </button>
        )}
      </div>

      {/* Inhalt */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="text-7xl mb-8">{slide.emoji}</div>
        <h2 className="text-2xl font-bold text-white mb-4">{slide.title}</h2>
        <p className="text-green-50 leading-relaxed max-w-sm">{slide.text}</p>
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
          className="flex-1 bg-white text-green-700 rounded-2xl py-3.5 font-bold text-sm hover:bg-green-50 transition-colors"
        >
          {last ? 'Los geht’s 🎉' : 'Weiter'}
        </button>
      </div>
    </div>
  )
}
