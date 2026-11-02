import { Link, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { barePath, cityPath } from '../lib/city.ts'
import { useApp } from '../state/AppState.tsx'

const ICONS: Record<string, string> = {
  home: 'M3.5 11 12 4l8.5 7 M5.5 9.5V20h13V9.5 M10 20v-5.5h4V20',
  map: 'M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z M9 4v13.5 M15 6.5V20',
  guides: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M5 17a3 3 0 0 1 3-3h11 M9 8h6',
  top: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  me: 'M12 4a4 4 0 1 0 .01 0z M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6',
}

/** Phone-only tab bar. The active pill slides between tabs on a spring; taps squash a little. */
export function TabBar() {
  const { pathname } = useLocation()
  const app = useApp()
  const reduce = useReducedMotion()
  const bare = barePath(pathname)
  // The city picker (root and /cities) is a full screen of its own.
  if (pathname === '/' || pathname === '/cities') return null
  if (bare === '/explore' || bare.startsWith('/collection/')) return null
  const me = app.user?.handle ? `/u/${app.user.handle}` : '/my'
  const tabs = [
    { id: 'home', label: 'Home', to: '/', on: bare === '/' },
    { id: 'map', label: 'Map', to: '/explore', on: bare.startsWith('/explore') },
    { id: 'guides', label: 'Guides', to: '/guides', on: bare.startsWith('/guide') },
    { id: 'top', label: 'Top 25', to: '/top', on: bare.startsWith('/top') },
    { id: 'me', label: app.user ? 'Me' : 'Saved', to: me, on: bare.startsWith('/u/') || bare === '/my' },
  ]
  return (
    <nav className="tab-bar glass" aria-label="Main">
      {tabs.map((tab) => (
        <motion.div key={tab.id} className="tab-cell" whileTap={reduce ? undefined : { scale: 0.86 }} transition={{ type: 'spring', stiffness: 600, damping: 22 }}>
          <Link to={cityPath(tab.to)} className={`tab-link${tab.on ? ' is-on' : ''}`} aria-current={tab.on ? 'page' : undefined} viewTransition={!reduce}>
            {tab.on ? <motion.span layoutId="tab-pill" className="tab-pill" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 34 }} /> : null}
            <motion.svg
              viewBox="0 0 24 24"
              className="tab-icon"
              aria-hidden="true"
              animate={tab.on && !reduce ? { y: [0, -3, 0], scale: [1, 1.12, 1] } : { y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 14 }}
            >
              <path d={ICONS[tab.id]} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
            <span className="tab-label">{tab.label}</span>
          </Link>
        </motion.div>
      ))}
    </nav>
  )
}
