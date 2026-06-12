import { useState, useRef, useEffect } from 'react'
import { useFreezer, parseVoiceInput, autoCategory } from './store'

// Häufigkeit aus aktuellem Bestand + recentNames ableiten
function suggestions(items, recentNames) {
  const counts = new Map()
  items.forEach(it => counts.set(it.name, (counts.get(it.name) || 0) + 1))
  recentNames.forEach((n, i) => {
    if (!counts.has(n)) counts.set(n, 0.5 - i / 100) // jüngere zuerst
  })
  return [...counts.entries()].sort((a,b) => b[1] - a[1]).slice(0, 10).map(([n]) => n)
}

export default function QuickAddBar() {
  const items = useFreezer(s => s.items)
  const recentNames = useFreezer(s => s.recentNames)
  const storages = useFreezer(s => s.storages)
  const lastUsed = useFreezer(s => s.lastUsedCompartment)
  const quickAddByName = useFreezer(s => s.quickAddByName)
  const addItem = useFreezer(s => s.addItem)
  const [text, setText] = useState('')
  const [hint, setHint] = useState('')
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)

  const chips = suggestions(items, recentNames)
  const lastStorage = storages.find(s => s.id === lastUsed?.storageId)
  const lastComp = lastStorage?.compartments.find(c => c.id === lastUsed?.compartmentId)
  const lastLabel = lastStorage ? `${lastStorage.emoji} ${lastComp?.label || lastStorage.label}` : 'Default-Schublade'

  function quickByText() {
    const t = text.trim()
    if (!t) return
    // Erst Voice-Parser probieren (verstehen wir Lokationsangaben?)
    const parsed = parseVoiceInput(t, storages)
    if (parsed && (parsed.storageId || parsed.portions > 1)) {
      addItem({
        name: parsed.name,
        category: autoCategory(parsed.name),
        portions: parsed.portions,
        storageId: parsed.storageId || lastUsed?.storageId || storages[0]?.id,
        compartmentId: parsed.compartmentId || lastUsed?.compartmentId || storages[0]?.compartments[0]?.id,
      })
      setHint(`✓ ${parsed.portions}× ${parsed.name} eingelegt`)
    } else {
      quickAddByName(t)
      setHint(`✓ ${t} → ${lastLabel}`)
    }
    setText('')
    setTimeout(() => setHint(''), 2500)
  }

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setHint('Sprache wird in diesem Browser nicht unterstützt'); setTimeout(()=>setHint(''),2500); return }
    const rec = new SR()
    rec.lang = 'de-DE'; rec.interimResults = false; rec.maxAlternatives = 1
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setText(transcript)
      setListening(false)
    }
    rec.onerror = () => { setListening(false); setHint('Sprache nicht verstanden'); setTimeout(()=>setHint(''),2500) }
    rec.onend   = () => setListening(false)
    rec.start()
    recRef.current = rec
    setListening(true)
  }
  useEffect(() => () => recRef.current?.abort?.(), [])

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-3 py-2.5 space-y-2">
      <div className="flex gap-2 items-center">
        <input
          className="flex-1 input py-2 text-sm"
          placeholder='z.B. „2 Lasagne in Keller Korb 2"'
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') quickByText() }}
        />
        <button onClick={startVoice}
          className={`flex-none w-10 h-10 rounded-full text-white text-lg transition-colors ${listening ? 'bg-red-500 animate-pulse' : 'bg-primary-600'}`}
          title="Sprache">🎙️</button>
        <button onClick={quickByText} disabled={!text.trim()}
          className="flex-none px-3 h-10 rounded-full bg-primary-600 text-white text-sm font-semibold disabled:opacity-40">
          ＋
        </button>
      </div>

      {chips.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          <span className="flex-none text-[10px] text-gray-400 font-bold self-center pr-1">HÄUFIG:</span>
          {chips.map(name => (
            <button key={name}
              onClick={() => { quickAddByName(name); setHint(`✓ +1 ${name} → ${lastLabel}`); setTimeout(()=>setHint(''),2000) }}
              className="flex-none text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-semibold px-2.5 py-1 rounded-full active:scale-95"
            >+ {name}</button>
          ))}
        </div>
      )}

      {hint && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{hint}</p>}
      <p className="text-[10px] text-gray-400">
        Quick-Add legt in {lastLabel} ab · 🎙️ versteht „3 Lasagne Keller Korb 2"
      </p>
    </div>
  )
}
