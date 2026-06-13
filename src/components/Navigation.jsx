const MODULES = [
  { id: 'dashboard', label: 'Start',   emoji: '🏠', addLabel: null },
  { id: 'spices',    label: 'Gewürze', emoji: '🌿', addLabel: 'Gewürz hinzufügen' },
  { id: 'freezer',   label: 'TK',      emoji: '❄️', addLabel: 'TK-Eintrag' },
  { id: 'cellar',    label: 'Wein',    emoji: '🍷', addLabel: 'Flasche' },
  { id: 'recipes',   label: 'Kochen',  emoji: '📖', addLabel: 'Rezept' },
  { id: 'shopping',  label: 'Einkauf', emoji: '🛒', addLabel: null },
]

export default function Navigation({ currentModule, onModuleChange, onAdd }) {
  const active = MODULES.find(m => m.id === currentModule) || MODULES[0]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30 pb-safe">
      <div className="flex items-center">
        {MODULES.map(m => (
          <ModItem key={m.id} m={m} active={currentModule === m.id} onClick={() => onModuleChange(m.id)} />
        ))}
      </div>
    </nav>
  )
}

function ModItem({ m, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
        active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
      }`}
    >
      <span className="text-xl leading-none">{m.emoji}</span>
      <span className="text-[10px] font-semibold">{m.label}</span>
    </button>
  )
}
