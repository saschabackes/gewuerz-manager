// Analysiert ein Weinetikett-Foto via Claude Vision und extrahiert strukturierte Daten.
// POST { image: "data:image/jpeg;base64,..." } → { ok, data: { name, winery, vintage, ... } }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}
function ok(d)  { return { statusCode: 200, headers: CORS, body: JSON.stringify(d) } }
function err(m) { return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: m }) } }

function loadApiKey() {
  const fromEnv = (process.env.ANTHROPIC_API_KEY || '').trim()
  if (fromEnv.startsWith('sk-ant-')) return fromEnv
  const fs = require('fs')
  const path = require('path')
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ]
  for (const p of candidates) {
    try {
      const lines = fs.readFileSync(p, 'utf8').split('\n')
      for (const line of lines) {
        const m = line.match(/^ANTHROPIC_API_KEY=(.+)$/)
        if (m && m[1].trim().startsWith('sk-ant-')) return m[1].trim()
      }
    } catch { /* ignore */ }
  }
  return fromEnv
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS }
  if (event.httpMethod !== 'POST') return err('POST only')

  const apiKey = loadApiKey()
  if (!apiKey) return err('ANTHROPIC_API_KEY nicht konfiguriert')
  if (!apiKey.startsWith('sk-ant-')) return err(`Key-Format ungültig (Länge ${apiKey.length}, Start: ${apiKey.slice(0,8)}…)`)

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
