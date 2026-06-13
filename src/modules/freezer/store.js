import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../../lib/supabase'
import useStore from '../../store/useStore'

function logActivity(action, target, detail) {
  try { useStore.getState()._logActivity(action, target, detail) } catch {}
}
function getHousehold() { return useStore.getState().household }

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
  let name = rest
    .replace(/\b(in|ins|im|auf|bei|nach|zu|zum|zur)\b/g, ' ')
    .replace(/portion(en)?|stück|packung(en)?/g, ' ')
  if (storage) name = name.replace(new RegExp(storage.label.toLowerCase().replace(/[()]/g,''), 'g'), ' ')
  if (compartment) name = name.replace(new RegExp(compartment.label.toLowerCase().replace(/[()]/g,''), 'g'), ' ')
  name = name.replace(/\s+/g, ' ').trim()
  if (!name) return null
  return { name: name.charAt(0).toUpperCase() + name.slice(1), portions, storageId: storage?.id, compartmentId: compartment?.id }
}

// ── DB-Konvertierung ────────────────────────────────────────────────────────

function storageToJS(row) {
  return {
    id:           row.id,
    label:        row.label,
    emoji:        row.emoji ?? '📦',
    compartments: row.compartments ?? [],
    sortOrder:    row.sort_order ?? 0,
  }
}

function itemToJS(row) {
  return {
    id:            row.id,
    name:          row.name,
    category:      row.category ?? 'sonstiges',
    storageId:     row.storage_id ?? '',
    compartmentId: row.compartment_id ?? '',
    portions:      row.portions ?? 1,
    portionSize:   row.portion_size ?? '',
    frozenAt:      row.frozen_at ?? '',
    expiryDate:    row.expiry_date ?? '',
    note:          row.note ?? '',
    photoData:     row.photo_data ?? null,
    needsRestock:  row.needs_restock ?? false,
  }
}

