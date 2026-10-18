import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SignInSheet } from './SignInSheet.tsx'
import { useApp } from '../state/AppState.tsx'

export function Header() {
  const { user, signOut } = useApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState(false)
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
        <form onSubmit={search} className="ml-auto hidden min-w-0 flex-1 md:block md:max-w-sm">
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
        <nav className="ml-auto hidden items-center gap-4 text-sm font-bold md:flex" aria-label="Primary">
          <Link to="/guides">Guides</Link>
          <Link to="/feed">Feed</Link>
          <Link to="/plans">Plans</Link>
          <Link to="/rank">Rank</Link>
          <Link to="/my">My guides</Link>
          {user ? (
            <button type="button" className="btn text-sm" onClick={signOut}>
              Sign out
            </button>
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
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="w-full border-2 border-ink bg-cream px-3 py-2" />
          </form>
          <Link to="/guides" onClick={() => setMenu(false)}>Guides</Link>
          <Link to="/feed" onClick={() => setMenu(false)}>Feed</Link>
          <Link to="/plans" onClick={() => setMenu(false)}>Plans</Link>
          <Link to="/rank" onClick={() => setMenu(false)}>Rank</Link>
          <Link to="/my" onClick={() => setMenu(false)}>My guides</Link>
          {user ? (
            <button type="button" className="btn" onClick={signOut}>Sign out {user.name}</button>
          ) : (
            <button type="button" className="btn btn-coral" onClick={() => setOpen(true)}>Sign in</button>
          )}
        </nav>
      ) : null}
      <SignInSheet open={open} onClose={() => setOpen(false)} />
    </header>
  )
}
