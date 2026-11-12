import { useLayoutEffect, useRef, useState } from 'react'

/** Hide once the bar is pinned and the page is moving down. Show on the way up, and always before it sticks. */
export function nextConcealed(concealed: boolean, y: number, delta: number, stuck: boolean, wasStuck: boolean): boolean {
  if (y <= 8 || !stuck) return false
  if (delta <= -10) return false
  if (delta >= 10 || (!wasStuck && delta > 0)) return true
  return concealed
}

/** Keep a running total in one direction. A reverse movement starts over, so jitter does not add up. */
export function accumulate(travel: number, delta: number): number {
  if (delta === 0) return travel
  if (travel !== 0 && Math.sign(travel) !== Math.sign(delta)) return delta
  return travel + delta
}

function readY(): number {
  const root = document.scrollingElement
  if (root) return root.scrollTop
  return window.scrollY || 0
}

function headerOffset(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-offset')
  const value = Number.parseFloat(raw)
  return Number.isFinite(value) ? value : 76
}

/** Flow position. Sticky compositing on iOS reports a stale visual top during momentum, so the pin line comes from offsetTop. */
function flowTop(el: HTMLElement): number {
  let top = 0
  let node: HTMLElement | null = el
  while (node && node !== document.body && node !== document.documentElement) {
    top += node.offsetTop
    node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null
  }
  return top
}

function isStuck(el: HTMLElement | null, y: number, wasStuck: boolean): boolean {
  if (!el) return false
  // The back control and city tabs live in the fixed header. They cover the page whenever it has moved.
  if (el.closest('.site-header')) return y > 24
  const line = flowTop(el) - headerOffset()
  // Once pinned, stay pinned through the header's own height change, or the bar pops back open.
  return wasStuck ? y >= line - 48 : y >= line - 1
}

export function useConcealOnScroll(paused = false, resetKey = '') {
  const dock = useRef<HTMLDivElement>(null)
  const [concealed, setConcealed] = useState(false)
  useLayoutEffect(() => {
    if (paused) return
    let last = readY()
    let current = false
    let wasStuck = false
    let travel = 0
    let lastHeight = document.scrollingElement?.scrollHeight ?? 0
    let touching = false
    let raf = 0
    let still = 0
    let frames = 0

    const apply = () => {
      const y = readY()
      const height = document.scrollingElement?.scrollHeight ?? lastHeight
      const shrink = lastHeight - height
      lastHeight = height
      let delta = y - last
      last = y
      // Hiding the subheader shortens the page. A browser clamp or scroll anchor is not a scroll up.
      if (shrink > 0 && delta < 0 && delta >= -shrink - 16) delta = 0
      const stuck = isStuck(dock.current, y, wasStuck)
      if (y <= 8 || !stuck) travel = 0
      else travel = accumulate(travel, delta)
      const next = nextConcealed(current, y, stuck ? travel : 0, stuck, wasStuck)
      wasStuck = stuck
      if (next !== current) {
        current = next
        travel = 0
        setConcealed(next)
      }
    }

    const pump = () => {
      const before = readY()
      apply()
      frames += 1
      still = readY() === before ? still + 1 : 0
      // Touch drags and the inertial glide after lift-off. iOS often skips window scroll events for both.
      if ((touching || still < 10) && frames < 180) raf = requestAnimationFrame(pump)
      else raf = 0
    }
    const wake = () => {
      still = 0
      frames = 0
      if (!raf) raf = requestAnimationFrame(pump)
    }

    const onTouchStart = () => {
      touching = true
      wake()
    }
    const onTouchEnd = () => {
      touching = false
      still = 0
      frames = 0
      wake()
    }

    apply()
    window.addEventListener('scroll', apply, { passive: true })
    document.addEventListener('scroll', apply, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
    window.addEventListener('touchmove', wake, { passive: true, capture: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true, capture: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true })
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', apply)
      document.removeEventListener('scroll', apply)
      window.removeEventListener('touchstart', onTouchStart, true)
      window.removeEventListener('touchmove', wake, true)
      window.removeEventListener('touchend', onTouchEnd, true)
      window.removeEventListener('touchcancel', onTouchEnd, true)
    }
  }, [paused, resetKey])
  return { dock, concealed: paused ? false : concealed }
}
