export const COMMON_SPICES = [
  // Kräuter (frisch/getrocknet)
  'Basilikum', 'Oregano', 'Thymian', 'Rosmarin', 'Salbei', 'Petersilie',
  'Schnittlauch', 'Dill', 'Majoran', 'Bohnenkraut', 'Liebstöckel',
  'Estragon', 'Melisse', 'Pfefferminze', 'Lavendel', 'Lorbeerblätter',
  'Kerbel', 'Brunnenkresse', 'Zitronenthymian', 'Zitronenmelisse',

  // Pfeffer & Schärfe
  'Schwarzer Pfeffer', 'Weißer Pfeffer', 'Grüner Pfeffer', 'Bunter Pfeffer',
  'Piment', 'Cayennepfeffer', 'Chili gemahlen', 'Chiliflocken',
  'Szechuanpfeffer', 'Langer Pfeffer', 'Kubebenpfeffer',

  // Paprika
  'Paprika edelsüß', 'Paprika scharf', 'Paprika geräuchert', 'Paprika rosenscharf',

  // Warme Gewürze
  'Zimt gemahlen', 'Zimtstangen', 'Kardamom gemahlen', 'Kardamomkapseln',
  'Nelken gemahlen', 'Nelken ganz', 'Sternanis', 'Piment ganz',
  'Muskatnuss gemahlen', 'Muskatnuss ganz', 'Muskatblüte',
  'Ingwer gemahlen', 'Kurkuma gemahlen', 'Safran',

  // Kümmel & Co.
  'Kümmel gemahlen', 'Kümmel ganz', 'Kreuzkümmel gemahlen', 'Kreuzkümmel ganz',
  'Fenchelsamen', 'Anissamen', 'Schwarzkümmel', 'Bockshornklee',

  // Mediterrane & Orientalische Gewürze
  'Koriander gemahlen', 'Koriandersamen', 'Sumach', 'Za\'atar', 'Harissa',
  'Ras el Hanout', 'Baharat', 'Berbere', 'Dukkah', 'Advieh',

  // Asiatische Gewürze
  'Galgant', 'Zitronengras', 'Kaffirlimettenblätter', 'Curryblätter',
  'Tamarinde', 'Asafoetida', 'Shichimi Togarashi', 'Furikake',

  // Salze
  'Meersalz', 'Steinsalz', 'Himalayasalz', 'Fleur de Sel', 'Räuchersalz',
  'Kräutersalz', 'Knoblauchsalz', 'Selleriesalz',

  // Zwiebel & Knoblauch
  'Knoblauchpulver', 'Knoblauchgranulat', 'Zwiebelpulver', 'Zwiebelflocken',
  'Schalottenpulver', 'Bärlauchpulver',

  // Gewürzmischungen
  'Curry mild', 'Curry scharf', 'Garam Masala', 'Tandoori Masala',
  'Italienische Kräuter', 'Herbes de Provence', 'Bouquet garni',
  'Grillgewürz', 'Gyrosgewürz', 'Kebabgewürz', 'Dönergewürz',
  'Mexicanische Gewürzmischung', 'Cajun Gewürz', 'Chili con Carne Gewürz',
  'Fischgewürz', 'Geflügelgewürz', 'Wildgewürz', 'Sauerbratengewürz',
  'Lebkuchengewürz', 'Spekulatiusgewürz', 'Glühweingewürz', 'Chai Gewürz',
  'Pumpkin Spice', 'BBQ Rub', 'Steak Seasoning',

  // Süße Gewürze & Backen
  'Vanilleextrakt', 'Vanillezucker', 'Vanilleschoten', 'Tonkabohne',
  'Kakao', 'Kakaonibs', 'Zitronenschale getrocknet', 'Orangenschale getrocknet',

  // Andere
  'Meerrettich getrocknet', 'Wasabipulver', 'Senfkörner gelb', 'Senfkörner braun',
  'Senfsaat', 'Wacholderbeeren', 'Kapern',
].sort((a, b) => a.localeCompare(b, 'de'))

export const PACKAGING_TYPES = [
  { id: 'fertigstreuer', label: 'Fertigstreuer', description: 'z.B. Ostmann – Menge in g + Anzahl Einheiten', color: 'blue' },
  { id: 'nachfuell', label: 'Nachfüllpackung', description: 'Lose Ware – Menge in g', color: 'purple' },
  { id: 'ganz', label: 'Ganze Gewürze', description: 'z.B. Muskatnuss – Stückzahl', color: 'amber' },
  { id: 'metallstreuer', label: 'Eigener Metallstreuer', description: 'Selbst befüllt – Anzahl Streuer', color: 'slate' },
]

export const PACKAGING_COLORS = {
  fertigstreuer: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400' },
  nachfuell: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-400' },
  ganz: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
  metallstreuer: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
}

// ── Kategorie-Farben (Farbname → Tailwind-Klassen) ───────────────────────────
// Kategorien selbst kommen aus der DB (spice_categories-Tabelle)

export const CATEGORY_COLORS = {
  green:  { bg: 'bg-green-100',  text: 'text-green-700'  },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700' },
  amber:  { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700' },
  red:    { bg: 'bg-red-100',    text: 'text-red-700'    },
  gray:   { bg: 'bg-gray-100',   text: 'text-gray-600'   },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  slate:  { bg: 'bg-slate-100',  text: 'text-slate-600'  },
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  teal:   { bg: 'bg-teal-100',   text: 'text-teal-700'   },
}
