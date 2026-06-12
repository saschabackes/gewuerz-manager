// ── Changelog ────────────────────────────────────────────────────────────────
// Neueste Version immer OBEN eintragen — APP_VERSION leitet sich daraus ab.
// types: 'new' (Neu), 'improved' (Verbessert), 'fixed' (Behoben)

export const CHANGELOG = [
  {
    version: '1.2.0',
    date: '2026-06-12',
    entries: [
      { type: 'new',      text: 'Kochen ist jetzt ein eigener Bereich in der Navigation – Rezepte sammeln, importieren und kochen.' },
      { type: 'new',      text: 'Bestandscheck im Rezept: zeigt, welche Zutaten du in Gewürzen, TK und Weinkeller schon hast.' },
      { type: 'new',      text: 'Fehlende Zutaten landen mit einem Tipp auf der Einkaufsliste – einzeln oder alle auf einmal.' },
      { type: 'improved', text: 'Rezeptliste zeigt direkt, wie viele Zutaten vorhanden sind (✓) und was fehlt (✗).' },
      { type: 'improved', text: 'Einheitlicher Plus-Button in allen Bereichen unten rechts.' },
      { type: 'fixed',    text: 'Doppelte Registrierung mit bereits vorhandener E-Mail wird jetzt klar gemeldet.' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-06-10',
    entries: [
      { type: 'new',      text: 'Wein-Empfehlungen per Link teilen – Empfänger brauchen kein Konto.' },
      { type: 'new',      text: '„Mail erneut senden" bei der Registrierung, falls die Bestätigungs-Mail nicht ankommt.' },
      { type: 'improved', text: 'Depot-Branding auf dem Anmeldebildschirm.' },
      { type: 'fixed',    text: 'Demo- und Reset-Buttons entfernt, damit echte Daten nicht versehentlich gelöscht werden.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-06-08',
    entries: [
      { type: 'new', text: 'Depot startet: Gewürze, Tiefkühl, Weinkeller und gemeinsame Einkaufsliste in einer App.' },
      { type: 'new', text: 'Setup-Assistenten beim ersten Öffnen jedes Bereichs.' },
      { type: 'new', text: 'Excel-Import für TK und Weinkeller.' },
    ],
  },
]

export const APP_VERSION = CHANGELOG[0].version

// ── „Was ist neu?"-Hinweis ───────────────────────────────────────────────────
const SEEN_KEY = 'depot_changelog_seen'

export function hasUnseenChangelog() {
  return localStorage.getItem(SEEN_KEY) !== APP_VERSION
}

export function markChangelogSeen() {
  localStorage.setItem(SEEN_KEY, APP_VERSION)
}
