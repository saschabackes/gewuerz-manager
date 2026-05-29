// Bring! API Proxy v8 – serverseitig, kein CORS-Problem
const BASE_URL  = 'https://api.getbring.com/rest/v2'
const BRING_KEY = 'cof4Nc6D8saplXjE3h3HXqHH8m7VU2i1Gs0g85Ol'

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

function ok(data) {
  return { statusCode: 200, headers: CORS, body: JSON.stringify(data) }
}

function err(msg, status) {
  return { statusCode: status || 500, headers: CORS, body: JSON.stringify({ error: msg }) }
}

async function safeJson(res) {
  var text = ''
  try { text = await res.text() } catch (e) { return { ok: false, text: '', error: 'read error: ' + e.message } }
  if (!text) return { ok: false, text: '', error: 'empty body (HTTP ' + res.status + ')' }
  try {
    var data = JSON.parse(text)
    return { ok: true, data: data, status: res.status, httpOk: res.ok }
  } catch (e) {
    return { ok: false, text: text.slice(0, 300), error: 'not JSON (HTTP ' + res.status + ')' }
  }
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: Object.assign({}, CORS, { 'Access-Control-Allow-Methods': 'POST, OPTIONS' }), body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return err('Method Not Allowed (v8)', 405)
  }

  var body
  try { body = JSON.parse(event.body || '{}') } catch (e) { return err('Invalid JSON body') }

  var action = body.action
  var p = Object.assign({}, body)
  delete p.action

  // ── Login ────────────────────────────────────────────────────────────
  if (action === 'login') {
    if (!p.email || !p.password) return err('E-Mail und Passwort erforderlich')
    try {
      var res = await fetch(BASE_URL + '/bringauth', {
        method:  'POST',
        headers: Object.assign({}, BRING_HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
        body:    'email=' + encodeURIComponent(p.email) + '&password=' + encodeURIComponent(p.password),
      })
      var result = await safeJson(res)
      if (!result.ok) return err('Bring! login: ' + result.error)
      if (!result.httpOk) return err('Bring! login HTTP ' + result.status + ': ' + (result.data.message || JSON.stringify(result.data)))
      return ok(result.data)
    } catch (e) {
      return err('Bring! login exception: ' + e.message)
    }
  }

  // ── Listen laden ─────────────────────────────────────────────────────
  if (action === 'getLists') {
    if (!p.accessToken) return err('Token erforderlich')

    // Alle UUID-Varianten aus dem Login (publicUuid + uuid), ohne Duplikate
    var uuids = []
    if (p.userUuid) uuids.push(p.userUuid)
    if (p.rawUuid && p.rawUuid !== p.userUuid) uuids.push(p.rawUuid)
    if (uuids.length === 0) return err('UUID erforderlich')

    var lastErr = ''
    for (var u = 0; u < uuids.length; u++) {
      var uuid = uuids[u]
      // X-BRING-USER-UUID ist Pflicht für authentifizierte Requests
      var authHdr = Object.assign({}, BRING_HEADERS, {
        'Authorization':     'Bearer ' + p.accessToken,
        'X-BRING-USER-UUID': uuid,
      })
      var candidates = [
        BASE_URL + '/bringlists/' + uuid,
        BASE_URL + '/bringusers/' + uuid + '/lists',
      ]
      for (var i = 0; i < candidates.length; i++) {
        try {
          var r = await fetch(candidates[i], { headers: authHdr })
          var parsed = await safeJson(r)
          if (parsed.ok && parsed.httpOk) return ok(parsed.data)
          lastErr = candidates[i] + ' [uuid=' + uuid.slice(0, 8) + '…] -> ' + (parsed.error || 'HTTP ' + parsed.status)
        } catch (e) {
          lastErr = candidates[i] + ' [uuid=' + uuid.slice(0, 8) + '…] -> exception: ' + e.message
        }
      }
    }
    return err('getLists: alle Endpoints fehlgeschlagen. Letzter: ' + lastErr)
  }

  // ── Artikel laden ────────────────────────────────────────────────────
  if (action === 'getItems') {
    if (!p.listUuid || !p.accessToken) return err('Parameter fehlen')
    try {
      var rg = await fetch(BASE_URL + '/bringlists/' + p.listUuid, {
        headers: Object.assign({}, BRING_HEADERS, {
          'Authorization':     'Bearer ' + p.accessToken,
          'X-BRING-USER-UUID': p.userUuid || '',
        }),
      })
      var pg = await safeJson(rg)
      if (!pg.ok || !pg.httpOk) return err('Bring! getItems: ' + (pg.error || 'HTTP ' + pg.status))
      return ok(pg.data)
    } catch (e) {
      return err('Bring! getItems exception: ' + e.message)
    }
  }

  // ── Artikel hinzufuegen ───────────────────────────────────────────────
  if (action === 'addItem') {
    if (!p.listUuid || !p.accessToken || !p.name) return err('Parameter fehlen')
    try {
      var res3 = await fetch(BASE_URL + '/bringlists/' + p.listUuid, {
        method:  'PUT',
        headers: Object.assign({}, BRING_HEADERS, {
          'Authorization':  'Bearer ' + p.accessToken,
          'Content-Type':   'application/x-www-form-urlencoded',
        }),
        body: 'purchase=' + encodeURIComponent(p.name) + '&specification=' + encodeURIComponent(p.specification || '') + '&remove=',
      })
      if (!res3.ok) return err('Bring! addItem HTTP ' + res3.status)
      return ok({ ok: true })
    } catch (e) {
      return err('Bring! addItem exception: ' + e.message)
    }
  }

  // ── Artikel entfernen ─────────────────────────────────────────────────
  if (action === 'removeItem') {
    if (!p.listUuid || !p.accessToken || !p.name) return err('Parameter fehlen')
    try {
      var rr = await fetch(BASE_URL + '/bringlists/' + p.listUuid, {
        method:  'PUT',
        headers: Object.assign({}, BRING_HEADERS, {
          'Authorization':  'Bearer ' + p.accessToken,
          'Content-Type':   'application/x-www-form-urlencoded',
        }),
        body: 'purchase=&specification=&remove=' + encodeURIComponent(p.name),
      })
      if (!rr.ok) return err('Bring! removeItem HTTP ' + rr.status)
      return ok({ ok: true })
    } catch (e) {
      return err('Bring! removeItem exception: ' + e.message)
    }
  }

  return err('Unbekannte Aktion: ' + action)
}
