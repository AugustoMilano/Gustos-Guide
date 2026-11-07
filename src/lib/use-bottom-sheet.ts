import { useEffect, useRef, type RefObject } from 'react'

export type Detent = 'peek' | 'half' | 'full'
const ORDER: Detent[] = ['full', 'half', 'peek']
// The app's spring curve, as used by the sheet before (fix70) and the glass buttons.
const SPRING = 'transform 520ms cubic-bezier(0.2, 1.15, 0.3, 1)'
const PHONE = '(max-width: 767px)'

/**
 * Apple Maps-style bottom sheet for phones. The sheet element is a fixed full-height panel moved
 * only with transform: translateY on itself (never on the cards or buttons inside its scroller).
 * The handle/header listens with passive:false so it can follow the finger 1:1; the list scroller
 * listens passively and only takes over a downward drag that starts at scrollTop 0.
 */
export function useBottomSheet(
  sheet: RefObject<HTMLElement | null>,
  head: RefObject<HTMLElement | null>,
  scroller: RefObject<HTMLElement | null>,
  detent: Detent,
  setDetent: (next: Detent) => void,
) {
  const current = useRef(detent)
  current.current = detent
  const setRef = useRef(setDetent)
  setRef.current = setDetent

  useEffect(() => {
    const el = sheet.current
    const handle = head.current
    const list = scroller.current
    if (!el || !handle || !list) return
    const phone = window.matchMedia(PHONE)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

    const offsets = () => {
      const height = el.offsetHeight
      const peek = Math.max(0, height - handle.offsetHeight)
      return { full: 0, half: Math.round(height * 0.45), peek } as Record<Detent, number>
    }
    const place = (y: number, animate: boolean) => {
      if (!phone.matches) {
        el.style.transform = ''
        el.style.transition = ''
        return
      }
      if (animate && !reduce.matches) {
        el.style.transition = SPRING
      } else {
        // Jump, then arm the spring again so the next detent still moves.
        // A resize observer was leaving the transition at none.
        el.style.transition = 'none'
      }
      el.style.transform = `translate3d(0, ${y}px, 0)`
      if (!animate && !reduce.matches) {
        void el.offsetHeight
        el.style.transition = SPRING
      }
      obstruct()
    }
    const obstruct = () => {
      const shell = el.closest('.explore-shell')
      if (!(shell instanceof HTMLElement) || !phone.matches) return
      const top = el.getBoundingClientRect().top
      const bottom = shell.getBoundingClientRect().bottom
      shell.style.setProperty('--explore-peek', `${Math.max(0, Math.round(bottom - top))}px`)
    }
    const settle = (to: Detent) => place(offsets()[to], true)

    let drag: { startY: number; base: number; y: number; lastY: number; lastT: number; v: number; fromList: boolean } | null = null
    const begin = (clientY: number, fromList: boolean) => {
      const base = offsets()[current.current]
      drag = { startY: clientY, base, y: base, lastY: clientY, lastT: performance.now(), v: 0, fromList }
    }
    const follow = (clientY: number) => {
      if (!drag) return
      const o = offsets()
      let y = drag.base + (clientY - drag.startY)
      // Rubber band past the top and bottom detents.
      if (y < o.full) y = o.full - Math.sqrt(o.full - y) * 4
      if (y > o.peek) y = o.peek + Math.sqrt(y - o.peek) * 4
      const now = performance.now()
      const dt = Math.max(1, now - drag.lastT)
      drag.v = 0.8 * ((clientY - drag.lastY) / dt) + 0.2 * drag.v
      drag.lastY = clientY
      drag.lastT = now
      drag.y = y
      place(y, false)
      obstruct()
    }
    const end = () => {
      if (!drag) return
      const { y, v, base: drag0 } = drag
      drag = null
      const o = offsets()
      const travel = y - drag0
      let target: Detent
      // One detent per gesture. A downward flick used to skip half and land on peek,
      // so the middle stop was almost unreachable.
      if (Math.abs(v) > 0.45 || Math.abs(travel) > 56) {
        const index = ORDER.indexOf(current.current)
        const down = v > 0.45 || (Math.abs(v) <= 0.45 && travel > 0)
        const next = Math.max(0, Math.min(ORDER.length - 1, index + (down ? 1 : -1)))
        target = ORDER[next]
      } else {
        const projected = y + v * 120
        target = ORDER.reduce((best, d) => (Math.abs(o[d] - projected) < Math.abs(o[best] - projected) ? d : best), current.current)
      }
      if (target === current.current) settle(target)
      else setRef.current(target)
    }

    // Handle: non-passive so the page never scrolls or zooms while the sheet follows the finger.
    const hStart = (e: TouchEvent) => { if (phone.matches) begin(e.touches[0].clientY, false) }
    const hMove = (e: TouchEvent) => { if (drag && !drag.fromList) { e.preventDefault(); follow(e.touches[0].clientY) } }
    // List: passive. Only a pull down from the very top drags the sheet; everything else is native scroll.
    let listStart: number | null = null
    const lStart = (e: TouchEvent) => { listStart = phone.matches && list.scrollTop <= 0 ? e.touches[0].clientY : null }
    const lMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY
      if (!drag && listStart != null && list.scrollTop <= 0 && y - listStart > 8) begin(listStart + 8, true)
      if (drag && drag.fromList) follow(y)
    }
    handle.addEventListener('touchstart', hStart, { passive: true })
    handle.addEventListener('touchmove', hMove, { passive: false })
    handle.addEventListener('touchend', end)
    handle.addEventListener('touchcancel', end)
    list.addEventListener('touchstart', lStart, { passive: true })
    list.addEventListener('touchmove', lMove, { passive: true })
    list.addEventListener('touchend', end)
    list.addEventListener('touchcancel', end)
    const onResize = () => {
      place(offsets()[current.current], false)
      obstruct()
    }
    window.addEventListener('resize', onResize)
    phone.addEventListener('change', onResize)
    const header = document.querySelector('.site-header')
    const watch = new ResizeObserver(onResize)
    watch.observe(handle)
    if (header) watch.observe(header)
    place(offsets()[current.current], false)
    obstruct()
    return () => {
      watch.disconnect()
      handle.removeEventListener('touchstart', hStart)
      handle.removeEventListener('touchmove', hMove)
      handle.removeEventListener('touchend', end)
      handle.removeEventListener('touchcancel', end)
      list.removeEventListener('touchstart', lStart)
      list.removeEventListener('touchmove', lMove)
      list.removeEventListener('touchend', end)
      list.removeEventListener('touchcancel', end)
      window.removeEventListener('resize', onResize)
      phone.removeEventListener('change', onResize)
    }
  }, [sheet, head, scroller])

  // Detent changes from state (buttons, map taps, a finished drag) spring into place.
  useEffect(() => {
    const el = sheet.current
    const handle = head.current
    if (!el || !handle || !window.matchMedia(PHONE).matches) return
    const height = el.offsetHeight
    const y = detent === 'full' ? 0 : detent === 'half' ? Math.round(height * 0.45) : Math.max(0, height - handle.offsetHeight)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.style.transition = reduce ? 'none' : SPRING
    el.style.transform = `translate3d(0, ${y}px, 0)`
    const shell = el.closest('.explore-shell')
    if (shell instanceof HTMLElement) {
      const top = el.getBoundingClientRect().top
      const bottom = shell.getBoundingClientRect().bottom
      shell.style.setProperty('--explore-peek', `${Math.max(0, Math.round(bottom - top))}px`)
    }
  }, [detent, sheet, head])
}
