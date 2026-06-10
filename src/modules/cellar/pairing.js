// Wein-Pairing-Logik: Speisen-Kategorien + Matching-Score

export const DISH_CATEGORIES = [
  { id: 'rind_lamm',     label: 'Rind / Lamm',         emoji: '🥩', preferred: { color: ['rot'],            body: ['voll','mittel'], tannin: ['kräftig','mittel'] } },
  { id: 'wild',          label: 'Wild',                emoji: '🦌', preferred: { color: ['rot'],            body: ['voll'],          tannin: ['kräftig'] } },
  { id: 'schwein',       label: 'Schwein',             emoji: '🐷', preferred: { color: ['rot','weiß'],     body: ['mittel'],        tannin: ['mittel','weich'] } },
  { id: 'geflügel',      label: 'Geflügel',            emoji: '🍗', preferred: { color: ['weiß','rot'],     body: ['leicht','mittel'] } },
  { id: 'ente_gans',     label: 'Ente / Gans',         emoji: '🦆', preferred: { color: ['rot'],            body: ['voll','mittel'] } },
  { id: 'fisch_kräftig', label: 'Fisch kräftig (Lachs)', emoji: '🐟', preferred: { color: ['weiß','rot'],   body: ['mittel'] } },
  { id: 'fisch_zart',    label: 'Fisch zart',          emoji: '🐠', preferred: { color: ['weiß'],           body: ['leicht'],        acidity: ['frisch'] } },
  { id: 'meeresfrüchte', label: 'Meeresfrüchte',       emoji: '🦐', preferred: { color: ['weiß','schaum'],  body: ['leicht'],        acidity: ['frisch'] } },
  { id: 'sushi',         label: 'Sushi',               emoji: '🍣', preferred: { color: ['weiß','schaum'],  body: ['leicht'],        sweetness: ['halbtrocken','trocken'] } },
  { id: 'pasta_tomate',  label: 'Pasta Tomate',        emoji: '🍝', preferred: { color: ['rot'],            body: ['mittel'],        acidity: ['frisch'] } },
  { id: 'pasta_sahne',   label: 'Pasta Sahne',         emoji: '🥖', preferred: { color: ['weiß'],           body: ['mittel'] } },
  { id: 'pizza',         label: 'Pizza',               emoji: '🍕', preferred: { color: ['rot'],            body: ['mittel'] } },
  { id: 'risotto',       label: 'Risotto',             emoji: '🍚', preferred: { color: ['weiß'],           body: ['mittel'] } },
  { id: 'käse_hart',     label: 'Käse hart',           emoji: '🧀', preferred: { color: ['rot'],            body: ['voll','mittel'] } },
  { id: 'käse_weich',    label: 'Käse weich',          emoji: '🥯', preferred: { color: ['weiß','schaum'],  body: ['leicht','mittel'] } },
  { id: 'käse_blau',     label: 'Blauschimmelkäse',    emoji: '🟦', preferred: { color: ['weiß'],           sweetness: ['lieblich','süß'] } },
  { id: 'salat',         label: 'Salat',               emoji: '🥗', preferred: { color: ['weiß','rosé'],    body: ['leicht'],        acidity: ['frisch'] } },
  { id: 'asia_süss',     label: 'Asiatisch süß-scharf',emoji: '🍜', preferred: { color: ['weiß','rosé'],    sweetness: ['halbtrocken','lieblich'] } },
  { id: 'indisch',       label: 'Indisch / Curry',     emoji: '🍛', preferred: { color: ['weiß','rosé'],    sweetness: ['halbtrocken','lieblich'] } },
  { id: 'gemüse',        label: 'Vegetarisch',         emoji: '🥦', preferred: { color: ['weiß','rosé'],    body: ['leicht','mittel'] } },
  { id: 'pilze',         label: 'Pilze',               emoji: '🍄', preferred: { color: ['rot','weiß'],     body: ['mittel'] } },
  { id: 'gegrilltes',    label: 'Gegrilltes / BBQ',    emoji: '🔥', preferred: { color: ['rot'],            body: ['voll'],          tannin: ['kräftig'] } },
  { id: 'dessert_fruit', label: 'Dessert Frucht',      emoji: '🍰', preferred: { color: ['weiß','schaum'],  sweetness: ['lieblich','süß'] } },
  { id: 'schokolade',    label: 'Schokolade',          emoji: '🍫', preferred: { color: ['rot'],            sweetness: ['lieblich'] } },
  { id: 'aperitif',      label: 'Aperitif',            emoji: '🥂', preferred: { color: ['schaum','weiß','rosé'], acidity: ['frisch'] } },
  { id: 'käseplatte',    label: 'Käseplatte',          emoji: '🍽️', preferred: { color: ['rot','weiß'] } },
]

export function dishById(id) { return DISH_CATEGORIES.find(d => d.id === id) }

