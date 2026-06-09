// Modul-Registry für den Haushalts-Manager-Prototyp.
// Jedes Modul beschreibt sich selbst (Icon, Label, Farbe, Default-Route).
// Wird im LOCAL-PROTOTYP per LocalStorage gespeichert – kein Supabase-Eingriff.

export const MODULES = [
  {
    id: 'spices',
    label: 'Gewürze',
    emoji: '🌿',
    color: 'green',
    description: 'Gewürzregal, Füllstand, MHD',
    isCore: true, // bestehende App
  },
  {
    id: 'freezer',
    label: 'Tiefkühl',
    emoji: '❄️',
    color: 'sky',
    description: 'Schubladen, Portionen, Einfrierdatum',
  },
  {
    id: 'cellar',
    label: 'Weinkeller',
    emoji: '🍷',
    color: 'rose',
    description: 'Flaschen, Trinkfenster, Bewertung',
  },
]

export function moduleById(id) {
  return MODULES.find(m => m.id === id) || MODULES[0]
}
