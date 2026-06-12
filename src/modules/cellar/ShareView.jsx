import { useState, useEffect } from 'react'
import { decodeShareData } from './shareCodec'

const COLOR_EMOJI = { rot: '🍷', weiß: '🥂', rosé: '🌸', schaum: '🍾' }
const STARS = n => '★'.repeat(n) + '☆'.repeat(5 - n)

export default function ShareView({ encoded }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      setData(decodeShareData(encoded))
    } catch {
      setError('Ungültiger Link — die Empfehlung konnte nicht geladen werden.')
    }
  }, [encoded])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-4xl mb-3">🍷</p>
          <p className="text-gray-700 font-medium">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { bottles, meta } = data
  const senderName = meta.sn || 'Jemand'
  const message = meta.msg || ''

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-4xl mb-2">🍷</p>
          <h1 className="text-xl font-bold text-gray-900">
            Wein-Empfehlung{bottles.length > 1 ? 'en' : ''}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {senderName} empfiehlt dir {bottles.length === 1 ? 'diesen Wein' : `diese ${bottles.length} Weine`}
          </p>
          {message && (
            <div className="mt-3 bg-white rounded-xl px-4 py-3 text-sm text-gray-700 italic border border-gray-100 shadow-sm">
              „{message}"
            </div>
          )}
        </div>

        {/* Wine Cards */}
        <div className="space-y-4">
          {bottles.map((b, i) => (
            <WineCard key={i} bottle={b} />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="border-t border-gray-200 pt-6">
            <p className="text-xs text-gray-400 mb-2">Erstellt mit</p>
            <a href="https://depotapp.online" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D7377" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span className="text-sm font-semibold" style={{ color: '#0D7377' }}>Depot</span>
              <span className="text-xs text-gray-400">Dein Haushalt, organisiert</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function WineCard({ bottle: b }) {
  const emoji = COLOR_EMOJI[b.color] || '🍷'
  const year = new Date().getFullYear()
  const inWindow = b.drinkFrom && b.drinkUntil && year >= b.drinkFrom && year <= b.drinkUntil

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Color strip */}
      <div className={`h-1.5 ${
        b.color === 'rot' ? 'bg-red-500' :
        b.color === 'weiß' ? 'bg-amber-300' :
        b.color === 'rosé' ? 'bg-pink-300' :
        b.color === 'schaum' ? 'bg-yellow-400' : 'bg-gray-300'
      }`} />

      <div className="p-4">
        {/* Title row */}
        <div className="flex items-start gap-3">
          <span className="text-3xl flex-none">{emoji}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{b.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {[b.winery, b.vintage].filter(Boolean).join(' · ')}
            </p>
            {(b.region || b.country) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {[b.region, b.country].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          {b.rating > 0 && (
            <div className="flex-none text-right">
              <p className="text-amber-500 text-sm tracking-tight">{STARS(b.rating)}</p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {b.grape && (
            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">🍇 {b.grape}</span>
          )}
          {b.drinkFrom && b.drinkUntil && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              inWindow ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {inWindow ? '✓ ' : ''}Trinkfenster {b.drinkFrom}–{b.drinkUntil}
            </span>
          )}
          {b.priceEur && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              ca. {b.priceEur} €
            </span>
          )}
        </div>

        {/* Aromas */}
        {b.aromas?.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {b.aromas.map((a, i) => (
              <span key={i} className="text-[11px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded">
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Tasting notes */}
        {b.tastingNotes && (
          <p className="mt-3 text-sm text-gray-600 italic border-l-2 border-gray-200 pl-3">
            {b.tastingNotes}
          </p>
        )}

        {/* Personal note */}
        {b.note && (
          <p className="mt-2 text-sm text-gray-500">
            💬 {b.note}
          </p>
        )}
      </div>
    </div>
  )
}
