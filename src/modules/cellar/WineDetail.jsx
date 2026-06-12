import { useState } from 'react'
import { useCellar, drinkStatus, effectiveDrinkUntil, qualityScore, qualityLabel } from './store'
import { DISH_CATEGORIES, TASTE_AXES, AROMAS, dishById } from './pairing'
import { isSparkling, CountryPicker } from './wineConstants'

const COLOR_EMOJI = { rot: '🍷', weiß: '🥂', rosé: '🌸', schaum: '🍾' }
const COLOR_BG    = { rot: 'from-rose-900 to-rose-700', weiß: 'from-yellow-700 to-yellow-500', rosé: 'from-pink-500 to-pink-400', schaum: 'from-amber-600 to-amber-400' }
const COUNTRY_FLAG = {
  'Deutschland':'🇩🇪','Italien':'🇮🇹','Frankreich':'🇫🇷','Spanien':'🇪🇸','Portugal':'🇵🇹',
  'Österreich':'🇦🇹','Schweiz':'🇨🇭','USA':'🇺🇸','Argentinien':'🇦🇷','Chile':'🇨🇱',
  'Südafrika':'🇿🇦','Neuseeland':'🇳🇿','Australien':'🇦🇺','Griechenland':'🇬🇷','Ungarn':'🇭🇺',
}

