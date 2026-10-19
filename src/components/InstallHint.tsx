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
      <p className="font-serif text-2xl italic">Add to Home Screen</p>
      <p className="mt-1 text-sm">Tap Share, then Add to Home Screen. Guides you have opened stay on the phone.</p>
      <button
        type="button"
        className="btn mt-3"
        onClick={() => {
          localStorage.setItem('gusto.install-hint', 'hide')
          setOpen(false)
        }}
      >
        Got it
      </button>
    </div>
  )
}
