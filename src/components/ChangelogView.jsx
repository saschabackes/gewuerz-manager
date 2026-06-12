import { useEffect } from 'react'
import { CHANGELOG, markChangelogSeen } from '../changelog'
import { APP_NAME } from '../branding'

const TYPE_BADGES = {
  new:      { label: 'Neu',        cls: 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' },
  improved: { label: 'Verbessert', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  fixed:    { label: 'Behoben',    cls: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ChangelogView({ onClose }) {
  // Öffnen gilt als „gesehen" → Hinweispunkt am Zahnrad verschwindet
  useEffect(() => { markChangelogSeen() }, [])

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 fade-enter" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl sheet-enter max-h-[85vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">✨ Was ist neu?</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-safe">
          {CHANGELOG.map((release, i) => (
            <div key={release.version}>
              <div className="flex items-baseline gap-2 mb-2.5">
                <h3 className="font-bold text-gray-900 dark:text-gray-100">
                  Version {release.version}
                </h3>
                {i === 0 && (
                  <span className="text-[10px] bg-primary-600 text-white font-bold rounded-full px-2 py-0.5">aktuell</span>
                )}
                <span className="text-xs text-gray-400 ml-auto">{fmtDate(release.date)}</span>
              </div>
              <ul className="space-y-2">
                {release.entries.map((e, j) => {
                  const badge = TYPE_BADGES[e.type] ?? TYPE_BADGES.new
                  return (
                    <li key={j} className="flex items-start gap-2">
                      <span className={`flex-none text-[10px] font-semibold rounded-full px-2 py-0.5 mt-0.5 w-[72px] text-center ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{e.text}</span>
                    </li>
                  )
                })}
              </ul>
              {i < CHANGELOG.length - 1 && (
                <div className="border-t border-gray-100 dark:border-gray-700 mt-5" />
              )}
            </div>
          ))}
          <p className="text-xs text-gray-400 text-center pb-4">{APP_NAME} · Danke, dass du dabei bist 💚</p>
        </div>
      </div>
    </>
  )
}
