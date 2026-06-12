// Modul-Registry für den Haushalts-Manager-Prototyp.
// Jedes Modul beschreibt sich selbst (Icon, Label, Farbe, Default-Route).
// Wird im LOCAL-PROTOTYP per LocalStorage gespeichert – kein Supabase-Eingriff.

export const MODULES = [
  {
    id: 'spices',
    label: 'Gewürze',
    emoji: '🌿',
    description: 'Gewürzregal, Füllstand, MHD',
    isCore: true,
  },
  {
    id: 'freezer',
    label: 'Tiefkühl',
    emoji: '❄️',
    description: 'Schubladen, Portionen, Einfrierdatum',
  },
  {
    id: 'cellar',
    label: 'Wein',
    emoji: '🍷',
    description: 'Flaschen, Trinkfenster, Bewertung',
  },
  {
    id: 'shopping',
    label: 'Einkauf',
    emoji: '🛒',
    description: 'Zentrale Einkaufsliste (alle Module)',
  },
]

export function moduleById(id) {
  return MODULES.find(m => m.id === id) || MODULES[0]
}
