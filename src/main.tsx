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

// The worker adds this once so a controlled tab loads the new document instead of the frozen one.
// Remove it without a second navigation. The hash, and anything saved in the browser, stays.
try {
  const current = new URL(window.location.href)
  if (current.searchParams.has('gusto-build')) {
    current.searchParams.delete('gusto-build')
    history.replaceState(history.state, '', `${current.pathname}${current.search}${current.hash}`)
  }
} catch {
  // A bad URL should not block the app.
}

// A new worker calls skipWaiting and navigates clients that are still on the previous bundle.
// This listener covers the next deploy: if a worker takes control of a page that already had one,
// reload once so the new entry chunk runs. The first visit has no controller yet and does not reload.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller)
  if (hadController) {
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return
      try {
        if (sessionStorage.getItem('gusto-sw-reload') === '1') return
        sessionStorage.setItem('gusto-sw-reload', '1')
      } catch {
        // Private mode can block storage. One reload is still safer than keeping the old bundle.
      }
      reloading = true
      window.location.reload()
    })
  }
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem('gusto-chunk-reload')
      sessionStorage.removeItem('gusto-sw-reload')
    } catch {
      // Ignore storage failures.
    }
  }, 10000)
  window.addEventListener('vite:preloadError', ((event: Event) => {
    event.preventDefault()
    try {
      if (sessionStorage.getItem('gusto-chunk-reload') === '1') return
      sessionStorage.setItem('gusto-chunk-reload', '1')
    } catch {
      return
    }
    window.location.reload()
  }) as EventListener)
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
      void registration.update()
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
