import { useMemo, useState } from 'react'
import useStore from '../store/useStore'
import { getMhdStatus, MHD_STYLES, formatMhdDate, formatAmount } from '../utils/mhd'
import { PACKAGING_COLORS, PACKAGING_TYPES } from '../data/spices'

const STATUS_FILTERS = [
  { id: 'all', label: 'Alle', icon: '📋' },
  { id: 'expired', label: 'Abgelaufen', icon: '🔴' },
  { id: 'critical', label: 'Kritisch', icon: '🟠' },
  { id: 'warning', label: 'Warnung', icon: '🟡' },
  { id: 'ok', label: 'OK', icon: '🟢' },
  { id: 'none', label: 'Kein MHD', icon: '⚪' },
]

export default function ExpiryView({ onEdit }) {
  const { spices: allSpices } = useStore()
  const [statusFilter, setStatusFilter] = useState('all')

  const { grouped, counts } = useMemo(() => {
    const counts = { expired: 0, critical: 0, warning: 0, ok: 0, none: 0 }
    const withStatus = allSpices.map(s => {
      const mhd = getMhdStatus(s.expiryDate)
      counts[mhd.status] = (counts[mhd.status] ?? 0) + 1
      return { ...s, mhd }
    })

    const sorted = [...withStatus].sort((a, b) => {
      const order = { expired: 0, critical: 1, warning: 2, ok: 3, none: 4 }
      const od = (order[a.mhd.status] ?? 5) - (order[b.mhd.status] ?? 5)
      if (od !== 0) return od
      if (!a.expiryDate) return 1
      if (!b.expiryDate) return -1
      return new Date(a.expiryDate) - new Date(b.expiryDate)
    })

    const filtered = statusFilter === 'all' ? sorted : sorted.filter(s => s.mhd.status === statusFilter)

    const grouped = []
    const GROUPS = [
      { status: 'expired', title: '⚠ Abgelaufen' },
      { status: 'critical', title: '🔴 Bald ablaufend (< 1 Monat)' },
      { status: 'warning', title: '🟡 In Kürze ablaufend (1–3 Monate)' },
      { status: 'ok', title: '🟢 Frisch (> 3 Monate)' },
      { status: 'none', title: '⚪ Kein MHD gesetzt' },
    ]

    for (const g of GROUPS) {
      const items = filtered.filter(s => s.mhd.status === g.status)
      if (items.length > 0) grouped.push({ ...g, items })
    }

    return { grouped, counts }
  }, [allSpices, statusFilter])

  if (allSpices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="text-5xl mb-4">📅</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-1">Keine Gewürze vorhanden</h3>
        <p className="text-sm text-gray-400">Füge zuerst Gewürze mit MHD hinzu</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary cards */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { status: 'expired', count: counts.expired, label: 'Abgelauf.', bg: 'bg-red-50', text: 'text-red-600' },
            { status: 'critical', count: counts.critical, label: 'Kritisch', bg: 'bg-orange-50', text: 'text-orange-600' },
            { status: 'warning', count: counts.warning, label: 'Warnung', bg: 'bg-yellow-50', text: 'text-yellow-600' },
            { status: 'ok', count: counts.ok, label: 'OK', bg: 'bg-green-50', text: 'text-green-600' },
          ].map(item => (
            <button
              key={item.status}
              onClick={() => setStatusFilter(f => f === item.status ? 'all' : item.status)}
              className={`rounded-xl p-2 text-center transition-all ${item.bg} ${
                statusFilter === item.status ? 'ring-2 ring-offset-1 ring-current' : ''
              }`}
            >
              <div className={`text-xl font-bold ${item.text}`}>{item.count}</div>
              <div className={`text-[10px] font-medium ${item.text} opacity-80`}>{item.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Filter pills */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id)}
            className={`flex-none rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              statusFilter === f.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {grouped.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Keine Einträge in dieser Kategorie
          </div>
        ) : grouped.map(group => (
          <div key={group.status}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
              {group.title} ({group.items.length})
            </h3>
            <div className="space-y-2">
              {group.items.map(spice => (
                <ExpiryCard key={spice.id} spice={spice} onEdit={onEdit} />
              ))}
            </div>
          </div>
        ))}
        <div className="h-2" />
      </div>
    </div>
  )
}

function ExpiryCard({ spice, onEdit }) {
  const mhd = getMhdStatus(spice.expiryDate)
  const mhdStyle = MHD_STYLES[mhd.status]
  const pkgColor = PACKAGING_COLORS[spice.packagingType] ?? PACKAGING_COLORS.fertigstreuer
  const pkgLabel = PACKAGING_TYPES.find(t => t.id === spice.packagingType)?.label ?? ''

  const rowClass = {
    expired: 'mhd-expired',
    critical: 'mhd-critical',
    warning: 'mhd-warning',
    ok: 'mhd-ok',
    none: 'mhd-none',
  }[mhd.status]

  return (
    <div className={`card ${rowClass} px-4 py-3 flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {spice.imageUrl && (
          <div className="flex-none w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
            <img src={spice.imageUrl} alt={spice.name} className="w-full h-full object-contain" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{spice.name}</span>
            <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${pkgColor.bg} ${pkgColor.text}`}>
              {pkgLabel}
            </span>
          </div>
          {spice.brand && <div className="text-xs text-gray-400 font-medium">{spice.brand}</div>}
          <div className="text-sm text-gray-500 mt-0.5">{formatAmount(spice)}</div>
        </div>
      </div>

      <div className="flex-none flex flex-col items-end gap-2">
        <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${mhdStyle.bg} ${mhdStyle.text}`}>
          {spice.expiryDate ? formatMhdDate(spice.expiryDate) : 'Kein MHD'}
        </span>
        {spice.expiryDate && (
          <span className={`text-xs ${mhdStyle.text}`}>
            {mhd.days !== null && mhd.days < 0
              ? `${Math.abs(mhd.days)} Tage überschritten`
              : mhd.days !== null
              ? `noch ${mhd.days} Tage`
              : ''}
          </span>
        )}
        <button
          onClick={() => onEdit(spice)}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Edit
        </button>
      </div>
    </div>
  )
}
