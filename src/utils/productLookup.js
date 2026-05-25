const OFF_API = 'https://world.openfoodfacts.org/api/v2/product'

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
