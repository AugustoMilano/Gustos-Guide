import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { m, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity } from 'framer-motion'

// The imperative animator is the heaviest part of the motion library, so it loads on first use
// (a tab tap or the first scroll that minimizes the bar), not with the first paint.
type Animatable = Parameters<typeof import('framer-motion').animate>[0]
function springTo(value: Animatable, target: number) {
  void import('framer-motion').then(({ animate }) => { animate(value as never, target, SNAP as never) })
}
import { barePath, cityPath } from '../lib/city.ts'
import { loadMapLibraries } from '../lib/load-maplibre.ts'
import { useApp } from '../state/AppState.tsx'

const ICONS: Record<string, string> = {
  home: 'M3.5 11 12 4l8.5 7 M5.5 9.5V20h13V9.5 M10 20v-5.5h4V20',
  map: 'M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z M9 4v13.5 M15 6.5V20',
  guides: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M5 17a3 3 0 0 1 3-3h11 M9 8h6',
  top: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  me: 'M12 4a4 4 0 1 0 .01 0z M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6',
}

const SNAP = { type: 'spring' as const, stiffness: 520, damping: 36, mass: 0.9 }
const PAD = 6

/** Refraction works only where backdrop-filter accepts an SVG filter (Chromium). Safari and Firefox keep plain glass. */
function supportsRefraction(): boolean {
  if (typeof window === 'undefined' || typeof CSS === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPhone|iPad|Safari\//.test(ua) && !/Chrome|CriOS|Android/.test(ua)) return false
  if (/Firefox/.test(ua)) return false
  return CSS.supports('backdrop-filter', 'url(#lg-refract)')
}

/**
 * Phone tab bar in the iOS 26 manner: a floating glass capsule with a glass lens on the open tab.
 * Press and slide across the bar; the lens follows the finger, stretches with speed, and snaps to a tab on release.
 */
export function TabBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const app = useApp()
  const reduce = useReducedMotion() ?? false
  const bare = barePath(pathname)
  const bar = useRef<HTMLDivElement>(null)
  const [cell, setCell] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const [pressed, setPressed] = useState(false)
  const [mini, setMini] = useState(false)
  const [refract, setRefract] = useState(false)
  const drag = useRef<{ id: number; startX: number; moved: boolean } | null>(null)
  const skipClick = useRef(false)

  const x = useMotionValue(0)
  const velocity = useVelocity(x)
  const stretch = useSpring(useTransform(velocity, (v) => Math.min(Math.abs(v) / 2400, 0.28)), { stiffness: 600, damping: 30 })
  const lift = useSpring(1, { stiffness: 520, damping: 26 })
  const scaleX = useTransform([stretch, lift] as const, ([s, l]: number[]) => (1 + s) * l)
  const scaleY = useTransform([stretch, lift] as const, ([s, l]: number[]) => (1 - s * 0.45) * l)

  // Shown on every page but the city picker, map and collection pages included, so every section stays one tap away.
  const hidden = pathname === '/' || pathname === '/cities'
  const me = app.user?.handle ? `/u/${app.user.handle}` : '/my'
  const tabs = [
    { id: 'home', label: 'Home', to: '/', on: bare === '/' },
    { id: 'map', label: 'Map', to: '/explore', on: bare.startsWith('/explore') },
    { id: 'guides', label: 'Guides', to: '/guides', on: bare.startsWith('/guide') },
    { id: 'top', label: 'Top 25', to: '/top', on: bare.startsWith('/top') },
    { id: 'me', label: app.user ? 'Me' : 'Saved', to: me, on: bare.startsWith('/u/') || bare === '/my' },
  ]
  const active = tabs.findIndex((tab) => tab.on)

  useEffect(() => setRefract(supportsRefraction()), [])

  // Measure one cell; the lens is one cell wide.
  useLayoutEffect(() => {
    const root = bar.current
    if (!root) return
    const measure = () => setCell((root.clientWidth - PAD * 2) / tabs.length)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  }, [hidden, tabs.length])

  // Park the lens on the open tab whenever the route changes.
  useEffect(() => {
    if (!cell || drag.current) return
    const target = PAD + Math.max(active, 0) * cell
    if (reduce || x.get() === 0) x.set(target)
    else springTo(x, target)
  }, [active, cell, reduce, x])

  // Shrink while reading down the page; return on the way up (iOS 26 minimize).
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (Math.abs(y - last) < 8) return
      setMini(y > last && y > 160)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (hidden) return null

  // Pointer position in the bar's own (unscaled) pixels, so the minimized scale never skews the lens.
  const localX = (clientX: number) => {
    const root = bar.current
    if (!root) return 0
    const rect = root.getBoundingClientRect()
    const scale = rect.width / (root.clientWidth || rect.width) || 1
    return (clientX - rect.left) / scale
  }
  const indexAt = (clientX: number) => {
    if (!cell) return 0
    return Math.max(0, Math.min(tabs.length - 1, Math.floor((localX(clientX) - PAD) / cell)))
  }
  const follow = (clientX: number) => {
    const width = bar.current?.clientWidth ?? 0
    x.set(Math.max(PAD, Math.min(width - PAD - cell, localX(clientX) - cell / 2)))
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    drag.current = { id: event.pointerId, startX: event.clientX, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
    setPressed(true)
    setMini(false)
    setHover(indexAt(event.clientX))
    if (!reduce) lift.set(1.12)
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.id !== event.pointerId) return
    if (!state.moved && Math.abs(event.clientX - state.startX) > 6) state.moved = true
    if (state.moved && !reduce) follow(event.clientX)
    setHover(indexAt(event.clientX))
  }
  const finish = (event: PointerEvent<HTMLDivElement>, cancel = false) => {
    const state = drag.current
    if (!state || state.id !== event.pointerId) return
    drag.current = null
    setPressed(false)
    setHover(null)
    lift.set(1)
    const index = cancel ? Math.max(active, 0) : indexAt(event.clientX)
    const target = PAD + index * cell
    if (reduce) x.set(target)
    else springTo(x, target)
    if (!cancel) {
      skipClick.current = true
      window.setTimeout(() => { skipClick.current = false }, 400)
      if (index !== active || !tabs[index].on) navigate(cityPath(tabs[index].to), { viewTransition: !reduce })
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 }
    const links = [...(bar.current?.querySelectorAll<HTMLAnchorElement>('[role="tab"]') ?? [])]
    const at = links.indexOf(document.activeElement as HTMLAnchorElement)
    if (at < 0) return
    let next = at
    if (event.key in keys) next = (at + keys[event.key] + links.length) % links.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = links.length - 1
    else return
    event.preventDefault()
    links[next]?.focus()
  }

  const lit = hover ?? active

  return (
    <nav aria-label="Main" className={`lg-dock${mini ? ' is-mini' : ''}`}>
      <svg width="0" height="0" className="lg-defs" aria-hidden="true" focusable="false">
        <filter id="lg-refract" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale="26" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div
        ref={bar}
        role="tablist"
        aria-label="Sections"
        className={`lg-bar${refract ? ' has-refract' : ''}${pressed ? ' is-pressed' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => finish(event)}
        onPointerCancel={(event) => finish(event, true)}
        onKeyDown={onKeyDown}
      >
        <span className="lg-sheen" aria-hidden="true" />
        {cell ? (
          <m.span
            className={`lg-lens${pressed ? ' is-lifted' : ''}`}
            aria-hidden="true"
            style={{ x, width: cell, scaleX: reduce ? 1 : scaleX, scaleY: reduce ? 1 : scaleY, opacity: active < 0 && !pressed ? 0 : 1 }}
          />
        ) : null}
        {tabs.map((tab, index) => (
          <Link
            key={tab.id}
            role="tab"
            aria-selected={tab.on}
            aria-current={tab.on ? 'page' : undefined}
            tabIndex={tab.on || (active < 0 && index === 0) ? 0 : -1}
            to={cityPath(tab.to)}
            draggable={false}
            className={`lg-tab${index === lit ? ' is-lit' : ''}${tab.on ? ' is-on' : ''}`}
            viewTransition={!reduce}
            onMouseEnter={tab.id === 'map' ? () => void loadMapLibraries() : undefined}
            onFocus={tab.id === 'map' ? () => void loadMapLibraries() : undefined}
            onClick={(event) => {
              // A press already navigated on release; keyboard and assistive clicks come through here.
              if (skipClick.current) event.preventDefault()
            }}
          >
            <svg viewBox="0 0 24 24" className="lg-icon" aria-hidden="true">
              <path d={ICONS[tab.id]} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="lg-label">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
