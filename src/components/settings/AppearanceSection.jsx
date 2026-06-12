import useStore from '../../store/useStore'

// ── Darstellung (Dark Mode) ───────────────────────────────────────────────────

function AppearanceSection() {
  const { theme, setTheme } = useStore()
  const options = [
    { id: 'system', label: 'System', emoji: '⚙️' },
    { id: 'light',  label: 'Hell',   emoji: '☀️' },
    { id: 'dark',   label: 'Dunkel', emoji: '🌙' },
  ]
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-gray-100">Darstellung</h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {options.map(o => (
          <button
            key={o.id}
            onClick={() => setTheme(o.id)}
            className={`rounded-2xl py-3 flex flex-col items-center gap-1 border-2 transition-all ${
              theme === o.id
                ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
            }`}
          >
            <span className="text-xl">{o.emoji}</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}


export default AppearanceSection
