import { useEffect, useRef, useState, type ReactNode } from 'react'

const TRIGGER = 72

/**
 * Touch pull-to-refresh for the top of a page. The content and a small fork spinner move
 * with the finger (transform only), then spring back once the refresh settles.
 */
export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void>; children: ReactNode }) {
  const body = useRef<HTMLDivElement>(null)
  const dial = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let startY = 0
    let pull = 0
    let active = false
    const paint = (y: number, settle = false) => {
      const ease = settle ? 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s' : 'none'
      if (body.current) {
        body.current.style.transition = ease
        body.current.style.transform = reduce || y === 0 ? '' : `translateY(${y}px)`
      }
      if (dial.current) {
        dial.current.style.transition = ease
        dial.current.style.opacity = String(Math.min(1, y / TRIGGER))
        dial.current.style.transform = `translateY(${Math.min(y, TRIGGER) - 40}px) rotate(${y * 4}deg)`
      }
    }
    const start = (e: TouchEvent) => {
      if (window.scrollY > 0 || busy) return
      startY = e.touches[0].clientY
      active = true
    }
    const move = (e: TouchEvent) => {
      if (!active) return
      const dy = e.touches[0].clientY - startY
      if (dy <= 0) { pull = 0; paint(0); return }
      pull = Math.min(120, dy * 0.5)
      paint(pull)
    }
    const end = () => {
      if (!active) return
      active = false
      if (pull >= TRIGGER) {
        setBusy(true)
        paint(TRIGGER * 0.75, true)
        dial.current?.classList.add('is-spinning')
        void onRefresh().finally(() => {
          dial.current?.classList.remove('is-spinning')
          setBusy(false)
          paint(0, true)
        })
      } else {
        paint(0, true)
      }
      pull = 0
    }
    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('touchmove', move, { passive: true })
    window.addEventListener('touchend', end)
    return () => {
      window.removeEventListener('touchstart', start)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
    }
  }, [onRefresh, busy])
  return (
    <div className="ptr">
      <div ref={dial} className="ptr-dial" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M8 3v6a4 4 0 0 0 8 0V3 M12 3v18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </div>
      {busy ? <p className="sr-only" role="status">Refreshing</p> : null}
      <div ref={body}>{children}</div>
    </div>
  )
}
