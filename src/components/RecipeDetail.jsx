import useStore from '../store/useStore'

export default function RecipeDetail({ recipe, onBack, onEdit }) {
  const { deleteRecipe } = useStore()

  function handleDelete() {
    if (confirm(`Rezept „${recipe.title}" wirklich löschen?`)) {
      deleteRecipe(recipe.id)
      onBack()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Kopf */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-2.5 flex items-center gap-2 flex-none">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2 className="flex-1 font-bold text-gray-900 dark:text-gray-100 truncate">{recipe.title}</h2>
        <button onClick={() => onEdit(recipe)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors" title="Bearbeiten">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button onClick={handleDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors" title="Löschen">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-20">
        {/* Player */}
        {recipe.videoId ? (
          <div className="rounded-2xl overflow-hidden bg-black aspect-video">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${recipe.videoId}`}
              title={recipe.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : recipe.thumbnailUrl ? (
          <img src={recipe.thumbnailUrl} alt="" className="w-full rounded-2xl" />
        ) : null}

        {/* Quelle / Tags */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {recipe.author && <span className="text-sm text-gray-500 dark:text-gray-400">{recipe.author}</span>}
          {recipe.sourceUrl && (
            <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
              Im Original öffnen
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          )}
        </div>
        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.tags.map(t => (
              <span key={t} className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full px-2.5 py-0.5">{t}</span>
            ))}
          </div>
        )}

        {/* Zutaten */}
        {recipe.ingredients?.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Zutaten</h3>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ing, i) => {
                const name = typeof ing === 'string' ? ing : ing.name
                return (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <span className="text-green-500 mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 flex-none" />
                    {name}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Schritte */}
        {recipe.steps?.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Zubereitung</h3>
            <ol className="space-y-3">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700 dark:text-gray-200">
                  <span className="flex-none w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold text-xs flex items-center justify-center">{i + 1}</span>
                  <span className="pt-0.5 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Notizen */}
        {recipe.notes && (
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Notizen</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{recipe.notes}</p>
          </div>
        )}

        {recipe.ingredients?.length === 0 && recipe.steps?.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            Noch keine Zutaten/Schritte erfasst – tippe oben auf ✎ zum Ergänzen.
          </p>
        )}
      </div>
    </div>
  )
}
