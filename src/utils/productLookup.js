const OFF_API    = 'https://world.openfoodfacts.org/api/v2/product'
const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl'

// Deutsche Komposita aufsplitten: "Selleriesalz" → "Sellerie Salz"
// Gibt null zurück wenn keine bekannte Endung erkannt wird.
function splitGermanCompound(word) {
  const suffixes = [
    'salz', 'pfeffer', 'pulver', 'samen', 'körner', 'kapseln',
    'blätter', 'flocken', 'kräuter', 'gewürz', 'zucker', 'öl',
    'extrakt', 'schoten', 'stangen', 'mehl', 'paste',
  ]
  const w = word.toLowerCase()
  for (const suf of suffixes) {
    if (w.endsWith(suf) && w.length > suf.length + 3) {
      const stem = word.slice(0, word.length - suf.length)
      return `${stem} ${suf.charAt(0).toUpperCase()}${suf.slice(1)}`
    }
  }
  return null
}

// Einzelne OFF-Suchanfrage – gibt normalisiertes Array zurück
async function offSearch(query, signal) {
  const params = new URLSearchParams({
    search_terms:  query,
    search_simple: '1',
    action:        'process',
    json:          '1',
    page_size:     '8',
    fields:        'product_name,brands,image_front_small_url,image_front_url,image_url',
  })
  try {
    const res  = await fetch(`${OFF_SEARCH}?${params}`, { signal })
    if (!res.ok) return []
    const data = await res.json()
    return (data.products ?? []).map(p => ({
      thumbUrl: p.image_front_small_url || p.image_front_url || p.image_url || null,
      fullUrl:  p.image_front_url       || p.image_url       || p.image_front_small_url || null,
      name:     p.product_name ?? '',
      brand:    (p.brands ?? '').split(',')[0].trim(),
    }))
  } catch {
    return []
  }
}

// Suche per Name + optionalem Hersteller → bis zu 6 Bilder-Vorschläge.
// Strategie: mehrere Queries parallel (original, Name ohne Marke,
// Kompositum gesplittet) → merge & dedup → beste 6 zurückgeben.
export async function searchProductImages(name, brand = '') {
  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), 8000)

  // Alle sinnvollen Query-Varianten sammeln (ohne Duplikate)
  const queries = new Set()
  const full    = [brand, name].filter(Boolean).join(' ')
  queries.add(full)
  if (brand) queries.add(name)                      // nur Name, ohne Marke

  const split = splitGermanCompound(name)
  if (split) {
    queries.add([brand, split].filter(Boolean).join(' '))
    queries.add(split)
  }

  try {
    const results = await Promise.all([...queries].map(q => offSearch(q, controller.signal)))
    // Merge + Duplikate per fullUrl entfernen + nur Einträge mit Bild
    const seen = new Set()
    return results
      .flat()
      .filter(p => {
        if (!p.thumbUrl || !p.fullUrl) return false
        if (seen.has(p.fullUrl)) return false
        seen.add(p.fullUrl)
        return true
      })
      .slice(0, 6)
  } finally {
    clearTimeout(timeout)
  }
}

export async function lookupBarcode(barcode) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${OFF_API}/${barcode}.json`, { signal: controller.signal })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    return parseProduct(data.product, barcode)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function extractGrams(str) {
  if (!str) return null
  // "2 x 25 g", "2x25g"
  const multi = str.match(/(\d+)\s*[×xX]\s*(\d+(?:[.,]\d+)?)\s*g(?!\w)/i)
  if (multi) return { grams: parseFloat(multi[2].replace(',', '.')), units: parseInt(multi[1]) }
  // "25 g", "25g", "0,5g"
  const single = str.match(/(\d+(?:[.,]\d+)?)\s*g(?!\w)/i)
  if (single) return { grams: parseFloat(single[1].replace(',', '.')), units: 1 }
  return null
}

function parseProduct(p, barcode) {
  const rawName = p.product_name_de || p.product_name || p.abbreviated_product_name || ''
  const brand = p.brands?.split(',')[0]?.trim() ?? ''

  // Gewicht: alle relevanten Felder der Reihe nach probieren
  const candidates = [
    p.quantity,
    p.net_weight,
    p.serving_size,
    // Gewicht manchmal im Produktnamen: "Oregano 15g"
    rawName,
  ].filter(Boolean)

  let amountGrams = null
  let units = null

  for (const candidate of candidates) {
    const result = extractGrams(String(candidate))
    if (result) {
      amountGrams = result.grams
      units = result.units
      break
    }
  }

  // product_quantity_value ist manchmal numerisch gesetzt
  if (!amountGrams && p.product_quantity && p.product_quantity_unit === 'g') {
    amountGrams = parseFloat(p.product_quantity)
    units = units ?? 1
  }

  // Stücke (Ganze Gewürze)
  let packagingType = 'fertigstreuer'
  const qStr = (p.quantity ?? '').toLowerCase()
  const pieceMatch = qStr.match(/(\d+)\s*(stück|stk\.?|pcs?)/i)
  if (pieceMatch) {
    packagingType = 'ganz'
    units = parseInt(pieceMatch[1])
    amountGrams = null
  }

  // Markennamen aus Produktname entfernen
  let name = rawName
  if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
    name = name.slice(brand.length).replace(/^\s*[-–,]\s*/, '').trim()
  }
  // Gewichtsangabe am Ende des Namens abschneiden ("Oregano 15g" → "Oregano")
  name = name.replace(/\s+\d+(?:[.,]\d+)?\s*g\s*$/i, '').trim()

  return {
    name: name || rawName,
    brand,
    amountGrams,
    units,
    packagingType,
    barcode,
    imageUrl: p.image_front_url || p.image_url || null,
    weightMissing: !amountGrams && packagingType !== 'ganz',
  }
}
