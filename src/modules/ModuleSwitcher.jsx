import { MODULES } from './registry'

// Segmentierter Switch oben unter dem Header.
// Klickbar zwischen 🌿 Gewürze | ❄️ Tiefkühl | 🍷 Keller
export default function ModuleSwitcher({ current, onChange }) {
  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-3 py-2 sticky top-0 z-20">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {MODULES.map(m => {
          const active = current === m.id
          return (
            <button
              key={m.id}
              onClick={() => onChange(m.id)}
              className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                active
                  ? `bg-${m.color}-600 text-white shadow-sm`
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300'
              }`}
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
              {m.isCore && !active && (
                <span className="text-[9px] uppercase opacity-50">aktiv</span>
              )}
              {!m.isCore && !active && (
                <span className="text-[9px] uppercase opacity-60">beta</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
