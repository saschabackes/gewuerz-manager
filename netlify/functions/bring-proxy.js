// Bring! API Proxy v7 – serverseitig, kein CORS-Problem
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
    return err('Method Not Allowed (v7)', 405)
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
    if (!p.userUuid || !p.accessToken) return err('UUID und Token erforderlich')
    var listsUrl = BASE_URL + '/bringlists/' + p.userUuid
    try {
      var res2 = await fetch(listsUrl, {
        headers: Object.assign({}, BRING_HEADERS, { 'Authorization': 'Bearer ' + p.accessToken }),
      })
      var result2 = await safeJson(res2)
      if (!result2.ok) return err('getLists ' + result2.error + ' | URL: ' + listsUrl)
      if (!result2.httpOk) return err('getLists HTTP ' + result2.status + ' | URL: ' + listsUrl)
      return ok(result2.data)
    } catch (e) {
      return err('getLists exception: ' + e.message + ' | URL: ' + listsUrl)
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

  return err('Unbekannte Aktion: ' + action)
}
