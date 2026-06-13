// Holt Metadaten + (bei YouTube) die Videobeschreibung und parst daraus
// best-effort Zutaten + Schritte.
// POST { url } → { ok, title, author, thumbnailUrl, videoId, sourceType,
//                  description, ingredients:[str], steps:[str] }

const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'  // öffentlicher Web-Client-Key

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}
function ok(d)  { return { statusCode: 200, headers: CORS, body: JSON.stringify(d) } }
function err(m) { return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: m }) } }

function youtubeId(url) {
  const patterns = [
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ]
  for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
  return null
}

// ── Beschreibung → Zutaten + Schritte (Heuristik) ────────────────────────────
function parseRecipe(desc) {
  if (!desc) return { ingredients: [], steps: [] }
  const lines = desc.split(/\r?\n/).map(l => l.trim())

  const stepHeaderRe = /^(anleitung|zubereitung|zubereitungsschritte|so geht'?s|schritte|method|preparation|und so geht'?s)\b\s*:?\.?$/i
  const promoRe = /(https?:\/\/|^#|abonn|affiliate|patreon|instagram|tiktok|spotify|linktr|youtube\.com|equipment|kochkurs|foodtour|werbung|^@|folg[te]? mir|unterst[üu]tz|werde teil|teil der familie)/i
  const sectionOnlyRe = /^[A-Za-zÄÖÜäöüß /&-]{3,30}:$/          // "Gewürze:", "Suppeneinlage:"
  const timestampRe = /^\d{1,2}:\d{2}/
  const startsQtyRe = /^([0-9]|½|¼|¾|⅓|⅔|\d+\/\d+|etwas\b|eine?r?\b|optional|prise|nach belieben|ein paar|je\b)/i

  // Indizes finden
  let stepsStart = lines.findIndex(l => stepHeaderRe.test(l))
  // erste Promo-/Schluss-Zeile (erst ab Zeile 1 suchen, Intro darf Links nicht haben – tut es meist nicht)
  let promoStart = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] && promoRe.test(lines[i])) { promoStart = i; break }
  }

  const ingredientEnd = stepsStart >= 0 ? stepsStart : (promoStart >= 0 ? promoStart : lines.length)

  // Erste „Zutaten-artige" Zeile finden (überspringt Intro-Prosa)
  let firstIng = -1
  for (let i = 0; i < ingredientEnd; i++) {
    const l = lines[i]
    if (l && startsQtyRe.test(l)) { firstIng = i; break }
  }

  const ingredients = []
  if (firstIng >= 0) {
    for (let i = firstIng; i < ingredientEnd; i++) {
      const l = lines[i]
      if (!l) continue
      if (timestampRe.test(l)) continue                   // YouTube-Kapitelmarken überspringen
      if (sectionOnlyRe.test(l)) continue                 // reine Überschrift überspringen
      if (promoRe.test(l)) break
      const wordCount = l.split(/\s+/).length
      const looksIngredient = startsQtyRe.test(l) || (l.length <= 60 && wordCount <= 9 && !/[.!?]$/.test(l))
      if (looksIngredient) ingredients.push(l)
    }
  }

  // Schritte
  const steps = []
  if (stepsStart >= 0) {
    const stepEnd = (promoStart > stepsStart) ? promoStart : lines.length
    for (let i = stepsStart + 1; i < stepEnd; i++) {
      const l = lines[i]
      if (!l) continue
      if (promoRe.test(l)) break
      // führende Nummerierung entfernen ("1. ", "1) ")
      steps.push(l.replace(/^\d+[.)]\s*/, ''))
    }
  }

  return { ingredients, steps }
}

