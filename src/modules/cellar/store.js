import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../../lib/supabase'
import useStore from '../../store/useStore'

function uid(p='w') { return p + '_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36) }

function logActivity(action, target, detail) {
  try { useStore.getState()._logActivity(action, target, detail) } catch {}
}
function getHousehold() { return useStore.getState().household }

const DEFAULT_RACKS = [
  { id: 'r_wz',     label: 'Regal Wohnzimmer', emoji: '🛋️',
    slots: ['A/1','A/2','A/3','B/1','B/2','B/3','C/1','C/2','C/3'],
    conditions: { temperature: 'normal', light: 'mixed',  humidity: 'normal', vibration: 'still' } },
  { id: 'r_keller', label: 'Regal Keller',     emoji: '🔻',
    slots: ['1','2','3','4','5','6'],
    conditions: { temperature: 'cool',   light: 'dark',   humidity: 'humid',  vibration: 'still' } },
  { id: 'r_kueche', label: 'Weinkühlschrank',  emoji: '🧊',
    slots: ['oben','mitte','unten'],
    conditions: { temperature: 'cool',   light: 'dark',   humidity: 'normal', vibration: 'some'  } },
]

// ── Lagerbedingungen ─────────────────────────────────────────────────────────
export const CONDITION_OPTIONS = {
  temperature: [
    { id: 'cool',   label: '🧊 Kühl <14°',   pts: 40 },
    { id: 'normal', label: '🌤️ Normal 14-20°', pts: 20 },
    { id: 'warm',   label: '🥵 Warm >20°',    pts: 0  },
  ],
  light: [
    { id: 'dark',   label: '🌑 Dunkel',  pts: 25 },
    { id: 'mixed',  label: '🌗 Gemischt', pts: 12 },
    { id: 'bright', label: '☀️ Hell',    pts: 0  },
  ],
  humidity: [
    { id: 'humid',  label: '💦 Feucht 60-80%', pts: 20 },
    { id: 'normal', label: '🌬️ Normal',        pts: 10 },
    { id: 'dry',    label: '🏜️ Trocken',       pts: 0  },
  ],
  vibration: [
    { id: 'still',  label: '🔇 Ruhig',         pts: 15 },
    { id: 'some',   label: '🔊 Leichte Vibration', pts: 5 },
  ],
}

const DEFAULT_CONDITIONS = { temperature: 'normal', light: 'mixed', humidity: 'normal', vibration: 'still' }

export function qualityScore(conditions) {
  const c = conditions || DEFAULT_CONDITIONS
  let s = 0
  Object.keys(CONDITION_OPTIONS).forEach(k => {
    const opt = CONDITION_OPTIONS[k].find(o => o.id === c[k])
    s += opt?.pts ?? 0
  })
  return Math.min(100, s)
}

export function qualityLabel(score) {
  if (score >= 85) return { label: 'Optimal', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
  if (score >= 65) return { label: 'Gut',     cls: 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300' }
  if (score >= 40) return { label: 'Mittel',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' }
  return                { label: 'Schlecht', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }
}

export function effectiveDrinkUntil(bottle, rack) {
  const score = qualityScore(rack?.conditions)
  const span  = bottle.drinkUntil - bottle.drinkFrom
  if (score >= 85 || span <= 0) return bottle.drinkUntil
  const factor = 0.4 + (score / 100) * 0.6
  return Math.round(bottle.drinkFrom + span * factor)
}

// ── DB-Konvertierung ────────────────────────────────────────────────────────

function rackToJS(row) {
  return {
    id:         row.id,
    label:      row.label,
    emoji:      row.emoji ?? '🍷',
    slots:      row.slots ?? [],
    conditions: row.conditions ?? { ...DEFAULT_CONDITIONS },
    sortOrder:  row.sort_order ?? 0,
  }
}

function bottleToJS(row) {
  return {
    id:             row.id,
    name:           row.name,
    winery:         row.winery ?? '',
    vintage:        row.vintage,
    region:         row.region ?? '',
    country:        row.country ?? '',
    grape:          row.grape ?? '',
    color:          row.color ?? 'rot',
    wineType:       row.wine_type ?? 'wein',
    sweetness:      row.sweetness ?? '',
    classification: row.classification ?? '',
    alcohol:        row.alcohol ?? '',
    alcoholFree:    row.alcohol_free ?? false,
    drinkFrom:      row.drink_from,
    drinkUntil:     row.drink_until,
    rackId:         row.rack_id ?? '',
    slot:           row.slot ?? '',
    count:          row.count ?? 1,
    priceEur:       row.price_eur,
    retailer:       row.retailer ?? '',
    purchaseDate:   row.purchase_date ?? '',
    link:           row.link ?? '',
    barcode:        row.barcode ?? '',
    rating:         row.rating ?? 0,
    tastingNotes:   row.tasting_notes ?? '',
    tasteProfile:   row.taste_profile ?? {},
    aromas:         row.aromas ?? [],
    pairings:       row.pairings ?? [],
    restock:        row.restock ?? false,
    note:           row.note ?? '',
    photoData:      row.photo_data ?? null,
    history:        row.history ?? [],
    archived:       row.archived ?? false,
    bought:         row.bought ?? '',
  }
}

function bottleToDB(data) {
  return {
    name:            data.name,
    winery:          data.winery ?? '',
    vintage:         data.vintage ?? null,
    region:          data.region ?? '',
    country:         data.country ?? '',
    grape:           data.grape ?? '',
    color:           data.color ?? 'rot',
    wine_type:       data.wineType ?? 'wein',
    sweetness:       data.sweetness ?? '',
    classification:  data.classification ?? '',
    alcohol:         data.alcohol ?? '',
    alcohol_free:    data.alcoholFree ?? false,
    drink_from:      data.drinkFrom ?? null,
    drink_until:     data.drinkUntil ?? null,
    rack_id:         data.rackId ?? null,
    slot:            data.slot ?? '',
    count:           data.count ?? 1,
    price_eur:       data.priceEur ?? null,
    retailer:        data.retailer ?? '',
    purchase_date:   data.purchaseDate ?? '',
    link:            data.link ?? '',
    barcode:         data.barcode ?? '',
    rating:          data.rating ?? 0,
    tasting_notes:   data.tastingNotes ?? '',
    taste_profile:   data.tasteProfile ?? {},
    aromas:          data.aromas ?? [],
    pairings:        data.pairings ?? [],
    restock:         data.restock ?? false,
    note:            data.note ?? '',
    photo_data:      data.photoData ?? null,
    history:         data.history ?? [],
    archived:        data.archived ?? false,
    bought:          data.bought ?? '',
  }
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useCellar = create(
  persist(
    (set, get) => ({
      racks: [],
      bottles: [],
      setupDone: false,
      recentNames: [],
      lastUsedRack: null,
      formOpen: false,
      formPrefill: null,
      pending: [],
      _loaded: false,

      completeSetup() {
        set({ setupDone: true })
        if (!get().racks.length) get().addRack('Weinregal', '🍷')
      },
      restartSetup()  { set({ setupDone: false }) },

      openForm(prefill = null) { set({ formOpen: true, formPrefill: prefill }) },
      closeForm()              { set({ formOpen: false, formPrefill: null }) },

      // ── Data Loading (von useStore.loadData aufgerufen) ───────────────────
      async _loadFromSupabase(householdId) {
        const [{ data: racksData }, { data: bottlesData }] = await Promise.all([
          supabase.from('cellar_racks').select('*').eq('household_id', householdId).order('sort_order'),
          supabase.from('cellar_bottles').select('*').eq('household_id', householdId).order('name'),
        ])
        const racks = (racksData ?? []).map(rackToJS)
        const bottles = (bottlesData ?? []).map(bottleToJS)
        const patch = { racks, bottles, _loaded: true }
        if (!get().setupDone && (racks.length > 0 || bottles.length > 0)) {
          patch.setupDone = true
        }
        set(patch)
        return { racks, bottles }
      },

      // ── localStorage-Migration ────────────────────────────────────────────
      async _migrateFromLocalStorage(householdId) {
        const raw = localStorage.getItem('haushalt-cellar-v6')
        if (!raw) return false
        let parsed
        try { parsed = JSON.parse(raw) } catch { return false }
        const localRacks = parsed?.state?.racks
        const localBottles = parsed?.state?.bottles
        if ((!localRacks || !localRacks.length) && (!localBottles || !localBottles.length)) return false

        if (localRacks?.length) {
          const rows = localRacks.map((r, i) => ({
            id: r.id,
            household_id: householdId,
            label: r.label,
            emoji: r.emoji ?? '🍷',
            slots: r.slots ?? [],
            conditions: r.conditions ?? { ...DEFAULT_CONDITIONS },
            sort_order: i,
          }))
          await supabase.from('cellar_racks').upsert(rows, { onConflict: 'id' })
        }
        if (localBottles?.length) {
          const rows = localBottles.map(b => ({
            id: b.id,
            household_id: householdId,
            ...bottleToDB(b),
          }))
          await supabase.from('cellar_bottles').upsert(rows, { onConflict: 'id' })
        }
        localStorage.setItem('_migrated_haushalt-cellar-v6', raw)
        localStorage.removeItem('haushalt-cellar-v6')
        return true
      },

      // ── Einräumen-Queue (bleibt lokal) ────────────────────────────────────
      markBought(bottleId) {
        const b = get().bottles.find(x => x.id === bottleId)
        if (!b) return
        const pid = uid('p')
        set(s => ({
          pending: [...s.pending, {
            id: pid, name: b.name, fromBottleId: bottleId,
            winery: b.winery, vintage: b.vintage, region: b.region, country: b.country,
            grape: b.grape, color: b.color, wineType: b.wineType, sweetness: b.sweetness,
            alcoholFree: b.alcoholFree,
            drinkFrom: b.drinkFrom, drinkUntil: b.drinkUntil,
            rackId: b.rackId, slot: b.slot, photoData: b.photoData,
            retailer: b.retailer, priceEur: b.priceEur, link: b.link,
          }],
          bottles: s.bottles.map(x => x.id === bottleId ? { ...x, restock: false } : x),
        }))
        supabase.from('cellar_bottles').update({ restock: false }).eq('id', bottleId).then(() => {})
        return pid
      },
      addPendingByName(name) {
        const pid = uid('p')
        set(s => ({ pending: [...s.pending, { id: pid, name }] }))
        return pid
      },
      addPendingBatch(wines) {
        const rks = get().racks
        const items = wines.map(w => {
          let rackId = ''
          let slot = w.slot || ''
          if (w.rackLabel) {
            const label = w.rackLabel.toLowerCase().trim()
            const match = rks.find(r => r.label.toLowerCase().trim() === label)
            if (match) rackId = match.id
          }
          return {
            id: uid('p'), name: w.name || '',
            winery: w.winery || '', vintage: w.vintage,
            region: w.region || '', country: w.country || '',
            grape: w.grape || '', color: w.color || 'rot',
            wineType: w.wineType || 'wein', sweetness: w.sweetness || '',
            classification: w.classification || '', alcohol: w.alcohol || '',
            alcoholFree: !!w.alcoholFree,
            drinkFrom: w.drinkFrom, drinkUntil: w.drinkUntil,
            count: w.count || 1, priceEur: w.priceEur,
            retailer: w.retailer || '', note: w.note || '',
            rackId, slot, rackLabel: w.rackLabel || '',
          }
        }).filter(w => w.name)
        set(s => ({ pending: [...s.pending, ...items] }))
        return items.length
      },
      removePending(pid) {
        set(s => ({ pending: s.pending.filter(p => p.id !== pid) }))
      },
      clearPending() {
        set({ pending: [] })
      },
      restockBottle(bottleId, count = 1) {
        const newCount = (get().bottles.find(b => b.id === bottleId)?.count || 0) + Number(count)
        set(s => ({
          bottles: s.bottles.map(b => b.id === bottleId
            ? { ...b, count: newCount, restock: false } : b),
        }))
        supabase.from('cellar_bottles').update({ count: newCount, restock: false }).eq('id', bottleId).then(() => {})
      },

      // ── Racks ──────────────────────────────────────────────────────────────
      addRack(label, emoji='🍷') {
        const h = getHousehold()
        const r = { id: uid('r'), label, emoji, slots: ['1','2','3'], conditions: { ...DEFAULT_CONDITIONS }, sortOrder: get().racks.length }
        set(s => ({ racks: [...s.racks, r] }))
        if (h) supabase.from('cellar_racks').insert([{
          id: r.id, household_id: h.id, label, emoji, slots: r.slots, conditions: r.conditions, sort_order: r.sortOrder,
        }]).then(({ error }) => { if (error) console.error('addRack:', error) })
        return r.id
      },
      setRackConditions(id, conditions) {
        set(s => ({ racks: s.racks.map(r => r.id === id ? { ...r, conditions: { ...(r.conditions || DEFAULT_CONDITIONS), ...conditions } } : r) }))
        const merged = get().racks.find(r => r.id === id)?.conditions
        if (merged) supabase.from('cellar_racks').update({ conditions: merged }).eq('id', id).then(() => {})
      },
      renameRack(id, label, emoji) {
        set(s => ({ racks: s.racks.map(r => r.id===id ? { ...r, label, emoji: emoji ?? r.emoji } : r) }))
        const patch = { label }
        if (emoji) patch.emoji = emoji
        supabase.from('cellar_racks').update(patch).eq('id', id).then(() => {})
      },
      removeRack(id) {
        set(s => ({
          racks: s.racks.filter(r => r.id !== id),
          bottles: s.bottles.filter(b => b.rackId !== id),
        }))
        supabase.from('cellar_racks').delete().eq('id', id).then(() => {})
        supabase.from('cellar_bottles').delete().eq('rack_id', id).then(() => {})
      },
      addSlot(rackId, label) {
        set(s => ({ racks: s.racks.map(r => r.id===rackId ? { ...r, slots: [...r.slots, label] } : r) }))
        const r = get().racks.find(r => r.id === rackId)
        if (r) supabase.from('cellar_racks').update({ slots: r.slots }).eq('id', rackId).then(() => {})
      },
      renameSlot(rackId, oldLabel, newLabel) {
        set(s => ({
          racks: s.racks.map(r => r.id===rackId
            ? { ...r, slots: r.slots.map(s2 => s2===oldLabel ? newLabel : s2) }
            : r),
          bottles: s.bottles.map(b => b.rackId===rackId && b.slot===oldLabel ? { ...b, slot: newLabel } : b),
        }))
        const r = get().racks.find(r => r.id === rackId)
        if (r) supabase.from('cellar_racks').update({ slots: r.slots }).eq('id', rackId).then(() => {})
        supabase.from('cellar_bottles').update({ slot: newLabel }).eq('rack_id', rackId).eq('slot', oldLabel).then(() => {})
      },
      removeSlot(rackId, label) {
        set(s => ({
          racks: s.racks.map(r => r.id===rackId
            ? { ...r, slots: r.slots.filter(s2 => s2 !== label) } : r),
          bottles: s.bottles.filter(b => !(b.rackId===rackId && b.slot===label)),
        }))
        const r = get().racks.find(r => r.id === rackId)
        if (r) supabase.from('cellar_racks').update({ slots: r.slots }).eq('id', rackId).then(() => {})
        supabase.from('cellar_bottles').delete().eq('rack_id', rackId).eq('slot', label).then(() => {})
      },

      // ── Bottles ────────────────────────────────────────────────────────────
      addBottle(data) {
        const h = getHousehold()
        const base = {
          name: data.name.trim(),
          winery: data.winery || '',
          vintage: Number(data.vintage) || new Date().getFullYear(),
          region: data.region || '',
          country: data.country || '',
          grape: data.grape || '',
          color: data.color || 'rot',
          wineType: data.wineType || 'wein',
          sweetness: data.sweetness || '',
          classification: data.classification || '',
          alcohol: data.alcohol || '',
          alcoholFree: !!data.alcoholFree,
          drinkFrom: Number(data.drinkFrom) || (Number(data.vintage) || new Date().getFullYear()) + 1,
          drinkUntil: Number(data.drinkUntil) || (Number(data.vintage) || new Date().getFullYear()) + 5,
          bought: data.bought || '',
          priceEur: data.priceEur ? Number(data.priceEur) : null,
          retailer: data.retailer || '',
          purchaseDate: data.purchaseDate || '',
          link: data.link || '',
          barcode: data.barcode || '',
          rating: Number(data.rating) || 0,
          tastingNotes: data.tastingNotes || '',
          tasteProfile: data.tasteProfile || {},
          aromas: data.aromas || [],
          pairings: data.pairings || [],
          restock: !!data.restock,
          note: data.note || '',
          photoData: data.photoData || null,
          history: [],
        }
        const locations = data.locations && data.locations.length > 0
          ? data.locations
          : [{ rackId: data.rackId, slot: data.slot || '', count: Math.max(1, Number(data.count) || 1) }]
        const grouped = {}
        locations.forEach(loc => {
          const key = `${loc.rackId}__${loc.slot}`
          if (!grouped[key]) grouped[key] = { rackId: loc.rackId, slot: loc.slot, count: 0 }
          grouped[key].count += (loc.count || 1)
        })
        const ids = []
        const entries = Object.values(grouped)
        entries.forEach(loc => {
          const b = { ...base, id: uid('b'), rackId: loc.rackId, slot: loc.slot, count: loc.count }
          ids.push(b.id)
          set(s => ({
            bottles: [...s.bottles, b],
            lastUsedRack: { rackId: loc.rackId, slot: loc.slot },
            recentNames: [b.name, ...s.recentNames.filter(n => n !== b.name)].slice(0, 30),
          }))
          if (h) supabase.from('cellar_bottles').insert([{ id: b.id, household_id: h.id, ...bottleToDB(b) }])
            .then(({ error }) => {
              if (error) {
                console.error('addBottle:', error)
                set(s => ({ bottles: s.bottles.filter(x => x.id !== b.id) }))
              }
            })
        })
        const totalCount = entries.reduce((s, l) => s + l.count, 0)
        logActivity('wine_added', base.name, `${totalCount}× ${base.vintage}`)
        return ids.length === 1 ? ids[0] : ids
      },

      updateBottle(id, patch) {
        const b = get().bottles.find(x => x.id === id)
        set(s => ({ bottles: s.bottles.map(x => x.id === id ? { ...x, ...patch } : x) }))
        if (b) logActivity('wine_updated', b.name)
        const dbPatch = {}
        if ('name' in patch)           dbPatch.name = patch.name
        if ('winery' in patch)         dbPatch.winery = patch.winery
        if ('vintage' in patch)        dbPatch.vintage = patch.vintage
        if ('region' in patch)         dbPatch.region = patch.region
        if ('country' in patch)        dbPatch.country = patch.country
        if ('grape' in patch)          dbPatch.grape = patch.grape
        if ('color' in patch)          dbPatch.color = patch.color
        if ('wineType' in patch)       dbPatch.wine_type = patch.wineType
        if ('sweetness' in patch)      dbPatch.sweetness = patch.sweetness
        if ('classification' in patch) dbPatch.classification = patch.classification
        if ('alcohol' in patch)        dbPatch.alcohol = patch.alcohol
        if ('alcoholFree' in patch)    dbPatch.alcohol_free = patch.alcoholFree
        if ('drinkFrom' in patch)      dbPatch.drink_from = patch.drinkFrom
        if ('drinkUntil' in patch)     dbPatch.drink_until = patch.drinkUntil
        if ('rackId' in patch)         dbPatch.rack_id = patch.rackId
        if ('slot' in patch)           dbPatch.slot = patch.slot
        if ('count' in patch)          dbPatch.count = patch.count
        if ('priceEur' in patch)       dbPatch.price_eur = patch.priceEur
        if ('retailer' in patch)       dbPatch.retailer = patch.retailer
        if ('purchaseDate' in patch)   dbPatch.purchase_date = patch.purchaseDate
        if ('link' in patch)           dbPatch.link = patch.link
        if ('barcode' in patch)        dbPatch.barcode = patch.barcode
        if ('rating' in patch)         dbPatch.rating = patch.rating
        if ('tastingNotes' in patch)   dbPatch.tasting_notes = patch.tastingNotes
        if ('tasteProfile' in patch)   dbPatch.taste_profile = patch.tasteProfile
        if ('aromas' in patch)         dbPatch.aromas = patch.aromas
        if ('pairings' in patch)       dbPatch.pairings = patch.pairings
        if ('restock' in patch)        dbPatch.restock = patch.restock
        if ('note' in patch)           dbPatch.note = patch.note
        if ('photoData' in patch)      dbPatch.photo_data = patch.photoData
        if ('history' in patch)        dbPatch.history = patch.history
        if ('archived' in patch)       dbPatch.archived = patch.archived
        if ('bought' in patch)         dbPatch.bought = patch.bought
        if (Object.keys(dbPatch).length) supabase.from('cellar_bottles').update(dbPatch).eq('id', id).then(() => {})
      },

      toggleRestock(id) {
        const val = !get().bottles.find(b => b.id === id)?.restock
        set(s => ({ bottles: s.bottles.map(b => b.id === id ? { ...b, restock: val } : b) }))
        supabase.from('cellar_bottles').update({ restock: val }).eq('id', id).then(() => {})
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
        const bottle = get().bottles.find(x => x.id === id)
        const newHistory = [...(bottle?.history || []), {
          id: uid('h'), date, rating: rating ?? null,
          occasion: entry.occasion || '', note: entry.note || '',
        }]
        const newCount = (bottle?.count ?? 1) - 1
        set(s => ({
          bottles: s.bottles.map(b => {
            if (b.id !== id) return b
            return {
              ...b,
              count: newCount,
              rating: rating ?? b.rating,
              tastingNotes: entry.note ? entry.note : b.tastingNotes,
              history: newHistory,
            }
          }),
        }))
        const dbPatch = { count: newCount, history: newHistory }
        if (rating) dbPatch.rating = rating
        if (entry.note) dbPatch.tasting_notes = entry.note
        supabase.from('cellar_bottles').update(dbPatch).eq('id', id).then(() => {})
        if (bottle) logActivity('wine_consumed', bottle.name)
      },
      removeBottle(id) {
        const b = get().bottles.find(x => x.id === id)
        set(s => ({ bottles: s.bottles.filter(x => x.id !== id) }))
        supabase.from('cellar_bottles').delete().eq('id', id).then(() => {})
        if (b) logActivity('wine_deleted', b.name)
      },
      bulkDeleteBottles(ids) {
        if (!ids.length) return
        set(s => ({ bottles: s.bottles.filter(b => !ids.includes(b.id)) }))
        supabase.from('cellar_bottles').delete().in('id', ids).then(() => {})
        logActivity('wine_deleted', `${ids.length} Weine gelöscht`)
      },
      clearAllBottles() {
        const h = getHousehold()
        const count = get().bottles.length
        if (!count) return
        set({ bottles: [] })
        if (h) supabase.from('cellar_bottles').delete().eq('household_id', h.id).then(() => {})
        logActivity('wine_deleted', `Alle ${count} Weine gelöscht`)
      },

      // ── Demo + Reset ──────────────────────────────────────────────────────
      seedDemoData() {
        const h = getHousehold()
        const defaultRacks = DEFAULT_RACKS.map((r, i) => ({ ...r, sortOrder: i }))
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

          { name: 'Sekt alkoholfrei',  winery: 'Kolonne Null', vintage: 2023, region: 'Pfalz', country: 'Deutschland', grape: 'Riesling', color: 'schaum', alcohol: '0.0 %', alcoholFree: true,
            drinkFrom: 2023, drinkUntil: 2025, rackId: 'r_kueche', slot: 'unten', count: 3, priceEur: 16, rating: 4,
            tasteProfile: { sweetness: 'halbtrocken', body: 'leicht', acidity: 'frisch' },
            aromas: ['🍐 Birne','🍋 Zitrone','🍏 Grüner Apfel'],
            pairings: ['aperitif','salat','sushi','dessert_fruit'],
            tastingNotes: 'Für die Schwangerschaft / Autofahrer-Variante – überraschend lebendig.' },

          { name: 'Rotwein alkoholfrei', winery: 'Eins Zwei Zero', vintage: 2024, region: 'Rheinhessen', country: 'Deutschland', grape: 'Cuvée', color: 'rot', alcohol: '0.5 %', alcoholFree: true,
            drinkFrom: 2024, drinkUntil: 2026, rackId: 'r_kueche', slot: 'unten', count: 2, priceEur: 12, rating: 3,
            tasteProfile: { sweetness: 'halbtrocken', body: 'leicht', acidity: 'mittel', tannin: 'weich' },
            aromas: ['🍒 Kirsche','🫐 Heidelbeere'],
            pairings: ['pizza','pasta_tomate','käse_hart'],
            tastingNotes: 'Solider Speisebegleiter ohne Promille.' },
        ]
        const bottleRows = samples.map(s => ({ id: uid('b'), note: '', photoData: null, restock: false, history: [], archived: false, bought: '', wineType: 'wein', sweetness: '', classification: '', purchaseDate: '', link: '', barcode: '', ...s }))
        set({
          racks: defaultRacks,
          bottles: bottleRows,
          recentNames: ['Riesling Kabinett','Barolo','Sauvignon Blanc','Spätburgunder'],
          lastUsedRack: { rackId: 'r_wz', slot: 'A/1' },
        })
        if (h) {
          supabase.from('cellar_racks').upsert(defaultRacks.map((r, i) => ({
            id: r.id, household_id: h.id, label: r.label, emoji: r.emoji, slots: r.slots, conditions: r.conditions, sort_order: i,
          })), { onConflict: 'id' }).then(() => {})
          supabase.from('cellar_bottles').upsert(bottleRows.map(b => ({
            id: b.id, household_id: h.id, ...bottleToDB(b),
          })), { onConflict: 'id' }).then(() => {})
        }
      },
      clear() {
        const h = getHousehold()
        set({ bottles: [], recentNames: [], lastUsedRack: null })
        if (h) supabase.from('cellar_bottles').delete().eq('household_id', h.id).then(() => {})
      },
      resetSetup() {
        const h = getHousehold()
        set({ racks: [], bottles: [], recentNames: [], lastUsedRack: null, setupDone: false })
        if (h) {
          supabase.from('cellar_bottles').delete().eq('household_id', h.id).then(() => {})
          supabase.from('cellar_racks').delete().eq('household_id', h.id).then(() => {})
        }
      },
    }),
    {
      name: 'haushalt-cellar-local-ui',
      partialize: (state) => ({
        setupDone: state.setupDone,
        lastUsedRack: state.lastUsedRack,
        recentNames: state.recentNames,
        pending: state.pending,
      }),
    }
  )
)

export function drinkStatus(b, rack) {
  const y = new Date().getFullYear()
  const effUntil = rack ? effectiveDrinkUntil(b, rack) : b.drinkUntil
  if (y < b.drinkFrom) return { label: `noch ${b.drinkFrom - y} J zu jung`, cls: 'bg-sky-100 text-sky-700', effUntil }
  if (y > effUntil)    return { label: `${y - effUntil} J über Höhepunkt`,  cls: 'bg-red-100 text-red-700', effUntil }
  const rest = effUntil - y
  if (rest <= 1) return { label: `bald trinken (bis ${effUntil})`,          cls: 'bg-orange-100 text-orange-700', effUntil }
  return { label: `optimal bis ${effUntil}`,                                 cls: 'bg-emerald-100 text-emerald-700', effUntil }
}
