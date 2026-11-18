import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { PhotoFrame } from './PhotoFrame.tsx'
import { PlaceArt } from './PlaceArt.tsx'
import { ThumbImg } from './ThumbImg.tsx'
import type { DisplayPhoto } from '../lib/gallery.ts'
import { clampView, containSize, tapZoom } from '../lib/zoom-fit.ts'

export function PlaceGallery({
  photos,
  active,
  onChange,
  known = true,
  transitionName,
}: {
  photos: DisplayPhoto[]
  active: number
  onChange: (index: number) => void
  /** False while only the one-photo card is loaded, so the counter is not a false 1/1. */
  known?: boolean
  transitionName?: string
}) {
  const [open, setOpen] = useState(false)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [enter, setEnter] = useState<'next' | 'prev' | null>(null)
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const frame = () => stage.current?.querySelector<HTMLElement>('.photo-frame') ?? null
  // The photo follows a horizontal drag 1:1 (transform only), then slides on or springs back.
  function onStageMove(event: ReactPointerEvent<HTMLElement>) {
    const start = drag.current
    const el = frame()
    if (!start || !el || !many || reduce) return
    const dx = event.clientX - start.x
    if (Math.abs(dx) < Math.abs(event.clientY - start.y)) return
    el.style.transition = 'none'
    el.style.transform = `translate3d(${dx}px, 0, 0)`
  }
  function release() {
    const el = frame()
    if (!el) return
    el.style.transition = reduce ? '' : 'transform 420ms cubic-bezier(0.2, 1.15, 0.3, 1)'
    el.style.transform = ''
  }
  const index = Math.min(active, Math.max(photos.length - 1, 0))
  const photo = photos[index]
  const many = photos.length > 1

  function step(delta: number) {
    if (!many) return
    setEnter(delta > 0 ? 'next' : 'prev')
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
    if (openOnTap) {
      const el = frame()
      if (el) { el.style.transition = 'none'; el.style.transform = '' }
    }
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
        ref={stage}
        className={`photo-stage${enter ? ` enter-${enter}` : ''}`}
        key={`${photo.placeId}:${photo.url ?? photo.key}:${index}`}
        onPointerDown={onPointerDown}
        onPointerMove={onStageMove}
        onPointerUp={(event) => onPointerUp(event, true)}
        onPointerCancel={() => { drag.current = null; release() }}
        onPointerLeave={() => { if (drag.current) { drag.current = null; release() } }}
      >
        <PhotoFrame photo={photo} priority transitionName={transitionName} />
        {known && many ? (
          <>
            <button type="button" className="photo-nav is-prev" aria-label="Previous photo" onPointerDown={(event) => event.stopPropagation()} onClick={() => step(-1)}>‹</button>
            <button type="button" className="photo-nav is-next" aria-label="Next photo" onPointerDown={(event) => event.stopPropagation()} onClick={() => step(1)}>›</button>
          </>
        ) : null}
        {known ? (
          <button type="button" className="photo-expand" aria-label={`View photo ${index + 1} / ${photos.length}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => setOpen(true)}>
            {index + 1} / {photos.length}
          </button>
        ) : null}
      </div>
      {known && many ? (
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
              {shot.url && !shot.illustration ? <ThumbImg url={shot.url} sizes="104px" /> : <PlaceArt id={shot.placeId} cuisine={shot.cuisine} neighborhood={shot.neighborhood} />}
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
  const credit = [photo.illustration ? '' : photo.credit, photo.license].filter(Boolean).join(' · ')

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${photo.alt || 'Photo'} ${index + 1} of ${photos.length}`}>
      <button type="button" className="lightbox-backdrop" aria-label="Close photo" onClick={onClose} />
      <div className="lightbox-bar">
        <p>{index + 1} / {photos.length}</p>
        <button ref={closeRef} type="button" className="btn" onClick={onClose}>Close</button>
      </div>
      <ZoomStage key={photo.url ?? index} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        {photo.url && !photo.illustration ? (
          <img src={photo.url} alt={photo.alt} decoding="async" draggable={false} />
        ) : (
          <PlaceArt id={photo.placeId} cuisine={photo.cuisine} neighborhood={photo.neighborhood} />
        )}
      </ZoomStage>
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

/**
 * Full-screen photo stage. At 1x the whole photo shows (object-fit: contain, letterboxed) and
 * swipes still step photos through the parent handlers. Double-tap or pinch on touch, click or
 * wheel with a mouse, zoom in (1x to 5x); drag, or scroll with a mouse, pans to every edge.
 */
function ZoomStage({
  children,
  onPointerDown,
  onPointerUp,
}: {
  children: ReactNode
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const view = useRef({ scale: 1, x: 0, y: 0 })
  const points = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; scale: number } | null>(null)
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)
  const down = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const lastTap = useRef(0)
  const lastClick = useRef(0)
  const [zoomed, setZoomed] = useState(false)

  const measure = () => {
    const r = box.current?.getBoundingClientRect()
    const img = box.current?.querySelector('img')
    const boxSize = { w: r?.width ?? 0, h: r?.height ?? 0 }
    return { r, boxSize, picture: containSize(boxSize.w, boxSize.h, img?.naturalWidth ?? 0, img?.naturalHeight ?? 0) }
  }
  const apply = (animate: boolean) => {
    const img = box.current?.firstElementChild as HTMLElement | null
    if (!img) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const { scale, x, y } = view.current
    img.style.transition = animate && !reduce ? 'transform 380ms cubic-bezier(0.2, 1.15, 0.3, 1)' : 'none'
    img.style.transform = scale === 1 ? '' : `translate3d(${x}px, ${y}px, 0) scale(${scale})`
    setZoomed(scale > 1.01)
  }
  const clamp = () => {
    const { boxSize, picture } = measure()
    view.current = clampView(view.current, boxSize, picture)
  }
  const zoomAt = (clientX: number, clientY: number, scale: number) => {
    const { r } = measure()
    if (!r) return
    const v = view.current
    const cx = clientX - (r.left + r.width / 2)
    const cy = clientY - (r.top + r.height / 2)
    const k = scale / v.scale
    v.x = cx - (cx - v.x) * k
    v.y = cy - (cy - v.y) * k
    v.scale = scale
    clamp()
  }
  const toggleAt = (clientX: number, clientY: number) => {
    const { boxSize, picture } = measure()
    zoomAt(clientX, clientY, view.current.scale > 1 ? 1 : tapZoom(boxSize, picture))
    apply(true)
  }

  return (
    <div
      ref={box}
      className={`lightbox-stage${zoomed ? ' is-zoomed' : ''}`}
      data-zoom={zoomed ? 'in' : 'fit'}
      onPointerDown={(event) => {
        points.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        down.current = { x: event.clientX, y: event.clientY, moved: false }
        if (points.current.size === 2) {
          const [a, b] = [...points.current.values()]
          pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: view.current.scale }
          pan.current = null
          return
        }
        if (event.pointerType !== 'mouse') {
          const now = Date.now()
          if (now - lastTap.current < 300) {
            toggleAt(event.clientX, event.clientY)
            lastTap.current = 0
            down.current = null
            return
          }
          lastTap.current = now
        }
        if (view.current.scale > 1) {
          pan.current = { x: event.clientX, y: event.clientY, vx: view.current.x, vy: view.current.y }
          event.currentTarget.setPointerCapture?.(event.pointerId)
        } else onPointerDown(event)
      }}
      onPointerMove={(event) => {
        if (!points.current.has(event.pointerId)) return
        points.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        if (down.current && Math.hypot(event.clientX - down.current.x, event.clientY - down.current.y) > 6) down.current.moved = true
        if (pinch.current && points.current.size >= 2) {
          const [a, b] = [...points.current.values()]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.current.scale * (dist / Math.max(1, pinch.current.dist)))
          apply(false)
        } else if (pan.current) {
          view.current.x = pan.current.vx + event.clientX - pan.current.x
          view.current.y = pan.current.vy + event.clientY - pan.current.y
          clamp()
          apply(false)
        }
      }}
      onPointerUp={(event) => {
        points.current.delete(event.pointerId)
        const wasPinch = pinch.current != null
        if (points.current.size < 2) pinch.current = null
        const click = event.pointerType === 'mouse' && down.current && !down.current.moved && !wasPinch
        down.current = null
        if (click) {
          pan.current = null
          // A double-click is two clicks: the second must not undo the first.
          const now = Date.now()
          if (now - lastClick.current > 350) toggleAt(event.clientX, event.clientY)
          lastClick.current = now
          return
        }
        if (pan.current) { pan.current = null; return }
        if (view.current.scale === 1 && points.current.size === 0) onPointerUp(event)
        else apply(true)
      }}
      onPointerCancel={(event) => { points.current.delete(event.pointerId); pinch.current = null; pan.current = null; down.current = null }}
      onWheel={(event) => {
        if (!event.ctrlKey && view.current.scale > 1) {
          view.current.x -= event.deltaX
          view.current.y -= event.deltaY
          clamp()
          apply(false)
          return
        }
        if (!event.ctrlKey && Math.abs(event.deltaY) < 4) return
        zoomAt(event.clientX, event.clientY, view.current.scale * Math.exp(-event.deltaY / 300))
        apply(false)
      }}
    >
      {children}
    </div>
  )
}
