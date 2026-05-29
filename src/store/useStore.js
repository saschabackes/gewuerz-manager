import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// ── Einladungscode generieren ─────────────────────────────────────────────────
// Verwirrbaren Zeichen (0/O, 1/I/l) ausgeschlossen

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ── DB (snake_case) ↔ JS (camelCase) Mapper ──────────────────────────────────

function toJS(row) {
  return {
    id:            row.id,
    name:          row.name,
    brand:         row.brand          ?? null,
    imageUrl:      row.image_url      ?? null,
    packagingType: row.packaging_type,
    amountGrams:   row.amount_grams   ?? null,
    units:         row.units          ?? null,
    expiryDate:    row.expiry_date    ?? null,
    barcode:       row.barcode        ?? null,
    notes:         row.notes          ?? null,
    locationId:    row.location_id    ?? null,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  }
}

function toDB(data) {
  return {
    name:           data.name,
    brand:          data.brand          ?? null,
    image_url:      data.imageUrl       ?? null,
    packaging_type: data.packagingType,
    amount_grams:   data.amountGrams    ?? null,
    units:          data.units          ?? null,
    expiry_date:    data.expiryDate     ?? null,
    barcode:        data.barcode        ?? null,
    notes:          data.notes          ?? null,
    location_id:    data.locationId     ?? null,
  }
}

function shopToJS(row) {
  return {
    id:        row.id,
    name:      row.name,
    amount:    row.amount    ?? '',
    checked:   row.checked,
    createdAt: row.created_at,
  }
}

