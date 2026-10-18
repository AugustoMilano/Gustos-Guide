import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SignInSheet } from './SignInSheet.tsx'
import { useApp } from '../state/AppState.tsx'

function prefetch(path: string) {
  if (path === '/explore') void import('../pages/ExplorePage.tsx')
  if (path === '/plans/wizard') void import('../pages/PlanPage.tsx')
  if (path.startsWith('/list/')) void import('../pages/ListPage.tsx')
  if (path.startsWith('/join/')) void import('../pages/JoinPage.tsx')
}

export function Header() {
  const { user, signOut, notices, markNoticesRead } = useApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState(false)
  const [bell, setBell] = useState(false)
  const unread = notices.filter((notice) => !notice.read).length
  const navigate = useNavigate()

  function search(event: FormEvent) {
    event.preventDefault()
    navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    setMenu(false)
  }

  return (
    <header className="site-header">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link to="/" className="font-serif text-3xl italic leading-none">
          Gusto's Guide
        </Link>
        <form onSubmit={search} className="ml-auto hidden min-w-0 flex-1 md:block md:max-w-[14rem]">
          <label className="sr-only" htmlFor="site-search">
            Search Seattle
          </label>
          <input
            id="site-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Places, guides, neighborhoods"
            className="w-full border-2 border-ink bg-cream px-3 py-2"
          />
        </form>
        <nav className="ml-auto hidden items-center gap-3 text-sm font-bold md:flex" aria-label="Primary">
          <Link to="/explore" onMouseEnter={() => prefetch('/explore')} onFocus={() => prefetch('/explore')}>Explore</Link>
          <Link to="/guides">Guides</Link>
          <Link to="/feed">Feed</Link>
          <Link to="/plans" onMouseEnter={() => prefetch('/plans/wizard')} onFocus={() => prefetch('/plans/wizard')}>Plans</Link>
          <Link to="/rank">Rank</Link>
          <Link to="/my">My guides</Link>
          <button
            type="button"
            className="relative min-h-11 px-2"
            aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
            aria-expanded={bell}
            onClick={() => {
              setBell((value) => !value)
              markNoticesRead()
            }}
          >
            Alerts{unread ? ` ${unread}` : ''}
          </button>
          {user ? (
            <>
              <Link to={`/u/${user.handle}`}>{user.name}</Link>
              <button type="button" className="btn text-sm" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <button type="button" className="btn btn-coral text-sm" onClick={() => setOpen(true)}>
              Sign in
            </button>
          )}
        </nav>
        <button type="button" className="ml-auto inline-flex min-h-11 items-center border-2 border-ink bg-cream px-3 text-sm font-bold md:hidden" aria-expanded={menu} onClick={() => setMenu((value) => !value)}>
          Menu
        </button>
      </div>
      {menu ? (
        <nav className="grid gap-2 border-t-2 border-ink px-4 py-3 text-sm font-bold md:hidden" aria-label="Mobile">
          <form onSubmit={search}>
            <input aria-label="Search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="w-full border-2 border-ink bg-cream px-3 py-2" />
          </form>
          <Link to="/explore" onClick={() => setMenu(false)} onFocus={() => prefetch('/explore')}>Explore</Link>
          <Link to="/guides" onClick={() => setMenu(false)}>Guides</Link>
          <Link to="/feed" onClick={() => setMenu(false)}>Feed</Link>
          <Link to="/plans" onClick={() => setMenu(false)}>Plans</Link>
          <Link to="/rank" onClick={() => setMenu(false)}>Rank</Link>
          <Link to="/my" onClick={() => setMenu(false)}>My guides</Link>
          <button type="button" className="text-left" aria-label="Notifications" onClick={() => { setBell(true); markNoticesRead() }}>
            Notifications{unread ? ` (${unread})` : ''}
          </button>
          {user ? (
            <>
              <Link to={`/u/${user.handle}`} onClick={() => setMenu(false)}>{user.name}</Link>
              <button type="button" className="btn" onClick={signOut}>Sign out {user.name}</button>
            </>
          ) : (
            <button type="button" className="btn btn-coral" onClick={() => setOpen(true)}>Sign in</button>
          )}
        </nav>
      ) : null}
      {bell ? (
        <div className="absolute top-full right-4 z-50 mt-1 w-80 max-w-[calc(100%-2rem)] border-2 border-ink bg-cream p-3" role="region" aria-label="Notifications">
          {notices.length === 0 ? <p>No notifications yet. Comments and plans show up here.</p> : (
            <ul className="space-y-2">
              {notices.slice(0, 8).map((notice) => (
                <li key={notice.id}>
                  <Link to={notice.href} onClick={() => setBell(false)}>{notice.text}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
      <SignInSheet open={open} onClose={() => setOpen(false)} />
    </header>
  )
}
