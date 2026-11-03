import { StrictMode } from 'react'
import { LazyMotion } from 'framer-motion'
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
      // A first visit loads its files before the worker runs. Hand it what this page already
      // fetched, so the place opened on that visit also works offline (C4).
      void navigator.serviceWorker.ready.then((ready) => {
        const urls = performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((name) => name.startsWith(location.origin) && /\/(assets|pd|photos)\/|\/status\.js$/.test(new URL(name).pathname))
        ready.active?.postMessage({ type: 'CACHE_URLS', urls })
      })
    })
  })
}

const loadMotionFeatures = () => import('./lib/motion-features.ts').then((module) => module.default)

if (window.location.hostname !== 'www.gustosguide.com') {
  settleAuthUrl()
  watchAuthHash()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {/* m.* components render at once; their animation features arrive in a separate chunk. */}
      <LazyMotion features={loadMotionFeatures} strict>
      <AppProvider>
        <AuthRouterGate>
          <HashRouter>
            <App />
          </HashRouter>
        </AuthRouterGate>
      </AppProvider>
      </LazyMotion>
    </StrictMode>,
  )
}