function unescapeJson(s) {
  try { return JSON.parse('"' + s + '"') } catch (e) { return s }
}
function htmlDecode(s) {
  return (s || '')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#34;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

// 1. Watch-Seite scrapen (mit Consent-Cookie) – funktioniert auch von Servern
async function fetchViaPage(vid) {
  const res = await fetch('https://www.youtube.com/watch?v=' + vid, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept-Language': 'de-DE,de;q=0.9',
      'Cookie': 'CONSENT=YES+1; SOCS=CAI',
    },
  })
  if (!res.ok) return null
  const html = await res.text()

  // Beschreibung: erst Player-JSON (vollständig), sonst og:description / meta
  const dm = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/)
  const om = html.match(/<meta property="og:description" content="([^"]*)"/)
  const mm = html.match(/<meta name="description" content="([^"]*)"/)
  let description = ''
  if (dm) description = unescapeJson(dm[1])
  else if (om) description = htmlDecode(om[1])
  else if (mm) description = htmlDecode(mm[1])

  const tm = html.match(/<meta property="og:title" content="([^"]*)"/) ||
             html.match(/"title":"((?:[^"\\]|\\.)*)","lengthSeconds"/)
  const am = html.match(/"author":"((?:[^"\\]|\\.)*)"/) ||
             html.match(/"ownerChannelName":"((?:[^"\\]|\\.)*)"/) ||
             html.match(/<link itemprop="name" content="([^"]*)"/)

  if (!description && !tm) return null
  return {
    title:       tm ? (tm[1].includes('&') ? htmlDecode(tm[1]) : unescapeJson(tm[1])) : '',
    author:      am ? htmlDecode(unescapeJson(am[1])) : '',
    description,
  }
}

// 2. Fallback: innertube WEB-API (klappt von Residential-IPs)
async function fetchViaApi(vid) {
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/player?key=' + INNERTUBE_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: '2.20240101.00.00', hl: 'de', gl: 'DE' } },
        videoId: vid,
      }),
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    const vd = data?.videoDetails
    if (!vd) return null
    return { title: vd.title || '', author: vd.author || '', description: vd.shortDescription || '' }
  } catch (e) { return null }
}

