import { useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { ScoreBadge } from '../components/ScoreBadge.tsx'
import { cityPath } from '../lib/city.ts'
import { useCityCatalog } from '../lib/use-city.ts'
import { milesBetween, priceLabel, publicReference } from '../lib/format.ts'
import { readPosition } from '../lib/geo.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'

export function SearchPage() {
  const { gustoScore } = useApp()
  const { city, places: cityPlaces, guides: cityGuides } = useCityCatalog()
  const area = city === 'eastside' ? 'the Eastside' : 'Seattle'
  const reduceMotion = useReducedMotion()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState('')
  usePageMeta(q ? `${q} · Search · Gusto's Guide` : "Search · Gusto's Guide", `Search ${area} places, guides, cuisines, and neighborhoods.`)

  const query = q.trim().toLowerCase()
  const places = useMemo(() => {
    const list = cityPlaces.filter((place) => {
      if (!query) return true
      return `${place.name} ${place.neighborhood} ${place.cuisine.join(' ')} ${place.oneLiner}`.toLowerCase().includes(query)
    })
    if (!origin) return list
    return list.slice().sort((a, b) => milesBetween(origin, a) - milesBetween(origin, b))
  }, [cityPlaces, query, origin])
  const guides = cityGuides.filter((guide) => !query || `${guide.title} ${guide.dek} ${guide.group}`.toLowerCase().includes(query))
  const guideByTitle = new Map(cityGuides.map((guide) => [guide.title.toLowerCase(), guide.slug]))
  const hoodGuide: Record<string, string> = {
    'queen anne': 'queen-anne-incl-lower-queen-anne',
    'lower queen anne': 'queen-anne-incl-lower-queen-anne',
    'south lake union': 'south-lake-union-incl-denny-triangle',
    'denny triangle': 'south-lake-union-incl-denny-triangle',
    georgetown: 'georgetown-sodo',
    sodo: 'georgetown-sodo',
  }
  const neighborhoods = [...new Set(cityPlaces.map((place) => place.neighborhood))].filter((name) => !query || name.toLowerCase().includes(query))
  const cuisines = [...new Set(cityPlaces.flatMap((place) => place.cuisine))].filter((name) => !query || name.toLowerCase().includes(query))

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <h1 className="font-serif text-5xl italic">Search {area === 'the Eastside' ? 'the Eastside' : 'Seattle'}</h1>
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
        <ul className="mt-2 grid gap-3 sm:grid-cols-2">{guides.slice(0, 12).map((guide) => <li key={guide.slug}><Link className="guide-card" to={cityPath(`/guide/${guide.slug}`)} viewTransition={!reduceMotion}><p className="text-xs font-bold tracking-[0.14em] uppercase">{guide.group}</p><h3 className="mt-2 font-serif text-2xl italic leading-none">{guide.title}</h3></Link></li>)}</ul>
      </section>
      <section className="mt-6">
        <h2 className="font-serif text-3xl italic">Neighborhoods</h2>
        <p className="mt-2 flex flex-wrap gap-2">{neighborhoods.slice(0, 16).map((name) => {
          const slug = guideByTitle.get(name.toLowerCase()) ?? hoodGuide[name.toLowerCase()]
          return <Link key={name} className="chip inline-flex items-center" to={slug ? cityPath(`/guide/${slug}`) : cityPath(`/search?q=${encodeURIComponent(name)}`)}>{name}</Link>
        })}</p>
      </section>
      <section className="mt-6">
        <h2 className="font-serif text-3xl italic">Cuisines</h2>
        <p className="mt-2 flex flex-wrap gap-2">{cuisines.slice(0, 16).map((name) => <Link key={name} className="chip inline-flex items-center" to={cityPath(`/search?q=${encodeURIComponent(name)}`)}>{name}</Link>)}</p>
      </section>
      <section className="mt-6">
        <h2 className="font-serif text-3xl italic">{places.length} places</h2>
        {query && places.length === 0 && guides.length === 0 ? (
          <p className="mt-3">Nothing matches “{q}”. <Link className="font-bold" to={cityPath('/guides')}>Browse the guides</Link> or <Link className="font-bold" to={cityPath('/explore')}>open the map</Link>.</p>
        ) : null}
        <ul className="mt-3 space-y-3">
          {places.slice(0, 40).map((place) => (
            <li key={place.id}>
              <Link to={cityPath(`/place/${place.id}`)} className="hit-card min-w-0" viewTransition={!reduceMotion}>
                <span className="flex items-center gap-3">
                  <span className="h-16 w-16 shrink-0 overflow-hidden bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full" style={reduceMotion ? undefined : { viewTransitionName: `place-${place.id}` }}>
                    <PlaceThumb place={place} />
                  </span>
                  <span className="flex min-w-0 flex-1 items-start justify-between gap-2 py-2 pr-3">
                    <span className="min-w-0">
                      <span className="block font-serif text-2xl italic leading-tight">{place.name}</span>
                      <span className="mt-1 block text-sm">{[place.cuisine.join(' · '), place.neighborhood, priceLabel(place.price)].filter(Boolean).join(' · ')}{origin ? ` · ${milesBetween(origin, place).toFixed(1)} mi` : ''}</span>
                      {publicReference(place) ? <span className="public-ref mt-1 block">{publicReference(place)}</span> : null}
                    </span>
                    <ScoreBadge score={gustoScore(place.id)} size="sm" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
