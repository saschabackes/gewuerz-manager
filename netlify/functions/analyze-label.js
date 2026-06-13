// Analysiert ein Weinetikett-Foto via Claude Vision und extrahiert strukturierte Daten.
// POST { image: "data:image/jpeg;base64,..." } → { ok, data: { name, winery, vintage, ... } }

const ALLOWED_ORIGINS = ['https://depotapp.online', 'https://depotapp.netlify.app']
function corsHeaders(event) {
  const origin = (event?.headers?.origin || '').toLowerCase()
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }
}

async function verifyJwt(event) {
  const sbUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '')
  const sbKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
  const accessToken = (event.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!accessToken || !sbUrl || !sbKey) return null
  const res = await fetch(`${sbUrl}/auth/v1/user`, {
    headers: { apikey: sbKey, Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const user = await res.json().catch(() => null)
  return user?.id ? user : null
}

let _cors
function ok(d)  { return { statusCode: 200, headers: _cors, body: JSON.stringify(d) } }
function err(m) { return { statusCode: 200, headers: _cors, body: JSON.stringify({ ok: false, error: m }) } }

exports.handler = async (event) => {
  _cors = corsHeaders(event)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: _cors }
  if (event.httpMethod !== 'POST') return err('POST only')

  const caller = await verifyJwt(event)
  if (!caller) return err('Nicht autorisiert')

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (!apiKey) return err('ANTHROPIC_API_KEY nicht konfiguriert')

  let body
  try { body = JSON.parse(event.body) } catch { return err('Invalid JSON') }
  if (!body.image) return err('Kein Bild übergeben')

  const match = body.image.match(/^data:image\/(jpeg|png|gif|webp);base64,(.+)$/)
  if (!match) return err('Ungültiges Bildformat')
  const mediaType = `image/${match[1]}`
  const base64Data = match[2]

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `Analysiere dieses Weinetikett und extrahiere alle erkennbaren Informationen.
Antworte NUR mit einem JSON-Objekt (kein Markdown, kein Text drumherum) mit diesen Feldern:
{
  "name": "Weinname (z.B. Spätburgunder, Riesling Kabinett)",
  "winery": "Weingut/Hersteller",
  "vintage": 2020,
  "region": "Anbaugebiet (z.B. Rheingau, Mosel, Piemont)",
  "country": "Land",
  "grape": "Rebsorte(n)",
  "color": "rot|weiß|rosé|schaum",
  "sweetness": "trocken|halbtrocken|lieblich|süß",
  "wineType": "wein|sekt|schorle|gluehwein|sonstige",
  "alcohol": "Alkoholgehalt als Text z.B. '12.5 %'",
  "alcoholFree": false,
  "classification": "Qualitätsstufe falls erkennbar (z.B. VDP.Gutswein, Kabinett, Spätlese, DOC, DOCG)"
}
Setze Felder auf null wenn nicht erkennbar. Bei vintage gib eine Zahl oder null zurück.
Sei bei der Farbe pragmatisch: Spätburgunder/Pinot Noir = rot, Riesling = weiß, etc.`,
            },
          ],
        }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return err(`Claude API Fehler: ${res.status} – ${errText.slice(0, 200)}`)
    }

    const result = await res.json()
    const text = result.content?.[0]?.text || ''

    let data
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      data = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      return err('Konnte Antwort nicht parsen')
    }

    if (!data) return err('Keine Daten erkannt')

    return ok({ ok: true, data })
  } catch (e) {
    return err(`Fehler: ${e.message}`)
  }
}
