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

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    https: underNetlify ? false : loadCert(),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Gewürz Manager',
        short_name: 'Gewürze',
        description: 'Gewürz-Verwaltung für den Haushalt',
        theme_color: '#16a34a',
        background_color: '#f0fdf4',
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
