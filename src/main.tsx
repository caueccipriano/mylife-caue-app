import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

const APP_VERSION = 'organic-2'

async function refreshPwaShell() {
  if (!('serviceWorker' in navigator)) return

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()

    for (const registration of registrations) {
      await registration.update()
    }

    const storedVersion = localStorage.getItem('eu-app-version')
    if (storedVersion !== APP_VERSION) {
      localStorage.setItem('eu-app-version', APP_VERSION)
    }
  } catch {
    // A atualização do shell não pode impedir o app de abrir.
  }
}

window.addEventListener('load', () => {
  void refreshPwaShell()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
