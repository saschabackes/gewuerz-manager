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
          grape: data.grape || '',
          color: data.color || 'rot',
          drinkFrom: Number(data.drinkFrom) || (Number(data.vintage) || new Date().getFullYear()) + 1,
          drinkUntil: Number(data.drinkUntil) || (Number(data.vintage) || new Date().getFullYear()) + 5,
          rackId: data.rackId,
          slot: data.slot || '',
          bought: data.bought || '',
          rating: 0,
          count: Math.max(1, Number(data.count) || 1),
          note: data.note || '',
          photoData: data.photoData || null,
        }
        set(s => ({
          bottles: [...s.bottles, b],
          lastUsedRack: { rackId: data.rackId, slot: data.slot },
          recentNames: [b.name, ...s.recentNames.filter(n => n !== b.name)].slice(0, 30),
        }))
        return b.id
      },

      quickAddByName(name) {
        const s = get()
        const rackId = s.lastUsedRack?.rackId || s.racks[0]?.id
        const slot = s.lastUsedRack?.slot || s.racks[0]?.slots[0] || ''
        return get().addBottle({ name, rackId, slot, count: 1, color: 'rot' })
      },

      drinkOne(id, rating) {
        set(s => ({
          bottles: s.bottles
            .map(b => b.id===id ? { ...b, count: b.count - 1, rating: rating ?? b.rating } : b)
            .filter(b => b.count > 0),
        }))
      },
      removeBottle(id) { set(s => ({ bottles: s.bottles.filter(b => b.id !== id) })) },

      seedDemoData() {
        const samples = [
          { name: 'Riesling Kabinett', winery: 'Loosen',    vintage: 2022, region: 'Mosel',     grape: 'Riesling', color: 'weiß', drinkFrom: 2023, drinkUntil: 2028, rackId: 'r_wz',     slot: 'A/1', count: 3 },
          { name: 'Barolo',            winery: 'Vietti',    vintage: 2018, region: 'Piemont',   grape: 'Nebbiolo', color: 'rot',  drinkFrom: 2024, drinkUntil: 2035, rackId: 'r_wz',     slot: 'B/2', count: 2 },
          { name: 'Châteauneuf-du-Pape', winery: 'Beaucastel', vintage: 2017, region: 'Rhône',  grape: 'Grenache', color: 'rot',  drinkFrom: 2020, drinkUntil: 2030, rackId: 'r_keller', slot: '3',   count: 1 },
          { name: 'Sauvignon Blanc',   winery: 'Cloudy Bay', vintage: 2023, region: 'Marlborough', grape: 'Sauvignon Blanc', color: 'weiß', drinkFrom: 2024, drinkUntil: 2026, rackId: 'r_kueche', slot: 'mitte', count: 4 },
          { name: 'Spätburgunder',     winery: 'Bernhard Huber', vintage: 2020, region: 'Baden', grape: 'Pinot Noir', color: 'rot', drinkFrom: 2023, drinkUntil: 2029, rackId: 'r_wz', slot: 'B/1', count: 2 },
          { name: 'Champagner Brut',   winery: 'Pol Roger', vintage: 2015, region: 'Champagne', grape: 'Chardonnay/Pinot', color: 'schaum', drinkFrom: 2022, drinkUntil: 2032, rackId: 'r_kueche', slot: 'oben', count: 1 },
        ]
        set({
          bottles: samples.map(s => ({ id: uid('b'), rating: 0, note: '', photoData: null, ...s })),
          recentNames: ['Riesling Kabinett','Barolo','Sauvignon Blanc','Spätburgunder'],
          lastUsedRack: { rackId: 'r_wz', slot: 'A/1' },
        })
      },
      clear() { set({ bottles: [], recentNames: [], lastUsedRack: null }) },
      resetSetup() { set({ racks: DEFAULT_RACKS, bottles: [], recentNames: [], lastUsedRack: null }) },
    }),
    { name: 'haushalt-cellar-v2' }
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
