import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { bringLogin, bringGetLists, bringAddItem, bringGetItems, bringRemoveItem, bringRefreshToken } from '../lib/bring'
import { cookidooVerify } from '../lib/cookidoo'

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
    category:      row.category       ?? null,
    fillLevel:     row.fill_level     ?? 4,
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
    category:       data.category       ?? null,
    fill_level:     data.fillLevel      ?? 4,
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

function catToJS(row) {
  return {
    id:        row.id,
    name:      row.name,
    color:     row.color      ?? 'gray',
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  }
}

function recipeToJS(r) {
  return {
    id:           r.id,
    title:        r.title,
    sourceUrl:    r.source_url   ?? '',
    sourceType:   r.source_type  ?? 'youtube',
    videoId:      r.video_id     ?? null,
    thumbnailUrl: r.thumbnail_url ?? null,
    author:       r.author       ?? '',
    tags:         r.tags         ?? [],
    ingredients:  r.ingredients  ?? [],   // [{ name, amount }]
    steps:        r.steps        ?? [],   // [ "..." ]
    notes:        r.notes        ?? '',
    createdAt:    r.created_at,
  }
}

function recipeToDB(d) {
  return {
    title:         d.title,
    source_url:    d.sourceUrl    ?? null,
    source_type:   d.sourceType   ?? 'youtube',
    video_id:      d.videoId      ?? null,
    thumbnail_url: d.thumbnailUrl ?? null,
    author:        d.author       ?? null,
    tags:          d.tags         ?? [],
    ingredients:   d.ingredients  ?? [],
    steps:         d.steps        ?? [],
    notes:         d.notes        ?? null,
  }
}

// ── Theme (Dark Mode) ─────────────────────────────────────────────────────────

function applyTheme(theme) {
  if (typeof document === 'undefined') return
  const dark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

const initialTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('gewuerz_theme')) || 'system'

// Bei System-Modus auf OS-Änderungen reagieren
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const t = localStorage.getItem('gewuerz_theme') || 'system'
    if (t === 'system') applyTheme('system')
  })
}

// ── Store ─────────────────────────────────────────────────────────────────────

