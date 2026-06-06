# 🌿 Gewürz-Manager

Eine Progressive Web App (PWA) zur Verwaltung des Gewürz-Vorrats im Haushalt –
mit Foto, Füllstand, Mindesthaltbarkeit, Einkaufsliste, Haushalts-Teilen und
einem „Kochen"-Modus, der zu einem Rezept die passenden Gläser (ältestes/leerstes
zuerst) vorschlägt.

## Features

- **Vorratsverwaltung** – Gewürze mit Foto, Marke, Verpackungstyp, Menge, Lagerort & Kategorie
- **Produktfoto-Suche** – automatisch über Google Images (SerpAPI), Fallback Open Food Facts
- **Barcode-Scanner** – Produkt per EAN anlegen (Open Food Facts)
- **Füllstand & Nachkaufen** – 4-stufiger Füllstand, automatischer Nachkauf-Hinweis (gruppenbewusst)
- **MHD-Tracking** – Ablaufdaten mit Warnstufen, eigene MHD-Ansicht
- **Einkaufsliste** – eingebaut oder direkt in **Bring!** (auch per Alexa)
- **Haushalt teilen** – Familie per Einladungscode, Freunde mit eigener Sammlung
- **Benutzerverwaltung** – Haushaltsinhaber & globaler Betreiber-Bereich (Super-Admin)
- **Aktivitätsverlauf** – wer hat was geändert (für geteilte Haushalte)
- **Kochen** – Rezept als Text einfügen oder **Cookidoo-Link** importieren →
  Zuteilung der Gewürze nach MHD/Füllstand
- **Dark Mode**, Onboarding-Tour, ausführliche In-App-Hilfe
- **PWA** – installierbar auf iOS, Android und Desktop

## Tech-Stack

- **Frontend:** React 18 + Vite, Zustand (State), Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Serverless:** Netlify Functions (Proxys für Bring!, Cookidoo, Bildsuche, User-Admin)
- **Weitere:** html5-qrcode (Scanner), date-fns, vite-plugin-pwa
- **Hosting:** Netlify

## Lokale Entwicklung

Voraussetzung: [Node.js](https://nodejs.org/) v18+

```bash
npm install
npm run dev      # Dev-Server (http://localhost:5173)
npm run build    # Production-Build (→ dist/)
npm run preview  # Build lokal testen
```

## Environment-Variablen

Alle Secrets liegen in Umgebungsvariablen – **nichts davon gehört in den Code**.
Lokal in eine `.env` (steht in `.gitignore`), in Produktion in den
Netlify-Environment-Variablen.

### Frontend (Build-Zeit, Präfix `VITE_`)

| Variable | Zweck |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Projekt-URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon-Key (öffentlich, durch RLS abgesichert) |
| `VITE_SUPER_ADMIN_EMAIL` | E-Mail, die den Betreiber-Tab sichtbar macht |

### Netlify Functions (serverseitig, geheim)

| Variable | Zweck |
|---|---|
| `SUPABASE_URL` | Supabase Projekt-URL (serverseitig) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service-Role-Key – **streng geheim**, umgeht RLS |
| `SUPER_ADMIN_EMAIL` | E-Mail des Betreibers (serverseitige Berechtigungsprüfung) |
| `SERP_API_KEY` | SerpAPI-Key für die Produktfoto-Suche (optional) |

> Bring!- und Cookidoo-Zugangsdaten werden **nicht** als Env-Var gespeichert,
> sondern pro Nutzer zur Laufzeit eingegeben (Cookidoo: in den Supabase-User-Metadaten).

## Datenbank (Supabase)

Tabellen, alle mit aktivierter **Row Level Security** (haushaltsbasiert):

- `households`, `household_members`
- `spices`, `spice_categories`, `storage_locations`
- `shopping_items`
- `activity_log`

Auth über Supabase Auth (E-Mail-Bestätigung + Passwort-Reset aktiviert).

## Deployment (Netlify)

1. Repo mit Netlify verbinden
2. Build-Command `npm run build`, Publish-Dir `dist`
3. Alle Environment-Variablen (siehe oben) in Netlify hinterlegen
4. Functions liegen automatisch unter `netlify/functions/`

## Sicherheit

- Keine Secrets im Repo oder in der Git-Historie
- Datenzugriff ausschließlich über RLS-Policies (haushaltsgebunden)
- Service-Role-Key nur serverseitig in Netlify Functions
- Drittanbieter-Logins (Bring!, Cookidoo) laufen über serverseitige Proxys

## Hinweis zu Drittanbieter-Integrationen

Die Bring!- und Cookidoo-Anbindungen nutzen **inoffizielle, reverse-engineerte
APIs**. Sie können sich jederzeit ändern und sind nicht von den jeweiligen
Anbietern unterstützt. Nutzung auf eigene Verantwortung mit dem eigenen Konto.

## Lizenz

Privates Projekt – alle Rechte vorbehalten, sofern nicht anders angegeben.
