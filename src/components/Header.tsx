import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { dragSheet } from '../lib/motion.ts'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cityPath } from '../lib/city.ts'
import { useCityId } from '../lib/use-city.ts'
import { CitySwitcher } from './CitySwitcher.tsx'
import { SignInSheet } from './SignInSheet.tsx'
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
  const [more, setMore] = useState(false)
  const [bell, setBell] = useState(false)
  const unread = notices.filter((notice) => !notice.read).length
  const navigate = useNavigate()
  const location = useLocation()
  const areaName = useCityId() === 'eastside' ? 'the Eastside' : 'Seattle'
  const bellPanel = useRef<HTMLDivElement>(null)
  const bellDesktop = useRef<HTMLButtonElement>(null)
  const bellMobile = useRef<HTMLButtonElement>(null)
  const menuPanel = useRef<HTMLElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const morePanel = useRef<HTMLDivElement>(null)
  const moreButton = useRef<HTMLButtonElement>(null)
  const [bellRefs] = useState(() => [bellPanel, bellDesktop, bellMobile])
  const [menuRefs] = useState(() => [menuPanel, menuButton])
  const [moreRefs] = useState(() => [morePanel, moreButton])
  const reduceMotion = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)
  const [onHero, setOnHero] = useState(() => location.pathname === '/' || location.pathname === '/seattle' || location.pathname === '/eastside')
  const press = reduceMotion ? undefined : { scale: 0.97 }
  const route = `${location.pathname}${location.search}`

  useEffect(() => {
    const onScroll = () => {
      const hero = document.querySelector('.hero')
      const bar = document.querySelector('.site-header')
      const heroBottom = hero?.getBoundingClientRect().bottom ?? 0
      const barHeight = bar?.getBoundingClientRect().height ?? 0
      setOnHero(heroBottom > barHeight * 0.45)
      setScrolled(window.scrollY > 12)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [route])

  useDismiss(bell, () => setBell(false), bellRefs, true)
  useDismiss(menu, () => setMenu(false), menuRefs)
  useDismiss(more, () => setMore(false), moreRefs, true)

  // Close both popovers when the route changes (adjusting state during render, not in an effect).
  const [lastRoute, setLastRoute] = useState(route)
  if (route !== lastRoute) {
    setLastRoute(route)
    setBell(false)
    setMenu(false)
    setMore(false)
  }

  function toggleBell() {
    setMenu(false)
    setMore(false)
    if (!bell) markNoticesRead()
    setBell(!bell)
  }

  function search(event: FormEvent) {
    event.preventDefault()
    navigate(cityPath(`/search?q=${encodeURIComponent(query.trim())}`))
    setMenu(false)
    setMore(false)
  }

  return (
    <header key={onHero ? 'hero' : 'page'} className={`site-header${onHero ? ' on-hero' : ''}${scrolled && !onHero ? ' is-scrolled' : ''}`}>
      <div className="mx-auto flex w-full max-w-[100rem] items-center gap-3 px-4 py-3">
        <Link to={cityPath('/')} className="shrink-0 font-serif text-3xl italic leading-none">
          Gusto's Guide
        </Link>
        <CitySwitcher />
        <form onSubmit={search} className="site-search ml-auto hidden w-44 shrink-0 lg:block min-[1400px]:w-60">
          <label className="sr-only" htmlFor="site-search">
            Search {areaName}
          </label>
          <input
            id="site-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="glass-input w-full px-3 py-2"
          />
        </form>
        <nav className="site-nav hidden items-center gap-1 text-sm font-bold lg:flex" aria-label="Primary">
          <Link to={cityPath('/explore')} onMouseEnter={() => prefetch('/explore')} onFocus={() => prefetch('/explore')}>Explore</Link>
          <Link to={cityPath('/guides')}>Guides</Link>
          <Link to={cityPath('/tonight')}>Tonight</Link>
          <Link className="nav-wide" to={cityPath('/feed')}>Feed</Link>
          <Link className="nav-wide" to={cityPath('/plans')} onMouseEnter={() => prefetch('/plans/wizard')} onFocus={() => prefetch('/plans/wizard')}>Plans</Link>
          <Link className="nav-wide" to={cityPath('/rank')}>Rank</Link>
          <Link className="nav-wide" to={cityPath('/my')}>My guides</Link>
          {user?.isOwner ? <Link className="nav-wide" to={cityPath('/score')}>Scores</Link> : null}
          {user?.isOwner ? <Link className="nav-wide" to={cityPath('/photos')}>Photos</Link> : null}
          <div className="nav-more relative">
            <button
              type="button"
              ref={moreButton}
              aria-expanded={more}
              aria-controls="more-menu"
              onClick={() => {
                setBell(false)
                setMore((value) => !value)
              }}
            >
              More
            </button>
            <AnimatePresence>
              {more ? (
                <motion.div
                  ref={morePanel}
                  id="more-menu"
                  className="more-sheet"
                  role="group"
                  aria-label="More"
                  initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                >
                  <Link to={cityPath('/feed')} onClick={() => setMore(false)}>Feed</Link>
                  <Link to={cityPath('/plans')} onClick={() => setMore(false)} onFocus={() => prefetch('/plans/wizard')}>Plans</Link>
                  <Link to={cityPath('/rank')} onClick={() => setMore(false)}>Rank</Link>
                  <Link to={cityPath('/my')} onClick={() => setMore(false)}>My guides</Link>
                  {user?.isOwner ? <Link to={cityPath('/score')} onClick={() => setMore(false)}>Scores</Link> : null}
                  {user?.isOwner ? <Link to={cityPath('/photos')} onClick={() => setMore(false)}>Photos</Link> : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <button
            type="button"
            className="relative min-h-11 px-2"
            ref={bellDesktop}
            aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
            aria-expanded={bell}
            aria-controls="notifications-panel"
            onClick={toggleBell}
          >
            Alerts{unread ? ` ${unread}` : ''}
          </button>
          {user ? (
            <>
              <Link to={cityPath(`/u/${user.handle}`)} className="inline-flex max-w-[10rem] items-center gap-2">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" /> : null}
                <span className="truncate">{user.name}</span>
              </Link>
              <button type="button" className="btn text-sm" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <button type="button" className="btn btn-coral text-sm" onClick={() => setOpen(true)}>
              Sign in
            </button>
          )}
        </nav>
        <motion.button
          type="button"
          ref={bellMobile}
          whileTap={press}
          className="glass-icon relative ml-auto inline-flex min-h-11 min-w-11 items-center justify-center px-2 lg:hidden"
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          aria-expanded={bell}
          aria-controls="notifications-panel"
          onClick={toggleBell}
        >
          <BellIcon />
          {unread ? <span className="absolute -top-1.5 -right-1.5 min-w-5 rounded-full bg-coral px-1 text-center text-xs font-bold leading-5">{unread}</span> : null}
        </motion.button>
        <motion.button
          type="button"
          ref={menuButton}
          whileTap={press}
          className="glass-icon inline-flex min-h-11 items-center px-3 text-sm font-bold lg:hidden"
          aria-expanded={menu}
          aria-controls="mobile-menu"
          onClick={() => {
            setBell(false)
            setMenu((value) => !value)
          }}
        >
          {menu ? 'Close' : 'Menu'}
        </motion.button>
      </div>
      <AnimatePresence>
      {menu ? (
        <motion.nav
          ref={menuPanel}
          id="mobile-menu"
          className="menu-sheet glass grid max-h-[calc(100dvh-5.5rem)] gap-2 overflow-y-auto text-sm font-bold lg:hidden"
          aria-label="Menu"
          style={{ transformOrigin: 'top right' }}
          initial={reduceMotion ? false : { opacity: 0, y: -10, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        >
          <form onSubmit={search}>
            <input aria-label={`Search ${areaName}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="glass-input w-full px-3 py-2" />
          </form>
          <CitySwitcher layoutId="city-pill-menu" />
          <Link to={cityPath('/explore')} onClick={() => setMenu(false)} onFocus={() => prefetch('/explore')}>Explore</Link>
          <Link to={cityPath('/guides')} onClick={() => setMenu(false)}>Guides</Link>
          <Link to={cityPath('/tonight')} onClick={() => setMenu(false)}>Tonight</Link>
          <Link to={cityPath('/feed')} onClick={() => setMenu(false)}>Feed</Link>
          <Link to={cityPath('/plans')} onClick={() => setMenu(false)}>Plans</Link>
          <Link to={cityPath('/rank')} onClick={() => setMenu(false)}>Rank</Link>
          <Link to={cityPath('/my')} onClick={() => setMenu(false)}>My guides</Link>
          {user?.isOwner ? <Link to={cityPath('/score')} onClick={() => setMenu(false)}>Scores</Link> : null}
          {user?.isOwner ? <Link to={cityPath('/photos')} onClick={() => setMenu(false)}>Photos</Link> : null}
          <button type="button" className="text-left" aria-label="Notifications" onClick={() => { setMenu(false); setBell(true); markNoticesRead() }}>
            Notifications{unread ? ` (${unread})` : ''}
          </button>
          {user ? (
            <>
              <Link to={cityPath(`/u/${user.handle}`)} className="inline-flex items-center gap-2" onClick={() => setMenu(false)}>
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : null}
                {user.name}
              </Link>
              <button type="button" className="btn" onClick={signOut}>Sign out {user.name}</button>
            </>
          ) : (
            <button type="button" className="btn btn-coral" onClick={() => { setMenu(false); setOpen(true) }}>Sign in</button>
          )}
        </motion.nav>
      ) : null}
      </AnimatePresence>
      <AnimatePresence>
      {bell ? (
        <motion.div
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
                  <Link to={notice.href} onClick={() => setBell(false)}>{notice.text}</Link>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      ) : null}
      </AnimatePresence>
      <SignInSheet open={open} onClose={() => setOpen(false)} />
    </header>
  )
}
