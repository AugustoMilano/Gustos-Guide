import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cx } from '../lib/format.ts'
import { useGuide } from '../state/GuideContext.tsx'

export function Header() {
  const { user, signOut, requestSignIn } = useGuide()
  const location = useLocation()
  const navigate = useNavigate()
  const onHome = location.pathname === '/' || location.pathname.startsWith('/city/')
  const [solid, setSolid] = useState(!onHome)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    if (!onHome) {
      setSolid(true)
      return
    }
    const onScroll = () => setSolid(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onHome])

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const next = query.trim()
    if (!next) return
    navigate(`/search?q=${encodeURIComponent(next)}`)
    setSearchOpen(false)
  }

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-40 border-b',
        solid
          ? 'border-ink/15 bg-cream/95 text-ink backdrop-blur-sm'
          : 'on-navy border-transparent bg-transparent text-cream',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-4">
        <Link to="/" className="font-serif text-[1.65rem] italic leading-none tracking-tight">
          Gusto's Guide
        </Link>
        <form onSubmit={submitSearch} className="ml-auto hidden min-w-0 flex-1 sm:block sm:max-w-md">
          <label htmlFor="site-search" className="sr-only">
            Search places
          </label>
          <input
            id="site-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sandwiches, neighborhoods, dishes"
            className={cx(
              'w-full border-2 bg-transparent px-3 py-2 text-sm',
              solid
                ? 'border-ink placeholder:text-muted'
                : 'border-cream/80 text-cream placeholder:text-cream',
            )}
          />
        </form>
        <button
          type="button"
          className="ml-auto grid h-11 w-11 place-items-center border-2 border-current sm:hidden"
          aria-expanded={searchOpen}
          aria-controls="mobile-search"
          onClick={() => setSearchOpen((open) => !open)}
        >
          <span className="sr-only">{searchOpen ? 'Close search' : 'Open search'}</span>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="7.5" cy="7.5" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M11.5 11.5 L16 16" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <nav aria-label="Account" className="flex items-center gap-2">
          <Link to="/my" className="hidden text-sm font-bold tracking-wide uppercase sm:inline">
            My guides
          </Link>
          {user ? (
            <button type="button" className="btn px-3 py-1 text-sm" onClick={signOut}>
              Sign out
            </button>
          ) : (
            <button type="button" className="btn btn-coral px-3 py-1 text-sm" onClick={() => requestSignIn()}>
              Sign in
            </button>
          )}
        </nav>
      </div>
      {searchOpen && (
        <form id="mobile-search" onSubmit={submitSearch} className="px-4 pb-3 sm:hidden">
          <label htmlFor="mobile-search-input" className="sr-only">
            Search places
          </label>
          <input
            id="mobile-search-input"
            value={query}
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search places"
            className="w-full border-2 border-ink bg-cream px-3 py-2 text-ink placeholder:text-muted"
          />
        </form>
      )}
    </header>
  )
}
