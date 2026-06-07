// Holt Metadaten zu einem Rezept-Link (aktuell YouTube via oEmbed).
// POST { url } → { ok, title, author, thumbnailUrl, videoId, sourceType }

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

  // YouTube → oEmbed
  if (vid) {
    try {
      const oembedUrl = 'https://www.youtube.com/oembed?format=json&url=' +
        encodeURIComponent('https://www.youtube.com/watch?v=' + vid)
      const res = await fetch(oembedUrl)
      if (!res.ok) {
        // Fallback: zumindest Thumbnail + leerer Titel
        return ok({
          ok: true, sourceType: 'youtube', videoId: vid,
          title: '', author: '',
          thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        })
      }
      const data = await res.json()
      return ok({
        ok: true,
        sourceType: 'youtube',
        videoId: vid,
        title: data.title || '',
        author: data.author_name || '',
        thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
      })
    } catch (e) {
      return err('YouTube-Abruf fehlgeschlagen: ' + e.message)
    }
  }

  // Andere Quelle → generische oEmbed-/Titel-Erkennung (best effort)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const html = await res.text()
    const og = (prop) => {
      const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
      return m ? m[1] : ''
    }
    return ok({
      ok: true,
      sourceType: 'web',
      videoId: null,
      title: og('title') || '',
      author: '',
      thumbnailUrl: og('image') || '',
    })
  } catch (e) {
    return ok({ ok: true, sourceType: 'web', videoId: null, title: '', author: '', thumbnailUrl: '' })
  }
}
