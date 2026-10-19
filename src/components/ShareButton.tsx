import { useState } from 'react'

export function ShareButton({ title, url, className = 'btn text-sm' }: { title: string; url: string; className?: string }) {
  const [label, setLabel] = useState('Share')

  async function share() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
        return
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setLabel('Copied')
    } catch {
      setLabel('Copy the link')
    }
    window.setTimeout(() => setLabel('Share'), 1600)
  }

  return (
    <button type="button" className={className} onClick={() => void share()}>
      {label}
    </button>
  )
}
