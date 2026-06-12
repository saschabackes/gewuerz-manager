export default function SubTabs({ tabs, active, onChange, trailing }) {
  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-3 py-2 sticky top-0 z-20">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar items-center">
        {tabs.map(t => (
          <button key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-none px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
              active === t.id ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-300'
            }`}
          >{t.label}</button>
        ))}
        {trailing && <div className="ml-auto flex-none">{trailing}</div>}
      </div>
    </div>
  )
}
