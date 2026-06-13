import { buildCookPlan, normalize, cleanIngredientName } from './recipeParser'
import { getMhdStatus } from './mhd'
import { FREEZER_SHELF_LIFE } from '../modules/freezer/store'
import { detectDishes, rankWinesForDish } from '../modules/cellar/pairing'

function keywords(name) {
  return normalize(name).split(' ').filter(w => w.length >= 3)
}

const WINE_WORDS = ['wein', 'weißwein', 'rotwein', 'rosé', 'prosecco', 'sekt', 'champagner', 'marsala', 'sherry', 'port', 'portwein']

export function matchFreezerItems(ingredientName, freezerItems) {
  const keys = keywords(ingredientName)
  if (keys.length === 0) return []
  return freezerItems.filter(item => {
    const itemWords = normalize(item.name).split(' ').filter(w => w.length >= 3)
    return keys.some(k => itemWords.some(w =>
      k === w || (k.length >= 4 && w.length >= 4 && (k.includes(w) || w.includes(k)))
    ))
  })
}

export function matchWineBottles(ingredientName, bottles) {
  const n = normalize(ingredientName)
  const isWineIngredient = WINE_WORDS.some(w => n.includes(w))
  if (!isWineIngredient) return []

  const wantsRed = n.includes('rotwein') || n.includes('rot')
  const wantsWhite = n.includes('weißwein') || n.includes('weiß') || n.includes('weisswein')

  return bottles.filter(b => {
    if (wantsRed && b.color !== 'rot') return false
    if (wantsWhite && b.color !== 'weiß') return false
    return true
  }).slice(0, 3)
}

export function computeRecipeAvailability(recipe, spices, freezerItems, bottles) {
  const ingredients = recipe.ingredients ?? []
  const spicePlan = buildCookPlan(ingredients, spices)
  const matchedSpiceNames = new Set(spicePlan.matched.map(m => m.recipeName))
  const unmatchedSpiceNames = new Set(spicePlan.unmatched)

  const freezerMatches = []
  const wineMatches = []
  const allIngNames = ingredients.map(i => typeof i === 'string' ? i : i.name)

  allIngNames.forEach(name => {
    if (matchedSpiceNames.has(name)) return

    const tkHits = matchFreezerItems(name, freezerItems)
    if (tkHits.length > 0) {
      freezerMatches.push({ recipeName: name, items: tkHits.slice(0, 3) })
      unmatchedSpiceNames.delete(name)
      return
    }

    const wineHits = matchWineBottles(name, bottles)
    if (wineHits.length > 0) {
      wineMatches.push({ recipeName: name, bottles: wineHits })
      unmatchedSpiceNames.delete(name)
    }
  })

  const cleanMissing = []
  const seen = new Set()
  ;[...unmatchedSpiceNames].forEach(raw => {
    const clean = cleanIngredientName(raw)
    const key = clean.toLowerCase()
    if (clean && !seen.has(key)) { seen.add(key); cleanMissing.push(clean) }
  })

  const totalFound = spicePlan.matched.length + freezerMatches.length + wineMatches.length
  const totalMissing = cleanMissing.length
  const total = totalFound + totalMissing
  const percentage = total > 0 ? totalFound / total : 0

  let matchedExpiring = 0
  spicePlan.matched.forEach(m => {
    m.jars.forEach(sp => {
      const mhd = getMhdStatus(sp.expiryDate)
      if (mhd.status === 'critical' || mhd.status === 'expired') matchedExpiring++
    })
  })
  freezerMatches.forEach(m => {
    m.items.forEach(item => {
      if (item.frozenAt && item.category) {
        const days = FREEZER_SHELF_LIFE[item.category] ?? 180
        const expiry = new Date(item.frozenAt)
        expiry.setDate(expiry.getDate() + days)
        const remaining = (expiry - new Date()) / 86400000
        if (remaining < 30) matchedExpiring++
      }
    })
  })

  const title = recipe.title || ''
  const dishIds = detectDishes(title)
  let winePairing = null
  if (dishIds.length > 0 && bottles.length > 0) {
    const ranked = rankWinesForDish(bottles, dishIds[0])
    if (ranked.length > 0) winePairing = ranked[0]
  }

  return { totalFound, totalMissing, percentage, matchedExpiring, winePairing, freezerMatches, wineMatches, spicePlan, missing: cleanMissing }
}
