import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import { App } from './App.tsx'
import { AuthRouterGate } from './components/AuthRouterGate.tsx'
import { settleAuthUrl, watchAuthHash } from './lib/auth-callback.ts'
import { AppProvider } from './state/AppState.tsx'
import './index.css'

if (window.location.hostname === 'www.gustosguide.com') {
  const url = new URL(window.location.href)
  url.hostname = 'gustosguide.com'
  window.location.replace(url.toString())
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller)
  let reloading = false
  if (hadController) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    })
  }
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((registration) => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update()
      })
    })
  })
}

if (window.location.hostname !== 'www.gustosguide.com') {
  settleAuthUrl()
  watchAuthHash()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProvider>
        <AuthRouterGate>
          <HashRouter>
            <App />
          </HashRouter>
        </AuthRouterGate>
      </AppProvider>
    </StrictMode>,
  )
}