function itemToDB(data) {
  return {
    name:           data.name,
    category:       data.category ?? 'sonstiges',
    storage_id:     data.storageId ?? null,
    compartment_id: data.compartmentId ?? null,
    portions:       data.portions ?? 1,
    portion_size:   data.portionSize ?? '',
    frozen_at:      data.frozenAt ?? null,
    expiry_date:    data.expiryDate ?? null,
    note:           data.note ?? '',
    photo_data:     data.photoData ?? null,
    needs_restock:  data.needsRestock ?? false,
  }
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useFreezer = create(
  persist(
    (set, get) => ({
      storages: [],
      items: [],
      setupDone: false,
      lastUsedCompartment: null,
      recentNames: [],
      formOpen: false,
      formPrefill: null,
      pending: [],
      _loaded: false,

      completeSetup() {
        set({ setupDone: true })
        if (!get().storages.length) get().addStorage('Gefrierschrank', '❄️')
      },
      restartSetup()  { set({ setupDone: false }) },

      openForm(prefill = null) { set({ formOpen: true, formPrefill: prefill }) },
      closeForm()              { set({ formOpen: false, formPrefill: null }) },

      // ── Data Loading (von useStore.loadData aufgerufen) ───────────────────
      async _loadFromSupabase(householdId) {
        const [{ data: storagesData }, { data: itemsData }] = await Promise.all([
          supabase.from('freezer_storages').select('*').eq('household_id', householdId).order('sort_order'),
          supabase.from('freezer_items').select('*').eq('household_id', householdId).order('name'),
        ])
        const storages = (storagesData ?? []).map(storageToJS)
        const items = (itemsData ?? []).map(itemToJS)
        const patch = { storages, items, _loaded: true }
        if (!get().setupDone && (storages.length > 0 || items.length > 0)) {
          patch.setupDone = true
        }
        set(patch)
        return { storages, items }
      },

      // ── localStorage-Migration ────────────────────────────────────────────
      async _migrateFromLocalStorage(householdId) {
        const raw = localStorage.getItem('haushalt-freezer-v3')
        if (!raw) return false
        let parsed
        try { parsed = JSON.parse(raw) } catch { return false }
        const localStorages = parsed?.state?.storages
        const localItems = parsed?.state?.items
        if ((!localStorages || !localStorages.length) && (!localItems || !localItems.length)) return false

        if (localStorages?.length) {
          const rows = localStorages.map((s, i) => ({
            id: s.id,
            household_id: householdId,
            label: s.label,
            emoji: s.emoji ?? '📦',
            compartments: s.compartments ?? [],
            sort_order: i,
          }))
          await supabase.from('freezer_storages').upsert(rows, { onConflict: 'id' })
        }
        if (localItems?.length) {
          const rows = localItems.map(it => ({
            id: it.id,
            household_id: householdId,
            ...itemToDB(it),
          }))
          await supabase.from('freezer_items').upsert(rows, { onConflict: 'id' })
        }
        localStorage.setItem('_migrated_haushalt-freezer-v3', raw)
        localStorage.removeItem('haushalt-freezer-v3')
        return true
      },

      // ── Einräumen-Queue (bleibt lokal) ────────────────────────────────────
      markBought(itemId) {
        const it = get().items.find(i => i.id === itemId)
        if (!it) return
        const pid = uid('p')
        set(s => ({
          pending: [...s.pending, {
            id: pid, name: it.name, fromItemId: itemId,
            photoData: it.photoData, category: it.category,
            portionSize: it.portionSize,
            storageId: it.storageId, compartmentId: it.compartmentId,
          }],
          items: s.items.map(x => x.id === itemId ? { ...x, needsRestock: false } : x),
        }))
        const h = getHousehold()
        if (h) supabase.from('freezer_items').update({ needs_restock: false }).eq('id', itemId).then(() => {})
        return pid
      },
      addPendingByName(name) {
        const pid = uid('p')
        set(s => ({ pending: [...s.pending, { id: pid, name }] }))
        return pid
      },
      removePending(pid) {
        set(s => ({ pending: s.pending.filter(p => p.id !== pid) }))
      },

      // ── Storage-Verwaltung ────────────────────────────────────────────────
      addStorage(label, emoji='📦') {
        const h = getHousehold()
        const s = { id: uid('s'), label, emoji, compartments: [{ id: uid('c'), label: 'Fach 1' }] }
        set(st => ({ storages: [...st.storages, { ...s, sortOrder: st.storages.length }] }))
        if (h) supabase.from('freezer_storages').insert([{
          id: s.id, household_id: h.id, label, emoji, compartments: s.compartments, sort_order: get().storages.length - 1,
        }]).then(({ error }) => { if (error) console.error('addStorage:', error) })
        return s.id
      },
      renameStorage(id, label, emoji) {
        set(st => ({ storages: st.storages.map(s => s.id===id ? { ...s, label, emoji: emoji ?? s.emoji } : s) }))
        const patch = { label }
        if (emoji) patch.emoji = emoji
        supabase.from('freezer_storages').update(patch).eq('id', id).then(() => {})
      },
      removeStorage(id) {
        set(st => ({
          storages: st.storages.filter(s => s.id !== id),
          items: st.items.filter(it => it.storageId !== id),
        }))
        supabase.from('freezer_storages').delete().eq('id', id).then(() => {})
        supabase.from('freezer_items').delete().eq('storage_id', id).then(() => {})
      },
      addCompartment(storageId, label) {
        const newComp = { id: uid('c'), label }
        set(st => ({
          storages: st.storages.map(s => s.id===storageId
            ? { ...s, compartments: [...s.compartments, newComp] } : s)
        }))
        const s = get().storages.find(s => s.id === storageId)
        if (s) supabase.from('freezer_storages').update({ compartments: s.compartments }).eq('id', storageId).then(() => {})
      },
      renameCompartment(storageId, compartmentId, label) {
        set(st => ({
          storages: st.storages.map(s => s.id===storageId
            ? { ...s, compartments: s.compartments.map(c => c.id===compartmentId ? { ...c, label } : c) } : s)
        }))
        const s = get().storages.find(s => s.id === storageId)
        if (s) supabase.from('freezer_storages').update({ compartments: s.compartments }).eq('id', storageId).then(() => {})
      },
      removeCompartment(storageId, compartmentId) {
        set(st => ({
          storages: st.storages.map(s => s.id===storageId
            ? { ...s, compartments: s.compartments.filter(c => c.id!==compartmentId) } : s),
          items: st.items.filter(it => !(it.storageId===storageId && it.compartmentId===compartmentId)),
        }))
        const s = get().storages.find(s => s.id === storageId)
        if (s) supabase.from('freezer_storages').update({ compartments: s.compartments }).eq('id', storageId).then(() => {})
        supabase.from('freezer_items').delete().eq('storage_id', storageId).eq('compartment_id', compartmentId).then(() => {})
      },

      // ── Items ─────────────────────────────────────────────────────────────
      addItem(data) {
        const h = getHousehold()
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
        if (h) supabase.from('freezer_items').insert([{ id: item.id, household_id: h.id, ...itemToDB(item) }])
          .then(({ error }) => {
            if (error) {
              console.error('addItem:', error)
              set(s => ({ items: s.items.filter(it => it.id !== item.id) }))
            }
          })
        logActivity('freezer_added', item.name, `${item.portions}× ${item.portionSize || 'Portion'}`)
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
        const item = get().items.find(it => it.id === id)
        const newPortions = item ? item.portions - 1 : 0
        set(s => ({
          items: s.items
            .map(it => it.id===id ? { ...it, portions: it.portions - 1 } : it)
            .filter(it => it.portions > 0),
        }))
        if (newPortions > 0) {
          supabase.from('freezer_items').update({ portions: newPortions }).eq('id', id).then(() => {})
        } else {
          supabase.from('freezer_items').delete().eq('id', id).then(() => {})
        }
        if (item) logActivity('freezer_consumed', item.name)
      },
      removeItem(id) {
        const item = get().items.find(it => it.id === id)
        set(s => ({ items: s.items.filter(it => it.id !== id) }))
        supabase.from('freezer_items').delete().eq('id', id).then(() => {})
        if (item) logActivity('freezer_deleted', item.name)
      },
      bulkDeleteItems(ids) {
        if (!ids.length) return
        set(s => ({ items: s.items.filter(it => !ids.includes(it.id)) }))
        supabase.from('freezer_items').delete().in('id', ids).then(() => {})
        logActivity('freezer_deleted', `${ids.length} Einträge gelöscht`)
      },
      clearAllItems() {
        const h = getHousehold()
        const count = get().items.length
        if (!count) return
        set({ items: [] })
        if (h) supabase.from('freezer_items').delete().eq('household_id', h.id).then(() => {})
        logActivity('freezer_deleted', `Alle ${count} Einträge gelöscht`)
      },

      updateItem(id, patch) {
        set(s => ({ items: s.items.map(it => it.id === id ? { ...it, ...patch } : it) }))
        const dbPatch = {}
        if ('name' in patch)          dbPatch.name = patch.name
        if ('category' in patch)      dbPatch.category = patch.category
        if ('storageId' in patch)     dbPatch.storage_id = patch.storageId
        if ('compartmentId' in patch) dbPatch.compartment_id = patch.compartmentId
        if ('portions' in patch)      dbPatch.portions = patch.portions
        if ('portionSize' in patch)   dbPatch.portion_size = patch.portionSize
        if ('note' in patch)          dbPatch.note = patch.note
        if ('frozenAt' in patch)      dbPatch.frozen_at = patch.frozenAt
        if ('expiryDate' in patch)    dbPatch.expiry_date = patch.expiryDate
        if ('photoData' in patch)     dbPatch.photo_data = patch.photoData
        if ('needsRestock' in patch)  dbPatch.needs_restock = patch.needsRestock
        if (Object.keys(dbPatch).length) supabase.from('freezer_items').update(dbPatch).eq('id', id).then(() => {})
      },
      toggleRestock(id) {
        const item = get().items.find(it => it.id === id)
        const val = !item?.needsRestock
        set(s => ({ items: s.items.map(it => it.id === id ? { ...it, needsRestock: val } : it) }))
        supabase.from('freezer_items').update({ needs_restock: val }).eq('id', id).then(() => {})
      },

      // ── Demo + Reset ──────────────────────────────────────────────────────
      seedDemoData() {
        const h = getHousehold()
        const oldDate = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0,10) }
        const defaultStorages = DEFAULT_STORAGES.map((s, i) => ({ ...s, sortOrder: i }))
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
        ].map(s => ({
          id: uid('i'), note: '', photoData: null, needsRestock: false,
          ...s,
          expiryDate: calcExpiry(s.category, s.frozenAt),
        }))
        set({
          storages: defaultStorages,
          items: samples,
          recentNames: ['Hähnchenbrust','Lasagne','Fischstäbchen','Magnum Mandel','TK-Erbsen','BARF Rindfleisch'],
          lastUsedCompartment: { storageId: 's_eg', compartmentId: 'eg_1' },
        })
        if (h) {
          supabase.from('freezer_storages').upsert(defaultStorages.map((s, i) => ({
            id: s.id, household_id: h.id, label: s.label, emoji: s.emoji, compartments: s.compartments, sort_order: i,
          })), { onConflict: 'id' }).then(() => {})
          supabase.from('freezer_items').upsert(samples.map(it => ({
            id: it.id, household_id: h.id, ...itemToDB(it),
          })), { onConflict: 'id' }).then(() => {})
        }
      },
      clear() {
        const h = getHousehold()
        set({ items: [], recentNames: [], lastUsedCompartment: null })
        if (h) supabase.from('freezer_items').delete().eq('household_id', h.id).then(() => {})
      },
      resetSetup() {
        const h = getHousehold()
        set({ storages: [], items: [], recentNames: [], lastUsedCompartment: null, setupDone: false })
        if (h) {
          supabase.from('freezer_items').delete().eq('household_id', h.id).then(() => {})
          supabase.from('freezer_storages').delete().eq('household_id', h.id).then(() => {})
        }
      },
    }),
    {
      name: 'haushalt-freezer-local-ui',
      partialize: (state) => ({
        setupDone: state.setupDone,
        lastUsedCompartment: state.lastUsedCompartment,
        recentNames: state.recentNames,
        pending: state.pending,
      }),
    }
  )
)
