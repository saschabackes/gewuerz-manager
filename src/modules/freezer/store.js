// LocalStorage-Store für den TK-Prototyp.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const FREEZER_SHELF_LIFE = {
  fleisch_roh: 240, fleisch_gegart: 90, fisch: 120, geflügel: 270,
  gemüse: 365, obst: 365, brot: 90, fertiggericht: 90, kräuter: 180,
  suppe: 90, eis: 180, teig: 90, hundefutter: 180, tierfutter: 180,
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
  { id: 'teig',            label: 'Teig',             emoji: '🥐' },
  { id: 'fertiggericht',   label: 'Fertiggericht',    emoji: '🍱' },
  { id: 'eis',             label: 'Eis',              emoji: '🍨' },
  { id: 'kräuter',         label: 'Kräuter',          emoji: '🌿' },
  { id: 'suppe',           label: 'Suppe/Sauce',      emoji: '🥣' },
  { id: 'hundefutter',     label: 'Hundefutter',      emoji: '🐶' },
  { id: 'tierfutter',      label: 'Tierfutter',       emoji: '🐠' },
  { id: 'sonstiges',       label: 'Sonstiges',        emoji: '📦' },
]

function uid(p='tk') { return p + '_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36) }
function today()     { return new Date().toISOString().slice(0,10) }
function calcExpiry(category, frozenAt) {
  const days = FREEZER_SHELF_LIFE[category] ?? 180
  const d = new Date(frozenAt); d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Default-Setup: zwei Gefrierschränke wie bei Sascha
const DEFAULT_STORAGES = [
  {
    id: 's_eg', label: 'Gefrierschrank Erdgeschoss', emoji: '🏠',
    compartments: [
      { id: 'eg_1', label: 'Schublade 1 (oben)' },
      { id: 'eg_2', label: 'Schublade 2' },
      { id: 'eg_3', label: 'Schublade 3' },
      { id: 'eg_4', label: 'Schublade 4 (unten)' },
    ],
  },
  {
    id: 's_keller', label: 'Gefrierschrank Keller', emoji: '🔻',
    compartments: [
      { id: 'k_1', label: 'Korb 1 (oben)' },
      { id: 'k_2', label: 'Korb 2' },
      { id: 'k_3', label: 'Korb 3' },
      { id: 'k_4', label: 'Korb 4' },
      { id: 'k_5', label: 'Korb 5' },
      { id: 'k_door', label: 'Tür' },
    ],
  },
]

// Auto-Kategorisierung anhand Schlüsselwörtern im Namen
const KEYWORD_CAT = [
  ['eis|sorbet|magnum|cornetto', 'eis'],
  ['hähnchen|hühnchen|huhn|pute|ente|gans', 'geflügel'],
  ['lachs|forelle|kabeljau|garnele|krabben|seelachs|fisch|stäbchen|matjes', 'fisch'],
  ['rinder|hack|gulasch|filet|steak|kotelett|schinken|wurst|schwein', 'fleisch_roh'],
  ['gemüse|erbsen|spinat|bohnen|brokkoli|blumenkohl|möhren|karotten|paprika|zwiebel', 'gemüse'],
  ['beeren|himbeer|heidelbeer|erdbeer|kirsch|mango|obst', 'obst'],
  ['brot|brötchen|baguette|toast|teig|pizza', 'brot'],
  ['hund|barf|hundefutter', 'hundefutter'],
  ['aquarium|frostfutter|fischfutter|cichlid|artemia|mücken', 'tierfutter'],
  ['suppe|brühe|sauce|soße|fond|eintopf', 'suppe'],
  ['petersilie|schnittlauch|basilikum|kräuter|dill', 'kräuter'],
  ['lasagne|maultaschen|fertig|gericht|menü', 'fertiggericht'],
]
export function autoCategory(name) {
  const n = (name || '').toLowerCase()
  for (const [re, cat] of KEYWORD_CAT) if (new RegExp(re).test(n)) return cat
  return 'sonstiges'
}

// Sprach-Input parsen: "Drei Lasagne in Keller Korb 2"
export function parseVoiceInput(text, storages) {
  const t = (text || '').toLowerCase().trim()
  if (!t) return null
  const numWords = { eins:1, ein:1, eine:1, einen:1, einer:1, zwei:2, drei:3, vier:4, fünf:5, sechs:6, sieben:7, acht:8, neun:9, zehn:10 }
  const portionsMatch = t.match(/^\s*(\d+|eins|ein|eine|einen|einer|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)\b/)
  let portions = 1
  let rest = t
  if (portionsMatch) {
    portions = Number(portionsMatch[1]) || numWords[portionsMatch[1]] || 1
    rest = t.slice(portionsMatch[0].length).trim()
  }
  // Lokation am Ende ("in keller korb 2" / "ins erdgeschoss")
  let storage = null, compartment = null
  for (const s of storages) {
    const labelWords = s.label.toLowerCase().split(/\s+/)
    if (labelWords.some(w => w.length >= 4 && rest.includes(w))) { storage = s; break }
  }
  if (storage) {
    for (const c of storage.compartments) {
      const cw = c.label.toLowerCase().match(/\b\w{3,}\b|\d+/g) || []
      if (cw.some(w => rest.includes(w))) { compartment = c; break }
    }
  }
  // Namen säubern: Lokations-Tokens abschneiden
  let name = rest
    .replace(/\b(in|ins|im|auf|bei|nach|zu|zum|zur)\b/g, ' ')
    .replace(/portion(en)?|stück|packung(en)?/g, ' ')
  if (storage) name = name.replace(new RegExp(storage.label.toLowerCase().replace(/[()]/g,''), 'g'), ' ')
  if (compartment) name = name.replace(new RegExp(compartment.label.toLowerCase().replace(/[()]/g,''), 'g'), ' ')
  name = name.replace(/\s+/g, ' ').trim()
  if (!name) return null
  return { name: name.charAt(0).toUpperCase() + name.slice(1), portions, storageId: storage?.id, compartmentId: compartment?.id }
}

export const useFreezer = create(
  persist(
    (set, get) => ({
      storages: DEFAULT_STORAGES,
      items: [], // {id, name, category, storageId, compartmentId, portions, portionSize, frozenAt, expiryDate, note, photoData}
      lastUsedCompartment: null, // {storageId, compartmentId}
      recentNames: [], // Häufigkeitsverlauf

      // ── Storage-Verwaltung ──────────────────────────────────────────────────
      addStorage(label, emoji='📦') {
        const s = { id: uid('s'), label, emoji, compartments: [{ id: uid('c'), label: 'Fach 1' }] }
        set(st => ({ storages: [...st.storages, s] }))
        return s.id
      },
      renameStorage(id, label, emoji) {
        set(st => ({ storages: st.storages.map(s => s.id===id ? { ...s, label, emoji: emoji ?? s.emoji } : s) }))
      },
      removeStorage(id) {
        set(st => ({
          storages: st.storages.filter(s => s.id !== id),
          items: st.items.filter(it => it.storageId !== id),
        }))
      },
      addCompartment(storageId, label) {
        set(st => ({
          storages: st.storages.map(s => s.id===storageId
            ? { ...s, compartments: [...s.compartments, { id: uid('c'), label }] } : s)
        }))
      },
      renameCompartment(storageId, compartmentId, label) {
        set(st => ({
          storages: st.storages.map(s => s.id===storageId
            ? { ...s, compartments: s.compartments.map(c => c.id===compartmentId ? { ...c, label } : c) } : s)
        }))
      },
      removeCompartment(storageId, compartmentId) {
        set(st => ({
          storages: st.storages.map(s => s.id===storageId
            ? { ...s, compartments: s.compartments.filter(c => c.id!==compartmentId) } : s),
          items: st.items.filter(it => !(it.storageId===storageId && it.compartmentId===compartmentId)),
        }))
      },

      // ── Items ───────────────────────────────────────────────────────────────
      addItem(data) {
        const frozenAt = data.frozenAt || today()
        const category = data.category || autoCategory(data.name)
        const item = {
          id: uid('i'),
          name: data.name.trim(),
          category,
          storageId: data.storageId,
          compartmentId: data.compartmentId,
          portions: Math.max(1, Number(data.portions) || 1),
          portionSize: data.portionSize || '',
          frozenAt,
          expiryDate: calcExpiry(category, frozenAt),
          note: data.note || '',
          photoData: data.photoData || null,
        }
        set(s => {
          const recent = [item.name, ...s.recentNames.filter(n => n !== item.name)].slice(0, 40)
          return {
            items: [...s.items, item],
            lastUsedCompartment: { storageId: data.storageId, compartmentId: data.compartmentId },
            recentNames: recent,
          }
        })
        return item.id
      },

      quickAddByName(name) {
        const s = get()
        const last = s.lastUsedCompartment
        const storageId = last?.storageId || s.storages[0]?.id
        const compartmentId = last?.compartmentId || s.storages[0]?.compartments[0]?.id
        return get().addItem({ name, storageId, compartmentId, portions: 1 })
      },

      consumePortion(id) {
        set(s => ({
          items: s.items
            .map(it => it.id===id ? { ...it, portions: it.portions - 1 } : it)
            .filter(it => it.portions > 0),
        }))
      },
      removeItem(id) { set(s => ({ items: s.items.filter(it => it.id !== id) })) },

      toggleRestock(id) {
        set(s => ({ items: s.items.map(it => it.id === id ? { ...it, needsRestock: !it.needsRestock } : it) }))
      },

      // ── Demo + Reset ────────────────────────────────────────────────────────
      seedDemoData() {
        const oldDate = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0,10) }
        const samples = [
          { name: 'Hähnchenbrust',  category: 'geflügel',      storageId: 's_eg', compartmentId: 'eg_1', portions: 3, portionSize: '150 g', frozenAt: oldDate(45)  },
          { name: 'Lasagne',        category: 'fertiggericht', storageId: 's_eg', compartmentId: 'eg_2', portions: 2, portionSize: 'Portion',frozenAt: oldDate(20)  },
          { name: 'Fischstäbchen',  category: 'fisch',         storageId: 's_eg', compartmentId: 'eg_2', portions: 12, portionSize: 'Stück', frozenAt: oldDate(60)  },
          { name: 'Magnum Mandel',  category: 'eis',           storageId: 's_eg', compartmentId: 'eg_4', portions: 4, portionSize: 'Stück',  frozenAt: oldDate(15)  },
          { name: 'TK-Erbsen',      category: 'gemüse',        storageId: 's_keller', compartmentId: 'k_2', portions: 5, portionSize: '200 g', frozenAt: oldDate(120) },
          { name: 'Eingemachte Tomatensauce', category: 'suppe', storageId: 's_keller', compartmentId: 'k_3', portions: 6, portionSize: 'Glas', frozenAt: oldDate(40)},
          { name: 'BARF Rindfleisch', category: 'hundefutter', storageId: 's_keller', compartmentId: 'k_5', portions: 8, portionSize: '500 g', frozenAt: oldDate(20) },
          { name: 'Aquarium-Frostfutter', category: 'tierfutter', storageId: 's_keller', compartmentId: 'k_door', portions: 10, portionSize: 'Würfel', frozenAt: oldDate(90) },
          { name: 'Pizzateig',      category: 'teig',          storageId: 's_eg', compartmentId: 'eg_3', portions: 2, portionSize: 'Stück', frozenAt: oldDate(50) },
          { name: 'Petersilie',     category: 'kräuter',       storageId: 's_eg', compartmentId: 'eg_3', portions: 5, portionSize: 'EL',    frozenAt: oldDate(80) },
        ]
        set({ items: samples.map(s => ({
          id: uid('i'), note: '', photoData: null,
          ...s,
          expiryDate: calcExpiry(s.category, s.frozenAt),
        })),
        recentNames: ['Hähnchenbrust','Lasagne','Fischstäbchen','Magnum Mandel','TK-Erbsen','BARF Rindfleisch'],
        lastUsedCompartment: { storageId: 's_eg', compartmentId: 'eg_1' },
        })
      },
      clear() { set({ items: [], recentNames: [], lastUsedCompartment: null }) },
      resetSetup() { set({ storages: DEFAULT_STORAGES, items: [], recentNames: [], lastUsedCompartment: null }) },
    }),
    { name: 'haushalt-freezer-v2' }
  )
)
