// Heuristik für Excel-Spaltenerkennung beim Wein-Import.
// Verstehen sehr unterschiedliche Excel-Layouts ohne harte Vorgaben.

// Zielfelder, in die wir mappen können
export const TARGETS = [
  { id: 'ignore',     label: '— ignorieren —' },
  { id: 'name',       label: 'Name' },
  { id: 'winery',     label: 'Weingut' },
  { id: 'vintage',    label: 'Jahrgang' },
  { id: 'region',     label: 'Region' },
  { id: 'country',    label: 'Land' },
  { id: 'grape',      label: 'Rebsorte' },
  { id: 'color',      label: 'Farbe (rot/weiß/rosé/schaum)' },
  { id: 'sweetness',  label: 'Geschmack (trocken/brut/…)' },
  { id: 'wineType',   label: 'Art (wein/sekt/…)' },
  { id: 'classification', label: 'Qualität/Klassifikation' },
  { id: 'alcohol',    label: 'Alkohol-Angabe' },
  { id: 'alcoholFree',label: 'Alkoholfrei (ja/nein)' },
  { id: 'drinkFrom',  label: 'Trinken ab' },
  { id: 'drinkUntil', label: 'Trinken bis' },
  { id: 'count',      label: 'Anzahl Flaschen' },
  { id: 'priceEur',   label: 'Preis (€)' },
  { id: 'rating',     label: 'Bewertung (1–5)' },
  { id: 'rackLabel',  label: 'Regal (Name/Reihe)' },
  { id: 'slot',       label: 'Fach (Spalte/Position)' },
  { id: 'note',       label: 'Notiz / Besonderes' },
]

// Header-Schlüsselwörter → Ziel-ID (de + en + häufige Synonyme)
const HEADER_HINTS = [
  // Reihenfolge zählt – spezifischere zuerst
  [/^(name|wein(?:name)?|bezeichnung|titel|product|cuvée)$/i,            'name'],
  [/^(weingut|gut|erzeuger|hersteller|produzent|winery|domaine|château|chateau)$/i, 'winery'],
  [/^(jahr(gang)?|year|vintage|vintage[ -]?year|jhg\.?)$/i,             'vintage'],
  [/^(region|anbaugebiet|gebiet|appellation|origin)$/i,                  'region'],
  [/^(land|country|herkunftsland)$/i,                                    'country'],
  [/^(rebsorte|sorte|grape|grapes|traube|traubensorte|cépage|cepage)$/i, 'grape'],
  [/^(farbe|color|colour)$/i,                                           'color'],
  [/^(geschmack|sweetness|art)$/i,                                       'sweetness'],
  [/^(typ|wein[ -]?art|wine[ -]?type|kategorie)$/i,                     'wineType'],
  [/^(qualit(ä|ae?)t|classification|klassifikation|prädikat|praedikat|stufe)$/i, 'classification'],
  [/^(alk(ohol)?[\.\s%]?|alcohol|abv|vol|%vol)$/i,                       'alcohol'],
  [/^(alkoholfrei|ohne[ -]?alkohol|alc[ -]?free|non[ -]?alc|0\s?%)$/i,   'alcoholFree'],
  [/^(trinken[ -]?ab|drink[ -]?from|from|ab)$/i,                        'drinkFrom'],
  [/^(trinken[ -]?bis|drink[ -]?until|until|bis|optimal[ -]?bis)$/i,    'drinkUntil'],
  [/^(anzahl|menge|qty|quantity|flaschen|bottles|count|stück)$/i,        'count'],
  [/^(preis|price|€|eur|kosten|cost)$/i,                                 'priceEur'],
  [/^(rating|bewertung|punkte|score|sterne|stars)$/i,                    'rating'],
  [/^(regal|rack|lager|standort|location|shelf|reihe)$/i,               'rackLabel'],
  [/^(fach|slot|platz|position|spalte)$/i,                               'slot'],
  [/^(notiz(en)?|note|notes|kommentar|comment|remark|besonder(e|es|s)|bemerkung)$/i, 'note'],
]

