// Parst eine (eingefügte) Rezept-/Videobeschreibung heuristisch in
// Zutaten + Schritte. Trennt Intro-Prosa, Zutaten, Anleitung und
// Werbe-/Link-Block am Ende.

const stepHeaderRe = /^(anleitung|zubereitung|zubereitungsschritte|so geht'?s|schritte|und so geht'?s|kochen|method|preparation|steps)\b\s*:?\.?$/i
const promoRe = /(https?:\/\/|^#|abonn|affiliate|patreon|instagram|tiktok|spotify|linktr|youtube\.com|equipment|kochkurs|foodtour|werbung|^@|folg[te]? mir|unterst[üu]tz)/i
const sectionOnlyRe = /^[A-Za-zÄÖÜäöüß /&-]{3,30}:$/
const startsQtyRe = /^([0-9]|½|¼|¾|⅓|⅔|\d+\/\d+|etwas\b|eine?r?\b|optional|prise|nach belieben|ein paar|je\b)/i

export function parseRecipeDescription(desc) {
  if (!desc || !desc.trim()) return { ingredients: [], steps: [] }
  const lines = desc.split(/\r?\n/).map(l => l.trim())

  const stepsStart = lines.findIndex(l => stepHeaderRe.test(l))
  let promoStart = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] && promoRe.test(lines[i])) { promoStart = i; break }
  }

  const ingredientEnd = stepsStart >= 0 ? stepsStart : (promoStart >= 0 ? promoStart : lines.length)

  let firstIng = -1
  for (let i = 0; i < ingredientEnd; i++) {
    if (lines[i] && startsQtyRe.test(lines[i])) { firstIng = i; break }
  }

  const ingredients = []
  if (firstIng >= 0) {
    for (let i = firstIng; i < ingredientEnd; i++) {
      const l = lines[i]
      if (!l) continue
      if (sectionOnlyRe.test(l)) continue
      if (promoRe.test(l)) break
      const wc = l.split(/\s+/).length
      const looks = startsQtyRe.test(l) || (l.length <= 60 && wc <= 9 && !/[.!?]$/.test(l))
      if (looks) ingredients.push(l)
    }
  }

  const steps = []
  if (stepsStart >= 0) {
    const stepEnd = (promoStart > stepsStart) ? promoStart : lines.length
    for (let i = stepsStart + 1; i < stepEnd; i++) {
      const l = lines[i]
      if (!l) continue
      if (promoRe.test(l)) break
      steps.push(l.replace(/^\d+[.)]\s*/, ''))
    }
  }

  return { ingredients, steps }
}
