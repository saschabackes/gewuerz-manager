// LocalStorage-Store für den TK-Prototyp.
// Kein Supabase, kein Sharing – nur lokales Spielen.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Typische Haltbarkeiten in Tagen je Kategorie (TK-Empfehlung)
export const FREEZER_SHELF_LIFE = {
  fleisch_roh: 240,
  fleisch_gegart: 90,
  fisch: 120,
  geflügel: 270,
  gemüse: 365,
  obst: 365,
  brot: 90,
  fertiggericht: 90,
  kräuter: 180,
  suppe: 90,
  sonstiges: 180,
}

export const CATEGORIES = [
  { id: 'fleisch_roh',     label: 'Fleisch roh',      emoji: '🥩' },
  { id: 'fleisch_gegart',  label: 'Fleisch gegart',   emoji: '🍖' },
  { id: 'geflügel',        label: 'Geflügel',         emoji: '🍗' },
  { id: 'fisch',           label: 'Fisch',            emoji: '🐟' },
  { id: 'gemüse',          label: 'Gemüse',           emoji: '🥦' },
  { id: 'obst',            label: 'Obst',             emoji: '🍓' },
  { id: 'brot',            label: 'Brot/Teig',        emoji: '🥖' },
  { id: 'fertiggericht',   label: 'Fertiggericht',    emoji: '🍱' },
  { id: 'kräuter',         label: 'Kräuter',          emoji: '🌿' },
  { id: 'suppe',           label: 'Suppe/Sauce',      emoji: '🥣' },
  { id: 'sonstiges',       label: 'Sonstiges',        emoji: '📦' },
]

function uid() {
  return 'tk_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function calcExpiry(category, frozenAt) {
  const days = FREEZER_SHELF_LIFE[category] ?? 180
  const d = new Date(frozenAt)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const DEFAULT_DRAWERS = [
  { id: 'd1', label: 'Schublade 1' },
  { id: 'd2', label: 'Schublade 2' },
  { id: 'd3', label: 'Schublade 3' },
  { id: 'd4', label: 'Schublade 4' },
]

export const useFreezer = create(
  persist(
    (set, get) => ({
      drawers: DEFAULT_DRAWERS,
      items: [], // {id, name, category, drawerId, portions, portionSize, frozenAt, expiryDate, note}

      addItem(data) {
        const frozenAt = data.frozenAt || new Date().toISOString().slice(0, 10)
        const item = {
          id: uid(),
          name: data.name.trim(),
          category: data.category || 'sonstiges',
          drawerId: data.drawerId || 'd1',
          portions: Math.max(1, Number(data.portions) || 1),
          portionSize: data.portionSize || '',
          frozenAt,
          expiryDate: calcExpiry(data.category || 'sonstiges', frozenAt),
          note: data.note || '',
        }
        set(s => ({ items: [...s.items, item] }))
        return item.id
      },

      consumePortion(id) {
        set(s => ({
          items: s.items
            .map(it => it.id === id ? { ...it, portions: it.portions - 1 } : it)
            .filter(it => it.portions > 0),
        }))
      },

      removeItem(id) {
        set(s => ({ items: s.items.filter(it => it.id !== id) }))
      },

      seedDemoData() {
        const today = new Date().toISOString().slice(0, 10)
        const oldDate = (days) => {
          const d = new Date(); d.setDate(d.getDate() - days)
          return d.toISOString().slice(0, 10)
        }
        const sample = [
          { name: 'Hähnchenbrust', category: 'geflügel',   drawerId: 'd1', portions: 3, portionSize: '150 g', frozenAt: oldDate(45)  },
          { name: 'Lasagne',       category: 'fertiggericht', drawerId: 'd2', portions: 2, portionSize: 'Portion', frozenAt: oldDate(20)  },
          { name: 'Erbsen',        category: 'gemüse',     drawerId: 'd3', portions: 4, portionSize: '200 g', frozenAt: oldDate(120) },
          { name: 'Lachsfilet',    category: 'fisch',      drawerId: 'd1', portions: 2, portionSize: '180 g', frozenAt: oldDate(60)  },
          { name: 'Toastbrot',     category: 'brot',       drawerId: 'd4', portions: 1, portionSize: 'Laib',  frozenAt: oldDate(70)  },
          { name: 'Hackfleisch',   category: 'fleisch_roh', drawerId: 'd1', portions: 2, portionSize: '500 g', frozenAt: oldDate(30) },
          { name: 'Petersilie',    category: 'kräuter',    drawerId: 'd3', portions: 5, portionSize: 'EL',    frozenAt: oldDate(90) },
        ]
        set({ items: sample.map(s => ({
          id: uid(),
          ...s,
          expiryDate: calcExpiry(s.category, s.frozenAt),
          note: '',
        })) })
      },

      clear() { set({ items: [] }) },
    }),
    { name: 'haushalt-freezer-v1' }
  )
)
