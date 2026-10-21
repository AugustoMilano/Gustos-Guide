import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { PhotoFrame } from './PhotoFrame.tsx'
import type { DisplayPhoto } from '../lib/gallery.ts'

export function PlaceGallery({
  photos,
  active,
  onChange,
  transitionName,
}: {
  photos: DisplayPhoto[]
  active: number
  onChange: (index: number) => void
  transitionName?: string
}) {
  const [open, setOpen] = useState(false)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const index = Math.min(active, Math.max(photos.length - 1, 0))
  const photo = photos[index]
  const many = photos.length > 1

  function step(delta: number) {
    if (!many) return
    onChange((index + delta + photos.length) % photos.length)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return
    drag.current = { x: event.clientX, y: event.clientY }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>, openOnTap: boolean) {
    const start = drag.current
    drag.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (many && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      step(dx < 0 ? 1 : -1)
      return
    }
    if (openOnTap && Math.abs(dx) < 8 && Math.abs(dy) < 8) setOpen(true)
  }

  if (!photo) return null

  return (
    <div className="place-gallery" data-noswipe="">
      <div
        className="photo-stage"
        onPointerDown={onPointerDown}
        onPointerUp={(event) => onPointerUp(event, true)}
      >
        <PhotoFrame photo={photo} priority transitionName={transitionName} />
        {many ? (
          <>
            <button type="button" className="photo-nav is-prev" aria-label="Previous photo" onPointerDown={(event) => event.stopPropagation()} onClick={() => step(-1)}>‹</button>
            <button type="button" className="photo-nav is-next" aria-label="Next photo" onPointerDown={(event) => event.stopPropagation()} onClick={() => step(1)}>›</button>
          </>
        ) : null}
        <button type="button" className="photo-expand" aria-label={`View photo ${index + 1} of ${photos.length}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => setOpen(true)}>
          {index + 1} / {photos.length}
        </button>
      </div>
      {many ? (
        <div className="photo-strip" role="tablist" aria-label="Photos">
          {photos.map((shot, shotIndex) => (
            <button
              key={shot.key}
              type="button"
              role="tab"
              aria-selected={shotIndex === index}
              className={`photo-thumb${shotIndex === index ? ' is-on' : ''}`}
              aria-label={`Photo ${shotIndex + 1} of ${photos.length}`}
              onClick={() => onChange(shotIndex)}
            >
              {shot.url && !shot.illustration ? <img src={shot.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <span>Illustration</span>}
            </button>
          ))}
        </div>
      ) : null}
      {open ? (
        <Lightbox
          photos={photos}
          index={index}
          onStep={step}
          onClose={() => setOpen(false)}
          onPointerDown={onPointerDown}
          onPointerUp={(event) => onPointerUp(event, false)}
        />
      ) : null}
    </div>
  )
}

function Lightbox({
  photos,
  index,
  onStep,
  onClose,
  onPointerDown,
  onPointerUp,
}: {
  photos: DisplayPhoto[]
  index: number
  onStep: (delta: number) => void
  onClose: () => void
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const stepRef = useRef(onStep)
  const closeFn = useRef(onClose)
  stepRef.current = onStep
  closeFn.current = onClose
  const photo = photos[index]
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFn.current()
      if (event.key === 'ArrowRight') stepRef.current(1)
      if (event.key === 'ArrowLeft') stepRef.current(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  if (!photo) return null
  const credit = [photo.illustration ? 'Illustration' : photo.credit, photo.license].filter(Boolean).join(' · ')

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${photo.alt || 'Photo'} ${index + 1} of ${photos.length}`}>
      <button type="button" className="lightbox-backdrop" aria-label="Close photo" onClick={onClose} />
      <div className="lightbox-bar">
        <p>{index + 1} / {photos.length}</p>
        <button ref={closeRef} type="button" className="btn" onClick={onClose}>Close</button>
      </div>
      <div className="lightbox-stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        {photo.url && !photo.illustration ? (
          <img src={photo.url} alt={photo.alt} decoding="async" />
        ) : (
          <p className="font-serif text-4xl italic">Illustration</p>
        )}
      </div>
      {photos.length > 1 ? (
        <div className="lightbox-nav">
          <button type="button" className="btn" onClick={() => onStep(-1)}>Previous</button>
          <button type="button" className="btn" onClick={() => onStep(1)}>Next</button>
        </div>
      ) : null}
      {credit ? <p className="lightbox-credit">{credit}{photo.creditUrl ? <> · <a href={photo.creditUrl}>Source</a></> : null}</p> : null}
    </div>
  )
}
