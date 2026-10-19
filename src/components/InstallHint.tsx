import { useState } from 'react'

function iosBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iphone = /iPhone|iPad|iPod/.test(ua)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  return iphone && !standalone
}

export function InstallHint() {
  const [open, setOpen] = useState(() => {
    if (!iosBrowser()) return false
    return localStorage.getItem('gusto.install-hint') !== 'hide'
  })
  if (!open) return null
  return (
    <div className="install-hint" role="status">
      <button
        type="button"
        className="btn"
        onClick={() => {
          localStorage.setItem('gusto.install-hint', 'hide')
          setOpen(false)
        }}
      >
        Got it
      </button>
      <p>Add to Home Screen from Share. Guides you open stay on the phone.</p>
    </div>
  )
}