function locToJS(row) {
  return {
    id:          row.id,
    name:        row.name,
    description: row.description ?? '',
    sortOrder:   row.sort_order  ?? 0,
    createdAt:   row.created_at,
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

const useStore = create((set, get) => ({
  // Auth
  user:        null,
  authLoading: true,

  // Haushalt
  household: null,   // { id, name, inviteCode }

  // Data
  spices:        [],
  shoppingItems: [],
  locations:     [],
  dataLoading:   false,
  dataError:     null,

  // ── Auth ──────────────────────────────────────────────────────────────

  async init() {
    if (get()._initialized) return
    set({ _initialized: true })

    const { data: { session } } = await supabase.auth.getSession()
    set({ user: session?.user ?? null, authLoading: false })
    if (session?.user) get().loadData()

    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      set({ user })
      if (user) get().loadData()
      else set({ household: null, spices: [], shoppingItems: [], locations: [] })
    })
  },

  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  async signUp(name, email, password) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
  },

  async signOut() {
    await supabase.auth.signOut({ scope: 'local' })
    set({ user: null, household: null, spices: [], shoppingItems: [], locations: [], _initialized: false })
  },

  currentUser() {
    const { user } = get()
    if (!user) return null
    return {
      id:    user.id,
      name:  user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Benutzer',
      email: user.email,
    }
  },

  // ── Haushalt ──────────────────────────────────────────────────────────

  // Wird bei jedem loadData() aufgerufen – findet oder erstellt den Haushalt des Users
  async _ensureHousehold() {
    const { user } = get()
    if (!user) return null

    // Bestehende Mitgliedschaft suchen
    const { data: membership, error: membershipErr } = await supabase
      .from('household_members')
      .select('household_id, households(id, name, invite_code)')
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipErr) {
      console.error('🔴 _ensureHousehold – Mitgliedschaft abfragen:', membershipErr)
      set({ dataError: `Datenbankfehler: ${membershipErr.message} (Code: ${membershipErr.code})` })
      return null
    }

    if (membership?.household_id) {
      const h = membership.households
      // Altdaten (ohne household_id) automatisch in diesen Haushalt migrieren
      await Promise.all([
        supabase.from('spices').update({ household_id: h.id }).is('household_id', null),
        supabase.from('shopping_items').update({ household_id: h.id }).is('household_id', null),
        supabase.from('storage_locations').update({ household_id: h.id }).is('household_id', null),
      ])
      return { id: h.id, name: h.name, inviteCode: h.invite_code }
    }

    // Keinen Haushalt gefunden → neuen erstellen
    const householdId  = crypto.randomUUID()
    const inviteCode   = generateInviteCode()
    const userName     = user.user_metadata?.name ?? 'Benutzer'
    const householdName = `${userName}s Haushalt`

    const { error: hErr } = await supabase.from('households').insert([{
      id: householdId, name: householdName, invite_code: inviteCode, created_by: user.id,
    }])
    if (hErr) {
      console.error('🔴 _ensureHousehold – Haushalt erstellen:', hErr)
      set({ dataError: `Haushalt erstellen fehlgeschlagen: ${hErr.message} (Code: ${hErr.code})` })
      return null
    }

    const { error: mErr } = await supabase.from('household_members').insert([{
      household_id: householdId, user_id: user.id, role: 'owner',
    }])
    if (mErr) {
      console.error('🔴 _ensureHousehold – Mitglied hinzufügen:', mErr)
      set({ dataError: `Mitgliedschaft erstellen fehlgeschlagen: ${mErr.message} (Code: ${mErr.code})` })
      return null
    }

    // Altdaten migrieren
    await Promise.all([
      supabase.from('spices').update({ household_id: householdId }).is('household_id', null),
      supabase.from('shopping_items').update({ household_id: householdId }).is('household_id', null),
      supabase.from('storage_locations').update({ household_id: householdId }).is('household_id', null),
    ])

    return { id: householdId, name: householdName, inviteCode }
  },

  // Haushalt per Einladungscode beitreten
  async joinHousehold(code) {
    const { user, household } = get()
    const cleanCode = code.trim().toUpperCase()

    const { data: target } = await supabase
      .from('households')
      .select('id, name, invite_code')
      .eq('invite_code', cleanCode)
      .maybeSingle()

    if (!target) throw new Error('Ungültiger Einladungscode.')
    if (target.id === household?.id) throw new Error('Du bist bereits Mitglied dieses Haushalts.')

    // Aktuellen Haushalt verlassen
    if (household?.id) {
      await supabase.from('household_members')
        .delete()
        .eq('user_id', user.id)
        .eq('household_id', household.id)
    }

    // Neuem Haushalt beitreten
    const { error } = await supabase.from('household_members').insert([{
      household_id: target.id, user_id: user.id, role: 'member',
    }])
    if (error) throw new Error('Beitritt fehlgeschlagen: ' + error.message)

    // Daten neu laden
    set({ household: null, spices: [], shoppingItems: [], locations: [] })
    await get().loadData()

    return target.name
  },

  // Haushalt verlassen und privaten Haushalt erstellen
  async leaveHousehold() {
    const { user, household } = get()
    if (!household) return

    await supabase.from('household_members')
      .delete()
      .eq('user_id', user.id)
      .eq('household_id', household.id)

    set({ household: null, spices: [], shoppingItems: [], locations: [] })
    await get().loadData()
  },

  // Haushaltsname ändern
  async updateHouseholdName(name) {
    const { household } = get()
    if (!household || !name.trim()) return
    set(s => ({ household: { ...s.household, name: name.trim() } }))
    await supabase.from('households').update({ name: name.trim() }).eq('id', household.id)
  },

  // ── Data ─────────────────────────────────────────────────────────────

  async loadData() {
    const { user } = get()
    if (!user) return
    set({ dataLoading: true, dataError: null })

    const household = await get()._ensureHousehold()
    if (!household) { set({ dataLoading: false }); return }

    const [{ data: spicesData }, { data: shopData }, { data: locData }] = await Promise.all([
      supabase.from('spices').select('*').eq('household_id', household.id).order('name'),
      supabase.from('shopping_items').select('*').eq('household_id', household.id).order('created_at'),
      supabase.from('storage_locations').select('*').eq('household_id', household.id).order('sort_order, name'),
    ])

    set({
      household,
      spices:        (spicesData ?? []).map(toJS),
      shoppingItems: (shopData   ?? []).map(shopToJS),
      locations:     (locData    ?? []).map(locToJS),
      dataLoading:   false,
    })
  },

  // ── Spices ────────────────────────────────────────────────────────────

  addSpice(data) {
    const { user, household } = get()
    if (!household) {
      console.error('🔴 addSpice: Kein Haushalt geladen – Gewürz wird nicht gespeichert!')
      set({ dataError: 'Kein Haushalt geladen. Bitte Seite neu laden.' })
      return
    }
    const id  = crypto.randomUUID()
    const now = new Date().toISOString()
    const newSpice = toJS({ id, ...toDB(data), household_id: household.id, created_at: now, updated_at: now })
    set(s => ({
      spices: [...s.spices, newSpice].sort((a, b) => a.name.localeCompare(b.name, 'de')),
    }))
    supabase.from('spices')
      .insert([{ id, ...toDB(data), household_id: household.id, created_by: user?.id }])
      .then(({ error }) => {
        if (error) {
          console.error('🔴 addSpice – Supabase Insert fehlgeschlagen:', error)
          set({ dataError: `Gewürz speichern fehlgeschlagen: ${error.message}` })
          // Optimistisches Update rückgängig machen
          set(s => ({ spices: s.spices.filter(sp => sp.id !== id) }))
        }
      })
  },

  updateSpice(id, data) {
    const now = new Date().toISOString()
    set(s => ({
      spices: s.spices.map(sp => sp.id === id ? { ...sp, ...data, updatedAt: now } : sp),
    }))
    supabase.from('spices')
      .update({ ...toDB(data), updated_at: now })
      .eq('id', id)
      .then(({ error }) => { if (error) console.error('updateSpice:', error) })
  },

  deleteSpice(id) {
    set(s => ({ spices: s.spices.filter(sp => sp.id !== id) }))
    supabase.from('spices').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('deleteSpice:', error) })
  },

  // ── Lagerorte ─────────────────────────────────────────────────────────

  addLocation(data) {
    const { household } = get()
    const id = crypto.randomUUID()
    const newLoc = locToJS({ id, name: data.name, description: data.description ?? '', sort_order: data.sortOrder ?? 0, created_at: new Date().toISOString() })
    set(s => ({ locations: [...s.locations, newLoc] }))
    supabase.from('storage_locations')
      .insert([{ id, name: data.name, description: data.description || null, sort_order: data.sortOrder ?? 0, household_id: household?.id }])
      .then(({ error }) => { if (error) console.error('addLocation:', error) })
  },

  updateLocation(id, data) {
    set(s => ({
      locations: s.locations.map(l => l.id === id ? { ...l, ...data } : l),
    }))
    supabase.from('storage_locations')
      .update({ name: data.name, description: data.description || null, sort_order: data.sortOrder ?? 0 })
      .eq('id', id)
      .then(({ error }) => { if (error) console.error('updateLocation:', error) })
  },

  deleteLocation(id) {
    set(s => ({
      locations: s.locations.filter(l => l.id !== id),
      spices:    s.spices.map(sp => sp.locationId === id ? { ...sp, locationId: null } : sp),
    }))
    supabase.from('storage_locations').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('deleteLocation:', error) })
  },

  // ── Shopping ─────────────────────────────────────────────────────────

  addShoppingItem(name, amount = '') {
    const { user, household } = get()
    const id   = crypto.randomUUID()
    const item = { id, name: name.trim(), amount: amount.trim(), checked: false, createdAt: new Date().toISOString() }
    set(s => ({ shoppingItems: [...s.shoppingItems, item] }))
    supabase.from('shopping_items')
      .insert([{ id, name: name.trim(), amount: amount.trim() || null, added_by: user?.id, household_id: household?.id }])
      .then(({ error }) => { if (error) console.error('addShoppingItem:', error) })
  },

  toggleShoppingItem(id) {
    const item = get().shoppingItems.find(i => i.id === id)
    if (!item) return
    const checked = !item.checked
    set(s => ({ shoppingItems: s.shoppingItems.map(i => i.id === id ? { ...i, checked } : i) }))
    supabase.from('shopping_items').update({ checked }).eq('id', id)
      .then(({ error }) => { if (error) console.error('toggleShoppingItem:', error) })
  },

  updateShoppingItem(id, updates) {
    set(s => ({ shoppingItems: s.shoppingItems.map(i => i.id === id ? { ...i, ...updates } : i) }))
    const dbUpdates = {}
    if (updates.name   !== undefined) dbUpdates.name   = updates.name
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount || null
    supabase.from('shopping_items').update(dbUpdates).eq('id', id)
      .then(({ error }) => { if (error) console.error('updateShoppingItem:', error) })
  },

  deleteShoppingItem(id) {
    set(s => ({ shoppingItems: s.shoppingItems.filter(i => i.id !== id) }))
    supabase.from('shopping_items').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('deleteShoppingItem:', error) })
  },

  clearCheckedShopping() {
    const ids = get().shoppingItems.filter(i => i.checked).map(i => i.id)
    if (!ids.length) return
    set(s => ({ shoppingItems: s.shoppingItems.filter(i => !i.checked) }))
    supabase.from('shopping_items').delete().in('id', ids)
      .then(({ error }) => { if (error) console.error('clearCheckedShopping:', error) })
  },
}))

export default useStore
