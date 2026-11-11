import { useEffect, useRef, useState } from 'react'

/** Hide once the bar is pinned and the page is moving down. Show on the way up, and always before it sticks. */
export function nextConcealed(concealed: boolean, y: number, delta: number, stuck: boolean, wasStuck: boolean): boolean {
  if (y <= 8 || !stuck) return false
  if (delta <= -10) return false
  if (delta >= 10 || (!wasStuck && delta > 0)) return true
  return concealed
}

export function useConcealOnScroll(paused = false) {
  const dock = useRef<HTMLDivElement>(null)
  const [concealed, setConcealed] = useState(false)
  useEffect(() => {
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
    const onResize = () => { offset = offsetOf() }
    const apply = () => {
      const y = window.scrollY
      const delta = y - last
      last = y
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
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [paused])
  return { dock, concealed: paused ? false : concealed }
}
