import { useEffect, useState } from 'react'

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const HIDE = 'gusto.install-hint'
const VISITS = 'gusto.visits'

function standalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

function iosBrowser(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !standalone()
}

/** Counts this visit once per tab session and returns the total. */
function countVisit(): number {
  try {
    const seen = sessionStorage.getItem(VISITS) === '1'
    const total = Number(localStorage.getItem(VISITS) ?? '0') + (seen ? 0 : 1)
    if (!seen) {
      localStorage.setItem(VISITS, String(total))
      sessionStorage.setItem(VISITS, '1')
    }
    return total
  } catch {
    return 0
  }
}

/**
 * Add to Home Screen (C4). Waits for a second visit so a first look is never interrupted. iPhone and
 * iPad get the Share-sheet steps; browsers that offer an install prompt get an Install button.
 */
export function InstallHint() {
  const [visits] = useState(() => (typeof window === 'undefined' ? 0 : countVisit()))
  const [hidden, setHidden] = useState(() => typeof window === 'undefined' || localStorage.getItem(HIDE) === 'hide' || standalone())
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPrompt)
    }
    const onInstalled = () => setHidden(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(HIDE, 'hide')
    setHidden(true)
  }

  if (hidden || visits < 2) return null
  if (prompt) {
    return (
      <div className="install-hint" role="status">
        <button
          type="button"
          className="btn"
          onClick={() => {
            void prompt.prompt()
            void prompt.userChoice.then(() => setPrompt(null)).finally(dismiss)
          }}
        >
          Install
        </button>
        <p>Keep Gusto&rsquo;s Guide on your home screen. Guides you open work offline.</p>
        <button type="button" className="install-hint-close" aria-label="Not now" onClick={dismiss}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
    )
  }
  if (!iosBrowser()) return null
  return (
    <div className="install-hint" role="status">
      <button type="button" className="btn" onClick={dismiss}>
        Got it
      </button>
      <p>
        Tap Share{' '}
        <svg className="install-hint-share" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 1.5v8.5M5 4.5l3-3 3 3M4 7H3v7.5h10V7h-1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {' '}then Add to Home Screen. Guides you open work offline.
      </p>
    </div>
  )
}