export default function WineDetail({ bottle, onClose, onOpenPairing, onShare }) {
  const { racks, drinkOne, removeBottle, updateBottle, toggleRestock } = useCellar()
  const [showDrink, setShowDrink] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  if (!bottle) return null
  const rack = racks.find(r => r.id === bottle.rackId)
  const status = drinkStatus(bottle, rack)
  const effUntil = effectiveDrinkUntil(bottle, rack)
  const qScore = qualityScore(rack?.conditions)
  const ql = qualityLabel(qScore)
  const tp = bottle.tasteProfile || {}
  const drunken = bottle.history?.length || 0
  const flag = COUNTRY_FLAG[bottle.country] || ''

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto pb-20">
      {/* Hero */}
      <div className={`bg-gradient-to-br ${COLOR_BG[bottle.color] || 'from-rose-900 to-rose-700'} text-white relative`}>
        <button onClick={onClose}
          className="absolute top-4 left-4 z-10 bg-black/30 backdrop-blur rounded-full w-9 h-9 flex items-center justify-center text-lg">
          ←
        </button>
        <button onClick={() => setShowEdit(true)}
          className="absolute top-4 right-4 z-10 bg-black/30 backdrop-blur rounded-full w-9 h-9 flex items-center justify-center text-sm">
          ✎
        </button>

        <div className="flex items-center justify-center pt-12 pb-6">
          {bottle.photoData
            ? <img src={bottle.photoData} alt="" className="w-32 h-44 rounded-lg shadow-2xl object-cover ring-4 ring-white/20" />
            : <div className="w-32 h-44 rounded-lg bg-white/10 shadow-2xl flex items-center justify-center text-7xl ring-4 ring-white/20">
                {COLOR_EMOJI[bottle.color] || '🍷'}
              </div>}
        </div>

        <div className="px-6 pb-5 text-center">
          <h1 className="text-2xl font-bold drop-shadow-sm">{bottle.name}</h1>
          {bottle.winery && <p className="text-white/90 text-sm mt-0.5">{bottle.winery}</p>}
          <p className="text-white/80 text-xs mt-1">
            {bottle.vintage} · {bottle.color} · {bottle.alcohol || '—'}
            {bottle.sweetness && <span className="ml-1">· {bottle.sweetness}</span>}
            {bottle.classification && <span className="ml-1">· {bottle.classification}</span>}
            {bottle.wineType && bottle.wineType !== 'wein' && <span className="ml-1">· {bottle.wineType}</span>}
            {bottle.alcoholFree && <span className="ml-2 bg-emerald-500/90 text-white font-bold px-1.5 py-0.5 rounded text-[10px]">🚫 ALKOHOLFREI</span>}
          </p>
          <StarRow value={bottle.rating} onChange={r => updateBottle(bottle.id, { rating: r })} large />
        </div>
      </div>

      {/* Quick-Facts */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50">
        <Fact icon={flag || '🌍'} label="Region" value={`${bottle.region}${bottle.country ? `, ${bottle.country}` : ''}`} />
        <Fact icon="🍇" label="Rebsorte" value={bottle.grape || '—'} />
        <Fact icon="📅" label="Trinkfenster" value={`${bottle.drinkFrom}–${effUntil}`}
          sub={effUntil !== bottle.drinkUntil ? `nominal bis ${bottle.drinkUntil}` : status.label} />
        <Fact icon={rack?.emoji || '📦'} label={rack?.label || '—'} value={bottle.slot || '—'} sub={`${bottle.count}× Bestand · ${drunken}× getrunken`} />
      </div>

      {/* Trinkfenster-Status + Lagerqualität */}
      <div className={`mx-3 mt-3 rounded-xl p-2.5 text-center text-sm font-semibold ${status.cls}`}>
        {status.label}
      </div>
      {rack && (
        <div className="mx-3 mt-2 rounded-xl p-2.5 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-none ${ql.cls}`}>
            {qScore}/100 · {ql.label}
          </span>
          <div className="text-[11px] text-gray-500 dark:text-gray-300">
            <span className="font-semibold">{rack.emoji} {rack.label}</span>
            {effUntil !== bottle.drinkUntil && (
              <span> — Trinkfenster verkürzt auf {effUntil} (statt {bottle.drinkUntil})</span>
            )}
            {effUntil === bottle.drinkUntil && (
              <span> — optimale Lagerung, volles Trinkfenster</span>
            )}
          </div>
        </div>
      )}

      {/* Ausverkauft → Wiederkauf-CTA */}
      {bottle.count <= 0 && (
        <div className="mx-3 mt-3 rounded-xl p-3 bg-gray-100 dark:bg-gray-800/60 flex items-center gap-3">
          <span className="text-2xl">🍷</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-200">Ausgetrunken</p>
            <p className="text-[11px] text-gray-600 dark:text-gray-300">
              War {bottle.rating > 0 ? `mit ${bottle.rating} Sternen ` : ''}in deiner Sammlung. Wieder kaufen?
            </p>
          </div>
          <button onClick={() => toggleRestock(bottle.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
              bottle.restock ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
            }`}>
            {bottle.restock ? '✓ auf Einkaufsliste' : '🔄 Wieder kaufen'}
          </button>
        </div>
      )}

      {/* Geschmacksprofil */}
      <Section title="🎨 Geschmacksprofil">
        {TASTE_AXES
          .filter(ax => bottle.color !== 'weiß' || ax.key !== 'tannin') // Tannin nur bei Rot relevant
          .map(ax => (
            <AxisRow key={ax.key} axis={ax} value={tp[ax.key]} onChange={v => updateBottle(bottle.id, { tasteProfile: { ...tp, [ax.key]: v } })} />
          ))}
      </Section>

      {/* Aromen */}
      <Section title="👃 Aromen">
        {bottle.aromas?.length > 0
          ? <div className="flex flex-wrap gap-1.5">
              {bottle.aromas.map(a => (
                <span key={a} className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {a}
                </span>
              ))}
            </div>
          : <p className="text-xs text-gray-400 italic">Noch keine Aromen erfasst – ✎ oben rechts zum Bearbeiten</p>}
      </Section>

      {/* Pairings */}
      <Section title="🍽️ Passt zu" action={
        <button onClick={onOpenPairing}
          className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-1 rounded-full">
          🔄 Wein zu Gericht finden
        </button>
      }>
        <div className="flex flex-wrap gap-1.5">
          {(bottle.pairings || []).map(id => {
            const d = dishById(id); if (!d) return null
            return (
              <span key={id} className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                {d.emoji} {d.label}
              </span>
            )
          })}
          {(!bottle.pairings || bottle.pairings.length === 0) && (
            <p className="text-xs text-gray-400 italic">Keine Pairings hinterlegt – ✎ oben rechts</p>
          )}
        </div>
      </Section>

      {/* Notizen */}
      <Section title="📝 Tasting-Notizen">
        <textarea
          className="input text-sm resize-none"
          rows={3}
          placeholder="Wie war der Wein? Eindrücke, Tipps für nächstes Mal…"
          value={bottle.tastingNotes || ''}
          onChange={e => updateBottle(bottle.id, { tastingNotes: e.target.value })}
        />
      </Section>

      {/* History */}
      {drunken > 0 && (
        <Section title={`📒 Trink-Historie (${drunken})`}>
          <ul className="space-y-2">
            {[...bottle.history].reverse().map(h => (
              <li key={h.id} className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{h.date}</span>
                  {h.rating ? <span className="text-xs">{'⭐'.repeat(h.rating)}</span> : null}
                </div>
                {h.occasion && <p className="text-xs text-gray-500 dark:text-gray-300 mt-0.5"><b>Anlass:</b> {h.occasion}</p>}
                {h.note     && <p className="text-xs text-gray-500 dark:text-gray-300 mt-0.5 italic">{h.note}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Preis & Nachkauf */}
      <Section title="💶 Kauf & Nachkauf">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            {bottle.priceEur != null && <span className="text-sm text-gray-700 dark:text-gray-200">{bottle.priceEur.toFixed(2)} € pro Flasche</span>}
            {bottle.retailer && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">🏪 {bottle.retailer}</span>}
            {bottle.purchaseDate && <span className="text-xs text-gray-500">🗓️ {bottle.purchaseDate}</span>}
          </div>
          {bottle.link && (
            <a href={bottle.link} target="_blank" rel="noopener noreferrer"
              className="text-xs text-indigo-600 dark:text-indigo-400 underline truncate block">🔗 {bottle.link}</a>
          )}
          <button
            onClick={() => toggleRestock(bottle.id)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
              bottle.restock
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}>
            {bottle.restock ? '✓ wird nachgekauft' : '+ nachkaufen'}
          </button>
        </div>
      </Section>

      {/* Aktionen */}
      <div className="px-3 py-4 flex gap-2">
        <button onClick={() => setShowDrink(true)}
          className="flex-1 bg-indigo-600 text-white font-semibold py-3 rounded-2xl"
          disabled={bottle.count <= 0}>
          🥂 Getrunken
        </button>
        {onShare && (
          <button onClick={() => onShare(bottle.id)}
            className="bg-gray-100 dark:bg-gray-800 text-gray-500 px-4 rounded-2xl" title="Empfehlen">🔗</button>
        )}
        <button onClick={() => { if (confirm('Position komplett löschen?')) { removeBottle(bottle.id); onClose() } }}
          className="bg-gray-100 dark:bg-gray-800 text-gray-500 px-4 rounded-2xl">🗑️</button>
      </div>

      {showDrink && (
        <DrinkSheet bottle={bottle} onClose={() => setShowDrink(false)} onSave={(entry) => { drinkOne(bottle.id, entry); setShowDrink(false) }} />
      )}
      {showEdit && (
        <EditSheet bottle={bottle} onClose={() => setShowEdit(false)} onSave={(patch) => { updateBottle(bottle.id, patch); setShowEdit(false) }} />
      )}
    </div>
  )
}

// ── Bausteine ────────────────────────────────────────────────────────────────

function Section({ title, action, children }) {
  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function Fact({ icon, label, value, sub }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-2.5">
      <p className="text-[10px] uppercase font-bold text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate"><span className="mr-1">{icon}</span>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 truncate">{sub}</p>}
    </div>
  )
}

function StarRow({ value, onChange, large }) {
  return (
    <div className={`flex justify-center gap-1 ${large ? 'mt-3 text-2xl' : 'text-base'}`}>
      {[1,2,3,4,5].map(i => (
        <button key={i} onClick={() => onChange(i === value ? 0 : i)}
          className={`${i <= value ? 'opacity-100' : 'opacity-30'} transition-opacity`}>
          ⭐
        </button>
      ))}
    </div>
  )
}

function AxisRow({ axis, value, onChange }) {
  const idx = axis.steps.indexOf(value)
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-[11px] text-gray-400 mb-0.5">
        <span>{axis.label}</span>
        <span className="text-gray-700 dark:text-gray-200 font-semibold">{value || '—'}</span>
      </div>
      <div className="flex gap-1">
        {axis.steps.map((s, i) => (
          <button key={s} onClick={() => onChange(s === value ? null : s)}
            className={`flex-1 h-2 rounded-full transition-colors ${
              i <= idx && idx >= 0 ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'
            }`}
            title={s}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        <span>{axis.left}</span><span>{axis.right}</span>
      </div>
    </div>
  )
}

// ── Trinken-Sheet ────────────────────────────────────────────────────────────
function DrinkSheet({ bottle, onClose, onSave }) {
  const [rating, setRating]     = useState(bottle.rating || 0)
  const [occasion, setOccasion] = useState('')
  const [note, setNote]         = useState('')
  const [date, setDate]         = useState(new Date().toISOString().slice(0,10))
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl p-5 space-y-3">
        <h3 className="text-lg font-bold">🥂 Flasche getrunken</h3>
        <div>
          <label className="label">Wann</label>
          <input type="date" className="input text-sm" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Bewertung</label>
          <StarRow value={rating} onChange={setRating} large />
        </div>
        <div>
          <label className="label">Anlass</label>
          <input className="input text-sm" placeholder="z.B. Geburtstag Anna, Sonntagsbraten"
            value={occasion} onChange={e => setOccasion(e.target.value)} />
        </div>
        <div>
          <label className="label">Notiz</label>
          <textarea className="input text-sm resize-none" rows={2}
            placeholder="Wie war's? Pairing? Erinnerung…"
            value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
          <button onClick={() => onSave({ rating: rating || undefined, occasion, note, date })}
            className="btn-primary flex-1" style={{ backgroundColor: '#0D7377' }}>Eintragen</button>
        </div>
      </div>
    </>
  )
}

// ── Edit-Sheet: Aromen, Pairings, Stammdaten ─────────────────────────────────
function EditSheet({ bottle, onClose, onSave }) {
  const [name, setName]       = useState(bottle.name)
  const [winery, setWinery]   = useState(bottle.winery || '')
  const [region, setRegion]   = useState(bottle.region || '')
  const [country, setCountry] = useState(bottle.country || '')
  const [grape, setGrape]     = useState(bottle.grape || '')
  const [alcohol, setAlcohol] = useState(bottle.alcohol || '')
  const [sweetness, setSweetness] = useState(bottle.sweetness || '')
  const [classification, setClassification] = useState(bottle.classification || '')
  const [wineType, setWineType]   = useState(bottle.wineType || 'wein')
  const [retailer, setRetailer]   = useState(bottle.retailer || '')
  const [priceEur, setPriceEur]   = useState(bottle.priceEur ?? '')
  const [purchaseDate, setPurchaseDate] = useState(bottle.purchaseDate || '')
  const [link, setLink]           = useState(bottle.link || '')
  const [aromas, setAromas]   = useState(bottle.aromas || [])
  const [pairings, setPairings] = useState(bottle.pairings || [])
  const [alcoholFree, setAlcoholFree] = useState(!!bottle.alcoholFree)

  function toggle(arr, set, v) { set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]) }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-center pt-3"><div className="w-10 h-1.5 rounded-full bg-gray-200" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-lg font-bold">✎ Wein bearbeiten</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">Name</label><input className="input text-sm" value={name} onChange={e => setName(e.target.value)} /></div>
            <div><label className="label">Weingut</label><input className="input text-sm" value={winery} onChange={e => setWinery(e.target.value)} /></div>
            <div><label className="label">Region</label><input className="input text-sm" value={region} onChange={e => setRegion(e.target.value)} /></div>
            <div className="col-span-2"><label className="label">Land</label><CountryPicker value={country} onChange={setCountry} /></div>
            <div><label className="label">Rebsorte</label><input className="input text-sm" value={grape} onChange={e => setGrape(e.target.value)} /></div>
            <div><label className="label">Alkohol</label><input className="input text-sm" value={alcohol} onChange={e => setAlcohol(e.target.value)} placeholder="13.5 %" /></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Geschmack</label>
              <select className="input text-sm" value={sweetness} onChange={e => setSweetness(e.target.value)}>
                <option value="">—</option>
                {isSparkling(bottle.color, wineType) && <>
                  <option value="brut nature">Brut Nature</option>
                  <option value="extra brut">Extra Brut</option>
                  <option value="brut">Brut</option>
                  <option value="extra dry">Extra Dry</option>
                </>}
                <option value="trocken">Trocken</option>
                <option value="halbtrocken">Halbtrocken</option>
                <option value="lieblich">Lieblich</option>
                <option value="süß">Süß</option>
              </select>
            </div>
            <div>
              <label className="label">Art</label>
              <select className="input text-sm" value={wineType} onChange={e => setWineType(e.target.value)}>
                <option value="wein">Wein</option>
                <option value="sekt">Sekt</option>
                <option value="schorle">Schorle</option>
                <option value="gluehwein">Glühwein</option>
                <option value="sonstige">Sonstige</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">Qualität</label><input className="input text-sm" value={classification} onChange={e => setClassification(e.target.value)} placeholder="z.B. Spätlese, DOC" /></div>
            <div><label className="label">Preis (€)</label><input type="number" step="0.01" className="input text-sm" value={priceEur} onChange={e => setPriceEur(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">Händler</label><input className="input text-sm" value={retailer} onChange={e => setRetailer(e.target.value)} placeholder="z.B. Jacques'" /></div>
            <div><label className="label">Kaufdatum</label><input type="date" className="input text-sm" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} /></div>
          </div>
          <div>
            <label className="label">Link</label><input type="url" className="input text-sm" value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 rounded-xl">
            <input type="checkbox" checked={alcoholFree} onChange={e => setAlcoholFree(e.target.checked)} />
            <span>🚫 <b>Alkoholfrei</b> – kein Promille, taugt für Schwangerschaft, Autofahrer, abends auf der Couch</span>
          </label>

          <div>
            <label className="label">👃 Aromen</label>
            <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
              {AROMAS.map(a => (
                <button key={a} onClick={() => toggle(aromas, setAromas, a)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    aromas.includes(a) ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                  }`}>{a}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">🍽️ Passt zu</label>
            <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
              {DISH_CATEGORIES.map(d => (
                <button key={d.id} onClick={() => toggle(pairings, setPairings, d.id)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    pairings.includes(d.id) ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                  }`}>{d.emoji} {d.label}</button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2 pb-4">
            <button onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
            <button
              onClick={() => onSave({ name, winery, region, country, grape, alcohol, alcoholFree, sweetness, classification, wineType, retailer, priceEur: priceEur ? Number(priceEur) : null, purchaseDate, link, aromas, pairings })}
              className="btn-primary flex-1" style={{ backgroundColor: '#0D7377' }}>Speichern</button>
          </div>
        </div>
      </div>
    </>
  )
}
