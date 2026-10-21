import { useState } from 'react'

export function StoryShareButton({
  filename,
  title,
  build,
}: {
  filename: string
  title: string
  build: () => Promise<Blob>
}) {
  const [label, setLabel] = useState('Story')
  const [busy, setBusy] = useState(false)

  async function share() {
    if (busy) return
    setBusy(true)
    setLabel('Making story…')
    try {
      const blob = await build()
      const file = new File([blob], filename, { type: 'image/png' })
      const payload = { files: [file], title, text: 'gustosguide.com' }
      const canShare = typeof navigator.canShare === 'function' && navigator.canShare(payload)
      if (canShare && typeof navigator.share === 'function') {
        try {
          await navigator.share(payload)
          setLabel('Story')
          return
        } catch (reason) {
          if (reason instanceof DOMException && reason.name === 'AbortError') {
            setLabel('Story')
            return
          }
        }
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
      setLabel('Saved')
      window.setTimeout(() => setLabel('Story'), 1600)
    } catch {
      setLabel('Try again')
      window.setTimeout(() => setLabel('Story'), 1600)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className="btn text-sm" disabled={busy} aria-label={`Share a story image for ${title}`} onClick={() => void share()}>
      {label}
    </button>
  )
}
