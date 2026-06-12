import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ShareView from './modules/cellar/ShareView'
import './index.css'
import { APP_NAME, APP_DESCRIPTION } from './branding'

document.title = APP_NAME
document.querySelector('meta[name="description"]')?.setAttribute('content', APP_DESCRIPTION)

window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

function Root() {
  const hash = window.location.hash
  if (hash.startsWith('#share=')) {
    const encoded = hash.slice('#share='.length)
    return <ShareView encoded={encoded} />
  }
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
