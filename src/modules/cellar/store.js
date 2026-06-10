import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function uid(p='w') { return p + '_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36) }

// Default-Regale (frei umbenennbar/erweiterbar)
const DEFAULT_RACKS = [
  { id: 'r_wz',     label: 'Regal Wohnzimmer', emoji: '🛋️', slots: ['A/1','A/2','A/3','B/1','B/2','B/3','C/1','C/2','C/3'] },
  { id: 'r_keller', label: 'Regal Keller',     emoji: '🔻', slots: ['1','2','3','4','5','6'] },
  { id: 'r_kueche', label: 'Weinkühlschrank',  emoji: '🧊', slots: ['oben','mitte','unten'] },
]

export const useCellar = create(
  persist(
    (set, get) => ({
      racks: DEFAULT_RACKS,
      bottles: [],
      recentNames: [],
      lastUsedRack: null, // {rackId, slot}

      // ── Racks ──────────────────────────────────────────────────────────────
      addRack(label, emoji='🍷') {
        const r = { id: uid('r'), label, emoji, slots: ['1','2','3'] }
        set(s => ({ racks: [...s.racks, r] }))
        return r.id
      },
      renameRack(id, label, emoji) {
        set(s => ({ racks: s.racks.map(r => r.id===id ? { ...r, label, emoji: emoji ?? r.emoji } : r) }))
      },
      removeRack(id) {
        set(s => ({
          racks: s.racks.filter(r => r.id !== id),
          bottles: s.bottles.filter(b => b.rackId !== id),
        }))
      },
      addSlot(rackId, label) {
        set(s => ({ racks: s.racks.map(r => r.id===rackId ? { ...r, slots: [...r.slots, label] } : r) }))
      },
      renameSlot(rackId, oldLabel, newLabel) {
        set(s => ({
          racks: s.racks.map(r => r.id===rackId
            ? { ...r, slots: r.slots.map(s2 => s2===oldLabel ? newLabel : s2) }
            : r),
          bottles: s.bottles.map(b => b.rackId===rackId && b.slot===oldLabel ? { ...b, slot: newLabel } : b),
        }))
      },
      removeSlot(rackId, label) {
        set(s => ({
          racks: s.racks.map(r => r.id===rackId
            ? { ...r, slots: r.slots.filter(s2 => s2 !== label) } : r),
          bottles: s.bottles.filter(b => !(b.rackId===rackId && b.slot===label)),
        }))
      },

      // ── Bottles ────────────────────────────────────────────────────────────
      addBottle(data) {
        const b = {
          id: uid('b'),
          name: data.name.trim(),
          winery: data.winery || '',
          vintage: Number(data.vintage) || new Date().getFullYear(),
          region: data.region || '',
          country: data.country || '',
          grape: data.grape || '',
          color: data.color || 'rot',
          alcohol: data.alcohol || '',
          drinkFrom: Number(data.drinkFrom) || (Number(data.vintage) || new Date().getFullYear()) + 1,
          drinkUntil: Number(data.drinkUntil) || (Number(data.vintage) || new Date().getFullYear()) + 5,
          rackId: data.rackId,
          slot: data.slot || '',
          bought: data.bought || '',
          priceEur: data.priceEur ? Number(data.priceEur) : null,
          rating: Number(data.rating) || 0,
          tastingNotes: data.tastingNotes || '',
          tasteProfile: data.tasteProfile || {}, // { sweetness, body, acidity, tannin, oak }
          aromas: data.aromas || [],
          pairings: data.pairings || [],
          restock: !!data.restock,
          count: Math.max(1, Number(data.count) || 1),
          note: data.note || '',
          photoData: data.photoData || null,
          history: [], // [{ id, date, rating, occasion, note }]
        }
        set(s => ({
          bottles: [...s.bottles, b],
          lastUsedRack: { rackId: data.rackId, slot: data.slot },
          recentNames: [b.name, ...s.recentNames.filter(n => n !== b.name)].slice(0, 30),
        }))
        return b.id
      },

      updateBottle(id, patch) {
        set(s => ({ bottles: s.bottles.map(b => b.id === id ? { ...b, ...patch } : b) }))
      },

      toggleRestock(id) {
        set(s => ({ bottles: s.bottles.map(b => b.id === id ? { ...b, restock: !b.restock } : b) }))
      },

      quickAddByName(name) {
        const s = get()
        const rackId = s.lastUsedRack?.rackId || s.racks[0]?.id
        const slot = s.lastUsedRack?.slot || s.racks[0]?.slots[0] || ''
        return get().addBottle({ name, rackId, slot, count: 1, color: 'rot' })
      },

      drinkOne(id, entry = {}) {
        const date = entry.date || new Date().toISOString().slice(0, 10)
        const rating = Number(entry.rating) || undefined
        set(s => ({
          bottles: s.bottles.map(b => {
            if (b.id !== id) return b
            const history = [...(b.history || []), {
              id: uid('h'), date, rating: rating ?? null,
              occasion: entry.occasion || '', note: entry.note || '',
            }]
            return {
              ...b,
              count: b.count - 1,
              rating: rating ?? b.rating,
              tastingNotes: entry.note ? entry.note : b.tastingNotes,
              history,
            }
          }),
        }))
        // count==0 → trotzdem behalten (Geschichte interessant). Erst auf Wunsch entfernen.
      },
      removeBottle(id) { set(s => ({ bottles: s.bottles.filter(b => b.id !== id) })) },

      seedDemoData() {
        const samples = [
          { name: 'Riesling Kabinett', winery: 'Loosen',    vintage: 2022, region: 'Mosel',     country: 'Deutschland', grape: 'Riesling', color: 'weiß', alcohol: '8.5 %',
            drinkFrom: 2023, drinkUntil: 2028, rackId: 'r_wz', slot: 'A/1', count: 3, priceEur: 14, rating: 4,
            tasteProfile: { sweetness: 'halbtrocken', body: 'leicht', acidity: 'frisch' },
            aromas: ['🍐 Birne','🍏 Grüner Apfel','🌱 Mineralisch','🍋 Zitrone'],
            pairings: ['fisch_zart','meeresfrüchte','sushi','asia_süss','salat'],
            tastingNotes: 'Klassisch mineralisch, knackige Säure, lebendig.' },

          { name: 'Barolo',            winery: 'Vietti',    vintage: 2018, region: 'Piemont',   country: 'Italien', grape: 'Nebbiolo', color: 'rot', alcohol: '14 %',
            drinkFrom: 2024, drinkUntil: 2035, rackId: 'r_wz', slot: 'B/2', count: 2, priceEur: 65, rating: 5,
            tasteProfile: { sweetness: 'trocken', body: 'voll', acidity: 'frisch', tannin: 'kräftig', oak: 'spürbar' },
            aromas: ['🍒 Kirsche','🌹 Rose','🍂 Tabak','🧁 Vanille','🪵 Holz'],
            pairings: ['rind_lamm','wild','käse_hart','pilze','gegrilltes'],
            tastingNotes: 'Geht ewig in der Flasche, ideal zu Steak.' },

          { name: 'Châteauneuf-du-Pape', winery: 'Beaucastel', vintage: 2017, region: 'Rhône', country: 'Frankreich', grape: 'Grenache/Syrah/Mourvèdre', color: 'rot', alcohol: '14.5 %',
            drinkFrom: 2020, drinkUntil: 2030, rackId: 'r_keller', slot: '3', count: 1, priceEur: 75, rating: 5,
            tasteProfile: { sweetness: 'trocken', body: 'voll', acidity: 'mittel', tannin: 'mittel', oak: 'dezent' },
            aromas: ['🍒 Brombeere','🌶️ Pfeffer','🍂 Tabak','⛰️ Erdig','🌿 Kräuter'],
            pairings: ['rind_lamm','wild','gegrilltes','käse_hart'],
            tastingNotes: 'Kraftvoll, würzig, perfekt zum Sonntagsbraten.' },

          { name: 'Sauvignon Blanc',   winery: 'Cloudy Bay', vintage: 2023, region: 'Marlborough', country: 'Neuseeland', grape: 'Sauvignon Blanc', color: 'weiß', alcohol: '13 %',
            drinkFrom: 2024, drinkUntil: 2026, rackId: 'r_kueche', slot: 'mitte', count: 4, priceEur: 28, rating: 4,
            tasteProfile: { sweetness: 'trocken', body: 'leicht', acidity: 'frisch' },
            aromas: ['🍏 Grüner Apfel','🍍 Tropisch','🍋 Zitrone','🌿 Kräuter'],
            pairings: ['fisch_zart','meeresfrüchte','salat','sushi','geflügel','käse_weich'],
            tastingNotes: 'Frisch, kräuterig, knackig.' },

          { name: 'Spätburgunder',     winery: 'Bernhard Huber', vintage: 2020, region: 'Baden', country: 'Deutschland', grape: 'Pinot Noir', color: 'rot', alcohol: '13 %',
            drinkFrom: 2023, drinkUntil: 2029, rackId: 'r_wz', slot: 'B/1', count: 2, priceEur: 35, rating: 4,
            tasteProfile: { sweetness: 'trocken', body: 'mittel', acidity: 'frisch', tannin: 'mittel', oak: 'dezent' },
            aromas: ['🍒 Kirsche','🫐 Heidelbeere','🌹 Rose','🍄 Pilz'],
            pairings: ['ente_gans','geflügel','pilze','fisch_kräftig','schwein'],
            tastingNotes: 'Eleganter Pinot, vielseitig am Tisch.' },

          { name: 'Champagner Brut',   winery: 'Pol Roger', vintage: 2015, region: 'Champagne', country: 'Frankreich', grape: 'Chardonnay/Pinot Noir', color: 'schaum', alcohol: '12.5 %',
            drinkFrom: 2022, drinkUntil: 2032, rackId: 'r_kueche', slot: 'oben', count: 1, priceEur: 95, rating: 5,
            tasteProfile: { sweetness: 'trocken', body: 'mittel', acidity: 'frisch' },
            aromas: ['🥖 Brioche','🍐 Birne','🍋 Zitrone','🥥 Kokos'],
            pairings: ['aperitif','meeresfrüchte','sushi','käse_weich','dessert_fruit'],
            tastingNotes: 'Klassisch, langer Abgang, Festtagswein.' },
        ]
        set({
          bottles: samples.map(s => ({ id: uid('b'), note: '', photoData: null, restock: false, history: [], ...s })),
          recentNames: ['Riesling Kabinett','Barolo','Sauvignon Blanc','Spätburgunder'],
          lastUsedRack: { rackId: 'r_wz', slot: 'A/1' },
        })
      },
      clear() { set({ bottles: [], recentNames: [], lastUsedRack: null }) },
      resetSetup() { set({ racks: DEFAULT_RACKS, bottles: [], recentNames: [], lastUsedRack: null }) },
    }),
    { name: 'haushalt-cellar-v3' }
  )
)

export function drinkStatus(b) {
  const y = new Date().getFullYear()
  if (y < b.drinkFrom) return { label: `noch ${b.drinkFrom - y} J zu jung`,    cls: 'bg-sky-100 text-sky-700' }
  if (y > b.drinkUntil) return { label: `${y - b.drinkUntil} J über Höhepunkt`, cls: 'bg-red-100 text-red-700' }
  const rest = b.drinkUntil - y
  if (rest <= 1) return { label: `bald trinken (bis ${b.drinkUntil})`,         cls: 'bg-orange-100 text-orange-700' }
  return { label: `optimal bis ${b.drinkUntil}`,                                cls: 'bg-emerald-100 text-emerald-700' }
}