const useStore = create((set, get) => ({
  // Auth
  user:        null,
  authLoading: true,

  // Theme: 'system' | 'light' | 'dark'
  theme: initialTheme,
  setTheme(theme) {
    localStorage.setItem('gewuerz_theme', theme)
    applyTheme(theme)
    set({ theme })
  },

  // Onboarding (Willkommens-Tour)
  onboardingReplay: false,
  startOnboarding() { set({ onboardingReplay: true }) },
  async finishOnboarding() {
    set({ onboardingReplay: false })
    const { user } = get()
    if (user && !user.user_metadata?.onboarding_done) {
      await supabase.auth.updateUser({ data: { onboarding_done: true } })
    }
  },

  // Haushalt
  household: null,   // { id, name, inviteCode }

  // Bring!
  bringSettings: null, // null | { accessToken, userUuid, listUuid, listName, email }
  bringItems:      [], // [{ uuid, name, specification }] – aktuelle Artikel der Bring!-Liste
  bringItemsError: null,

  // Cookidoo
  cookidooSettings: null, // null | { email, password }

  async connectCookidoo(email, password) {
    await cookidooVerify(email, password)  // wirft bei falschen Daten
    const settings = { email, password }
    set({ cookidooSettings: settings })
    await supabase.auth.updateUser({ data: { cookidoo: settings } })
  },

  async disconnectCookidoo() {
    set({ cookidooSettings: null })
    await supabase.auth.updateUser({ data: { cookidoo: null } })
  },

  // Data
  spices:        [],
  shoppingItems: [],
  locations:     [],
  categories:    [],
  activityLog:   [],
  pendingInventory: [],   // [{ id, name, brand, spiceId, status, seenOnList }]
  recipes:       [],
  dataLoading:   false,
  dataError:     null,

  // ── Aktivitätsverlauf ───────────────────────────────────────────────────

  // Fire-and-forget: schreibt einen Verlaufseintrag (denormalisiert für Lesbarkeit)
  _logActivity(action, targetName = null, detail = null) {
    const { household, user } = get()
    if (!household) return
    const userName = user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'Jemand'
    supabase.from('activity_log').insert([{
      household_id: household.id,
      user_id:      user?.id ?? null,
      user_name:    userName,
      action,
      target_name:  targetName,
      detail,
    }]).then(({ error }) => { if (error) console.error('logActivity:', error) })
  },

  async loadActivity() {
    const { household } = get()
    if (!household) return
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false })
      .limit(150)
    if (error) { console.error('loadActivity:', error); return }
    set({ activityLog: (data ?? []).map(r => ({
      id:        r.id,
      userName:  r.user_name ?? 'Jemand',
      action:    r.action,
      target:    r.target_name ?? '',
      detail:    r.detail ?? '',
      createdAt: r.created_at,
    })) })
  },

  // ── Auth ──────────────────────────────────────────────────────────────

  async init() {
    if (get()._initialized) return
    set({ _initialized: true })

    const { data: { session } } = await supabase.auth.getSession()
    const bringSettings = session?.user?.user_metadata?.bring_settings ?? null
    const cookidooSettings = session?.user?.user_metadata?.cookidoo ?? null
    set({ user: session?.user ?? null, authLoading: false, bringSettings, cookidooSettings })

    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      const bringSettings = user?.user_metadata?.bring_settings ?? null
      const cookidooSettings = user?.user_metadata?.cookidoo ?? null
      set({ user, bringSettings, cookidooSettings })
      if (user) get().loadData()
      else set({ household: null, spices: [], shoppingItems: [], locations: [], categories: [], pendingInventory: [], recipes: [], bringSettings: null, cookidooSettings: null })
    })
  },

  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  async signUp(name, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw error
    // Gibt true zurück wenn E-Mail-Bestätigung erforderlich ist
    // (Supabase setzt session=null wenn Confirmation aktiv)
    return { needsConfirmation: !data.session }
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  },

  async signOut() {
    await supabase.auth.signOut({ scope: 'local' })
    set({ user: null, household: null, spices: [], shoppingItems: [], locations: [], categories: [], pendingInventory: [], recipes: [], bringSettings: null, cookidooSettings: null, _initialized: false })
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

    // Bestehende Mitgliedschaft suchen (limit(1) statt maybeSingle, um mehrere Zeilen zu tolerieren)
    const { data: memberships, error: membershipErr } = await supabase
      .from('household_members')
      .select('household_id, role, households(id, name, invite_code)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: true })
      .limit(1)

    if (membershipErr) {
      console.error('🔴 _ensureHousehold – Mitgliedschaft abfragen:', membershipErr)
      set({ dataError: `Datenbankfehler: ${membershipErr.message} (Code: ${membershipErr.code})` })
      return null
    }

    const membership = memberships?.[0] ?? null

    if (membership?.household_id) {
      const h = membership.households
      // Altdaten (ohne household_id) automatisch in diesen Haushalt migrieren
      await Promise.all([
        supabase.from('spices').update({ household_id: h.id }).is('household_id', null),
        supabase.from('shopping_items').update({ household_id: h.id }).is('household_id', null),
        supabase.from('storage_locations').update({ household_id: h.id }).is('household_id', null),
      ])
      return { id: h.id, name: h.name, inviteCode: h.invite_code, role: membership.role ?? 'member' }
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

    return { id: householdId, name: householdName, inviteCode, role: 'owner' }
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

  // ── Bring! ────────────────────────────────────────────────────────────

  // Schritt 1: Anmelden + Listen laden (gibt [{ listUuid, name }] zurück)
  async connectBring(email, password) {
    const auth = await bringLogin(email, password)
    const publicUuid = auth.publicUuid
    const rawUuid    = auth.uuid
    const userUuid   = publicUuid || rawUuid

    // getLists versuchen – schlägt fehl → Fallback auf bringListUUID aus der Login-Antwort
    let lists = []
    let listsError = null
    try {
      lists = await bringGetLists(userUuid, rawUuid, auth.access_token)
    } catch (e) {
      listsError = e.message
      console.warn('⚠️ bringGetLists fehlgeschlagen, nutze Fallback:', listsError)
    }

    // Fallback: Default-Liste ist direkt im Login-Response enthalten
    if (lists.length === 0 && auth.bringListUUID) {
      lists = [{ listUuid: auth.bringListUUID, name: 'Meine Bring!-Liste' }]
    }

    if (lists.length === 0) {
      throw new Error(listsError || 'Keine Bring!-Listen gefunden')
    }

    // Temporär speichern bis Liste gewählt wurde (inkl. refresh_token)
    set({ _bringAuth: { accessToken: auth.access_token, refreshToken: auth.refresh_token ?? null, userUuid, email } })
    return lists
  },

  // Access-Token via refresh_token erneuern; aktualisiert State + user_metadata.
  // Gibt den neuen Token zurück oder null.
  async _refreshBringToken() {
    const { bringSettings } = get()
    if (!bringSettings?.refreshToken) return null
    try {
      const data = await bringRefreshToken(bringSettings.refreshToken)
      const newToken = data.access_token
      if (!newToken) return null
      const updated = {
        ...bringSettings,
        accessToken: newToken,
        refreshToken: data.refresh_token ?? bringSettings.refreshToken,
      }
      set({ bringSettings: updated })
      supabase.auth.updateUser({ data: { bring_settings: updated } })
      return newToken
    } catch (e) {
      console.error('🔴 Bring! refresh:', e.message)
      return null
    }
  },

  // Schritt 2: Liste auswählen + persistent speichern
  async setBringList(listUuid, listName) {
    const { _bringAuth } = get()
    if (!_bringAuth) throw new Error('Nicht authentifiziert')
    const settings = { ..._bringAuth, listUuid, listName }
    set({ bringSettings: settings, _bringAuth: null })
    await supabase.auth.updateUser({ data: { bring_settings: settings } })
  },

  async disconnectBring() {
    set({ bringSettings: null, bringItems: [] })
    await supabase.auth.updateUser({ data: { bring_settings: null } })
  },

  // Aktuelle Artikel aus der Bring!-Liste laden
  async loadBringItems(_retried = false) {
    const { bringSettings } = get()
    if (!bringSettings?.listUuid || !bringSettings?.accessToken) return
    try {
      const { items, debugInfo } = await bringGetItems(
        bringSettings.listUuid,
        bringSettings.accessToken,
        bringSettings.userUuid ?? ''
      )
      set({
        bringItems: items,
        bringItemsError: items.length === 0
          ? `Keine Artikel gefunden. API-Antwort: ${debugInfo}`
          : null,
      })
      // Nachkauf-Abgleich: abgehakte Gewürze → 'ready'
      get()._reconcilePending(items.map(i => i.name))
    } catch (e) {
      console.error('🔴 loadBringItems:', e.message)
      // Token abgelaufen → einmal erneuern und erneut versuchen
      if (!_retried && /401/.test(e.message)) {
        const t = await get()._refreshBringToken()
        if (t) return get().loadBringItems(true)
      }
      // Rate-Limit: kein roter Fehler, vorhandene Liste bleibt angezeigt
      if (e.message.includes('usage_exceeded')) return
      set({ bringItemsError: e.message })
    }
  },

  // Artikel aus der Bring!-Liste entfernen (→ "Kürzlich gekauft")
  async removeBringItem(name, _retried = false) {
    const { bringSettings } = get()
    if (!bringSettings?.listUuid || !bringSettings?.accessToken) return
    // Optimistisch aus der lokalen Liste entfernen
    set(s => ({ bringItems: s.bringItems.filter(i => i.name !== name) }))
    try {
      await bringRemoveItem(bringSettings.listUuid, bringSettings.accessToken, name)
      get().loadBringItems()
    } catch (e) {
      console.error('🔴 removeBringItem:', e.message)
      if (!_retried && /401/.test(e.message)) {
        const t = await get()._refreshBringToken()
        if (t) return get().removeBringItem(name, true)
      }
      get().loadBringItems()
    }
  },

  // ── Nachkauf / Einräumen ────────────────────────────────────────────────

  _pendingToJS(r) {
    return { id: r.id, name: r.name, brand: r.brand ?? null, spiceId: r.spice_id ?? null, status: r.status, seenOnList: !!r.seen_on_list }
  },

  async loadPendingInventory() {
    const { household } = get()
    if (!household) return
    const { data } = await supabase
      .from('pending_inventory')
      .select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false })
    set({ pendingInventory: (data ?? []).map(get()._pendingToJS) })
  },

  // Beim Auf-die-Liste-Setzen eines Gewürzes einen Nachkauf-Eintrag anlegen
  _addPending(name, spiceId = null, brand = null) {
    const { household, pendingInventory } = get()
    if (!household) return
    const cleanName = name.trim()
    // Doppelte vermeiden (gleicher Name, noch offen)
    if (pendingInventory.some(p => p.name.toLowerCase() === cleanName.toLowerCase())) return
    const id = crypto.randomUUID()
    const row = { id, name: cleanName, brand, spiceId, status: 'shopping', seenOnList: false }
    set(s => ({ pendingInventory: [row, ...s.pendingInventory] }))
    supabase.from('pending_inventory').insert([{
      id, household_id: household.id, name: cleanName, brand, spice_id: spiceId, status: 'shopping', seen_on_list: false,
    }]).then(({ error }) => { if (error) console.error('addPending:', error) })
  },

  // Abgleich mit der aktuellen Bring!-Liste: abgehakte Gewürze → 'ready'
  _reconcilePending(activeNames) {
    const { pendingInventory } = get()
    const active = new Set(activeNames.map(n => n.toLowerCase()))
    pendingInventory.filter(p => p.status === 'shopping').forEach(p => {
      const onList = active.has(p.name.toLowerCase())
      if (onList && !p.seenOnList) {
        set(s => ({ pendingInventory: s.pendingInventory.map(x => x.id === p.id ? { ...x, seenOnList: true } : x) }))
        supabase.from('pending_inventory').update({ seen_on_list: true }).eq('id', p.id).then(() => {})
      } else if (!onList && p.seenOnList) {
        set(s => ({ pendingInventory: s.pendingInventory.map(x => x.id === p.id ? { ...x, status: 'ready' } : x) }))
        supabase.from('pending_inventory').update({ status: 'ready' }).eq('id', p.id).then(() => {})
      }
    })
  },

  // Manuell als eingekauft markieren (→ wartet auf Einräumen)
  markPurchased(name, spiceId = null, brand = null) {
    const { pendingInventory } = get()
    const existing = pendingInventory.find(p => p.name.toLowerCase() === name.trim().toLowerCase())
    if (existing) {
      set(s => ({ pendingInventory: s.pendingInventory.map(x => x.id === existing.id ? { ...x, status: 'ready' } : x) }))
      supabase.from('pending_inventory').update({ status: 'ready' }).eq('id', existing.id).then(() => {})
    } else {
      const { household } = get()
      if (!household) return
      const id = crypto.randomUUID()
      const row = { id, name: name.trim(), brand, spiceId, status: 'ready', seenOnList: true }
      set(s => ({ pendingInventory: [row, ...s.pendingInventory] }))
      supabase.from('pending_inventory').insert([{
        id, household_id: household.id, name: name.trim(), brand, spice_id: spiceId, status: 'ready', seen_on_list: true,
      }]).then(() => {})
    }
  },

  // Nachkauf-Eintrag entfernen (eingeräumt oder verworfen)
  resolvePending(id) {
    set(s => ({ pendingInventory: s.pendingInventory.filter(p => p.id !== id) }))
    supabase.from('pending_inventory').delete().eq('id', id).then(() => {})
  },

  // Offenen Nachkauf zu einem Namen verwerfen (z.B. „nur entfernt, nicht gekauft")
  cancelPendingByName(name) {
    const n = name.trim().toLowerCase()
    set(s => ({ pendingInventory: s.pendingInventory.filter(p => p.name.toLowerCase() !== n) }))
    const { household } = get()
    if (household) {
      supabase.from('pending_inventory').delete()
        .eq('household_id', household.id).ilike('name', name.trim())
        .then(() => {})
    }
  },

  // ── Data ─────────────────────────────────────────────────────────────

  async loadData() {
    const { user } = get()
    if (!user || get()._dataLoadingLock) return
    set({ dataLoading: true, dataError: null, _dataLoadingLock: true })

    const household = await get()._ensureHousehold()
    if (!household) { set({ dataLoading: false, _dataLoadingLock: false }); return }

    const [{ data: spicesData }, { data: shopData }, { data: locData }, { data: catData }, { data: pendData }, { data: recipeData }] = await Promise.all([
      supabase.from('spices').select('*').eq('household_id', household.id).order('name'),
      supabase.from('shopping_items').select('*').eq('household_id', household.id).order('created_at'),
      supabase.from('storage_locations').select('*').eq('household_id', household.id).order('sort_order, name'),
      supabase.from('spice_categories').select('*').eq('household_id', household.id).order('sort_order, name'),
      supabase.from('pending_inventory').select('*').eq('household_id', household.id).order('created_at', { ascending: false }),
      supabase.from('recipes').select('*').eq('household_id', household.id).order('created_at', { ascending: false }),
    ])

    set({
      household,
      spices:        (spicesData ?? []).map(toJS),
      shoppingItems: (shopData   ?? []).map(shopToJS),
      locations:     (locData    ?? []).map(locToJS),
      categories:    (catData    ?? []).map(catToJS),
      pendingInventory: (pendData ?? []).map(get()._pendingToJS),
      recipes:       (recipeData ?? []).map(recipeToJS),
      dataLoading:   false,
      _dataLoadingLock: false,
    })
  },

  // ── Rezepte ──────────────────────────────────────────────────────────

  addRecipe(data) {
    const { user, household } = get()
    if (!household) return null
    const id  = crypto.randomUUID()
    const now = new Date().toISOString()
    const newRecipe = recipeToJS({ id, ...recipeToDB(data), created_at: now })
    set(s => ({ recipes: [newRecipe, ...s.recipes] }))
    supabase.from('recipes')
      .insert([{ id, ...recipeToDB(data), household_id: household.id, created_by: user?.id }])
      .then(({ error }) => { if (error) console.error('addRecipe:', error) })
    return id
  },

  updateRecipe(id, data) {
    set(s => ({ recipes: s.recipes.map(r => r.id === id ? { ...r, ...data } : r) }))
    supabase.from('recipes').update(recipeToDB({ ...get().recipes.find(r => r.id === id), ...data }))
      .eq('id', id)
      .then(({ error }) => { if (error) console.error('updateRecipe:', error) })
  },

  deleteRecipe(id) {
    set(s => ({ recipes: s.recipes.filter(r => r.id !== id) }))
    supabase.from('recipes').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('deleteRecipe:', error) })
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
    get()._logActivity('spice_added', data.name)
  },

  updateSpice(id, data) {
    const now = new Date().toISOString()
    const prev = get().spices.find(sp => sp.id === id)
    set(s => ({
      spices: s.spices.map(sp => sp.id === id ? { ...sp, ...data, updatedAt: now } : sp),
    }))
    supabase.from('spices')
      .update({ ...toDB(data), updated_at: now })
      .eq('id', id)
      .then(({ error }) => { if (error) console.error('updateSpice:', error) })
    get()._logActivity('spice_updated', data.name ?? prev?.name ?? '')
  },

  updateFillLevel(id, level) {
    const FILL_LABELS = ['Fast leer', 'Wenig', 'Halb', 'Gut', 'Voll']
    const clamped = Math.max(0, Math.min(4, level))
    const sp = get().spices.find(s => s.id === id)
    set(s => ({
      spices: s.spices.map(sp => sp.id === id ? { ...sp, fillLevel: clamped } : sp),
    }))
    supabase.from('spices').update({ fill_level: clamped }).eq('id', id)
      .then(({ error }) => { if (error) console.error('updateFillLevel:', error) })
    if (sp) get()._logActivity('fill_changed', sp.name, FILL_LABELS[clamped])
  },

  deleteSpice(id) {
    const sp = get().spices.find(s => s.id === id)
    set(s => ({ spices: s.spices.filter(sp => sp.id !== id) }))
    supabase.from('spices').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('deleteSpice:', error) })
    if (sp) get()._logActivity('spice_deleted', sp.name)
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

  // ── Kategorien ────────────────────────────────────────────────────────

  addCategory(data) {
    const { household, categories } = get()
    const id = crypto.randomUUID()
    const newCat = catToJS({ id, name: data.name, color: data.color ?? 'gray', sort_order: categories.length, created_at: new Date().toISOString() })
    set(s => ({ categories: [...s.categories, newCat] }))
    supabase.from('spice_categories')
      .insert([{ id, name: data.name, color: data.color || 'gray', sort_order: categories.length, household_id: household?.id }])
      .then(({ error }) => { if (error) console.error('addCategory:', error) })
  },

  updateCategory(id, data) {
    set(s => ({ categories: s.categories.map(c => c.id === id ? { ...c, ...data } : c) }))
    supabase.from('spice_categories')
      .update({ name: data.name, color: data.color })
      .eq('id', id)
      .then(({ error }) => { if (error) console.error('updateCategory:', error) })
  },

  deleteCategory(id) {
    set(s => ({
      categories: s.categories.filter(c => c.id !== id),
      spices:     s.spices.map(sp => sp.category === id ? { ...sp, category: null } : sp),
    }))
    supabase.from('spice_categories').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('deleteCategory:', error) })
    // Kategorie-Zuweisung bei betroffenen Gewürzen entfernen
    supabase.from('spices').update({ category: null }).eq('category', id)
      .then(({ error }) => { if (error) console.error('deleteCategory/spices:', error) })
  },

  // ── Shopping ─────────────────────────────────────────────────────────

  addShoppingItem(name, amount = '', isSpice = false, meta = {}) {
    const { bringSettings, user, household } = get()
    if (isSpice) get()._addPending(name, meta.spiceId ?? null, meta.brand ?? null)

    // Bring!-Modus: direkt in Bring!-Liste schreiben, danach Liste neu laden
    if (bringSettings?.listUuid && bringSettings?.accessToken) {
      // Gewürze bekommen "Gewürz" als Specification – so können wir sie in der Ansicht filtern
      const spec = isSpice ? 'Gewürz' : amount.trim()
      const addOnce = async (token, retried) => {
        try {
          await bringAddItem(bringSettings.listUuid, token, name.trim(), spec)
          get().loadBringItems()
        } catch (err) {
          console.error('🔴 Bring! addItem:', err)
          if (!retried && /401/.test(err.message)) {
            const t = await get()._refreshBringToken()
            if (t) return addOnce(t, true)
          }
          set({ dataError: `Bring!-Fehler: ${err.message}` })
        }
      }
      addOnce(bringSettings.accessToken, false)
      get()._logActivity('shopping_added', name.trim())
      return
    }

    // Eingebaute Liste
    const id   = crypto.randomUUID()
    const item = { id, name: name.trim(), amount: amount.trim(), checked: false, createdAt: new Date().toISOString() }
    set(s => ({ shoppingItems: [...s.shoppingItems, item] }))
    supabase.from('shopping_items')
      .insert([{ id, name: name.trim(), amount: amount.trim() || null, added_by: user?.id, household_id: household?.id }])
      .then(({ error }) => { if (error) console.error('addShoppingItem:', error) })
    get()._logActivity('shopping_added', name.trim())
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

  // ── Export ────────────────────────────────────────────────────────────

  exportData() {
    const { spices, locations, categories, household } = get()
    const locById = Object.fromEntries(locations.map(l => [l.id, l]))
    const catById = Object.fromEntries(categories.map(c => [c.id, c]))
    return {
      exportedAt: new Date().toISOString(),
      version:    1,
      haushalt:   household?.name ?? '',
      kategorien: categories.map(c => ({
        name:        c.name,
        farbe:       c.color,
        reihenfolge: c.sortOrder,
      })),
      lagerorte: locations.map(l => ({
        name:         l.name,
        beschreibung: l.description || null,
        reihenfolge:  l.sortOrder,
      })),
      gewuerze: spices.map(s => ({
        name:       s.name,
        marke:      s.brand        ?? null,
        verpackung: s.packagingType,
        mengeGramm: s.amountGrams  ?? null,
        stueckzahl: s.units        ?? null,
        mhd:        s.expiryDate   ?? null,
        barcode:    s.barcode      ?? null,
        notizen:    s.notes        ?? null,
        kategorie:  catById[s.category]?.name   ?? null,
        lagerort:   locById[s.locationId]?.name ?? null,
        erstellt:   s.createdAt,
      })),
    }
  },
}))

export default useStore
