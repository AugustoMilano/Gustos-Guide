import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { dragSheet } from '../lib/motion.ts'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { accountAccessibleName, accountGreeting } from '../lib/account-label.ts'
import { barePath, regionName as areaLabel, areaPhrase, areasFor, CITY_PREFIXES, cityPath, isCityPicker, readRegionMemory, writeRegionMemory } from '../lib/city.ts'
import { SearchField } from './SearchField.tsx'
import { useCityId } from '../lib/use-city-id.ts'
import { AreaKicker } from './AreaKicker.tsx'
import { CitySwitcher } from './CitySwitcher.tsx'
import { LogoMark } from './LogoMark.tsx'
import { SignInSheet } from './SignInSheet.tsx'
import { setStatusBar, watchThemeColor } from '../lib/status-bar.ts'
import { useApp } from '../state/AppState.tsx'

function prefetch(path: string) {
  if (path === '/explore') void import('../pages/ExplorePage.tsx')
  if (path === '/plans/wizard') void import('../pages/PlanPage.tsx')
  if (path.startsWith('/list/')) void import('../pages/ListPage.tsx')
  if (path.startsWith('/join/')) void import('../pages/JoinPage.tsx')
}

// Close a header popover on a tap or click outside it (and outside its trigger), on Escape,
// and optionally on scroll. pointerdown and touchstart both fire so iOS Safari dismisses too.
function useDismiss(open: boolean, close: () => void, refs: RefObject<HTMLElement | null>[], onScroll = false) {
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })
  useEffect(() => {
    if (!open) return
    const inside = (target: EventTarget | null) =>
      target instanceof Node && refs.some((ref) => ref.current?.contains(target))
    const outside = (event: Event) => {
      if (!inside(event.target)) closeRef.current()
    }
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    const scroll = () => closeRef.current()
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('touchstart', outside, { capture: true, passive: true })
    document.addEventListener('keydown', key)
    if (onScroll) window.addEventListener('scroll', scroll, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', outside, true)
      document.removeEventListener('touchstart', outside, true)
      document.removeEventListener('keydown', key)
      if (onScroll) window.removeEventListener('scroll', scroll)
    }
  }, [open, onScroll, refs])
}

const CityButton = m.create(Link)
const SPRING = { type: 'spring' as const, stiffness: 420, damping: 32 }

const HOME_PATHS = new Set(['/', ...CITY_PREFIXES])

function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (!offline) return null
  return <p className="offline-banner" role="status">You are offline. Pages you already opened still work. New ones wait for a connection.</p>
}

function BellIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

