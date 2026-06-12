import { useState } from 'react'
import useStore from '../../store/useStore'
import { MODULES_ENABLED, APP_NAME, APP_URL } from '../../branding'

// ── Einladung verschicken ─────────────────────────────────────────────────────

function InviteSection() {
  const { household, currentUser } = useStore()
  const [mode, setMode]               = useState('household')  // 'household' | 'friend'
  const [personalMsg, setPersonalMsg] = useState('')
  const [copied, setCopied]           = useState(false)
  const [shared, setShared]           = useState(false)

  const displayCode = household?.inviteCode
    ? `${household.inviteCode.slice(0, 4)}-${household.inviteCode.slice(4)}`
    : '——'
  const senderName = currentUser()?.name ?? 'Jemand'
  const houseName  = household?.name ?? 'unserem Haushalt'

  function buildMessage() {
    const p = personalMsg.trim() ? `${personalMsg.trim()}\n\n` : ''
    if (mode === 'household') {
      return `Hey!\n\n${p}${senderName} lädt dich ein, unsere Vorräte gemeinsam zu verwalten.\n\nWir nutzen dafür ${APP_NAME} – eine App die uns hilft den Überblick zu behalten:\n• Welche Gewürze haben wir, wie viel ist noch da?\n• Wo ist was gelagert?\n• Was müssen wir nachkaufen?\n\nSo trittst du „${houseName}" bei:\n1. App öffnen → ${APP_URL}\n2. Konto erstellen\n3. „Anderem Haushalt beitreten" wählen\n4. Einladungscode eingeben: ${displayCode}\n\nBis gleich! 👋`
    }
    return `Hey!\n\n${p}Kennst du ${APP_NAME}? Eine kostenlose App um Gewürze${MODULES_ENABLED ? ', Tiefkühl-Vorräte und Weine' : ''} im Griff zu behalten.\n\nWas du damit machen kannst:\n• Vorräte mit Foto, Menge & Lagerort erfassen\n• Ablaufdaten & Füllstand im Blick behalten\n• Einkaufsliste – optional mit Bring!-Anbindung\n• Haushalt mit Familie teilen (wenn du magst)\n\nEinfach kostenlos registrieren:\n${APP_URL}\n\nViel Spaß! 👋`
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ text: buildMessage() })
        .then(() => { setShared(true); setTimeout(() => setShared(false), 2500) })
    } else {
      handleCopy()
    }
  }

  function handleCopy() {
    navigator.clipboard?.writeText(buildMessage()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="font-bold text-gray-800 dark:text-gray-100">Einladen</h3>
      </div>

      {/* Modus-Auswahl */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setMode('household')}
          className={`rounded-2xl p-3 text-left border-2 transition-all ${
            mode === 'household' ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
          }`}
        >
          <div className="text-lg mb-0.5">🏠</div>
          <div className="font-semibold text-sm text-gray-800 dark:text-gray-100">Familie / Mitbewohner</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">Gemeinsame Gewürzsammlung verwalten</div>
        </button>
        <button
          onClick={() => setMode('friend')}
          className={`rounded-2xl p-3 text-left border-2 transition-all ${
            mode === 'friend' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
          }`}
        >
          <div className="text-lg mb-0.5">👤</div>
          <div className="font-semibold text-sm text-gray-800 dark:text-gray-100">Freunde</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">Eigene Sammlung – unabhängig von dir</div>
        </button>
      </div>

      {/* Hinweis je nach Modus */}
      <div className={`text-xs rounded-xl px-3 py-2 mb-3 ${
        mode === 'household' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      }`}>
        {mode === 'household'
          ? `Einladungscode ${displayCode} wird automatisch eingefügt. Dein Kontakt tritt „${houseName}" bei.`
          : 'Kein Einladungscode – dein Freund erstellt seinen eigenen Haushalt.'
        }
      </div>

      {/* Persönliche Nachricht */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block">
          Persönliche Nachricht (optional)
        </label>
        <textarea
          className="input resize-none text-sm"
          rows={2}
          placeholder={mode === 'household'
            ? 'z.B. Hey Lisa, damit verwalten wir ab jetzt unsere Gewürze…'
            : 'z.B. Hey Max, ich nutze das schon eine Weile und finds super…'
          }
          value={personalMsg}
          onChange={e => setPersonalMsg(e.target.value)}
        />
      </div>

      {/* Vorschau */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Vorschau</p>
        <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{buildMessage()}</pre>
      </div>

      {/* Aktionen */}
      <div className="flex gap-2">
        <button onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white rounded-2xl py-3 text-sm font-semibold hover:bg-green-700 transition-colors">
          {shared
            ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>Geteilt!</>
            : <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeLinecap="round" strokeLinejoin="round"/></svg>Teilen</>
          }
        </button>
        <button onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-2xl py-3 text-sm font-semibold hover:bg-gray-200 transition-colors">
          {copied
            ? <><svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg><span className="text-green-600 dark:text-green-400">Kopiert!</span></>
            : <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>Kopieren</>
          }
        </button>
      </div>
    </div>
  )
}


export default InviteSection
