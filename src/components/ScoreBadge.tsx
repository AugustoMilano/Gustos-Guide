import { useEffect, useRef, useState } from 'react'

export function scoreBand(score: number): { label: string; tone: 'best' | 'great' | 'good' | 'fine' | 'skip' } {
  if (score >= 9) return { label: 'Best of the best', tone: 'best' }
  if (score >= 8) return { label: 'Great', tone: 'great' }
  if (score >= 7) return { label: 'Good', tone: 'good' }
  if (score >= 6) return { label: "It's fine", tone: 'fine' }
  return { label: 'Skip', tone: 'skip' }
}

export function ScoreBadge({ score, size = 'md' }: { score: number | null; size?: 'md' | 'sm' }) {
  if (score == null && size === 'sm') {
    return (
      <p className="score-badge score-badge-sm is-muted" aria-label="Gusto's Score, not yet rated">
        <small>Gusto's</small>
        <strong>—</strong>
        <span>Not yet rated</span>
      </p>
    )
  }
  if (score == null) {
    return (
      <p className="score-badge is-muted">
        <small>Gusto's</small>
        <strong>Not yet rated</strong>
      </p>
    )
  }
  const band = scoreBand(score)
  return (
    <p className={`score-badge tone-${band.tone} ${size === 'sm' ? 'score-badge-sm' : ''}`} aria-label={`Gusto's Score ${score.toFixed(1)}, ${band.label}`}>
      <small>Gusto's</small>
      <CountUp value={score} />
      <span>{band.label}</span>
    </p>
  )
}

const seen = new Set<string>()

/**
 * The score ticks up from a little below its value the first time it scrolls into view,
 * always shown to one decimal. Text only, no layout shift: the width is reserved by tabular numerals.
 */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLElement>(null)
  const key = value.toFixed(1)
  const [shown, setShown] = useState(value)
  useEffect(() => {
    const el = ref.current
    if (!el || seen.size > 400 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value)
      return
    }
    const from = Math.max(0, value - 2)
    let raf = 0
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      seen.add(key)
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / 700)
        const eased = 1 - (1 - t) ** 3
        setShown(from + (value - from) * eased)
        if (t < 1) raf = requestAnimationFrame(step)
      }
      setShown(from)
      raf = requestAnimationFrame(step)
    }, { threshold: 0.6 })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, key])
  return <strong ref={ref} className="tabular-nums">{shown.toFixed(1)}</strong>
}
