import { useState } from 'react'

export default function SelectionBar({ count, onDelete, onCancel, label = 'Löschen' }) {
  const [confirming, setConfirming] = useState(false)

  if (!count) return null

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full shadow-xl px-5 py-2.5 flex items-center gap-3 text-sm font-medium">
      <span>{count} ausgewählt</span>
      {confirming ? (
        <>
          <button onClick={() => { onDelete(); setConfirming(false) }}
            className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">
            Ja, {label.toLowerCase()}
          </button>
          <button onClick={() => setConfirming(false)}
            className="text-gray-300 dark:text-gray-500 px-2 py-1 text-xs">
            Abbrechen
          </button>
        </>
      ) : (
        <>
          <button onClick={() => setConfirming(true)}
            className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">
            {label}
          </button>
          <button onClick={onCancel}
            className="text-gray-300 dark:text-gray-500 px-2 py-1 text-xs">
            ✕
          </button>
        </>
      )}
    </div>
  )
}

export function ClearAllButton({ onClear, label, count }) {
  const [confirming, setConfirming] = useState(false)

  if (!count) return null

  return confirming ? (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-red-600 font-medium">Alle {count} löschen?</span>
      <button onClick={() => { onClear(); setConfirming(false) }}
        className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">Ja</button>
      <button onClick={() => setConfirming(false)}
        className="text-gray-400 text-xs">Nein</button>
    </div>
  ) : (
    <button onClick={() => setConfirming(true)}
      className="text-xs text-red-500 hover:text-red-700 font-medium">
      {label}
    </button>
  )
}
