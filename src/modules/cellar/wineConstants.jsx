import { useState } from 'react'

export const WINE_COUNTRIES_TOP = [
  { code: 'DE', flag: '🇩🇪', label: 'Deutschland' },
  { code: 'FR', flag: '🇫🇷', label: 'Frankreich' },
  { code: 'IT', flag: '🇮🇹', label: 'Italien' },
  { code: 'ES', flag: '🇪🇸', label: 'Spanien' },
  { code: 'AT', flag: '🇦🇹', label: 'Österreich' },
]
export const WINE_COUNTRIES_MORE = [
  { code: 'AR', flag: '🇦🇷', label: 'Argentinien' },
  { code: 'AU', flag: '🇦🇺', label: 'Australien' },
  { code: 'BR', flag: '🇧🇷', label: 'Brasilien' },
  { code: 'BG', flag: '🇧🇬', label: 'Bulgarien' },
  { code: 'CL', flag: '🇨🇱', label: 'Chile' },
  { code: 'GR', flag: '🇬🇷', label: 'Griechenland' },
  { code: 'HR', flag: '🇭🇷', label: 'Kroatien' },
  { code: 'LB', flag: '🇱🇧', label: 'Libanon' },
  { code: 'LU', flag: '🇱🇺', label: 'Luxemburg' },
  { code: 'MX', flag: '🇲🇽', label: 'Mexiko' },
  { code: 'MD', flag: '🇲🇩', label: 'Moldau' },
  { code: 'NZ', flag: '🇳🇿', label: 'Neuseeland' },
  { code: 'PT', flag: '🇵🇹', label: 'Portugal' },
  { code: 'RO', flag: '🇷🇴', label: 'Rumänien' },
  { code: 'CH', flag: '🇨🇭', label: 'Schweiz' },
  { code: 'RS', flag: '🇷🇸', label: 'Serbien' },
  { code: 'SI', flag: '🇸🇮', label: 'Slowenien' },
  { code: 'ZA', flag: '🇿🇦', label: 'Südafrika' },
  { code: 'TR', flag: '🇹🇷', label: 'Türkei' },
  { code: 'HU', flag: '🇭🇺', label: 'Ungarn' },
  { code: 'US', flag: '🇺🇸', label: 'USA' },
  { code: 'UY', flag: '🇺🇾', label: 'Uruguay' },
  { code: 'GE', flag: '🇬🇪', label: 'Georgien' },
]

export function isSparkling(color, wineType) {
  return color === 'schaum' || wineType === 'sekt'
}

export function CountryPicker({ value, onChange }) {
  const isInMore = WINE_COUNTRIES_MORE.some(c => c.label === value)
  const [showMore, setShowMore] = useState(isInMore)

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5 flex-wrap">
        {WINE_COUNTRIES_TOP.map(c => (
          <button key={c.code} type="button"
            onClick={() => onChange(value === c.label ? '' : c.label)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold ${
              value === c.label ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>{c.flag} {c.label}</button>
        ))}
        <button type="button" onClick={() => setShowMore(o => !o)}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold ${
            showMore ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>{showMore ? '▾ Weniger' : '▸ Weitere'}</button>
      </div>
      {showMore && (
        <div className="flex gap-1.5 flex-wrap">
          {WINE_COUNTRIES_MORE.map(c => (
            <button key={c.code} type="button"
              onClick={() => onChange(value === c.label ? '' : c.label)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold ${
                value === c.label ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>{c.flag} {c.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}
