import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'

export function SlidingRow({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  const row = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const [mark, setMark] = useState({ x: 0, scale: 1, on: false })

  useLayoutEffect(() => {
    const root = row.current
    if (!root) return
    const measure = () => {
      const selected = root.querySelector<HTMLElement>('[aria-pressed="true"]')
      if (!selected) {
        setMark((current) => (current.on ? { ...current, on: false } : current))
        return
      }
      const scale = Math.max(0.5, selected.offsetWidth / 44)
      const x = selected.offsetLeft
      setMark((current) => (
        current.on && current.x === x && Math.abs(current.scale - scale) < 0.02
          ? current
          : { x, scale, on: true }
      ))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    const onClick = () => requestAnimationFrame(measure)
    root.addEventListener('click', onClick)
    return () => {
      observer.disconnect()
      root.removeEventListener('click', onClick)
    }
  }, [children])

  return (
    <div ref={row} className={`slide-choices chip-row ${className}`} role="group" aria-label={label}>
      <span
        className="choice-mark"
        aria-hidden="true"
        style={{
          opacity: mark.on ? 1 : 0,
          transform: `translate3d(${mark.x}px, 0, 0) scaleX(${mark.scale})`,
          transition: reduce ? 'none' : undefined,
        }}
      />
      {children}
    </div>
  )
}
