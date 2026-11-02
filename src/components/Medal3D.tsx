import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { badgeBackSvg, badgeEdge, badgeMetal } from '../lib/badge-art.ts'
import { achievementArt, type Achievement } from '../lib/achievements.ts'

const EDGE_LAYERS = 7

/**
 * A two-sided medal in CSS 3D. Drag or swipe sideways to spin it; it carries momentum,
 * then springs to the nearest face. At rest it idles with a slight tilt and a moving shine.
 * Reduced motion: no spin or idle; a tap flips it.
 */
export function Medal3D({ a, engraved, size = 224 }: { a: Achievement; engraved: { top: string; date?: string; middle: string; bottom?: string }; size?: number }) {
  const reduce = useReducedMotion()
  const rotor = useRef<HTMLDivElement>(null)
  const state = useRef({ angle: 0, v: 0, dragging: false, lastX: 0, lastT: 0, startX: 0, moved: false, t0: performance.now(), raf: 0 })
  const [flipped, setFlipped] = useState(false)
  const metal = a.earned ? badgeMetal(a.spec) : 'silver'

  useEffect(() => {
    const s = state.current
    const el = rotor.current
    if (!el) return
    if (reduce) {
      el.style.transform = `rotateY(${flipped ? 180 : 0}deg)`
      return
    }
    const tick = (now: number) => {
      if (!s.dragging) {
        if (Math.abs(s.v) > 0.15) {
          s.angle += s.v
          s.v *= 0.95
        } else {
          // Spring to the nearest face.
          const target = Math.round(s.angle / 180) * 180
          const force = (target - s.angle) * 0.08
          s.v = (s.v + force) * 0.78
          s.angle += s.v
        }
      }
      const idle = s.dragging ? 0 : Math.sin((now - s.t0) / 1400) * 7
      const tilt = s.dragging ? 0 : Math.cos((now - s.t0) / 1900) * 5
      el.style.transform = `rotateX(${tilt.toFixed(2)}deg) rotateY(${(s.angle + idle).toFixed(2)}deg)`
      el.style.setProperty('--shine', `${(((s.angle + idle) % 360) + 360) % 360}`)
      s.raf = requestAnimationFrame(tick)
    }
    s.raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(s.raf)
  }, [reduce, flipped])

  const onDown = (event: React.PointerEvent) => {
    if (reduce) return
    const s = state.current
    s.dragging = true
    s.moved = false
    s.startX = s.lastX = event.clientX
    s.lastT = performance.now()
    s.v = 0
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }
  const onMove = (event: React.PointerEvent) => {
    const s = state.current
    if (!s.dragging) return
    const now = performance.now()
    const dx = event.clientX - s.lastX
    s.angle += dx * 0.7
    const dt = Math.max(1, now - s.lastT)
    s.v = ((dx * 0.7) / dt) * 16
    s.lastX = event.clientX
    s.lastT = now
    if (Math.abs(event.clientX - s.startX) > 4) s.moved = true
  }
  const onUp = () => {
    const s = state.current
    if (!s.dragging) return
    s.dragging = false
    // A tap without a drag gives it a flick to the other side.
    if (!s.moved) s.v = 9.5
    s.v = Math.max(-40, Math.min(40, s.v))
  }

  return (
    <div
      className="medal3d"
      style={{ width: size, height: size }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onClick={reduce ? () => setFlipped((v) => !v) : undefined}
      role="img"
      aria-label={`${a.title} medal. Drag to turn it over.`}
    >
      <div ref={rotor} className="medal3d-rotor">
        {Array.from({ length: EDGE_LAYERS }, (_, i) => (
          <span key={i} className="medal3d-edge" style={{ transform: `translateZ(${(i - (EDGE_LAYERS - 1) / 2) * 1.1}px)` }} dangerouslySetInnerHTML={{ __html: badgeEdge(a.spec).svg }} />
        ))}
        <div className={`medal3d-face medal3d-front ${a.earned ? '' : 'is-locked'}`}>
          <span className="medal3d-art" dangerouslySetInnerHTML={{ __html: achievementArt(a) }} />
          <span className="medal3d-shine" aria-hidden="true" />
        </div>
        <div className="medal3d-face medal3d-back">
          <span className="medal3d-art" dangerouslySetInnerHTML={{ __html: badgeBackSvg(a.spec, metal) }} />
          <span className={`medal3d-engrave medal3d-engrave-${metal}`}>
            <span className="medal3d-eng-top">{engraved.top}</span>
            {engraved.date ? <span className="medal3d-eng-date">{engraved.date}</span> : null}
            <span className="medal3d-eng-mid">{engraved.middle}</span>
            {engraved.bottom ? <span className="medal3d-eng-bot">{engraved.bottom}</span> : null}
          </span>
          <span className="medal3d-shine" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
