import { useState } from 'react'
import { APP_VERSION } from '../../changelog'
import useStore from '../../store/useStore'

export default function FeedbackSection() {
  const user = useStore(s => s.user)
  const [type, setType] = useState('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/.netlify/functions/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          userEmail: user?.email || '',
          appVersion: APP_VERSION,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data.ok) throw new Error(data.error || 'Fehler beim Senden')
      setDone(true)
      setTitle('')
      setDescription('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="text-3xl mb-2">🎉</div>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Danke für dein Feedback!</p>
        <p className="text-xs text-gray-500 mt-1">Wir schauen uns das an.</p>
        <button
          onClick={() => setDone(false)}
          className="mt-3 text-xs text-primary-600 hover:text-primary-700 underline"
        >
          Weiteres Feedback senden
        </button>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Feedback
      </h3>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('bug')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              type === 'bug'
                ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 ring-1 ring-red-300 dark:ring-red-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            🐛 Bug melden
          </button>
          <button
            type="button"
            onClick={() => setType('feature')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              type === 'feature'
                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 ring-1 ring-primary-300 dark:ring-primary-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            💡 Idee / Wunsch
          </button>
        </div>

        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={type === 'bug' ? 'Was funktioniert nicht?' : 'Was wünschst du dir?'}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
          required
        />

        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Details (optional)"
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
        />

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={sending || !title.trim()}
          className="w-full py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {sending ? 'Wird gesendet…' : 'Absenden'}
        </button>
      </form>
    </div>
  )
}
