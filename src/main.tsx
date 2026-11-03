import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
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

// Service worker updates never reload the page. A new version waits, takes over while the page
// is in the background, and the next open simply loads it.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((registration) => {
      const activateWhenHidden = () => {
        if (document.visibilityState === 'hidden') registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update()
        else activateWhenHidden()
      })
      window.addEventListener('pagehide', () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' }))
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
