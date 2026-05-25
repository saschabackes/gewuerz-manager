# 🌿 Gewürz Manager

Progressive Web App zur Verwaltung von Gewürzen im Haushalt.

## Features

- **Mehrere Benutzer** – Jeder Haushaltsbewohner hat ein eigenes Konto (lokale Speicherung)
- **4 Verpackungstypen**: Fertigstreuer, Nachfüllpackung, Ganze Gewürze, Eigener Metallstreuer
- **Vorausgefüllte Gewürzliste** mit 100+ deutschen Gewürzen und Mischungen + manuelle Eingabe
- **MHD-Verwaltung** mit farblicher Warnung (grün/gelb/orange/rot)
- **Einkaufsliste** mit Export als PDF oder Text / Teilen-Funktion
- **Barcode-Scanner** via Kamera (für EAN-Codes)
- **PWA** – installierbar auf iOS, Android und Desktop

## Setup & Entwicklung

### Voraussetzungen
- [Node.js](https://nodejs.org/) v18 oder neuer

### Installation

```bash
cd gewuerz-manager
npm install
npm run dev
```

Die App ist dann unter `http://localhost:5173` erreichbar.

### Build für Produktion

```bash
npm run build
npm run preview     # lokale Vorschau des Builds
```

Der `dist/`-Ordner kann auf jeden statischen Hosting-Dienst deployt werden.

## Deployment

### Option A – Netlify / Vercel (empfohlen)

1. `npm run build` ausführen
2. `dist/`-Ordner hochladen oder Git-Repo verbinden
3. Build-Command: `npm run build`, Publish-Dir: `dist`

### Option B – GitHub Pages

```bash
# vite.config.js: base: '/repo-name/' eintragen
npm run build
# dist/ in gh-pages Branch pushen
```

### Option C – Lokal öffnen (ohne Server)

Da die App eine SPA ist, funktioniert das direkte Öffnen der `dist/index.html` **nicht**. Immer einen kleinen Webserver verwenden:

```bash
npm run preview
# oder: npx serve dist
```

## PWA-Icons generieren

Für vollständige PWA-Unterstützung (inklusive iOS-Homescreen-Icon) werden PNG-Icons benötigt:

```bash
npm install -D sharp
node -e "
const sharp = require('sharp');
const svg = Buffer.from('<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" rx=\"22\" fill=\"#16a34a\"/><text y=\".9em\" font-size=\"72\" x=\"50%\" text-anchor=\"middle\" dominant-baseline=\"hanging\" dy=\"10\">🌿</text></svg>');
sharp(svg).resize(192).png().toFile('public/pwa-192x192.png');
sharp(svg).resize(512).png().toFile('public/pwa-512x512.png');
sharp(svg).resize(180).png().toFile('public/apple-touch-icon.png');
console.log('Icons generiert!');
"
```

Oder einen Online-Dienst wie [RealFaviconGenerator](https://realfavicongenerator.net/) nutzen.

## Daten & Datenschutz

Alle Daten werden ausschließlich **lokal im Browser** (localStorage) gespeichert – kein Server, kein Cloud-Sync. Daten werden nur auf dem jeweiligen Gerät gespeichert.

## Tech Stack

- **React 18** + **Vite** – schnelle Entwicklung und Build
- **Tailwind CSS** – utility-first Styling
- **Zustand** – State Management mit localStorage-Persistenz
- **vite-plugin-pwa** – Service Worker + Web App Manifest
- **html5-qrcode** – Barcode-/QR-Scanner
- **jsPDF** – PDF-Export der Einkaufsliste
- **date-fns** – Datums-Berechnungen
