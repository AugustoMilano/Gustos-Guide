import { useLayoutEffect, useRef, useState } from 'react'

/** Hide once the bar is pinned and the page is moving down. Show on the way up, and always before it sticks. */
export function nextConcealed(concealed: boolean, y: number, delta: number, stuck: boolean, wasStuck: boolean): boolean {
  if (y <= 8 || !stuck) return false
  if (delta <= -10) return false
  if (delta >= 10 || (!wasStuck && delta > 0)) return true
  return concealed
}

export function useConcealOnScroll(paused = false, resetKey = '') {
  const dock = useRef<HTMLDivElement>(null)
  const [concealed, setConcealed] = useState(false)
  useLayoutEffect(() => {
    if (paused) return
    let last = window.scrollY
    let current = false
    let wasStuck = false
    const offsetOf = () => {
      const probe = document.createElement('div')
      probe.style.cssText = 'position:absolute;visibility:hidden;height:var(--header-offset)'
      document.body.appendChild(probe)
      const offset = probe.getBoundingClientRect().height || 76
      probe.remove()
      return offset
    }
    let offset = offsetOf()
    let lastHeight = document.scrollingElement?.scrollHeight ?? 0
    const onResize = () => { offset = offsetOf() }
    const apply = () => {
      const y = window.scrollY
      const height = document.scrollingElement?.scrollHeight ?? lastHeight
      const shrink = lastHeight - height
      lastHeight = height
      let delta = y - last
      last = y
      // Hiding the subheader shortens the page. A browser clamp at the bottom is not a scroll up.
      if (shrink > 0 && delta < 0 && Math.abs(delta + shrink) <= 4) delta = 0
      const top = dock.current?.getBoundingClientRect().top ?? offset + 1
      const stuck = top <= offset + 2
      const next = nextConcealed(current, y, delta, stuck, wasStuck)
      wasStuck = stuck
      if (next !== current) {
        current = next
        setConcealed(next)
      }
    }
    const onScroll = () => apply()
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [paused, resetKey])
  return { dock, concealed: paused ? false : concealed }
}
