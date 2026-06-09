import { fetchRecipeMeta, youtubeId } from './youtube'
import { cookidooFetchRecipe } from './cookidoo'

// Einheitliches Ergebnis:
// { title, author, thumbnailUrl, videoId, sourceType, ingredients:[str], steps:[str] }
export async function importRecipe(url, cookidooSettings) {
  const u = (url || '').trim()
  if (!u) throw new Error('Bitte einen Link einfügen')

  // 1. Cookidoo
  if (/cookidoo\./i.test(u)) {
    if (!cookidooSettings?.email) {
      throw new Error('Cookidoo ist nicht verbunden – bitte in den Einstellungen verknüpfen.')
    }
    const data = await cookidooFetchRecipe(cookidooSettings.email, cookidooSettings.password, u)
    return {
      title: data.title || '',
      author: 'Cookidoo',
      thumbnailUrl: data.thumbnailUrl || '',
      videoId: null,
      sourceType: 'cookidoo',
      // {name, amount} → "amount name"
      ingredients: (data.ingredients || []).map(i =>
        (typeof i === 'string' ? i : [i.amount, i.name].filter(Boolean).join(' ')).trim()
      ).filter(Boolean),
      steps: data.steps || [],
    }
  }

  // 2. YouTube + 3. sonstige Webseiten → recipe-meta (erkennt selbst)
  const m = await fetchRecipeMeta(u)
  return {
    title: m.title || '',
    author: m.author || '',
    thumbnailUrl: m.thumbnailUrl || '',
    videoId: m.videoId ?? (youtubeId(u) || null),
    sourceType: m.sourceType || 'web',
    ingredients: m.ingredients || [],
    steps: m.steps || [],
  }
}
