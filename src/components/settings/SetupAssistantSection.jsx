import useStore from '../../store/useStore'
import { useFreezer } from '../../modules/freezer/store'
import { useCellar } from '../../modules/cellar/store'

// ── Setup-Assistenten neu starten ────────────────────────────────────────────

function SetupAssistantSection({ onClose }) {
  const { restartSpiceSetup } = useStore()
  const restartFreezer = useFreezer(s => s.restartSetup)
  const restartCellar = useCellar(s => s.restartSetup)

  const modules = [
    { label: '🌿 Gewürze', restart: restartSpiceSetup },
    { label: '❄️ Tiefkühl', restart: restartFreezer },
    { label: '🍷 Weinkeller', restart: restartCellar },
  ]

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center text-sm">🧙</div>
        <h3 className="font-bold text-gray-800 dark:text-gray-100">Setup-Assistenten</h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Starte den Einrichtungsassistenten für ein Modul erneut, um Lagerorte und Einstellungen anzupassen.
      </p>
      <div className="space-y-2">
        {modules.map(m => (
          <button key={m.label} onClick={() => { if (confirm(`Setup-Assistent für ${m.label.slice(3)} neu starten?`)) { m.restart(); onClose() } }}
            className="w-full flex items-center justify-between bg-gray-50 dark:bg-gray-900/40 rounded-xl px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <span>{m.label}</span>
            <span className="text-xs text-primary-600 dark:text-primary-400 font-semibold">Neu starten ↺</span>
          </button>
        ))}
      </div>
    </div>
  )
}


export default SetupAssistantSection