// Inhalts-Heuristiken (wenn Header nichts hergibt)
function classifyByContent(samples) {
  const clean = samples.filter(v => v !== '' && v !== null && v !== undefined).map(String)
  if (clean.length === 0) return null

  const nums  = clean.filter(v => /^-?\d+([.,]\d+)?$/.test(v.trim()))
  const years = clean.filter(v => /^(19|20)\d{2}$/.test(v.trim()))

  if (years.length / clean.length > 0.7) return 'vintage'
  if (nums.length   / clean.length > 0.7) {
    const avg = nums.map(n => parseFloat(n.replace(',', '.'))).reduce((a,b) => a+b, 0) / nums.length
    if (avg >= 1 && avg <= 5)       return 'rating'
    if (avg >= 1 && avg <= 200)     return 'priceEur'
    if (avg >= 1 && avg <= 50)      return 'count'
  }

  const colorRe = /^(r|w|rot|red|weiß|weiss|white|blanc|rosé|rose|rosato|sekt|schaum|champagner|champagne|sparkling|spumante|cava|prosecco|zcham|zperlw|zsekt)/i
  if (clean.filter(v => colorRe.test(v.trim())).length / clean.length > 0.6) return 'color'

  const sweetnessRe = /^(tr|htr|s|trocken|halbtrocken|lieblich|süß|süss|brut|extra\s*(brut|dry)|feinherb|sweet|dry|sec|demi[- ]sec)$/i
  if (clean.filter(v => sweetnessRe.test(v.trim())).length / clean.length > 0.5) return 'sweetness'

  const classRe = /(kabinett|spätlese|auslese|beerenauslese|trockenbeerenauslese|eiswein|qmp|qw|doc|docg|aoc|igp|igt|grand\s*cru|premier\s*cru|reserva|riserva|crianza|a\.?p\.?c|a\.?h\.?m\.?c)/i
  if (clean.filter(v => classRe.test(v.trim())).length / clean.length > 0.4) return 'classification'

  const grapeRe = /(riesling|chardonnay|pinot|nebbiolo|sangiovese|merlot|cabernet|grenache|syrah|shiraz|sauvignon|tempranillo|spätburgunder|silvaner|gewürztraminer|grauburgunder|weißburgunder)/i
  if (clean.filter(v => grapeRe.test(v)).length / clean.length > 0.5) return 'grape'

  const countryRe = /(deutschland|germany|italien|italy|frankreich|france|spanien|spain|portugal|österreich|austria|schweiz|switzerland|usa|argentinien|chile|südafrika|neuseeland|australien|griechenland|ungarn)/i
  if (clean.filter(v => countryRe.test(v)).length / clean.length > 0.5) return 'country'

  // Längere Strings sehr wahrscheinlich Namen oder Notizen
  const avgLen = clean.reduce((s, v) => s + v.length, 0) / clean.length
  if (avgLen > 25) return 'note'
  if (avgLen > 10) return 'name'

  return null
}

// Header-Erkennung pro Wert (case-insensitive, trim)
function classifyHeader(text) {
  const t = String(text || '').toLowerCase().trim()
  if (!t) return null
  for (const [re, id] of HEADER_HINTS) if (re.test(t)) return id
  return null
}

// Heuristik: ist die erste Zeile ein Header?
export function looksLikeHeader(row, samplesBelow) {
  if (!row || row.length === 0) return false
  const headerHits = row.filter(c => classifyHeader(c)).length
  if (headerHits >= 2) return true
  // Wenn alle Werte unter der ersten Zeile Zahlen sind, ist die Zeile vermutlich Header
  const lowerNumRatio = samplesBelow.flat().filter(v => /^\d/.test(String(v))).length /
                        Math.max(1, samplesBelow.flat().length)
  const upperStringRatio = row.filter(v => typeof v === 'string' && v.length > 1).length / row.length
  return upperStringRatio > 0.6 && lowerNumRatio > 0.3
}

// Erzeugt für jede Spalte ein Mapping (Header + Content-Heuristik)
export function autoMapColumns(headers, dataRows) {
  return headers.map((h, idx) => {
    const headerGuess = classifyHeader(h)
    const samples = dataRows.slice(0, 30).map(r => r[idx])
    const contentGuess = classifyByContent(samples)
    return {
      colIndex: idx,
      header: h ?? `Spalte ${idx + 1}`,
      target: headerGuess || contentGuess || 'ignore',
      samples: samples.filter(v => v !== '' && v != null).slice(0, 3),
    }
  })
}

// Farbe normieren (inkl. gängige Abkürzungen)
export function normalizeColor(v) {
  const s = String(v || '').toLowerCase().trim()
  if (!s) return ''
  if (/^r$/.test(s)) return 'rot'
  if (/^w$/.test(s)) return 'weiß'
  if (/(rot|red|tinto|rosso)/.test(s)) return 'rot'
  if (/(weiß|weiss|white|blanc|bianco)/.test(s)) return 'weiß'
  if (/^(rosé|rose|rosato)$/i.test(s)) return 'rosé'
  if (/(sekt|schaum|champagner|champagne|sparkling|spumante|cava|prosecco|perlw|zcham|zsekt)/i.test(s)) return 'schaum'
  if (/ros[eé]/i.test(s)) return 'rosé'
  return 'rot'
}