// 3. YouTube Data API v3 (zuverlässig von Datacenter-IPs, braucht GOOGLE_API_KEY)
async function fetchViaDataApi(vid) {
  const apiKey = (process.env.GOOGLE_API_KEY || '').trim()
  if (!apiKey) return null
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${vid}&key=${apiKey}`
    )
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    const snippet = data?.items?.[0]?.snippet
    if (!snippet) return null
    return {
      title: snippet.title || '',
      author: snippet.channelTitle || '',
      description: snippet.description || '',
    }
  } catch (e) { return null }
}

// 4. Fallback: oEmbed (nur Titel/Autor)
async function fetchViaOembed(vid) {
  try {
    const res = await fetch('https://www.youtube.com/oembed?format=json&url=' +
      encodeURIComponent('https://www.youtube.com/watch?v=' + vid))
    if (!res.ok) return null
    const d = await res.json()
    return { title: d.title || '', author: d.author_name || '', description: '' }
  } catch (e) { return null }
}

async function fetchYouTube(vid) {
  const page = await fetchViaPage(vid)
  const api  = await fetchViaApi(vid)
  const dataApi = await fetchViaDataApi(vid)
  const oembed = await fetchViaOembed(vid)

  // Bestes Ergebnis zusammenführen: Page-Scraping hat oft die vollständige
  // Beschreibung, aber von Datacenter-IPs liefert YouTube generische Platzhalter.
  const genericDesc = /angesagtesten Videos|die besten Videos|find.*videos.*tracks/i
  const best = { title: '', author: '', description: '' }

  // Debug: welche Quellen haben was geliefert
  const _debug = {
    page:    page    ? { title: !!page.title, desc: (page.description||'').length }    : null,
    api:     api     ? { title: !!api.title, desc: (api.description||'').length }     : null,
    dataApi: dataApi ? { title: !!dataApi.title, desc: (dataApi.description||'').length } : null,
    oembed:  oembed  ? { title: !!oembed.title, desc: (oembed.description||'').length } : null,
    hasGoogleKey: !!(process.env.GOOGLE_API_KEY || '').trim(),
  }
  best._debug = _debug

  for (const src of [page, api, dataApi, oembed]) {
    if (!src) continue
    if (!best.title && src.title) best.title = src.title
    if (!best.author && src.author) best.author = src.author
    if (!best.description && src.description && !genericDesc.test(src.description)) {
      best.description = src.description
    }
  }

  return best
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: Object.assign({}, CORS, { 'Access-Control-Allow-Methods': 'POST, OPTIONS' }), body: '' }
  }
  if (event.httpMethod !== 'POST') return err('Method not allowed')

  let body
  try { body = JSON.parse(event.body || '{}') } catch (e) { return err('Invalid JSON') }
  const url = (body.url || '').trim()
  if (!url) return err('url erforderlich')

  const vid = youtubeId(url)

  if (vid) {
    try {
      const meta = await fetchYouTube(vid)
      const description = meta.description ?? ''
      const { ingredients, steps } = parseRecipe(description)
      return ok({
        ok: true,
        sourceType: 'youtube',
        videoId: vid,
        title: meta.title ?? '',
        author: meta.author ?? '',
        thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        description,
        ingredients,
        steps,
      })
    } catch (e) {
      return ok({
        ok: true, sourceType: 'youtube', videoId: vid,
        title: '', author: '',
        thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        description: '', ingredients: [], steps: [],
      })
    }
  }

  // Andere Quelle → schema.org/Recipe (JSON-LD), Fallback og:-Tags
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'de-DE,de;q=0.9',
      },
    })
    const html = await res.text()
    const recipe = extractJsonLdRecipe(html)
    const og = (prop) => {
      const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
      return m ? htmlDecode(m[1]) : ''
    }

    if (recipe) {
      return ok({
        ok: true, sourceType: 'web', videoId: null,
        title: recipe.title || og('title') || '',
        author: recipe.author || '',
        thumbnailUrl: recipe.image || og('image') || '',
        description: '',
        ingredients: recipe.ingredients,
        steps: recipe.steps,
      })
    }
    // kein JSON-LD → wenigstens Titel/Bild
    return ok({
      ok: true, sourceType: 'web', videoId: null,
      title: og('title') || '', author: '', thumbnailUrl: og('image') || '',
      description: og('description') || '', ingredients: [], steps: [],
    })
  } catch (e) {
    return ok({ ok: true, sourceType: 'web', videoId: null, title: '', author: '', thumbnailUrl: '', description: '', ingredients: [], steps: [] })
  }
}

// ── schema.org/Recipe aus JSON-LD extrahieren ────────────────────────────────
function extractJsonLdRecipe(html) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1])
  for (const raw of blocks) {
    let data
    try { data = JSON.parse(raw.trim()) } catch (e) { continue }
    const candidates = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : [data])
    for (const obj of candidates) {
      if (!obj || typeof obj !== 'object') continue
      const type = obj['@type']
      const isRecipe = Array.isArray(type) ? type.some(t => /Recipe/i.test(t)) : /Recipe/i.test(String(type || ''))
      if (!isRecipe) continue

      const ingredients = (obj.recipeIngredient || obj.ingredients || [])
        .map(s => htmlDecode(String(s).trim())).filter(Boolean)

      const steps = flattenInstructions(obj.recipeInstructions).map(htmlDecode)

      let image = obj.image
      if (Array.isArray(image)) image = image[0]
      if (image && typeof image === 'object') image = image.url || image.contentUrl || ''

      let author = obj.author
      if (Array.isArray(author)) author = author[0]
      if (author && typeof author === 'object') author = author.name || ''

      return {
        title: htmlDecode(String(obj.name || '').trim()),
        author: htmlDecode(String(author || '').trim()),
        image: typeof image === 'string' ? image : '',
        ingredients,
        steps,
      }
    }
  }
  return null
}

// recipeInstructions kann String, String[], HowToStep[] oder HowToSection[] sein
function flattenInstructions(instr) {
  if (!instr) return []
  if (typeof instr === 'string') {
    return instr.split(/\n|\.\s+(?=[A-ZÄÖÜ])/).map(s => s.trim()).filter(s => s.length > 3)
  }
  const out = []
  const arr = Array.isArray(instr) ? instr : [instr]
  arr.forEach(item => {
    if (typeof item === 'string') { if (item.trim()) out.push(item.trim()); return }
    if (!item || typeof item !== 'object') return
    const t = item['@type'] || ''
    if (/HowToSection/i.test(t) && item.itemListElement) {
      flattenInstructions(item.itemListElement).forEach(s => out.push(s))
    } else {
      const text = item.text || item.name || ''
      if (text && String(text).trim()) out.push(String(text).trim())
    }
  })
  return out
}
