import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePageMeta } from '../lib/meta.ts'

export function NotFoundPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  usePageMeta("Page not found · Gusto's Guide", 'That page is not on the menu. Search the Seattle list.', './og/og.svg')

  function search(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
      <p className="text-xs font-bold tracking-[0.14em] uppercase">404</p>
      <h1 className="mt-2 font-serif text-5xl italic">That page is not on the menu.</h1>
      <p className="mt-3 max-w-xl">The link may be old. Search the Seattle list, or start from the guides.</p>
      <form className="mt-6 flex flex-wrap gap-2" onSubmit={search}>
        <label className="sr-only" htmlFor="missing-search">Search Seattle</label>
        <input
          id="missing-search"
          className="min-h-11 min-w-0 flex-1 border-2 border-ink bg-cream px-3"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pizza, Ballard, Canlis"
        />
        <button className="btn btn-coral" type="submit">Search</button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/" className="btn">Home</Link>
        <Link to="/guides" className="btn">All guides</Link>
        <Link to="/explore" className="btn">Map</Link>
      </div>
    </main>
  )
}
