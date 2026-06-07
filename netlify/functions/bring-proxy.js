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

  // ── Token erneuern (refresh_token) ───────────────────────────────────────
  if (action === 'refreshToken') {
    if (!p.refreshToken) return err('refreshToken erforderlich')
    try {
      var rt = await fetch(BASE_URL + '/bringauth/token', {
        method:  'POST',
        headers: Object.assign({}, BRING_HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
        body:    'grant_type=refresh_token&refresh_token=' + encodeURIComponent(p.refreshToken),
      })
      var rtResult = await safeJson(rt)
      if (!rtResult.ok || !rtResult.httpOk) {
        return err('Bring! refresh HTTP ' + rtResult.status + ': ' + (rtResult.error || ''))
      }
      return ok(rtResult.data)   // enthält neuen access_token (ggf. neuen refresh_token)
    } catch (e) {
      return err('Bring! refresh exception: ' + e.message)
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

  // ── Produktbilder suchen (Google Custom Search) ────────────────────────
  if (action === 'searchGoogleImages') {
    var serpQuery = p.query
    if (!serpQuery) return err('query erforderlich')
    var serpKey = (process.env.SERP_API_KEY || '').trim()
    if (!serpKey) return err('SERP_API_KEY nicht konfiguriert')

    try {
      var serpParams = new URLSearchParams({
        api_key: serpKey,
        engine:  'google_images',
        q:       serpQuery,
        gl:      'de',
        hl:      'de',
      })
      var serpRes  = await fetch('https://serpapi.com/search.json?' + serpParams)
      var serpBody = await serpRes.json().catch(function() { return {} })
      if (!serpRes.ok) return ok([])
      var serpResults = (serpBody.images_results || [])
        .slice(0, 6)
        .map(function(r) {
          return {
            thumbUrl: r.thumbnail || null,
            fullUrl:  r.original  || r.thumbnail || null,
            name:     r.title     || '',
            brand:    r.source    || '',
          }
        })
        .filter(function(r) { return r.thumbUrl })
      return ok(serpResults)
    } catch (e) {
      return err('SerpAPI exception: ' + e.message)
    }
  }

  // ── Produktbilder suchen (Open Food Facts) ─────────────────────────────
  if (action === 'searchImages') {
    var queries = p.queries
    if (!Array.isArray(queries) || queries.length === 0) return err('queries erforderlich')

    var OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl'
    var offParams  = 'search_simple=1&action=process&json=1&page_size=8' +
                     '&fields=product_name,brands,image_front_small_url,image_front_url,image_url'

    try {
      var allResults = await Promise.all(queries.slice(0, 6).map(async function(q) {
        try {
          var offRes = await fetch(OFF_SEARCH + '?' + offParams + '&search_terms=' + encodeURIComponent(q))
          if (!offRes.ok) return []
          var offData = await offRes.json()
          return (offData.products || []).map(function(prod) {
            return {
              thumbUrl: prod.image_front_small_url || prod.image_front_url  || prod.image_url || null,
              fullUrl:  prod.image_front_url       || prod.image_url        || prod.image_front_small_url || null,
              name:     prod.product_name || '',
              brand:    (prod.brands || '').split(',')[0].trim(),
            }
          })
        } catch (e) {
          return []
        }
      }))

      // Merge + Duplikate per fullUrl entfernen
      var seenUrls = {}
      var merged   = []
      var flat     = [].concat.apply([], allResults)
      for (var fi = 0; fi < flat.length; fi++) {
        var item = flat[fi]
        if (item.thumbUrl && item.fullUrl && !seenUrls[item.fullUrl]) {
          seenUrls[item.fullUrl] = true
          merged.push(item)
        }
      }

      // Brand-Treffer nach vorne sortieren
      if (p.brand) {
        var brandLower = p.brand.toLowerCase()
        merged.sort(function(a, b) {
          var aMatch = a.brand.toLowerCase().indexOf(brandLower) >= 0 ? 0 : 1
          var bMatch = b.brand.toLowerCase().indexOf(brandLower) >= 0 ? 0 : 1
          return aMatch - bMatch
        })
      }

      return ok(merged.slice(0, 6))
    } catch (e) {
      return err('searchImages exception: ' + e.message)
    }
  }

  return err('Unbekannte Aktion: ' + action)
}
