// ── Rezept-Text parsen ────────────────────────────────────────────────────────
// Erwartetes Format (z.B. aus Cookidoo-Web kopiert):
//   <Name>
//   <Zubereitungsnotiz?>          (optional, enthält Kommas/Klammern/Verben)
//   <Menge>                       (kurze Zeile: Zahl + optionale Einheit)
//   <Alternative?>                (optional, wird ignoriert)
//   <Leerzeile>  → trennt Blöcke

const UNITS = 'g|kg|ml|l|TL|EL|Prise|Prisen|Stängel|Stange|Stangen|Würfel|Stück|Bund|Zehe|Zehen|Dose|Dosen|Pck\\.?|Packung|Msp\\.?|Tropfen|Blatt|Blätter|Becher|Tasse|Glas|cm'
const QUALIFIERS = 'geh\\.|gestr\\.|ca\\.|knapp|gut|etwa|je'

// Ist die Zeile eine reine Mengenangabe (nicht Name, nicht Notiz)?
function isAmountLine(line) {
  const l = line.trim()
  if (!l) return false
  if (/[(),]/.test(l)) return false            // Klammern/Kommas → Notiz
  if (!/\d|½|¼|¾|⅓|⅔|eine?\b|etwas/i.test(l)) return false
  // Alles Bekannte entfernen – bleibt fast nichts übrig → echte Menge
  const rest = l
    .replace(/\d+[.,]?\d*/g, '')
    .replace(new RegExp(`\\b(${QUALIFIERS})`, 'gi'), '')
    .replace(new RegExp(`\\b(${UNITS})\\b`, 'gi'), '')
    .replace(/[½¼¾⅓⅔/.\-\s]/g, '')
    .trim()
  return rest.length <= 2
}

export function parseRecipeText(text) {
  if (!text || !text.trim()) return []
  const lines = text.replace(/\r/g, '').split('\n')

  const blocks = []
  let current = []
  for (const raw of lines) {
    if (raw.trim() === '') {
      if (current.length) { blocks.push(current); current = [] }
    } else {
      current.push(raw.trim())
    }
  }
  if (current.length) blocks.push(current)

  const ingredients = []
  for (const block of blocks) {
    const name = block[0]
    if (!name) continue
    let amount = ''
    for (let i = 1; i < block.length; i++) {
      if (isAmountLine(block[i])) { amount = block[i]; break }
    }
    // Fallback: manchmal steht die Menge direkt nach dem Namen ohne Notiz
    if (!amount && block.length === 1 && isAmountLine(block[0])) continue
    ingredients.push({ name: name.replace(/\s+/g, ' ').trim(), amount })
  }
  return ingredients
}

// ── Zuordnung zum Bestand + Zuteilung ─────────────────────────────────────────

