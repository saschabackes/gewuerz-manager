import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// ── DB (snake_case) ↔ JS (camelCase) Mapper ──────────────────────────────────

function toJS(row) {
  return {
    id:            row.id,
    name:          row.name,
    brand:         row.brand         ?? null,
    imageUrl:      row.image_url     ?? null,
    packagingType: row.packaging_type,
    amountGrams:   row.amount_grams  ?? null,
    units:         row.units         ?? null,
    expiryDate:    row.expiry_date   ?? null,
    barcode:       row.barcode       ?? null,
    notes:         row.notes         ?? null,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  }
}

function toDB(data) {
  return {
    name:           data.name,
    brand:          data.brand         ?? null,
    image_url:      data.imageUrl      ?? null,
    packaging_type: data.packagingType,
    amount_grams:   data.amountGrams   ?? null,
    units:          data.units         ?? null,
    expiry_date:    data.expiryDate    ?? null,
    barcode:        data.barcode       ?? null,
    notes:          data.notes         ?? null,
  }
}

function shopToJS(row) {
  return {
    id:        row.id,
    name:      row.name,
    amount:    row.amount   ?? '',
    checked:   row.checked,
    createdAt: row.created_at,
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

const useStore = create((set, get) => ({
  // Auth
  user:        null,
  authLoading: true,

  // Data
  spices:        [],
  shoppingItems: [],
  dataLoading:   false,

  // ── Auth ──────────────────────────────────────────────────────────────

  async init() {
    // Verhindert Doppel-Initialisierung (React StrictMode ruft useEffect 2× auf)
    if (get()._initialized) return
    set({ _initialized: true })

    const { data: { session } } = await supabase.auth.getSession()
    set({ user: session?.user ?? null, authLoading: false })
    if (session?.user) get().loadData()

    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      set({ user })
      if (user) get().loadData()
      else set({ spices: [], shoppingItems: [] })
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
    await supabase.auth.signOut()
    set({ user: null, spices: [], shoppingItems: [], _initialized: false })
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

  // ── Data ─────────────────────────────────────────────────────────────

  async loadData() {
    set({ dataLoading: true })
    const [{ data: spicesData }, { data: shopData }] = await Promise.all([
      supabase.from('spices').select('*').order('name'),
      supabase.from('shopping_items').select('*').order('created_at'),
    ])
    set({
      spices:        (spicesData ?? []).map(toJS),
      shoppingItems: (shopData   ?? []).map(shopToJS),
      dataLoading:   false,
    })
  },

  // ── Spices ────────────────────────────────────────────────────────────

  addSpice(data) {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newSpice = toJS({ id, ...toDB(data), created_at: now, updated_at: now })
    // Optimistisch sofort in die Liste einfügen (alphabetisch sortiert)
    set(s => ({
      spices: [...s.spices, newSpice].sort((a, b) => a.name.localeCompare(b.name, 'de')),
    }))
    // Im Hintergrund in Supabase speichern
    supabase.from('spices')
      .insert([{ id, ...toDB(data), created_by: get().user?.id }])
      .then(({ error }) => { if (error) console.error('addSpice:', error) })
  },

  updateSpice(id, data) {
    const now = new Date().toISOString()
    set(s => ({
      spices: s.spices.map(sp =>
        sp.id === id ? { ...sp, ...data, updatedAt: now } : sp
      ),
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

  // ── Shopping ─────────────────────────────────────────────────────────

  addShoppingItem(name, amount = '') {
    const id = crypto.randomUUID()
    const item = {
      id,
      name:      name.trim(),
      amount:    amount.trim(),
      checked:   false,
      createdAt: new Date().toISOString(),
    }
    set(s => ({ shoppingItems: [...s.shoppingItems, item] }))
    supabase.from('shopping_items')
      .insert([{ id, name: name.trim(), amount: amount.trim() || null, added_by: get().user?.id }])
      .then(({ error }) => { if (error) console.error('addShoppingItem:', error) })
  },

  toggleShoppingItem(id) {
    const item = get().shoppingItems.find(i => i.id === id)
    if (!item) return
    const checked = !item.checked
    set(s => ({
      shoppingItems: s.shoppingItems.map(i => i.id === id ? { ...i, checked } : i),
    }))
    supabase.from('shopping_items').update({ checked }).eq('id', id)
      .then(({ error }) => { if (error) console.error('toggleShoppingItem:', error) })
  },

  updateShoppingItem(id, updates) {
    set(s => ({
      shoppingItems: s.shoppingItems.map(i => i.id === id ? { ...i, ...updates } : i),
    }))
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