export function Header() {
  const { user, signOut, notices, markNoticesRead } = useApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState(false)
  const [bell, setBell] = useState(false)
  const unread = notices.filter((notice) => !notice.read).length
  const bellLabel = unread ? `Notifications, ${unread} unread` : 'Notifications'
  const navigate = useNavigate()
  const location = useLocation()
  const city = useCityId()
  const picker = isCityPicker(location.pathname)
  const linkCity = picker ? readRegionMemory().area : city
  const areaName = areaPhrase(linkCity)
  // Profiles carry their own picker beside the Top 10, so the header skips it there.
  const onProfile = /\/u\/[^/]+\/?$/.test(location.pathname)
  const showAreas = !picker && !onProfile && areasFor(city).length > 1
  const bellPanel = useRef<HTMLDivElement>(null)
  const bellMobile = useRef<HTMLButtonElement>(null)
  const menuPanel = useRef<HTMLElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const [bellRefs] = useState(() => [bellPanel, bellMobile])
  const [menuRefs] = useState(() => [menuPanel, menuButton])
  const reduceMotion = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)
  const [onHero, setOnHero] = useState(() => HOME_PATHS.has(location.pathname))
  const route = `${location.pathname}${location.search}`

  useLayoutEffect(() => {
    const mode = picker ? 'picker' : showAreas ? 'areas' : 'single'
    const root = document.documentElement
    root.dataset.header = mode
    // Short phones use this to fold the map header. Other routes keep the full phone header.
    root.dataset.route = barePath(location.pathname).startsWith('/explore') ? 'explore' : 'page'
    if (!picker) writeRegionMemory(city)
  }, [picker, showAreas, city, location.pathname])

  useLayoutEffect(() => {
    const bar = document.querySelector('.site-header')
    if (!bar) return
    const apply = () => {
      const height = Math.ceil(bar.getBoundingClientRect().height)
      document.documentElement.style.setProperty('--header-offset', `${height}px`)
    }
    apply()
    const frame = requestAnimationFrame(apply)
    const observer = new ResizeObserver(apply)
    observer.observe(bar)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [location.pathname, picker, showAreas])

  useEffect(() => {
    const onScroll = () => {
      const hero = document.querySelector('.hero')
      const bar = document.querySelector('.site-header')
      const heroBottom = hero?.getBoundingClientRect().bottom ?? 0
      const barHeight = bar?.getBoundingClientRect().height ?? 0
      const heroOn = heroBottom > barHeight * 0.45
      setOnHero(heroOn)
      setScrolled(window.scrollY > 12)
      setStatusBar(heroOn ? 'navy' : 'cream')
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [route])

  useEffect(() => watchThemeColor(), [])

  useDismiss(bell, () => setBell(false), bellRefs, true)
  useDismiss(menu, () => {
    setMenu(false)
    menuButton.current?.focus()
  }, menuRefs)

  useEffect(() => {
    if (menu) menuPanel.current?.focus()
  }, [menu])

  // Close both popovers when the route changes (adjusting state during render, not in an effect).
  const [lastRoute, setLastRoute] = useState(route)
  if (route !== lastRoute) {
    setLastRoute(route)
    setBell(false)
    setMenu(false)
  }

  function toggleBell() {
    setMenu(false)
    if (!bell) markNoticesRead()
    setBell(!bell)
  }

  return (
    <header className={`site-header${onHero ? ' on-hero' : ''}${scrolled && !onHero ? ' is-scrolled' : ''}`}>
      <OfflineBanner />
      <div className="header-bar mx-auto flex w-full max-w-[100rem] items-center gap-3 px-4 py-3">
        <div className="brand-lockup">
          <Link viewTransition={!reduceMotion} to={cityPath('/', linkCity)} className="brand-link">
            <LogoMark />
            <span className="wordmark font-serif text-2xl italic leading-none sm:text-3xl">Gusto's Guide</span>
          </Link>
          {picker ? null : (
            <CityButton
              to="/cities"
              className="region-back"
              aria-label={`Switch city, now ${areaLabel(city)}`}
              initial="rest"
              whileHover={reduceMotion ? undefined : 'hover'}
              whileTap={reduceMotion ? undefined : 'press'}
              variants={{
                rest: { scale: 1 },
                hover: { scale: 1.04 },
                press: { scale: 0.96 },
              }}
              transition={reduceMotion ? { duration: 0 } : SPRING}
            >
              <m.span
                className="region-chevron"
                aria-hidden="true"
                variants={{
                  rest: { x: 0 },
                  hover: { x: -3 },
                  press: { x: -1 },
                }}
                transition={reduceMotion ? { duration: 0 } : SPRING}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6 9 12l6 6" />
                </svg>
              </m.span>
              {areaLabel(city)}
            </CityButton>
          )}
        </div>
        {showAreas ? <CitySwitcher /> : null}
        <SearchField
          id="site-search"
          label={`Search ${areaName}`}
          value={query}
          onChange={setQuery}
          onSubmit={(next) => {
            navigate(cityPath(`/search?q=${encodeURIComponent(next)}`, linkCity))
            setMenu(false)
          }}
          className="site-search ml-auto hidden w-44 shrink-0 xl:block min-[1400px]:w-60"
        />
        <nav className="site-nav hidden items-center gap-1 text-sm font-bold xl:flex" aria-label="Primary">
          <Link viewTransition={!reduceMotion} to={cityPath('/explore', linkCity)} aria-current={barePath(location.pathname) === '/explore' ? 'page' : undefined} onMouseEnter={() => prefetch('/explore')} onFocus={() => prefetch('/explore')}>Map</Link>
          <Link viewTransition={!reduceMotion} to={cityPath('/guides', linkCity)} aria-current={barePath(location.pathname) === '/guides' || barePath(location.pathname).startsWith('/guide/') ? 'page' : undefined}>Guides</Link>
          <Link viewTransition={!reduceMotion} to={cityPath('/tonight', linkCity)} aria-current={barePath(location.pathname) === '/tonight' ? 'page' : undefined}>Tonight</Link>
          <Link className="nav-wide" viewTransition={!reduceMotion} to={cityPath('/night', linkCity)} aria-current={barePath(location.pathname) === '/night' ? 'page' : undefined}>Night</Link>
          <Link viewTransition={!reduceMotion} to={cityPath('/top', linkCity)} aria-current={barePath(location.pathname) === '/top' ? 'page' : undefined}>Top 25</Link>
          {user ? (
            <>
              <Link viewTransition={!reduceMotion} to={cityPath(`/u/${user.handle}`, linkCity)} className="inline-flex max-w-[10rem] items-center gap-2" aria-label={accountAccessibleName(user)}>
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" width={32} height={32} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-8 w-8 shrink-0 rounded-full object-cover" /> : null}
                <span className="truncate">{accountGreeting(user)}</span>
              </Link>
            </>
          ) : (
            <button type="button" className="btn btn-coral text-sm" onClick={() => setOpen(true)}>
              Sign in
            </button>
          )}
        </nav>
        <button
          type="button"
          ref={bellMobile}
          className={`bell-btn glass-icon${unread ? ' has-unread' : ''} relative ml-auto inline-flex min-h-11 min-w-11 items-center justify-center px-2`}
          aria-label={bellLabel}
          title={bellLabel}
          aria-expanded={bell}
          aria-controls="notifications-panel"
          onClick={toggleBell}
        >
          <BellIcon />
          {unread ? <span className="bell-count absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-coral px-1 text-center text-xs font-bold leading-5 text-white">{unread}</span> : null}
        </button>
        <button
          type="button"
          ref={menuButton}
          className="menu-btn glass-icon inline-flex min-h-11 items-center px-3 text-sm font-bold"
          aria-expanded={menu}
          aria-controls="mobile-menu"
          onClick={() => {
            setBell(false)
            setMenu((value) => !value)
          }}
        >
          {menu ? 'Close' : 'Menu'}
        </button>
      </div>
      <AnimatePresence>
      {menu ? (
        <m.nav
          ref={menuPanel}
          id="mobile-menu"
          className="menu-sheet glass grid max-h-[calc(100dvh-var(--header-offset)-0.75rem)] gap-2 overflow-y-auto text-sm font-bold"
          tabIndex={-1}
          aria-label="Menu"
          style={{ transformOrigin: 'top right' }}
          initial={reduceMotion ? false : { opacity: 0, y: -10, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        >
          <SearchField
            id="menu-search"
            label={`Search ${areaName}`}
            value={query}
            onChange={setQuery}
            onSubmit={(next) => {
              navigate(cityPath(`/search?q=${encodeURIComponent(next)}`, linkCity))
              setMenu(false)
            }}
          />
          {user ? (
            <div className="menu-account">
              <Link viewTransition={!reduceMotion} to={cityPath(`/u/${user.handle}`, linkCity)} className="menu-account-link" aria-label={accountAccessibleName(user)} onClick={() => setMenu(false)}>
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" width={32} height={32} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" /> : <span className="menu-account-initial" aria-hidden="true">{accountGreeting(user).slice(0, 1)}</span>}
                <span className="truncate">{accountGreeting(user)}</span>
              </Link>
              <button type="button" className="menu-account-out" onClick={() => { setMenu(false); signOut() }}>Sign out</button>
            </div>
          ) : (
            <button type="button" className="btn btn-coral" onClick={() => { setMenu(false); setOpen(true) }}>Sign in</button>
          )}
          <AreaKicker />
          <Link viewTransition={!reduceMotion} to={cityPath('/explore', linkCity)} onClick={() => setMenu(false)} onFocus={() => prefetch('/explore')}>Map</Link>
          <Link viewTransition={!reduceMotion} to={cityPath('/guides', linkCity)} onClick={() => setMenu(false)}>Guides</Link>
          <Link viewTransition={!reduceMotion} to={cityPath('/tonight', linkCity)} onClick={() => setMenu(false)}>Tonight</Link>
          <Link viewTransition={!reduceMotion} to={cityPath('/night', linkCity)} onClick={() => setMenu(false)}>Plan my night</Link>
          <Link viewTransition={!reduceMotion} to={cityPath('/feed', linkCity)} onClick={() => setMenu(false)}>Feed</Link>
          <Link viewTransition={!reduceMotion} to={cityPath('/plans', linkCity)} onClick={() => setMenu(false)}>Plans</Link>
          <Link viewTransition={!reduceMotion} to={cityPath('/rank', linkCity)} onClick={() => setMenu(false)}>Rank</Link>
          <Link viewTransition={!reduceMotion} to={cityPath('/top', linkCity)} onClick={() => setMenu(false)}>Top 25</Link>
          <Link viewTransition={!reduceMotion} to={cityPath('/my', linkCity)} onClick={() => setMenu(false)}>My guides</Link>
          {user?.isOwner ? <Link viewTransition={!reduceMotion} to={cityPath('/score', linkCity)} onClick={() => setMenu(false)}>Scores</Link> : null}
          {user?.isOwner ? <Link viewTransition={!reduceMotion} to={cityPath('/score/quick', linkCity)} onClick={() => setMenu(false)}>Quick score</Link> : null}
          {user?.isOwner ? <Link viewTransition={!reduceMotion} to={cityPath('/photos', linkCity)} onClick={() => setMenu(false)}>Photos</Link> : null}
          <button type="button" className="text-left" aria-label="Notifications" onClick={() => { setMenu(false); setBell(true); markNoticesRead() }}>
            Notifications{unread ? ` (${unread})` : ''}
          </button>
        </m.nav>
      ) : null}
      </AnimatePresence>
      <AnimatePresence>
      {bell ? (
        <m.div
          ref={bellPanel}
          id="notifications-panel"
          className="notice-sheet"
          role="region"
          aria-label="Notifications"
          style={{ transformOrigin: 'top right' }}
          initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        >
          <div className="sheet-grab md:hidden" onPointerDown={(event) => dragSheet(event, bellPanel.current, () => setBell(false))}>
            <span />
          </div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-bold">Notifications</p>
            <button
              type="button"
              className="notice-close"
              aria-label="Close notifications"
              onClick={() => setBell(false)}
            >
              ×
            </button>
          </div>
          {notices.length === 0 ? <p>No notifications yet. Comments and plans show up here.</p> : (
            <ul className="space-y-2">
              {notices.slice(0, 8).map((notice) => (
                <li key={notice.id}>
                  <Link viewTransition={!reduceMotion} to={notice.href} onClick={() => setBell(false)}>{notice.text}</Link>
                </li>
              ))}
            </ul>
          )}
        </m.div>
      ) : null}
      </AnimatePresence>
      <SignInSheet open={open} onClose={() => setOpen(false)} />
    </header>
  )
}
