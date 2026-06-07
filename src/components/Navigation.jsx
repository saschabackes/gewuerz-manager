export default function Navigation({ current, onChange, onAdd }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30 pb-safe">
      <div className="flex items-center">
        <NavItem
          icon={<SpicesIcon />}
          label="Vorräte"
          active={current === 'spices'}
          onClick={() => onChange('spices')}
        />
        <NavItem
          icon={<CalendarIcon />}
          label="MHD"
          active={current === 'mhd'}
          onClick={() => onChange('mhd')}
        />
        {/* Center add button */}
        <div className="flex-none px-4">
          <button
            onClick={onAdd}
            className="bg-green-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg
                       active:bg-green-700 transition-colors -mt-5 border-4 border-white"
            aria-label="Gewürz hinzufügen"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <NavItem
          icon={<ShoppingIcon />}
          label="Einkauf"
          active={current === 'shopping'}
          onClick={() => onChange('shopping')}
        />
        <NavItem
          icon={<RecipeIcon />}
          label="Rezepte"
          active={current === 'recipes'}
          onClick={() => onChange('recipes')}
        />
      </div>
    </nav>
  )
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
        active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
      }`}
    >
      <span className={`w-6 h-6 ${active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>{icon}</span>
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  )
}

function SpicesIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12h6M9 16h4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeLinecap="round"/>
    </svg>
  )
}

function ShoppingIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function RecipeIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M12 6.5C12 5 10.5 4 8.5 4S4 5 4 6.5v12C4 17 5.5 16 8.5 16s3.5 1 3.5 2.5m0-12C12 5 13.5 4 15.5 4S20 5 20 6.5v12C20 17 18.5 16 15.5 16S12 17 12 18.5m0-12v12" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
