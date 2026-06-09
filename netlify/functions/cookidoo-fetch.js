// Cookidoo-Integration: Login (cookie-basiert) + Rezept-Zutaten abrufen.
// POST { email, password, url? }
//   - ohne url → Verify-Modus (nur Login testen)
//   - mit url  → { ok, title, ingredients: [{ name, amount, optional }] }
// Zugangsdaten kommen pro Request vom Client (aus user_metadata), nichts global.

const CIAM_LOGIN_SRV_URL = 'https://ciam.prod.cookidoo.vorwerk-digital.com/login-srv/login'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}
function ok(data)  { return { statusCode: 200, headers: CORS, body: JSON.stringify(data) } }
function err(msg)  { return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: msg }) } }

function storeCookies(res, jar) {
  let list = []
  if (typeof res.headers.getSetCookie === 'function') list = res.headers.getSetCookie()
  else { const raw = res.headers.get('set-cookie'); if (raw) list = [raw] }
  list.forEach(c => {
    const first = c.split(';')[0]
    const eq = first.indexOf('=')
    if (eq > 0) { const n = first.slice(0, eq).trim(); if (n) jar[n] = first.slice(eq + 1).trim() }
  })
}
function jarHeader(jar) { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') }

async function follow(startUrl, options, jar, maxHops = 10) {
  let url = startUrl
  let method = (options.method || 'GET').toUpperCase()
  let body = options.body
  const base = Object.assign({}, options.headers)
  for (let i = 0; i < maxHops; i++) {
    const headers = Object.assign({}, base)
    const cs = jarHeader(jar); if (cs) headers['Cookie'] = cs
    const res = await fetch(url, { method, body, headers, redirect: 'manual' })
    storeCookies(res, jar)
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location'); if (!loc) return res
      url = new URL(loc, url).toString()
      if (res.status === 303 || ((res.status === 301 || res.status === 302) && method === 'POST')) { method = 'GET'; body = undefined }
      continue
    }
    return res
  }
  return null
}

async function cookidooLogin(email, password, tld, lang, jar) {
  const redirect = `%2Ffoundation%2F${lang}%2Ffor-you`
  const loginPageUrl = `https://cookidoo.${tld}/profile/${lang}/login?redirectAfterLogin=${redirect}`
  const r1 = await follow(loginPageUrl, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } }, jar)
  const html = r1 ? await r1.text() : ''
  const rid = (html.match(/name="requestId"\s+value="([^"]+)"/) || html.match(/requestId["'\s:=]+([A-Za-z0-9._-]{8,})/))
  if (!rid) return { ok: false, error: 'Login-Seite nicht lesbar (requestId fehlt)' }

  const form = new URLSearchParams({ requestId: rid[1], username: email, password })
  await follow(CIAM_LOGIN_SRV_URL, {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'text/html,application/json' },
    body: form.toString(),
  }, jar)

  if (!(jar['_oauth2_proxy'] || jar['v-authenticated'])) {
    return { ok: false, error: 'Anmeldung fehlgeschlagen – E-Mail/Passwort prüfen' }
  }
  return { ok: true }
}

function extractIngredients(data) {
  const groups = data.recipeIngredientGroups || data.ingredientGroups || data.ingredients || []
  const out = []
  const pushItem = (it) => {
    const name = it.ingredientNotation || it.notation || it.name
    if (!name) return
    const q = it.quantity || {}
    const val = q.value ?? q.from ?? ''
    const unit = it.unitNotation || ''
    const amount = [val, unit].filter(x => x !== '' && x != null).join(' ').trim()
    out.push({ name: String(name).trim(), amount, optional: !!it.optional })
  }
  if (Array.isArray(groups)) {
    groups.forEach(g => {
      const items = g.recipeIngredients || g.ingredients || (g.ingredientNotation ? [g] : [])
      items.forEach(pushItem)
    })
  }
  return out
}

function extractSteps(data) {
  const out = []
  const push = (st) => {
    const text = (st && (st.formattedText || st.text || st.title || st.notation)) || (typeof st === 'string' ? st : '')
    const clean = String(text).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (clean) out.push(clean)
  }
  const groups = data.recipeStepGroups || data.stepGroups || data.preparationGroups
  if (Array.isArray(groups) && groups.length) {
    groups.forEach(g => {
      const steps = g.recipeSteps || g.steps || (g.formattedText || g.text ? [g] : [])
      steps.forEach(push)
    })
  } else if (Array.isArray(data.preparationSteps)) {
    data.preparationSteps.forEach(push)
  } else if (Array.isArray(data.steps)) {
    data.steps.forEach(push)
  }
  return out
}

function extractImage(data) {
  let img = data.imageUrl || data.image
  if (Array.isArray(img)) img = img[0]
  if (img && typeof img === 'object') img = img.url || img.contentUrl || ''
  if (typeof img === 'string' && img.includes('{transformation}')) {
    img = img.replace('{transformation}', 'w_640')
  }
  return typeof img === 'string' ? img : ''
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: Object.assign({}, CORS, { 'Access-Control-Allow-Methods': 'POST, OPTIONS' }), body: '' }
  }
  if (event.httpMethod !== 'POST') return err('Method not allowed')

  let body
  try { body = JSON.parse(event.body || '{}') } catch (e) { return err('Invalid JSON') }
  const email = (body.email || '').trim()
  const password = (body.password || '').trim()
  if (!email || !password) return err('E-Mail und Passwort erforderlich')

  // tld/lang/recipeId aus URL ableiten (Default cookidoo.de / de-DE)
  let tld = 'de', lang = 'de-DE', recipeId = ''
  if (body.url) {
    const m = body.url.match(/cookidoo\.([a-z.]+?)\//i); if (m) tld = m[1]
    const lm = body.url.match(/\/([a-z]{2}-[A-Z]{2})\//); if (lm) lang = lm[1]
    const rm = body.url.match(/(r\d{5,})/i); if (rm) recipeId = rm[1]
  }

  try {
    const jar = {}
    const login = await cookidooLogin(email, password, tld, lang, jar)
    if (!login.ok) return err(login.error)

    // Verify-Modus
    if (!body.url) return ok({ ok: true })
    if (!recipeId) return err('Keine Rezept-ID im Link erkannt')

    const recipeApi = `https://cookidoo.${tld}/recipes/recipe/${lang}/${recipeId}`
    const r = await fetch(recipeApi, { headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Cookie': jarHeader(jar) } })
    if (!r.ok) return err('Rezept konnte nicht geladen werden (HTTP ' + r.status + ')')
    const data = await r.json().catch(() => null)
    if (!data) return err('Rezept-Antwort nicht lesbar')

    const ingredients = extractIngredients(data)
    const title = data.title || data.name || data.recipeTitle || ''
    const steps = extractSteps(data)
    const thumbnailUrl = extractImage(data)
    if (ingredients.length === 0 && steps.length === 0) return err('Keine Zutaten/Schritte im Rezept gefunden')
    return ok({ ok: true, title, ingredients, steps, thumbnailUrl })
  } catch (e) {
    return err('Cookidoo-Fehler: ' + e.message)
  }
}
