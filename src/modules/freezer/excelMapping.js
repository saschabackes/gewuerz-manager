// Heuristik für Excel-Spaltenerkennung beim TK-Import.

export const TARGETS = [
  { id: 'ignore',        label: '— ignorieren —' },
  { id: 'name',          label: 'Name' },
  { id: 'category',      label: 'Kategorie' },
  { id: 'portions',      label: 'Portionen / Anzahl' },
  { id: 'portionSize',   label: 'Portionsgröße' },
  { id: 'frozenAt',      label: 'Einfrierdatum' },
  { id: 'storageLabel',  label: 'Gefrierschrank' },
  { id: 'compartment',   label: 'Fach / Schublade' },
  { id: 'note',          label: 'Notiz' },
]

const HEADER_HINTS = [
  [/^(name|produkt|bezeichnung|artikel|product|item|lebensmittel)$/i,              'name'],
  [/^(kategorie|kat\.?|category|art|typ|type|sorte)$/i,                            'category'],
  [/^(portionen|anzahl|menge|stück|qty|quantity|count|pcs|port\.?)$/i,             'portions'],
  [/^(größe|portionsgröße|portion|gewicht|weight|size|gramm|g)$/i,                 'portionSize'],
  [/^(eingefroren|einfrier(datum)?|frozen|froze|freeze|datum|date|eingefr\.?)$/i,  'frozenAt'],
  [/^(schrank|gefrier(schrank)?|freezer|storage|lager(ort)?|truhe|ort)$/i,         'storageLabel'],
  [/^(fach|schublade|compartment|drawer|korb|ablage|etage|ebene)$/i,               'compartment'],
  [/^(notiz|note|notes|kommentar|comment|bemerkung|info)$/i,                       'note'],
]

const CATEGORY_KEYWORDS = {
  fleisch_roh: /hähnchen|huhn|pute|rind|schwein|hack|filet|steak|kotelett|lamm|kalb|wild/i,
  fleisch_gegart: /gegart|gekocht|braten|schmor/i,
  geflügel: /geflügel|hühnchen|chicken|turkey/i,
  fisch: /lachs|fisch|forelle|garnele|kabeljau|shrimp|thunfisch|pangasius/i,
  gemüse: /gemüse|erbsen|spinat|brokkoli|bohnen|blumenkohl|möhren|karotten|paprika/i,
  obst: /obst|beeren|himbeeren|erdbeeren|heidelbeeren|kirschen|mango/i,
  brot: /brot|brötchen|baguette|toast|semmel/i,
  teig: /teig|pizza|blätterteig|strudelteig/i,
  fertiggericht: /fertig|lasagne|maultaschen|gericht|menü|schnitzel/i,
  eis: /eis|sorbet|magnum|cornetto/i,
  kräuter: /petersilie|basilikum|schnittlauch|kräuter|dill/i,
  suppe: /suppe|brühe|sauce|soße|fond|eintopf/i,
  hundefutter: /hund|barf|hundefutter/i,
  tierfutter: /frostfutter|fischfutter|artemia|tierfutter/i,
}

function classifyByContent(samples) {
  const clean = samples.filter(v => v !== '' && v !== null && v !== undefined).map(String)
  if (clean.length === 0) return null

  const nums = clean.filter(v => /^-?\d+([.,]\d+)?$/.test(v.trim()))
  const dates = clean.filter(v => /^\d{1,4}[.\-/]\d{1,2}[.\-/]\d{2,4}$/.test(v.trim()))

  if (dates.length >= clean.length * 0.5) return 'frozenAt'

  if (nums.length >= clean.length * 0.7) {
    const avg = nums.reduce((s, v) => s + parseFloat(v.replace(',', '.')), 0) / nums.length
    if (avg <= 50) return 'portions'
    return null
  }

  const catMatches = clean.filter(v => {
    for (const re of Object.values(CATEGORY_KEYWORDS)) if (re.test(v)) return true
    return false
  })
  if (catMatches.length >= clean.length * 0.4) return 'category'

  const sizePattern = clean.filter(v => /\d+\s*(g|kg|ml|l|stück|portion)/i.test(v))
  if (sizePattern.length >= clean.length * 0.3) return 'portionSize'

  return null
}

export function looksLikeHeader(row, dataRows) {
  const allStr = row.every(v => typeof v === 'string' || v === '')
  const dataHasNums = dataRows.some(r => r.some(c => typeof c === 'number'))
  if (allStr && dataHasNums) return true
  const matchCount = row.filter(v => {
    const s = String(v).trim()
    return HEADER_HINTS.some(([re]) => re.test(s))
  }).length
  return matchCount >= 2
}

export function autoMapColumns(headers, dataRows) {
  return headers.map((h, i) => {
    const headerStr = String(h).trim()
    const samples = dataRows.slice(0, 10).map(r => r[i]).filter(v => v !== '' && v != null)

    let target = 'ignore'
    for (const [re, id] of HEADER_HINTS) {
      if (re.test(headerStr)) { target = id; break }
    }
    if (target === 'ignore' && samples.length > 0) {
      const guess = classifyByContent(samples)
      if (guess) target = guess
    }
    return { header: headerStr, target, samples: samples.slice(0, 5) }
  })
}

function parseDate(v) {
  if (!v) return ''
  const s = String(v).trim()
  const m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/)
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3]
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (typeof v === 'number' && v > 30000 && v < 60000) {
    const d = new Date((v - 25569) * 86400000)
    return d.toISOString().slice(0, 10)
  }
  return ''
}

export function normalizeCategory(val) {
  const v = String(val || '').trim().toLowerCase()
  if (!v) return ''
  for (const [cat, re] of Object.entries(CATEGORY_KEYWORDS)) {
    if (re.test(v)) return cat
  }
  return 'sonstiges'
}

export function rowToItem(row, mapping) {
  const get = (targetId) => {
    const idx = mapping.findIndex(m => m.target === targetId)
    if (idx < 0) return ''
    return row[idx] ?? ''
  }

  const name = String(get('name')).trim()
  if (!name) return { name: '' }

  const portions = Math.max(1, parseInt(String(get('portions')).replace(/[^\d]/g, ''), 10) || 1)
  const portionSize = String(get('portionSize')).trim()
  const category = normalizeCategory(get('category') || name)
  const frozenAt = parseDate(get('frozenAt'))
  const storageLabel = String(get('storageLabel')).trim()
  const compartment = String(get('compartment')).trim()
  const note = String(get('note')).trim()

  return { name, category, portions, portionSize, frozenAt, storageLabel, compartment, note }
}