// Heuristik aus Freitext-Eingabe → Dish-IDs
export function detectDishes(text) {
  const t = (text || '').toLowerCase()
  const map = [
    [/lamm|rind|steak|braten|gulasch|kotelett|filet/, 'rind_lamm'],
    [/reh|hirsch|wild|wildschwein|ente|gans/, 'wild'],
    [/ente|gans/, 'ente_gans'],
    [/schwein|kasseler|haxe/, 'schwein'],
    [/hähnchen|huhn|pute|geflügel|hühnchen/, 'geflügel'],
    [/lachs|thunfisch|forelle/, 'fisch_kräftig'],
    [/seelachs|kabeljau|seezunge|scholle|fisch/, 'fisch_zart'],
    [/garnele|krabbe|hummer|muschel|austern/, 'meeresfrüchte'],
    [/sushi|sashimi/, 'sushi'],
    [/bolognese|tomatensauce|arrabbiata|napoli|pizza|pasta tomate/, 'pasta_tomate'],
    [/carbonara|sahne|alfredo|pasta sahne/, 'pasta_sahne'],
    [/pizza/, 'pizza'],
    [/risotto/, 'risotto'],
    [/parmesan|cheddar|hartkäse|gouda|manchego/, 'käse_hart'],
    [/brie|camembert|ziegenkäse|weichkäse/, 'käse_weich'],
    [/gorgonzola|roquefort|stilton|blauschimmel/, 'käse_blau'],
    [/salat/, 'salat'],
    [/asiatisch|thai|vietnamesisch|süß-scharf/, 'asia_süss'],
    [/curry|indisch|tikka/, 'indisch'],
    [/vegetarisch|vegan|gemüse|gemüsepfanne/, 'gemüse'],
    [/pilz|champignon|steinpilz/, 'pilze'],
    [/grill|bbq|barbecue|spareribs|gegrillt/, 'gegrilltes'],
    [/tiramisu|panna|kuchen|tarte|dessert|nachtisch/, 'dessert_fruit'],
    [/schoko|brownie|mousse/, 'schokolade'],
    [/aperitif|empfang|begrüßung/, 'aperitif'],
    [/käseplatte/, 'käseplatte'],
  ]
  const hits = new Set()
  map.forEach(([re, id]) => { if (re.test(t)) hits.add(id) })
  return [...hits]
}

// Score zwischen Wein und Speisen-Kategorie (0..100)
export function pairingScore(wine, dishId) {
  const dish = dishById(dishId)
  if (!dish) return 0
  const tp = wine.tasteProfile || {}
  const checks = []
  let score = 0

  const want = dish.preferred
  if (want.color) {
    const ok = want.color.includes(wine.color)
    checks.push({ k: 'Farbe', ok, want: want.color.join('/'), got: wine.color })
    score += ok ? 30 : 0
  }
  if (want.body) {
    const ok = !tp.body || want.body.includes(tp.body)
    checks.push({ k: 'Körper', ok, want: want.body.join('/'), got: tp.body || '—' })
    score += ok ? 20 : 0
  }
  if (want.acidity) {
    const ok = !tp.acidity || want.acidity.includes(tp.acidity)
    checks.push({ k: 'Säure', ok, want: want.acidity.join('/'), got: tp.acidity || '—' })
    score += ok ? 15 : 0
  }
  if (want.tannin) {
    const ok = !tp.tannin || want.tannin.includes(tp.tannin)
    checks.push({ k: 'Tannin', ok, want: want.tannin.join('/'), got: tp.tannin || '—' })
    score += ok ? 15 : 0
  }
  if (want.sweetness) {
    const ok = !tp.sweetness || want.sweetness.includes(tp.sweetness)
    checks.push({ k: 'Süße', ok, want: want.sweetness.join('/'), got: tp.sweetness || '—' })
    score += ok ? 15 : 0
  }
  // Bonus: wenn Wein explizit dieses Pairing markiert hat
  if (wine.pairings?.includes(dishId)) score += 20
  // Trinkfenster-Bonus
  const y = new Date().getFullYear()
  if (y >= wine.drinkFrom && y <= wine.drinkUntil) score += 5

  return { score: Math.min(100, score), checks, marked: wine.pairings?.includes(dishId) }
}

// Sortierte Bestandsliste für eine Speise
export function rankWinesForDish(wines, dishId, { onlyInDrinkWindow = false } = {}) {
  const y = new Date().getFullYear()
  return wines
    .filter(w => !onlyInDrinkWindow || (y >= w.drinkFrom && y <= w.drinkUntil))
    .map(w => ({ wine: w, ...pairingScore(w, dishId) }))
    .filter(r => r.score >= 30)
    .sort((a,b) => b.score - a.score)
}

// Aromen-Liste (für Tag-Auswahl)
export const AROMAS = [
  // Frucht
  '🍒 Kirsche','🍓 Erdbeere','🫐 Heidelbeere','🍒 Brombeere',
  '🍐 Birne','🍏 Grüner Apfel','🍑 Pfirsich','🍋 Zitrone','🍊 Orange',
  '🥥 Kokos','🍍 Tropisch','🍇 Schwarze Johannisbeere',
  // Würze
  '🌶️ Pfeffer','🌿 Kräuter','🍂 Tabak','🌰 Nuss','🍫 Schokolade','🧁 Vanille',
  // Erdig
  '🌱 Mineralisch','⛰️ Erdig','🔥 Geröstet','🍯 Honig','🧈 Butter','🪵 Holz','🥖 Brioche',
  // Blumen
  '🌹 Rose','🌸 Veilchen','🌺 Blüten',
]

// Geschmacks-Achsen (in der UI als Slider)
export const TASTE_AXES = [
  { key: 'sweetness', label: 'Süße',   left: 'trocken',     right: 'süß',       steps: ['trocken','halbtrocken','lieblich','süß'] },
  { key: 'body',      label: 'Körper', left: 'leicht',      right: 'voll',      steps: ['leicht','mittel','voll'] },
  { key: 'acidity',   label: 'Säure',  left: 'weich',       right: 'frisch',    steps: ['weich','mittel','frisch'] },
  { key: 'tannin',    label: 'Tannin', left: 'weich',       right: 'kräftig',   steps: ['weich','mittel','kräftig'] },
  { key: 'oak',       label: 'Holz',   left: 'unausgebaut', right: 'starke Eiche', steps: ['unausgebaut','dezent','spürbar','stark'] },
]
