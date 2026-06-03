// Cookidoo Auth-Test (Spike) – prüft ob der Login serverseitig per HTTP klappt.
// Aufruf:  /.netlify/functions/cookidoo-test?url=<cookidoo-rezept-link>
// Liest COOKIDOO_EMAIL / COOKIDOO_PASSWORD aus den Netlify-Env-Vars.
// Gibt eine Schritt-für-Schritt-Diagnose als JSON zurück.

const CIAM_LOGIN_SRV_URL = 'https://ciam.prod.cookidoo.vorwerk-digital.com/login-srv/login'

function json(status, data) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(data, null, 2),
  }
}

// Cookies aus einer Response in den Jar übernehmen
function storeCookies(res, jar) {
  let setCookies = []
  if (typeof res.headers.getSetCookie === 'function') {
    setCookies = res.headers.getSetCookie()
  } else {
    const raw = res.headers.get('set-cookie')
    if (raw) setCookies = [raw]
  }
  setCookies.forEach(c => {
    const first = c.split(';')[0]
    const eq = first.indexOf('=')
    if (eq > 0) {
      const name = first.slice(0, eq).trim()
      const val = first.slice(eq + 1).trim()
      if (name) jar[name] = val
    }
  })
}

function jarHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
}

// fetch mit manuellem Redirect-Following + Cookie-Jar (cross-domain)
async function followWithCookies(startUrl, options, jar, maxHops) {
  let url = startUrl
  let method = (options.method || 'GET').toUpperCase()
  let body = options.body
  const baseHeaders = Object.assign({}, options.headers)
  const hops = []

  for (let i = 0; i < (maxHops || 10); i++) {
    const headers = Object.assign({}, baseHeaders)
    const cookieStr = jarHeader(jar)
    if (cookieStr) headers['Cookie'] = cookieStr

    const res = await fetch(url, { method, body, headers, redirect: 'manual' })
    storeCookies(res, jar)
    hops.push({ url: url.slice(0, 120), status: res.status })

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location')
      if (!loc) return { res, hops }
      url = new URL(loc, url).toString()
      // Nach POST→Redirect auf GET wechseln (303 / klassisch 302)
      if (res.status === 303 || ((res.status === 301 || res.status === 302) && method === 'POST')) {
        method = 'GET'
        body = undefined
      }
      continue
    }
    return { res, hops }
  }
  return { res: null, hops, error: 'Zu viele Redirects' }
}

exports.handler = async function (event) {
  const email = (process.env.COOKIDOO_EMAIL || '').trim()
  const password = (process.env.COOKIDOO_PASSWORD || '').trim()
  if (!email || !password) {
    return json(400, { ok: false, error: 'COOKIDOO_EMAIL / COOKIDOO_PASSWORD nicht gesetzt' })
  }

  const recipeUrl = (event.queryStringParameters && event.queryStringParameters.url) || ''
  // tld + lang aus der Rezept-URL ableiten (Default: cookidoo.de / de-DE)
  let tld = 'de', lang = 'de-DE', recipeId = ''
  if (recipeUrl) {
    const m = recipeUrl.match(/cookidoo\.([a-z.]+?)\//i)
    if (m) tld = m[1]
    const lm = recipeUrl.match(/\/([a-z]{2}-[A-Z]{2})\//)
    if (lm) lang = lm[1]
    const rm = recipeUrl.match(/(r\d{5,})/i)
    if (rm) recipeId = rm[1]
  }

  const diag = { ok: false, config: { tld, lang, recipeId }, steps: [] }
  const jar = {}
  const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

  try {
    // ── Schritt 1: Login-Seite holen, requestId extrahieren ──────────────
    const redirect = `%2Ffoundation%2F${lang}%2Ffor-you`
    const loginPageUrl = `https://cookidoo.${tld}/profile/${lang}/login?redirectAfterLogin=${redirect}`
    const s1 = await followWithCookies(loginPageUrl, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' },
    }, jar, 10)
    const html = s1.res ? await s1.res.text() : ''
    const ridMatch = html.match(/name="requestId"\s+value="([^"]+)"/) ||
                     html.match(/requestId["'\s:=]+([A-Za-z0-9._-]{8,})/)
    const requestId = ridMatch ? ridMatch[1] : ''
    diag.steps.push({
      step: '1 Login-Seite', finalStatus: s1.res?.status, hops: s1.hops,
      requestIdFound: !!requestId, htmlLength: html.length,
      htmlSnippet: requestId ? undefined : html.slice(0, 300),
    })
    if (!requestId) {
      diag.error = 'Keine requestId gefunden – Login-Seite evtl. JS-/Bot-geschützt'
      return json(200, diag)
    }

    // ── Schritt 2: Credentials an CIAM posten ────────────────────────────
    const form = new URLSearchParams({ requestId, username: email, password })
    const s2 = await followWithCookies(CIAM_LOGIN_SRV_URL, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/json',
      },
      body: form.toString(),
    }, jar, 10)
    const authed = !!(jar['_oauth2_proxy'] || jar['v-authenticated'])
    diag.steps.push({
      step: '2 CIAM-Login', finalStatus: s2.res?.status, hops: s2.hops,
      cookies: Object.keys(jar),
      authenticated: authed,
    })
    if (!authed) {
      diag.error = 'Login-Cookies fehlen – Zugangsdaten falsch oder Flow blockiert'
      return json(200, diag)
    }

    // ── Schritt 3: Rezept abrufen ────────────────────────────────────────
    if (recipeId) {
      const recipeApi = `https://cookidoo.${tld}/recipes/recipe/${lang}/${recipeId}`
      const r = await fetch(recipeApi, {
        headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Cookie': jarHeader(jar) },
      })
      const ct = r.headers.get('content-type') || ''
      let ingredientsPreview = null
      let bodySnippet = null
      if (ct.includes('json')) {
        const data = await r.json().catch(() => null)
        // verschiedene mögliche Felder durchprobieren
        const ing = data && (data.recipeIngredientGroups || data.ingredientGroups || data.ingredients)
        ingredientsPreview = ing ? JSON.stringify(ing).slice(0, 600) : Object.keys(data || {})
      } else {
        bodySnippet = (await r.text()).slice(0, 300)
      }
      diag.steps.push({
        step: '3 Rezept', status: r.status, contentType: ct,
        ingredientsPreview, bodySnippet,
      })
    } else {
      diag.steps.push({ step: '3 Rezept', skipped: 'keine recipeId in URL erkannt' })
    }

    diag.ok = authed
    return json(200, diag)
  } catch (e) {
    diag.error = 'Exception: ' + e.message
    return json(200, diag)
  }
}
