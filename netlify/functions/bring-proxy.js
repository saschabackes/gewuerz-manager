// ── Bring! API Proxy ──────────────────────────────────────────────────────────
// Läuft serverseitig auf Netlify → kein CORS-Problem.
// Der Browser ruft /.netlify/functions/bring-proxy auf,
// diese Funktion leitet an api.getbring.com weiter.

const BASE_URL   = 'https://api.getbring.com/rest/v2'
const BRING_KEY  = 'cof4Nc6D8saplXjE3h3HXqHH8m7VU2i1Gs0g85Ol'

const BRING_HEADERS = {
  'X-BRING-API-KEY':        BRING_KEY,
  'X-BRING-CLIENT':         'webApp',
  'X-BRING-CLIENT-VERSION': '303070050',
  'X-BRING-COUNTRY':        'DE',
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
}

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  let body
  try { body = JSON.parse(event.body || '{}') }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) } }

  const { action, ...p } = body

  try {
    // ── Login ──────────────────────────────────────────────────────────
    if (action === 'login') {
      if (!p.email || !p.password) throw new Error('E-Mail und Passwort erforderlich')
      const res = await fetch(`${BASE_URL}/bringauth`, {
        method:  'POST',
        headers: { ...BRING_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({ email: p.email, password: p.password }).toString(),
      })
      const rawText = await res.text()
      // Immer den rohen Response zurückgeben wenn etwas schief geht
      if (!rawText) {
        throw new Error(`Bring! HTTP ${res.status} – leere Antwort`)
      }
      let data
      try {
        data = JSON.parse(rawText)
      } catch (_) {
        throw new Error(`Bring! HTTP ${res.status} – kein JSON: ${rawText.slice(0, 300)}`)
      }
      if (!res.ok) {
        throw new Error(`Bring! HTTP ${res.status}: ${data.message ?? rawText.slice(0, 200)}`)
      }
      return { statusCode: 200, headers: CORS, body: JSON.stringify(data) }
    }

    // ── Listen laden ───────────────────────────────────────────────────
    if (action === 'getLists') {
      if (!p.userUuid || !p.accessToken) throw new Error('UUID und Token erforderlich')
      const res = await fetch(`${BASE_URL}/bringlists/${p.userUuid}`, {
        headers: { ...BRING_HEADERS, Authorization: `Bearer ${p.accessToken}` },
      })
      const rawText = await res.text()
      if (!rawText) throw new Error(`Listen laden HTTP ${res.status} – leere Antwort`)
      let data
      try { data = JSON.parse(rawText) }
      catch (_) { throw new Error(`Listen laden HTTP ${res.status} – kein JSON: ${rawText.slice(0, 300)}`) }
      if (!res.ok) throw new Error(`Listen laden fehlgeschlagen (${res.status})`)
      return { statusCode: 200, headers: CORS, body: JSON.stringify(data) }
    }

    // ── Artikel hinzufügen ─────────────────────────────────────────────
    if (action === 'addItem') {
      if (!p.listUuid || !p.accessToken || !p.name) throw new Error('Parameter fehlen')
      const res = await fetch(`${BASE_URL}/bringlists/${p.listUuid}`, {
        method:  'PUT',
        headers: {
          ...BRING_HEADERS,
          Authorization:  `Bearer ${p.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ purchase: p.name, specification: p.specification ?? '', remove: '' }).toString(),
      })
      if (!res.ok) throw new Error(`Artikel hinzufügen fehlgeschlagen (${res.status})`)
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) }
    }

    throw new Error(`Unbekannte Aktion: ${action}`)

  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) }
  }
}
