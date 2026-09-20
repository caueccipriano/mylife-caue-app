import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

const APP_VERSION = 'eu-v8-flow-polish'

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
      <App />
    </HashRouter>
  </React.StrictMode>,
)
