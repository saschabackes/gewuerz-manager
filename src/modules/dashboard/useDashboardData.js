import { useMemo } from 'react'
import useStore from '../../store/useStore'
import { useFreezer, FREEZER_SHELF_LIFE } from '../freezer/store'
import { useCellar } from '../cellar/store'
import { getMhdStatus } from '../../utils/mhd'
import { computeRecipeAvailability } from '../../utils/inventoryMatch'

export default function useDashboardData() {
  const spices = useStore(s => s.spices)
  const shoppingItems = useStore(s => s.shoppingItems)
  const recipes = useStore(s => s.recipes)
  const activityLog = useStore(s => s.activityLog)
  const freezerItems = useFreezer(s => s.items)
  const bottles = useCellar(s => s.bottles)

  return useMemo(() => {
    const counts = {
      spices: spices.length,
      freezer: freezerItems.length,
      cellar: bottles.length,
      shopping: shoppingItems.filter(i => !i.checked).length,
      recipes: recipes.length,
    }

    const attention = []
    const now = new Date()
    const year = now.getFullYear()

    spices.forEach(sp => {
      const mhd = getMhdStatus(sp.expiryDate)
      if (mhd.status === 'critical' || mhd.status === 'expired') {
        attention.push({ type: 'spice', id: sp.id, name: sp.name, emoji: '🌿', status: mhd.status, label: mhd.label, days: mhd.days })
      }
    })

    freezerItems.forEach(item => {
      if (!item.frozenAt) return
      const days = FREEZER_SHELF_LIFE[item.category] ?? 180
      const expiry = new Date(item.frozenAt)
      expiry.setDate(expiry.getDate() + days)
      const remaining = Math.floor((expiry - now) / 86400000)
      if (remaining < 30) {
        attention.push({ type: 'freezer', id: item.id, name: item.name, emoji: '❄️', status: remaining < 0 ? 'expired' : 'critical', label: remaining < 0 ? `${Math.abs(remaining)}d über` : `${remaining}d`, days: remaining })
      }
    })

    bottles.forEach(b => {
      if (b.drinkUntil && b.drinkUntil <= year) {
        attention.push({ type: 'cellar', id: b.id, name: b.name, emoji: '🍷', status: b.drinkUntil < year ? 'expired' : 'critical', label: b.drinkUntil < year ? 'Trinkfenster vorbei' : 'Letztes Jahr', days: (b.drinkUntil - year) * 365 })
      }
    })

    attention.sort((a, b) => a.days - b.days)
    const topAttention = attention.slice(0, 10)

    const suggestions = recipes
      .filter(r => r.ingredients?.length > 0)
      .map(r => {
        const avail = computeRecipeAvailability(r, spices, freezerItems, bottles)
        const expiryBoost = avail.matchedExpiring * 0.1
        const score = avail.percentage + expiryBoost
        return { recipe: r, ...avail, score }
      })
      .filter(s => s.totalFound > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    const recentActivity = activityLog.slice(0, 5)

    return { counts, attention: topAttention, suggestions, recentActivity }
  }, [spices, freezerItems, bottles, shoppingItems, recipes, activityLog])
}