// Land normieren (Abkürzungen → voller Name)
const COUNTRY_ABBREV = {
  d: 'Deutschland', de: 'Deutschland',
  f: 'Frankreich', fr: 'Frankreich',
  i: 'Italien', it: 'Italien',
  e: 'Spanien', es: 'Spanien',
  a: 'Österreich', at: 'Österreich',
  ch: 'Schweiz',
  pt: 'Portugal',
  us: 'USA', usa: 'USA',
  ar: 'Argentinien',
  cl: 'Chile',
  za: 'Südafrika',
  au: 'Australien',
  nz: 'Neuseeland',
  gr: 'Griechenland',
  hu: 'Ungarn',
  hr: 'Kroatien',
  si: 'Slowenien',
  ge: 'Georgien',
  lb: 'Libanon',
  ro: 'Rumänien',
  bg: 'Bulgarien',
  rs: 'Serbien',
  tr: 'Türkei',
  lu: 'Luxemburg',
  br: 'Brasilien',
  mx: 'Mexiko',
  uy: 'Uruguay',
  md: 'Moldau',
}

export function normalizeCountry(v) {
  const s = String(v || '').trim()
  if (!s) return ''
  const lower = s.toLowerCase()
  if (COUNTRY_ABBREV[lower]) return COUNTRY_ABBREV[lower]
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Geschmack normieren (Abkürzungen → Standardwerte)
export function normalizeSweetness(v) {
  const s = String(v || '').toLowerCase().trim()
  if (!s) return ''
  if (/^tr$/.test(s) || /^trocken$/.test(s)) return 'trocken'
  if (/^htr$/.test(s) || /^halbtrocken$/.test(s) || /^feinherb$/.test(s)) return 'halbtrocken'
  if (/^s$/.test(s) || /^süß$/.test(s) || /^süss$/.test(s) || /^sweet$/.test(s)) return 'süß'
  if (/^lieblich$/.test(s)) return 'lieblich'
  if (/^brut\s*nature$/i.test(s) || /^bn$/.test(s)) return 'brut nature'
  if (/^extra\s*brut$/i.test(s) || /^eb$/.test(s)) return 'extra brut'
  if (/^brut$/.test(s)) return 'brut'
  if (/^extra\s*dry$/i.test(s) || /^ed$/.test(s)) return 'extra dry'
  return s
}

// Alkoholfrei normieren
export function normalizeBool(v) {
  const s = String(v || '').toLowerCase().trim()
  if (/^(ja|yes|y|1|true|x|alkoholfrei|frei)$/.test(s)) return true
  return false
}

// Eine Zeile gegen Mapping → Wein-Datenobjekt
export function rowToWine(row, mapping) {
  const out = {}
  mapping.forEach(m => {
    if (m.target === 'ignore') return
    const raw = row[m.colIndex]
    if (raw == null || raw === '') return
    if (m.target === 'color')           out.color = normalizeColor(raw)
    else if (m.target === 'country')    out.country = normalizeCountry(raw)
    else if (m.target === 'sweetness')  out.sweetness = normalizeSweetness(raw)
    else if (m.target === 'alcoholFree') out.alcoholFree = normalizeBool(raw)
    else if (m.target === 'vintage' || m.target === 'drinkFrom' || m.target === 'drinkUntil' || m.target === 'count' || m.target === 'rating') {
      const n = parseInt(String(raw).replace(/\D+/g, ''), 10)
      if (!isNaN(n)) out[m.target] = n
    }
    else if (m.target === 'priceEur') {
      const n = parseFloat(String(raw).replace(',', '.').replace(/[^0-9.]/g, ''))
      if (!isNaN(n)) out.priceEur = n
    }
    else out[m.target] = String(raw).trim()
  })
  // Auto-Farbe aus Namen, falls fehlt
  if (!out.color && out.name) out.color = normalizeColor(out.name) || normalizeColor(out.grape)
  if (!out.color) out.color = 'rot'
  // Schaum-Farbe aus Sekt-Type oder Schaumwein-Sweetness ableiten
  if (out.wineType === 'sekt' && !out.color) out.color = 'schaum'
  if (['brut nature','extra brut','brut','extra dry'].includes(out.sweetness) && out.color !== 'schaum') {
    out.color = 'schaum'
  }
  return out
}
