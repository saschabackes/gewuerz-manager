import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function uid() { return 'w_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36) }

export const useCellar = create(
  persist(
    (set, get) => ({
      bottles: [], // {id, name, winery, vintage, region, grape, color, drinkFrom, drinkUntil, slot, bought, rating, note}

      addBottle(data) {
        const b = {
          id: uid(),
          name: data.name.trim(),
          winery: data.winery || '',
          vintage: Number(data.vintage) || new Date().getFullYear(),
          region: data.region || '',
          grape: data.grape || '',
          color: data.color || 'rot',
          drinkFrom: Number(data.drinkFrom) || (Number(data.vintage) || new Date().getFullYear()) + 1,
          drinkUntil: Number(data.drinkUntil) || (Number(data.vintage) || new Date().getFullYear()) + 5,
          slot: data.slot || '',
          bought: data.bought || '',
          rating: 0,
          count: Math.max(1, Number(data.count) || 1),
          note: data.note || '',
        }
        set(s => ({ bottles: [...s.bottles, b] }))
        return b.id
      },

      drinkOne(id, rating) {
        set(s => ({
          bottles: s.bottles
            .map(b => b.id === id
              ? { ...b, count: b.count - 1, rating: rating ?? b.rating }
              : b)
            .filter(b => b.count > 0),
        }))
      },

      removeBottle(id) { set(s => ({ bottles: s.bottles.filter(b => b.id !== id) })) },

      seedDemoData() {
        const samples = [
          { name: 'Riesling Kabinett', winery: 'Loosen',  vintage: 2022, region: 'Mosel', grape: 'Riesling', color: 'weiß', drinkFrom: 2023, drinkUntil: 2028, slot: 'A/1', bought: '2023-04', count: 3 },
          { name: 'Barolo',            winery: 'Vietti',  vintage: 2018, region: 'Piemont', grape: 'Nebbiolo', color: 'rot', drinkFrom: 2024, drinkUntil: 2035, slot: 'B/2', bought: '2024-09', count: 2 },
          { name: 'Châteauneuf-du-Pape', winery: 'Beaucastel', vintage: 2017, region: 'Rhône', grape: 'Grenache', color: 'rot', drinkFrom: 2020, drinkUntil: 2030, slot: 'B/3', bought: '2022-12', count: 1 },
          { name: 'Sauvignon Blanc',   winery: 'Cloudy Bay', vintage: 2023, region: 'Marlborough', grape: 'Sauvignon Blanc', color: 'weiß', drinkFrom: 2024, drinkUntil: 2026, slot: 'A/2', bought: '2024-06', count: 4 },
          { name: 'Spätburgunder',     winery: 'Bernhard Huber', vintage: 2020, region: 'Baden', grape: 'Pinot Noir', color: 'rot', drinkFrom: 2023, drinkUntil: 2029, slot: 'B/1', bought: '2023-11', count: 2 },
          { name: 'Champagner Brut',   winery: 'Pol Roger', vintage: 2015, region: 'Champagne', grape: 'Chardonnay/Pinot', color: 'schaum', drinkFrom: 2022, drinkUntil: 2032, slot: 'C/1', bought: '2024-01', count: 1 },
        ]
        set({ bottles: samples.map(s => ({
          id: uid(), rating: 0, note: '', ...s,
        })) })
      },

      clear() { set({ bottles: [] }) },
    }),
    { name: 'haushalt-cellar-v1' }
  )
)

// Ist die Flasche im Trinkfenster?
export function drinkStatus(b) {
  const y = new Date().getFullYear()
  if (y < b.drinkFrom) return { label: `noch ${b.drinkFrom - y} J zu jung`, cls: 'bg-sky-100 text-sky-700' }
  if (y > b.drinkUntil) return { label: `${y - b.drinkUntil} J über Höhepunkt`, cls: 'bg-red-100 text-red-700' }
  const rest = b.drinkUntil - y
  if (rest <= 1) return { label: `bald trinken (bis ${b.drinkUntil})`, cls: 'bg-orange-100 text-orange-700' }
  return { label: `optimal bis ${b.drinkUntil}`, cls: 'bg-emerald-100 text-emerald-700' }
}
