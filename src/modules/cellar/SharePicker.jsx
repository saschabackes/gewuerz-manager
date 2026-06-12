import { useState } from 'react'
import { useCellar } from './store'
import { encodeShareData } from './shareCodec'
import { APP_URL } from '../../branding'

const COLOR_EMOJI = { rot: '🍷', weiß: '🥂', rosé: '🌸', schaum: '🍾' }

export default function SharePicker({ onClose, preselected }) {
  const { bottles } = useCellar()
  const inStock = bottles.filter(b => b.count > 0)

  const [selected, setSelected] = useState(() => {
    if (preselected) return new Set([preselected])
    return new Set()
  })
  const [senderName, setSenderName] = useState('')
  const [message, setMessage] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  function toggle(id) {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else if (next.size < 5) next.add(id)
      return next
    })
    setShareUrl('')
  }

  function generate() {
    const picks = inStock.filter(b => selected.has(b.id))
    const meta = {}
    if (senderName.trim()) meta.sn = senderName.trim()
    if (message.trim()) meta.msg = message.trim()
    const encoded = encodeShareData(picks, meta)
    const url = `${APP_URL}/#share=${encoded}`
    setShareUrl(url)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      prompt('Link kopieren:', shareUrl)
    }
  }

  async function nativeShare() {
    const picks = inStock.filter(b => selected.has(b.id))
    const names = picks.map(b => `${b.name} ${b.vintage}`).join(', ')
    try {
      await navigator.share({
        title: 'Wein-Empfehlung',
        text: `${senderName || 'Ich'} empfiehlt: ${names}`,
        url: shareUrl,
      })
    } catch {}
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[55]" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-10 z-[60] bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl flex flex-col">
        <div className="flex justify-center pt-3"><div className="w-10 h-1.5 rounded-full bg-gray-200" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">🔗 Weine empfehlen</h2>
          <button onClick={onClose} className="p-2 text-gray-500">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!shareUrl ? (
            <div className="space-y-4">
              <div>
                <label className="label">Dein Name (optional)</label>
                <input className="input text-sm" placeholder="z.B. Sascha"
                  value={senderName} onChange={e => setSenderName(e.target.value)} />
              </div>
              <div>
                <label className="label">Persönliche Nachricht (optional)</label>
                <textarea className="input text-sm" rows={2} placeholder="z.B. Probier mal den Barolo — perfekt zum Sonntagsbraten!"
                  value={message} onChange={e => setMessage(e.target.value)} />
              </div>

              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2">
                  Weine auswählen <span className="text-gray-400 font-normal">({selected.size}/5)</span>
                </p>
                <div className="space-y-1.5">
                  {inStock.map(b => {
                    const active = selected.has(b.id)
                    return (
                      <button key={b.id} onClick={() => toggle(b.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                          active
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500'
                            : 'bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}>
                        <span className="text-xl flex-none">{COLOR_EMOJI[b.color] || '🍷'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{b.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {[b.winery, b.vintage, b.region].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        {b.rating > 0 && (
                          <span className="text-xs text-amber-500 flex-none">{'★'.repeat(b.rating)}</span>
                        )}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-none ${
                          active ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                        }`}>
                          {active && <span className="text-white text-xs">✓</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {inStock.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Keine Flaschen im Bestand.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center py-6">
              <p className="text-5xl">🎉</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Link erstellt!</h3>
              <p className="text-sm text-gray-500">
                Der Empfänger kann die Empfehlung ohne Account ansehen.
              </p>
              <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3 break-all text-xs text-gray-600 dark:text-gray-300 text-left font-mono">
                {shareUrl}
              </div>
              <div className="flex gap-2">
                <button onClick={copyLink}
                  className="btn-primary flex-1 py-2.5" style={{ backgroundColor: '#0D7377' }}>
                  {copied ? '✓ Kopiert!' : '📋 Link kopieren'}
                </button>
                {typeof navigator.share === 'function' && (
                  <button onClick={nativeShare}
                    className="btn-secondary flex-1 py-2.5">
                    📤 Teilen
                  </button>
                )}
              </div>
              <button onClick={() => setShareUrl('')}
                className="text-xs text-gray-400 hover:text-gray-600">← Auswahl ändern</button>
            </div>
          )}
        </div>

        {!shareUrl && (
          <div className="border-t dark:border-gray-700 px-5 py-3 flex gap-2">
            <button onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={generate} disabled={selected.size === 0}
              className="btn-primary flex-1 disabled:opacity-40" style={{ backgroundColor: '#0D7377' }}>
              Link erstellen ({selected.size})
            </button>
          </div>
        )}
      </div>
    </>
  )
}
