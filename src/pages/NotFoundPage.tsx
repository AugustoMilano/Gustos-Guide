import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { areaPhrase, CITY_PREFIXES, cityPath } from '../lib/city.ts'
import { useCityId } from '../lib/use-city-id.ts'
import { usePageMeta } from '../lib/meta.ts'

export function NotFoundPage() {
  const navigate = useNavigate()
  const city = useCityId()
  const [query, setQuery] = useState('')
  usePageMeta("Page not found · Gusto's Guide", `That page is not on the menu. Search ${areaPhrase(city)}.`, './og/og.png')

  function search(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    const path = q ? `/search?q=${encodeURIComponent(q)}` : '/search'
    // Unprefixed misses stay on the Seattle search URL the rest of the site already uses.
    const hash = window.location.hash
    const prefixed = CITY_PREFIXES.some((prefix) => hash.includes(prefix))
    navigate(prefixed ? cityPath(path, city) : path)
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
      <AreaKicker />
      <p className="mt-2 text-xs font-bold tracking-[0.14em] uppercase">404</p>
      <h1 className="mt-2 font-serif text-5xl italic">That page is not on the menu.</h1>
      <p className="mt-3 max-w-xl">The link may be old. Search {areaPhrase(city)}, or start from the guides.</p>
      <form className="mt-6 flex flex-wrap gap-2" onSubmit={search}>
        <label className="sr-only" htmlFor="missing-search">Search {areaPhrase(city)}</label>
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
        <Link to={cityPath('/')} className="btn">Home</Link>
        <Link to={cityPath('/guides')} className="btn">All guides</Link>
        <Link to={cityPath('/explore')} className="btn">Map</Link>
      </div>
    </main>
  )
}
