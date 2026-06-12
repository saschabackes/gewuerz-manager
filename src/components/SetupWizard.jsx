import { useState } from 'react'

export default function SetupWizard({ module, steps, onComplete, onSkip }) {
  const [stepIdx, setStepIdx] = useState(0)
  const current = steps[stepIdx]
  const isLast = stepIdx === steps.length - 1

  return (
    <div className="fixed inset-0 z-[70] bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 flex flex-col">
      {/* Progress */}
      <div className="px-5 pt-5 pb-2 flex items-center gap-3">
        <div className="flex-1 flex gap-1">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
              i <= stepIdx ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
            }`} />
          ))}
        </div>
        <button onClick={onSkip}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium">
          Überspringen
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6">
            <p className="text-4xl mb-3">{current.emoji}</p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{current.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{current.subtitle}</p>
          </div>
          {current.content}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
        {stepIdx > 0 && (
          <button onClick={() => setStepIdx(s => s - 1)}
            className="btn-secondary flex-1">Zurück</button>
        )}
        <button
          onClick={() => isLast ? onComplete() : setStepIdx(s => s + 1)}
          className="btn-primary flex-1" style={{ backgroundColor: '#0D7377' }}>
          {isLast ? '✓ Fertig' : 'Weiter'}
        </button>
      </div>
    </div>
  )
}
