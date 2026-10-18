import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { catalog } from '../content/load.ts'
import { milesBetween, priceLabel } from '../lib/format.ts'
import { readPosition } from '../lib/geo.ts'
import { usePageMeta } from '../lib/meta.ts'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState('')
  usePageMeta(q ? `${q} · Search · Gusto's Guide` : "Search · Gusto's Guide", 'Search Seattle places, guides, cuisines, and neighborhoods.')

  const query = q.trim().toLowerCase()
  const places = useMemo(() => {
    const list = catalog.places.filter((place) => {
      if (!query) return true
      return `${place.name} ${place.neighborhood} ${place.cuisine.join(' ')} ${place.oneLiner}`.toLowerCase().includes(query)
    })
    if (!origin) return list
    return list.slice().sort((a, b) => milesBetween(origin, a) - milesBetween(origin, b))
  }, [query, origin])
  const guides = catalog.guides.filter((guide) => !query || `${guide.title} ${guide.dek} ${guide.group}`.toLowerCase().includes(query))
  const neighborhoods = [...new Set(catalog.places.map((place) => place.neighborhood))].filter((name) => !query || name.toLowerCase().includes(query))
  const cuisines = [...new Set(catalog.places.flatMap((place) => place.cuisine))].filter((name) => !query || name.toLowerCase().includes(query))

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <h1 className="font-serif text-5xl italic">Search Seattle</h1>
      <form className="mt-4" onSubmit={(event) => event.preventDefault()}>
        <label className="field">
          <span>Places, guides, cuisines, neighborhoods</span>
          <input value={q} onChange={(event) => setParams(event.target.value ? { q: event.target.value } : {})} />
        </label>
      </form>
      <button
        type="button"
        className="btn mt-3"
        onClick={() => {
          setError('')
          void readPosition().then(setOrigin).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Location unavailable.'))
        }}
      >
        Near me
      </button>
      {error ? <p className="mt-2 text-sm">{error}</p> : null}
      {origin ? <p className="mt-2 text-sm">Sorting places by distance from you.</p> : null}
      <section className="mt-8">
        <h2 className="font-serif text-3xl italic">Guides</h2>
        <ul className="mt-2 space-y-2">{guides.slice(0, 12).map((guide) => <li key={guide.slug}><Link className="font-bold" to={`/guide/${guide.slug}`}>{guide.title}</Link> · {guide.group}</li>)}</ul>
      </section>
      <section className="mt-6">
        <h2 className="font-serif text-3xl italic">Neighborhoods</h2>
        <p className="mt-2">{neighborhoods.slice(0, 16).map((name) => <Link key={name} className="mr-3 font-bold" to={`/search?q=${encodeURIComponent(name)}`}>{name}</Link>)}</p>
      </section>
      <section className="mt-6">
        <h2 className="font-serif text-3xl italic">Cuisines</h2>
        <p className="mt-2">{cuisines.slice(0, 16).map((name) => <Link key={name} className="mr-3 font-bold" to={`/search?q=${encodeURIComponent(name)}`}>{name}</Link>)}</p>
      </section>
      <section className="mt-6">
        <h2 className="font-serif text-3xl italic">{places.length} places</h2>
        <ul className="mt-3 space-y-3">
          {places.slice(0, 40).map((place) => (
            <li key={place.id}>
              <Link to={`/place/${place.id}`} className="font-serif text-2xl italic">{place.name}</Link>
              <p className="text-sm">{place.cuisine.join(' · ')} · {place.neighborhood} · {priceLabel(place.price)}{origin ? ` · ${milesBetween(origin, place).toFixed(1)} mi` : ''}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
