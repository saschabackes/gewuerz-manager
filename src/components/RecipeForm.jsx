import { useState } from 'react'
import useStore from '../store/useStore'
import { fetchRecipeMeta } from '../lib/youtube'
import { parseRecipeDescription } from '../utils/recipeDescription'

export default function RecipeForm({ recipe, onClose, onSaved }) {
  const { addRecipe, updateRecipe } = useStore()
  const isEdit = !!recipe

  const [sourceUrl, setSourceUrl]   = useState(recipe?.sourceUrl ?? '')
  const [title, setTitle]           = useState(recipe?.title ?? '')
  const [author, setAuthor]         = useState(recipe?.author ?? '')
  const [videoId, setVideoId]       = useState(recipe?.videoId ?? null)
  const [sourceType, setSourceType] = useState(recipe?.sourceType ?? 'youtube')
  const [thumbnailUrl, setThumb]    = useState(recipe?.thumbnailUrl ?? null)
  const [tags, setTags]             = useState(recipe?.tags ?? [])
  const [tagInput, setTagInput]     = useState('')
  const [ingredients, setIngredients] = useState(
    (recipe?.ingredients ?? []).map(i => (typeof i === 'string' ? i : i.name)).join('\n')
  )
  const [steps, setSteps]           = useState((recipe?.steps ?? []).join('\n'))
  const [notes, setNotes]           = useState(recipe?.notes ?? '')
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [metaError, setMetaError]   = useState('')
  const [autoFilled, setAutoFilled] = useState(false)
  const [showPaste, setShowPaste]   = useState(false)
  const [descPaste, setDescPaste]   = useState('')
  const [pasteResult, setPasteResult] = useState('')

  function applyPastedDescription() {
    const { ingredients: ing, steps: st } = parseRecipeDescription(descPaste)
    if (ing.length) setIngredients(ing.join('\n'))
    if (st.length)  setSteps(st.join('\n'))
    setPasteResult(`${ing.length} Zutaten, ${st.length} Schritte erkannt`)
  }

  async function loadMeta() {
    if (!sourceUrl.trim()) return
    setLoadingMeta(true)
    setMetaError('')
    setAutoFilled(false)
    try {
      const m = await fetchRecipeMeta(sourceUrl.trim())
      if (m.title) setTitle(m.title)
      if (m.author) setAuthor(m.author)
      setVideoId(m.videoId ?? null)
      setSourceType(m.sourceType ?? 'web')
      setThumb(m.thumbnailUrl ?? null)
      // Zutaten/Schritte aus der Beschreibung übernehmen (nur wenn Felder leer)
      let filled = false
      if (m.ingredients?.length && !ingredients.trim()) {
        setIngredients(m.ingredients.join('\n')); filled = true
      }
      if (m.steps?.length && !steps.trim()) {
        setSteps(m.steps.join('\n')); filled = true
      }
      setAutoFilled(filled)
      // Wenn nichts automatisch kam → Einfügefeld anbieten
      if (!filled) setShowPaste(true)
    } catch (e) {
      setMetaError(e.message)
    } finally {
      setLoadingMeta(false)
    }
  }

  function addTag(t) {
    const clean = t.trim()
    if (clean && !tags.includes(clean)) setTags([...tags, clean])
    setTagInput('')
  }

  function handleSave() {
    if (!title.trim()) { setMetaError('Bitte einen Titel angeben'); return }
    const data = {
      title: title.trim(),
      sourceUrl: sourceUrl.trim(),
      sourceType,
      videoId,
      thumbnailUrl,
      author: author.trim(),
      tags,
      ingredients: ingredients.split('\n').map(l => l.trim()).filter(Boolean).map(name => ({ name, amount: '' })),
      steps: steps.split('\n').map(l => l.trim()).filter(Boolean),
      notes: notes.trim(),
    }
    if (isEdit) { updateRecipe(recipe.id, data); onSaved?.(recipe.id) }
    else { const id = addRecipe(data); onSaved?.(id) }
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 fade-enter" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl sheet-enter max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 flex-none border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{isEdit ? 'Rezept bearbeiten' : 'Rezept speichern'}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-safe">
          {/* Link */}
          <div>
            <label className="label">Link (YouTube, Website…)</label>
            <div className="flex gap-2">
              <input type="url" className="input py-2.5 text-sm flex-1" placeholder="https://youtube.com/shorts/…"
                value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} />
              <button onClick={loadMeta} disabled={!sourceUrl.trim() || loadingMeta}
                className="btn-primary px-4 py-2.5 text-sm flex-none disabled:opacity-50">
                {loadingMeta ? '…' : 'Laden'}
              </button>
            </div>
            {metaError && <p className="text-xs text-red-600 dark:text-red-300 mt-1">{metaError}</p>}
            {autoFilled && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Zutaten &amp; Schritte aus der Videobeschreibung übernommen – bitte prüfen.
              </p>
            )}
          </div>

          {/* Vorschau */}
          {thumbnailUrl && (
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl p-2">
              <img src={thumbnailUrl} alt="" className="w-20 h-14 object-cover rounded-lg flex-none" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 line-clamp-2">{title || '—'}</p>
                {author && <p className="text-xs text-gray-400">{author}</p>}
              </div>
            </div>
          )}

          {/* Titel */}
          <div>
            <label className="label">Titel *</label>
            <input type="text" className="input py-2.5 text-sm" value={title} onChange={e => setTitle(e.target.value)} placeholder="Rezeptname" />
          </div>

          {/* Tags */}
          <div>
            <label className="label">Kategorien / Tags</label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(t => (
                  <span key={t} className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full pl-2.5 pr-1 py-0.5 flex items-center gap-1">
                    {t}
                    <button onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-red-500">✕</button>
                  </span>
                ))}
              </div>
            )}
            <input type="text" className="input py-2 text-sm" placeholder="z.B. Suppe, schnell, vegetarisch + Enter"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
            />
          </div>

          {/* Videobeschreibung einfügen → automatisch erkennen */}
          <div className="bg-sky-50 dark:bg-sky-950/40 rounded-xl p-3">
            {!showPaste ? (
              <button onClick={() => setShowPaste(true)}
                className="text-sm text-sky-700 dark:text-sky-300 font-semibold flex items-center gap-1.5">
                <span>✨</span> Zutaten & Schritte aus Videobeschreibung erkennen
              </button>
            ) : (
              <>
                <p className="text-xs text-sky-800 dark:text-sky-200 mb-2 leading-relaxed">
                  Füge die <b>Videobeschreibung</b> ein (in der YouTube-App: Beschreibung antippen → Text kopieren).
                  Zutaten &amp; Schritte werden automatisch erkannt.
                </p>
                <textarea className="input text-sm resize-none" rows={4}
                  placeholder="Videobeschreibung hier einfügen…"
                  value={descPaste} onChange={e => setDescPaste(e.target.value)} />
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={applyPastedDescription} disabled={!descPaste.trim()}
                    className="btn-primary py-2 px-4 text-sm disabled:opacity-50">Erkennen</button>
                  {pasteResult && <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ {pasteResult}</span>}
                </div>
              </>
            )}
          </div>

          {/* Zutaten */}
          <div>
            <label className="label">Zutaten (eine pro Zeile)</label>
            <textarea className="input text-sm resize-none" rows={5}
              placeholder={'z.B.\n1 Hähnchen\n2 Karotten\nSalz, Pfeffer'}
              value={ingredients} onChange={e => setIngredients(e.target.value)} />
          </div>

          {/* Schritte */}
          <div>
            <label className="label">Zubereitung (ein Schritt pro Zeile)</label>
            <textarea className="input text-sm resize-none" rows={5}
              placeholder={'1. Zwiebeln anbraten…\n2. Brühe aufgießen…'}
              value={steps} onChange={e => setSteps(e.target.value)} />
          </div>

          {/* Notizen */}
          <div>
            <label className="label">Notizen (optional)</label>
            <textarea className="input text-sm resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-3 pt-1 pb-4">
            <button onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={handleSave} className="btn-primary flex-1">{isEdit ? 'Speichern' : 'Hinzufügen'}</button>
          </div>
        </div>
      </div>
    </>
  )
}
