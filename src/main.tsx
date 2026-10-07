import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import CentralAuthGate from './CentralAuthGate'
import './styles.css'
import './life-os.css'
import './money.css'
import './central-auth.css'
import './polish.css'
import './command-center.css'
import './visual-polish-v23.css'
import './ambient-home.css'
import './v25-adaptive.css'
import './v26-brain.css'
import './v27-stability.css'
import './v30-unified.css'
import './v31-alive.css'
import './v32-assistant.css'
import './v34-fluid.css'
import './v35-system.css'
import './v36-finance.css'
import './v37-money-management.css'
import './v38-planning-future.css'

const APP_VERSION = 'eu-v38-planning-future'

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

function routeSharedContent() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('share') !== '1') return

  const title = params.get('title')?.trim()
  const text = params.get('text')?.trim()
  const url = params.get('url')?.trim()
  const parts = [title, text, url].filter(Boolean) as string[]
  if (!parts.length) return

  const capture = new URLSearchParams({
    texto: parts.join('\n'),
    tipo: url ? 'Referência' : 'Memória',
    area: 'Pessoal',
    origem: 'share',
  })

  window.history.replaceState({}, '', window.location.pathname)
  window.location.hash = '/capturar?' + capture.toString()
}

routeSharedContent()

window.addEventListener('load', () => {
  void refreshPwaShell()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <CentralAuthGate>
        <App />
      </CentralAuthGate>
    </HashRouter>
  </React.StrictMode>,
)
