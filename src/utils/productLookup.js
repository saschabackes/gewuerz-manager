const OFF_API = 'https://world.openfoodfacts.org/api/v2/product'
const PROXY   = '/.netlify/functions/bring-proxy'

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

// Suche per Name + optionalem Hersteller → bis zu 6 Bilder-Vorschläge.
// Läuft über die Netlify-Function (serverseitig, kein CORS-Problem).
// Strategie: mehrere Query-Varianten (original, ohne Marke, Kompositum
// aufgesplittet) → Proxy merged und dedup-t serverseitig.
export async function searchProductImages(name, brand = '') {
  // Query-Varianten sammeln
  const queries = new Set()
  const full    = [brand, name].filter(Boolean).join(' ')
  queries.add(full)
  if (brand) queries.add(name)

  const split = splitGermanCompound(name)
  if (split) {
    queries.add([brand, split].filter(Boolean).join(' '))
    queries.add(split)
  }

  try {
    const res  = await fetch(PROXY, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'searchImages', queries: [...queries] }),
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
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
