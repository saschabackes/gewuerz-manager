import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

// Lokales HTTPS-Zertifikat (erzeugt mit mkcert)
function loadCert() {
  try {
    return {
      key: fs.readFileSync(path.resolve('192.168.178.73+2-key.pem')),
      cert: fs.readFileSync(path.resolve('192.168.178.73+2.pem')),
    }
  } catch {
    return undefined
  }
}

// Unter `netlify dev` proxyt Netlify per HTTP → dort HTTPS aus + fester Port.
const underNetlify = !!process.env.NETLIFY_DEV
const isDepot = process.env.VITE_ENABLE_MODULES === '1'

export default defineConfig({
  server: {
    host: true,
    port: parseInt(process.env.PORT || '5173', 10),
    strictPort: !process.env.PORT,
    https: (underNetlify || process.env.PORT) ? false : loadCert(),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: isDepot ? 'Depot' : 'Gewürzmanager',
        short_name: isDepot ? 'Depot' : 'Gewürze',
        description: isDepot
          ? 'Depot — Dein Haushalt, organisiert. Gewürze, Tiefkühl, Wein & Einkauf.'
          : 'Gewürzmanager — Gewürze, MHD, Füllstände und Einkaufsliste.',
        theme_color: '#0D7377',
        background_color: '#f9fafb',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
      },
    }),
  ],
})
