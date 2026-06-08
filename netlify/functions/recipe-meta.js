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
  const promoRe = /(https?:\/\/|^#|abonn|affiliate|patreon|instagram|tiktok|spotify|linktr|youtube\.com|equipment|kochkurs|foodtour|werbung|^@|folg[te]? mir|unterst[üu]tz)/i
  const sectionOnlyRe = /^[A-Za-zÄÖÜäöüß /&-]{3,30}:$/          // "Gewürze:", "Suppeneinlage:"
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

async function fetchYouTube(vid) {
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
  return data?.videoDetails ?? null
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
      const vd = await fetchYouTube(vid)
      const description = vd?.shortDescription ?? ''
      const { ingredients, steps } = parseRecipe(description)
      return ok({
        ok: true,
        sourceType: 'youtube',
        videoId: vid,
        title: vd?.title ?? '',
        author: vd?.author ?? '',
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

  // Andere Quelle → og:-Tags
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const html = await res.text()
    const og = (prop) => {
      const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
      return m ? m[1] : ''
    }
    return ok({
      ok: true, sourceType: 'web', videoId: null,
      title: og('title') || '', author: '', thumbnailUrl: og('image') || '',
      description: og('description') || '', ingredients: [], steps: [],
    })
  } catch (e) {
    return ok({ ok: true, sourceType: 'web', videoId: null, title: '', author: '', thumbnailUrl: '', description: '', ingredients: [], steps: [] })
  }
}
