import useStore from '../store/useStore'
import FillBar, { FILL_LABELS } from './FillBar'

export default function InventoryReviewView({ onClose, onNewPackage }) {
  const { pendingInventory, spices, updateFillLevel, resolvePending } = useStore()
  const ready = pendingInventory.filter(p => p.status === 'ready')

  // passende Gläser im Bestand (gleicher Name)
  function matchingJars(name) {
    const n = name.toLowerCase().trim()
    return spices.filter(s => s.name.toLowerCase().trim() === n)
  }

  function refillExisting(item) {
    const jars = matchingJars(item.name)
    if (jars.length === 0) return
    // leerstes Glas auf voll setzen
    const emptiest = [...jars].sort((a, b) => (a.fillLevel ?? 4) - (b.fillLevel ?? 4))[0]
    updateFillLevel(emptiest.id, 4)
    resolvePending(item.id)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-enter" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl sheet-enter max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="text-xl">📥</span> Einräumen
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 pb-safe">
          {ready.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">Alles eingeräumt</h3>
              <p className="text-sm text-gray-400">
                Hier landen eingekaufte Gewürze, die noch ins Inventar müssen.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Diese Gewürze wurden von der Einkaufsliste abgehakt. Eingekauft? Dann einräumen.
              </p>
              <div className="space-y-3">
                {ready.map(item => {
                  const jars = matchingJars(item.name)
                  const exists = jars.length > 0
                  return (
                    <div key={item.id} className="card p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-gray-100">{item.name}</h3>
                          {item.brand && <span className="text-xs text-gray-400">{item.brand}</span>}
                          {exists && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {jars.length} Glas{jars.length !== 1 ? 'er' : ''} bereits im Bestand
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => resolvePending(item.id)}
                          className="text-xs text-gray-400 hover:text-red-500 flex-none px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="Doch nicht gekauft"
                        >
                          ✕ nicht gekauft
                        </button>
                      </div>

                      {exists ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => refillExisting(item)}
                            className="flex items-center justify-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 rounded-xl px-3 py-2.5 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                          >
                            <FillBar level={4} /> Auffüllen
                          </button>
                          <button
                            onClick={() => onNewPackage(item)}
                            className="flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2.5 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            + Neue Packung
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onNewPackage(item)}
                          className="btn-primary w-full py-2.5 text-sm"
                        >
                          Einräumen (neues Gewürz anlegen)
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
