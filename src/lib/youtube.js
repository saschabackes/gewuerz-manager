const PROXY = '/.netlify/functions/recipe-meta'

// Metadaten zu einem Rezept-Link holen → { title, author, thumbnailUrl, videoId, sourceType }
export async function fetchRecipeMeta(url) {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  const data = await res.json().catch(() => ({}))
  if (!data.ok) throw new Error(data.error ?? 'Metadaten konnten nicht geladen werden')
  return data
}

// YouTube-Video-ID aus einem Link ziehen (für Embed)
export function youtubeId(url = '') {
  const patterns = [
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ]
  for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
  return null
}
