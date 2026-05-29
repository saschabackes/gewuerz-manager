// ── Bring! Inoffizielle API ───────────────────────────────────────────────────
// Basierend auf Community-Dokumentation (github.com/foxriver76/node-bring-api)
// Die API ist nicht offiziell – kann sich ändern.

const BASE_URL = 'https://api.getbring.com/rest/v2'
const BRING_KEY = 'cof4Nc6D8saplXjE3h3HXqHH8m7VU2i1Gs0g85Ol'

const BASE_HEADERS = {
  'X-BRING-API-KEY':         BRING_KEY,
  'X-BRING-CLIENT':          'webApp',
  'X-BRING-CLIENT-VERSION':  '303070050',
  'X-BRING-COUNTRY':         'DE',
}

// ── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Meldet den Nutzer an und gibt { uuid, access_token, name, email } zurück.
 */
export async function bringLogin(email, password) {
  const res = await fetch(`${BASE_URL}/bringauth`, {
    method:  'POST',
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({ email, password }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message ?? `Anmeldung fehlgeschlagen (${res.status})`)
  }
  return res.json()
}

// ── Listen ────────────────────────────────────────────────────────────────────

/**
 * Gibt alle Listen des Nutzers zurück: [{ listUuid, name, theme }]
 */
export async function bringGetLists(userUuid, accessToken) {
  const res = await fetch(`${BASE_URL}/bringlists/${userUuid}`, {
    headers: { ...BASE_HEADERS, Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Listen laden fehlgeschlagen (${res.status})`)
  const data = await res.json()
  return data.lists ?? []
}

// ── Artikel ───────────────────────────────────────────────────────────────────

/**
 * Fügt einen Artikel zur Bring!-Liste hinzu.
 */
export async function bringAddItem(listUuid, accessToken, name, specification = '') {
  const res = await fetch(`${BASE_URL}/bringlists/${listUuid}`, {
    method:  'PUT',
    headers: {
      ...BASE_HEADERS,
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ purchase: name, specification, remove: '' }),
  })
  if (!res.ok) throw new Error(`Artikel hinzufügen fehlgeschlagen (${res.status})`)
}
