// ── Changelog ────────────────────────────────────────────────────────────────
// Neueste Version immer OBEN eintragen — APP_VERSION leitet sich daraus ab.
// types: 'new' (Neu), 'improved' (Verbessert), 'fixed' (Behoben)

export const CHANGELOG = [
  {
    version: '2.1.0',
    date: '2026-06-13',
    entries: [
      { type: 'new',      text: 'Rezept-Filter: nach Quelle (Cookidoo, YouTube, …), Favoriten und Verfügbarkeit filtern.' },
      { type: 'new',      text: 'Sortierung: Rezepte nach Neueste, A–Z oder Verfügbarkeit sortieren.' },
      { type: 'new',      text: 'Favoriten: Rezepte mit einem Stern markieren und gezielt filtern.' },
      { type: 'new',      text: 'Kategorien: Cookidoo-Kategorien werden beim Sync als Tags übernommen.' },
      { type: 'improved', text: 'Tag-Vorschläge: beim Bearbeiten eines Rezepts werden vorhandene Tags vorgeschlagen.' },
    ],
  },
  {
    version: '2.0.0',
    date: '2026-06-13',
    entries: [
      { type: 'new',      text: 'Dashboard: Neue Startseite mit Überblick über alle Bereiche, ablaufende Items und täglichen Kochvorschlägen.' },
      { type: 'new',      text: 'Kochvorschläge: Rezepte werden nach Verfügbarkeit der Zutaten im Bestand gerankt – bald ablaufende Zutaten werden bevorzugt.' },
      { type: 'new',      text: 'Weinempfehlungen: passende Weine aus dem eigenen Keller zu jedem Rezeptvorschlag.' },
      { type: 'new',      text: 'KptnCook-Import: Rezepte per Share-Link aus KptnCook importieren.' },
      { type: 'new',      text: 'Cookidoo-Sync: Listen auswählen und gezielt Rezepte mit Fotos importieren.' },
      { type: 'new',      text: 'Dashboard anpassbar: Sektionen ein-/ausblenden und Reihenfolge ändern.' },
      { type: 'improved', text: '„Alle löschen" in Admin-Bereich verschoben, mit Löschung nach Rezeptquelle.' },
    ],
  },
  {
    version: '1.9.0',
    date: '2026-06-13',
    entries: [
      { type: 'improved', text: 'TK und Weinkeller werden jetzt in der Cloud gespeichert – Daten bleiben auch nach Cache-Leerung erhalten und sind auf allen Geräten synchron.' },
      { type: 'improved', text: 'Bestehende lokale TK- und Wein-Daten werden beim ersten Login automatisch migriert.' },
    ],
  },
  {
    version: '1.8.0',
    date: '2026-06-13',
    entries: [
      { type: 'improved', text: 'Sicherheits-Härtung: CORS eingeschränkt, API-Endpoints mit Authentifizierung geschützt, SSRF-Schutz für Rezeptimport.' },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-06-13',
    entries: [
      { type: 'improved', text: '„Probiert" heißt jetzt „Weintagebuch" – persönlicher und passender.' },
      { type: 'new',      text: 'Wein-Archiv: Weine im Tagebuch archivieren, um irrelevante auszublenden. Bleiben über Bestand/Lager auffindbar.' },
      { type: 'new',      text: 'Lagerort bearbeiten: Regal und Fach bei Weinen und TK-Einträgen nachträglich ändern.' },
      { type: 'new',      text: 'TK-Einträge bearbeiten: Name, Kategorie, Portionen und Lagerort anpassen.' },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-06-13',
    entries: [
      { type: 'new',      text: 'Mehrfachauswahl: Einträge auswählen und gebündelt löschen – in allen Bereichen.' },
      { type: 'new',      text: 'Bereich leeren: alle Einträge eines Moduls mit einem Klick löschen (mit Bestätigung).' },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-06-13',
    entries: [
      { type: 'new',      text: 'Wein-Import: importierte Flaschen landen jetzt im Einräumen-Dialog, wo du Regal und Fach zuweisen kannst.' },
      { type: 'improved', text: 'Einräumen-Badge im Weinkeller zeigt wartende Flaschen an.' },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-06-13',
    entries: [
      { type: 'new',      text: '„Was ist neu?" erscheint jetzt automatisch nach Updates.' },
      { type: 'new',      text: 'Feedback direkt aus der App: Bugs melden oder Features wünschen – landet als GitHub Issue.' },
      { type: 'fixed',    text: 'YouTube-Rezeptimport liefert jetzt zuverlässig Titel, Zutaten und Beschreibung.' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-06-13',
    entries: [
      { type: 'new',      text: 'Einladungs-Links: Familienmitglieder treten jetzt per Link automatisch bei – kein Code-Abtippen mehr.' },
      { type: 'new',      text: 'Eigene Domain: Depot ist jetzt unter depotapp.online erreichbar.' },
      { type: 'improved', text: 'Einladungstexte an alle Module angepasst (nicht mehr nur Gewürze).' },
      { type: 'fixed',    text: 'Betreiber-Ansicht zeigte keine Nutzer an (fehlende Hilfsfunktionen nach Refactoring).' },
    ],
  },
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
