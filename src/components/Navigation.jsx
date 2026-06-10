// Konsistente Bottom-Navigation: Module statt Sub-Tabs.
// Die Sub-Tabs eines Moduls werden im Content-Bereich oben angezeigt.

const MODULES = [
  { id: 'spices',   label: 'Gewürze', emoji: '🌿', addLabel: 'Gewürz hinzufügen' },
  { id: 'freezer',  label: 'TK',      emoji: '❄️', addLabel: 'TK-Eintrag' },
  { id: 'cellar',   label: 'Wein',    emoji: '🍷', addLabel: 'Flasche' },
  { id: 'shopping', label: 'Einkauf', emoji: '🛒', addLabel: null },
]

export default function Navigation({ currentModule, onModuleChange, onAdd }) {
  const left  = MODULES.slice(0, 2)
  const right = MODULES.slice(2)
  const active = MODULES.find(m => m.id === currentModule) || MODULES[0]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30 pb-safe">
      <div className="flex items-center">
        {left.map(m => (
          <ModItem key={m.id} m={m} active={currentModule === m.id} onClick={() => onModuleChange(m.id)} />
        ))}

        {/* Center add */}
        <div className="flex-none px-4">
          <button
            onClick={() => active.addLabel && onAdd(active.id)}
            disabled={!active.addLabel}
            className={`rounded-full w-14 h-14 flex items-center justify-center shadow-lg -mt-5 border-4 border-white dark:border-gray-800 text-white transition-colors disabled:opacity-30
              ${active.id === 'spices'   ? 'bg-green-600 active:bg-green-700'
              : active.id === 'freezer'  ? 'bg-sky-600 active:bg-sky-700'
              : active.id === 'cellar'   ? 'bg-rose-600 active:bg-rose-700'
              :                            'bg-emerald-600 active:bg-emerald-700'}`}
            aria-label={active.addLabel || ''}
            title={active.addLabel || ''}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {right.map(m => (
          <ModItem key={m.id} m={m} active={currentModule === m.id} onClick={() => onModuleChange(m.id)} />
        ))}
      </div>
    </nav>
  )
}

function ModItem({ m, active, onClick }) {
  const activeColor =
    m.id === 'spices'   ? 'text-green-600 dark:text-green-400'
    : m.id === 'freezer' ? 'text-sky-600 dark:text-sky-400'
    : m.id === 'cellar'  ? 'text-rose-600 dark:text-rose-400'
    :                      'text-emerald-600 dark:text-emerald-400'
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
        active ? activeColor : 'text-gray-400'
      }`}
    >
      <span className="text-xl leading-none">{m.emoji}</span>
      <span className="text-[10px] font-semibold">{m.label}</span>
    </button>
  )
}
