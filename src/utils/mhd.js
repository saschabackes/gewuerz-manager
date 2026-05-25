import { differenceInDays, parseISO, isValid } from 'date-fns'

export function getMhdStatus(expiryDateStr) {
  if (!expiryDateStr) return { status: 'none', label: 'Kein MHD', days: null }

  const expiry = parseISO(expiryDateStr)
  if (!isValid(expiry)) return { status: 'none', label: 'Kein MHD', days: null }

  const days = differenceInDays(expiry, new Date())

  if (days < 0) return { status: 'expired', label: `Abgelaufen (${Math.abs(days)}d)`, days }
  if (days <= 30) return { status: 'critical', label: `${days}d`, days }
  if (days <= 90) return { status: 'warning', label: `${Math.ceil(days / 30)}M`, days }
  return { status: 'ok', label: `${Math.ceil(days / 30)}M`, days }
}

export const MHD_STYLES = {
  none: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-300', label: 'Kein MHD' },
  ok: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-400', label: 'OK' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-400', label: 'Bald' },
  critical: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400', label: 'Kritisch' },
  expired: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-400', label: 'Abgelaufen' },
}

export function formatMhdDate(dateStr) {
  if (!dateStr) return null
  const date = parseISO(dateStr)
  if (!isValid(date)) return null
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatAmount(spice) {
  const { packagingType, amountGrams, units } = spice
  switch (packagingType) {
    case 'fertigstreuer':
      return `${amountGrams ?? '?'} g × ${units ?? '?'} Stk.`
    case 'nachfuell':
      return `${amountGrams ?? '?'} g`
    case 'ganz':
      return `${units ?? '?'} Stück`
    case 'metallstreuer':
      return `${units ?? '?'} Streuer`
    default:
      return ''
  }
}
