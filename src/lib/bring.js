// ── Bring! API (über Netlify-Proxy) ───────────────────────────────────────────
// Direkte Browser-Anfragen an api.getbring.com scheitern an CORS.
// Deshalb läuft der eigentliche HTTP-Call serverseitig in einer
// Netlify Function unter /.netlify/functions/bring-proxy.

const PROXY = '/.netlify/functions/bring-proxy'

async function callProxy(action, params = {}) {
  const res = await fetch(PROXY, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action, ...params }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Fehler ${res.status}`)
  return data
}

// ── Öffentliche API ───────────────────────────────────────────────────────────

export async function bringLogin(email, password) {
  // Gibt { uuid, access_token, name, email, ... } zurück
  return callProxy('login', { email, password })
}

export async function bringGetLists(userUuid, rawUuid, accessToken) {
  // Gibt [{ listUuid, name, theme }] zurück
  // rawUuid = auth.uuid, userUuid = auth.publicUuid || auth.uuid
  const data = await callProxy('getLists', { userUuid, rawUuid, accessToken })
  return data.lists ?? []
}

export async function bringAddItem(listUuid, accessToken, name, specification = '') {
  await callProxy('addItem', { listUuid, accessToken, name, specification })
}

export async function bringGetItems(listUuid, accessToken, userUuid = '') {
  const data = await callProxy('getItems', { listUuid, accessToken, userUuid })

  // Bring! kann die Liste direkt als Array zurückgeben oder in verschiedenen Feldern verpackt
  const raw = Array.isArray(data)
    ? data
    : (data.items ?? data.purchases ?? data.content ?? [])

  // Feldnamen normalisieren: Bring! nutzt itemId/spec statt name/specification
  const items = raw.map(i => ({
    uuid:          i.uuid          ?? i.itemId ?? i.name ?? '',
    name:          i.name          ?? i.itemId ?? '',
    specification: i.specification ?? i.spec   ?? '',
  })).filter(i => i.name)

  // Debug-Info für den Fall dass noch immer leer
  const debugInfo = Array.isArray(data)
    ? `Array mit ${data.length} Einträgen`
    : `Felder: ${Object.keys(data).join(', ')} | raw=${raw.length}`

  return { items, debugInfo }
}

export async function bringRemoveItem(listUuid, accessToken, name) {
  // Verschiebt den Artikel in Bring!'s "Kürzlich gekauft"-Liste
  await callProxy('removeItem', { listUuid, accessToken, name })
}
