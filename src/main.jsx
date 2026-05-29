import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// PWA: Wenn nach einem Deploy ein gecachter JS-Chunk nicht mehr
// auf dem Server existiert, lädt Vite diesen Event. Seite neu laden
// holt die aktuelle Version vom Server.
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
