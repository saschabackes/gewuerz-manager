// Füllstand-Anzeige (Signalbalken-Stil, 4 Segmente, Höhe steigt)
// level: 0 = fast leer, 1 = wenig, 2 = halb, 3 = gut, 4 = voll

export const FILL_LABELS = ['Fast leer', 'Wenig', 'Halb', 'Gut', 'Voll']

const FILL_COLORS = [
  'bg-red-500',    // 0
  'bg-orange-400', // 1
  'bg-yellow-400', // 2
  'bg-green-400',  // 3
  'bg-green-500',  // 4
]

export default function FillBar({ level = 4 }) {
  const lvl   = Math.max(0, Math.min(4, level ?? 4))
  const color = FILL_COLORS[lvl]

  return (
    <div className="flex gap-0.5 items-end" style={{ height: 16 }}>
      {[1, 2, 3, 4].map(i => {
        // Level 0: nur der erste (kleinste) Balken rot-blinkend
        const filled = lvl === 0 ? i === 1 : i <= lvl
        return (
          <div
            key={i}
            className={`w-1.5 rounded-sm transition-all ${
              filled ? color : 'bg-gray-200'
            } ${lvl === 0 && i === 1 ? 'animate-pulse' : ''}`}
            style={{ height: i * 4 }}
          />
        )
      })}
    </div>
  )
}