// Recipe-Begriff → Bestands-Stichwort (für gängige Abweichungen)
const SYNONYMS = {
  kumin: 'kreuzkümmel',
  cumin: 'kreuzkümmel',
  muskat: 'muskatnuss',
  peffer: 'pfeffer',
  chili: 'chili',
  paprikapulver: 'paprika',
}

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[.,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Bedeutungstragende Wörter aus dem Rezeptnamen (ohne Notizteile)
function keywords(name) {
  const n = normalize(name)
  // Notiz nach erstem Komma o.ä. abschneiden ist schon via normalize entfernt
  const words = n.split(' ').filter(w => w.length >= 3)
  const out = new Set()
  words.forEach(w => {
    out.add(w)
    if (SYNONYMS[w]) out.add(SYNONYMS[w])
  })
  return [...out]
}

// Ist die Mengenangabe „gewürz-typisch"? Gewürze werden klein dosiert
// (TL/EL/Prise/Msp oder wenige Gramm) – Gemüse in Stück/großen Mengen.
export function isSpiceLike(amount) {
  if (!amount || !amount.trim()) return true            // ohne Menge → erlauben
  const a = amount.toLowerCase().replace(',', '.')
  // kleine Dosier-Einheiten → klar Gewürz
  if (/\b(tl|el|prise|prisen|msp|messerspitze|teel|essl)\b/.test(a)) return true
  // reine Grammangabe: nur kleine Mengen (≤ 20 g)
  const g = a.match(/(\d+(?:\.\d+)?)\s*g\b/)
  if (g) return parseFloat(g[1]) <= 20
  // alles andere (Stück, Bund, Zehe, Stange, Scheibe, ml/l, bloße Zahl) → kein Gewürz
  return false
}

// Prioritäts-Sortierung:
//   nicht-abgelaufene zuerst → ältestes MHD → niedrigster Füllstand → kleinste Menge
function byPriority(a, b) {
  const now = Date.now()
  const ea = a.expiryDate && Date.parse(a.expiryDate) < now ? 1 : 0
  const eb = b.expiryDate && Date.parse(b.expiryDate) < now ? 1 : 0
  if (ea !== eb) return ea - eb                 // abgelaufene ans Ende
  const da = a.expiryDate ? Date.parse(a.expiryDate) : Infinity
  const db = b.expiryDate ? Date.parse(b.expiryDate) : Infinity
  if (da !== db) return da - db
  const fa = a.fillLevel ?? 4
  const fb = b.fillLevel ?? 4
  if (fa !== fb) return fa - fb
  const ga = a.amountGrams ?? Infinity
  const gb = b.amountGrams ?? Infinity
  return ga - gb
}

// ── Form-Erkennung (ganz / gemahlen / frisch) ────────────────────────────────
const GROUND_RE = /\b(gemahlen|gemahlene[rs]?|pulver|granulat|gerieben|mehl|fein gemahlen)\b/i
const WHOLE_RE  = /(körner|samen|saat|\bganz|\bganze[rs]?\b|blätter|blatt|beeren|stange|schote|kapseln|\bnuss\b|getrocknet|gerebelt|sticks?)/i
const DOSE_RE   = /\b(tl|el|prise|prisen|msp|messerspitze|teel|essl)\b/i
const FRESH_UNIT_RE = /\b(zehen?|knolle[n]?|bund|stange[n]?|kopf|köpfe|stück|scheiben?)\b/i
// Zutaten, die typischerweise frisch verwendet werden (≠ Trockengewürz)
const FRESH_WORDS = ['zwiebel','zwiebeln','knoblauch','ingwer','karotte','karotten','möhre','möhren',
  'sellerie','lauch','frühlingslauch','frühlingszwiebel','petersilie','schalotte','schalotten',
  'tomate','tomaten','gurke','kartoffel','kartoffeln','paprika','zitrone','zitronen','apfel',
  'chili frisch','suppengrün','suppenhuhn','huhn','hähnchen','forelle','forellen','fisch']

// Vorrats-/Backzutaten: keine Gewürze, müssen aus dem Cook-Plan ausgeschlossen werden
// (selbst wenn keine Mengenangabe im Namen steht).
const PANTRY_WORDS = [
  // Mehl & Getreide
  'mehl','weizenmehl','roggenmehl','dinkelmehl','vollkornmehl','grieß','stärke','speisestärke','maisstärke',
  'haferflocken','flocken','müsli','cornflakes','reis','nudeln','pasta','spaghetti','penne','couscous','bulgur','quinoa','linsen','kichererbsen','bohnen','erbsen',
  // Eier & Milchprodukte
  'ei','eier','eigelb','eiweiß','eiklar',
  'milch','sahne','schlagsahne','crème','creme','crème fraîche','schmand','joghurt','jogurt','quark','frischkäse','käse','parmesan','mozzarella','feta','butter','margarine','frischkäse',
  // Süß & Back
  'zucker','rohrzucker','puderzucker','vanillezucker','honig','sirup','ahornsirup','agavendicksaft',
  'kakao','schokolade','schokoraspeln','marzipan','nutella',
  'hefe','trockenhefe','backpulver','natron','backsoda','vanillinzucker',
  // Brot/Brösel
  'brot','brötchen','toast','baguette','semmelbrösel','paniermehl','brösel',
  // Nüsse/Kerne (im Rezept-Kontext meist Hauptzutat, nicht Gewürz)
  'mandeln','mandel','walnüsse','walnuss','haselnüsse','haselnuss','cashew','cashewkerne','pistazien','erdnüsse','erdnuss','sonnenblumenkerne','kürbiskerne','sesam','leinsamen','chiasamen','kokosraspel','kokosflocken',
  // Flüssig
  'wasser','brühe','gemüsebrühe','hühnerbrühe','rinderbrühe','fond','wein','weißwein','rotwein','bier','essig','balsamico','sojasauce','sojasoße','sojasoss','tomatenmark','passata','tomatensauce','ketchup','senf','mayonnaise','majo',
  // Öle/Fette
  'öl','olivenöl','rapsöl','sonnenblumenöl','sesamöl','kokosöl','schmalz',
  // Obst/Süßes
  'banane','bananen','beeren','erdbeeren','himbeeren','heidelbeeren','rosinen',
]

// Vorratszutat (Mehl, Eiweiß, Haferflocken, …) erkannt? Diese sind nie Gewürze.
function isPantry(name) {
  const n = normalize(name)
  const words = n.split(' ')
  if (words.some(w => PANTRY_WORDS.includes(w))) return true
  return PANTRY_WORDS.some(pw => pw.includes(' ') && n.includes(pw))
}

// Bestimmt Form einer Rezept-Zeile + ob es frische Ware ist
function classifyRecipe(name) {
  const n = normalize(name)
  const ground = GROUND_RE.test(n)
  const whole  = WHOLE_RE.test(n)
  const dose   = DOSE_RE.test(name)
  const words  = n.split(' ')
  const baseHit = words.some(w => FRESH_WORDS.includes(w)) ||
                  FRESH_WORDS.some(fw => fw.includes(' ') && n.includes(fw))
  let fresh
  if (baseHit) {
    // bekannte Frischware (Zwiebel, Sellerie…) → frisch, außer explizit gemahlen/dosiert
    fresh = !ground && !dose
  } else {
    // sonst nur über frische Einheit (Zehen/Knolle/Bund) ohne Trocken-/Dosier-Hinweis
    fresh = FRESH_UNIT_RE.test(n) && !ground && !whole && !dose
  }
  const form = ground ? 'ground' : whole ? 'whole' : 'any'
  return { fresh, form }
}

// Große Mengen im Namen (z.B. "150 g Buchstabennudeln", "100 g Sahne",
// "1 kg ...") → klar kein Gewürz, sondern Hauptzutat
function isBulkByName(name) {
  const a = normalize(name).replace(',', '.')
  const g = a.match(/(\d+(?:\.\d+)?)\s*g\b/)
  if (g && parseFloat(g[1]) > 25) return true
  if (/\d+(?:\.\d+)?\s*(kg|ml|l)\b/.test(a)) return true
  return false
}

// Form eines Bestands-Gewürzes: explizites Feld bevorzugt, sonst Heuristik
function classifyInventory(sp) {
  if (sp.form === 'gemahlen') return 'ground'
  if (sp.form === 'ganz')     return 'whole'
  const n = normalize(sp.name)
  if (GROUND_RE.test(n)) return 'ground'
  if (WHOLE_RE.test(n) || sp.packagingType === 'ganz') return 'whole'
  return 'any'
}

function formsCompatible(a, b) {
  return a === 'any' || b === 'any' || a === b
}

// Findet zu einem Rezept-Namen passende Bestands-Gewürze.
// Wortstamm-Vergleich + Form-Abgleich (ganz/gemahlen müssen zusammenpassen).
function matchSpices(recipeName, recipeForm, spices) {
  const keys = keywords(recipeName)
  if (keys.length === 0) return []
  return spices.filter(sp => {
    const invWords = normalize(sp.name).split(' ').filter(w => w.length >= 3)
    const nameHit = keys.some(k => invWords.some(w =>
      k === w || (k.length >= 4 && w.length >= 4 && (k.includes(w) || w.includes(k)))
    ))
    if (!nameHit) return false
    return formsCompatible(recipeForm, classifyInventory(sp))
  })
}

// Baut den Kochplan: matched (mit sortierten Gläsern) + unmatched
export function buildCookPlan(ingredients, spices) {
  const matched = []
  const unmatched = []   // gewürz-typisch, aber nicht im Bestand
  const ignored = []     // keine Gewürze (Gemüse, große Mengen, Stück…)
  const usedSpiceIds = new Set()

  ingredients.forEach(ing => {
    const { fresh, form } = classifyRecipe(ing.name)
    // Frische Ware ODER große Bulk-Menge (im Namen) ODER nicht gewürz-typisch
    if (fresh || isPantry(ing.name) || isBulkByName(ing.name) || !isSpiceLike(ing.amount)) { ignored.push(ing.name); return }
    const hits = matchSpices(ing.name, form, spices).filter(sp => !usedSpiceIds.has(sp.id))
    if (hits.length === 0) {
      unmatched.push(ing.name)
      return
    }
    hits.forEach(sp => usedSpiceIds.add(sp.id))
    const jars = [...hits].sort(byPriority)
    matched.push({ recipeName: ing.name, amount: ing.amount, jars })
  })

  return { matched, unmatched, ignored }
}
