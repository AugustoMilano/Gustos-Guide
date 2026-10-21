import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MatchText } from '../components/MatchText.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { GoldenFork } from '../components/GoldenFork.tsx'
import { ScoreBadge } from '../components/ScoreBadge.tsx'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { areaPhrase, cityPath } from '../lib/city.ts'
import { useCityCatalog } from '../lib/use-city.ts'
import { milesBetween, priceLabel, publicReference } from '../lib/format.ts'
import { readPosition } from '../lib/geo.ts'
import { usePageMeta } from '../lib/meta.ts'
import { clearRecent, readRecent, rememberSearch } from '../lib/recent-search.ts'
import { useApp } from '../state/AppState.tsx'

type Hit = { id: string; href: string }

function tokenId(prefix: string, name: string) {
  return `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

export function SearchPage() {
  const { gustoScore } = useApp()
  const { city, places: cityPlaces, guides: cityGuides } = useCityCatalog()
  const area = areaPhrase(city)
  const reduceMotion = useReducedMotion()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [draft, setDraft] = useState(q)
  const [active, setActive] = useState(-1)
  const [recents, setRecents] = useState(() => readRecent())
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState('')
  usePageMeta(q ? `${q} · Search · Gusto's Guide` : "Search · Gusto's Guide", `Search ${area} places, guides, cuisines, and neighborhoods.`)

  useEffect(() => {
    setDraft(q)
  }, [q])

  const query = draft.trim().toLowerCase()
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
  const shownGuides = guides.slice(0, 12)
  const shownHoods = neighborhoods.slice(0, 16)
  const shownCuisines = cuisines.slice(0, 16)
  const shownPlaces = places.slice(0, 40)

  const hits = useMemo(() => {
    if (!query) return [] as Hit[]
    const list: Hit[] = []
    for (const guide of shownGuides) list.push({ id: `guide-${guide.slug}`, href: cityPath(`/guide/${guide.slug}`) })
    for (const name of shownHoods) {
      const slug = guideByTitle.get(name.toLowerCase()) ?? hoodGuide[name.toLowerCase()]
      list.push({ id: tokenId('hood', name), href: slug ? cityPath(`/guide/${slug}`) : cityPath(`/search?q=${encodeURIComponent(name)}`) })
    }
    for (const name of shownCuisines) list.push({ id: tokenId('cuisine', name), href: cityPath(`/search?q=${encodeURIComponent(name)}`) })
    for (const place of shownPlaces) list.push({ id: `place-${place.id}`, href: cityPath(`/place/${place.id}`) })
    return list
    // The slices are derived from the same query. Recompute when those inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, city, cityPlaces, cityGuides, origin])

  useEffect(() => {
    if (active < 0) return
    document.getElementById(hits[active]?.id ?? '')?.scrollIntoView({ block: 'nearest' })
  }, [active, hits])

  function type(value: string) {
    setDraft(value)
    setActive(-1)
    setParams(value ? { q: value } : {}, { replace: true })
  }

  function remember(value: string) {
    const next = rememberSearch(value)
    setRecents(next)
  }

  function go(index: number) {
    const hit = hits[index]
    if (!hit) {
      remember(draft)
      return
    }
    remember(draft)
    navigate(hit.href)
  }

  const listId = 'search-results'

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <AreaKicker />
      <h1 className="mt-2 font-serif text-5xl italic">Search {area}</h1>
      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (active >= 0) go(active)
          else remember(draft)
        }}
      >
        <label className="field" htmlFor="page-search">
          <span>Places, guides, cuisines, neighborhoods</span>
          <input
            id="page-search"
            role="combobox"
            aria-expanded={query.length > 0 && hits.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? hits[active]?.id : undefined}
            value={draft}
            autoComplete="off"
            onChange={(event) => type(event.target.value)}
            onKeyDown={(event) => {
              if (!hits.length) return
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActive((index) => Math.min(hits.length - 1, index + 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActive((index) => Math.max(-1, index - 1))
              } else if (event.key === 'Escape') {
                setActive(-1)
              }
            }}
          />
        </label>
      </form>
      {!query && recents.length ? (
        <section className="mt-4" aria-label="Recent searches">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-3xl italic">Recent</h2>
            <button
              type="button"
              className="text-sm font-bold"
              onClick={() => {
                clearRecent()
                setRecents([])
              }}
            >
              Clear
            </button>
          </div>
          <p className="mt-2 flex flex-wrap gap-2">
            {recents.map((item) => (
              <button key={item} type="button" className="chip" onClick={() => type(item)}>{item}</button>
            ))}
          </p>
        </section>
      ) : null}
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
      {error ? <p className="mt-2 text-sm" role="alert">{error}</p> : null}
      {origin ? <p className="mt-2 text-sm">Sorting places by distance from you.</p> : null}
      <div id={listId} role={query ? 'listbox' : undefined} aria-label={query ? 'Search results' : undefined}>
        {shownGuides.length ? (
          <section className="mt-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-3xl italic">Guides</h2>
              <p className="text-sm font-bold">{shownGuides.length === guides.length ? `${guides.length}` : `${shownGuides.length} of ${guides.length}`}</p>
            </div>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2">
              {shownGuides.map((guide) => {
                const index = hits.findIndex((hit) => hit.id === `guide-${guide.slug}`)
                return (
                  <li key={guide.slug}>
                    <Link
                      id={`guide-${guide.slug}`}
                      role={query ? 'option' : undefined}
                      aria-selected={query ? index === active : undefined}
                      className={`guide-card${index === active ? ' is-active' : ''}`}
                      to={cityPath(`/guide/${guide.slug}`)}
                      viewTransition={!reduceMotion}
                      onClick={() => remember(draft)}
                    >
                      <p className="text-xs font-bold tracking-[0.14em] uppercase">{guide.group}</p>
                      <h3 className="mt-2 font-serif text-2xl italic leading-none"><MatchText text={guide.title} query={draft} /></h3>
                      <p className="mt-2 text-sm font-bold">{guide.count} places</p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}
        {shownHoods.length ? (
          <section className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-3xl italic">Neighborhoods</h2>
              <p className="text-sm font-bold">{shownHoods.length === neighborhoods.length ? `${neighborhoods.length}` : `${shownHoods.length} of ${neighborhoods.length}`}</p>
            </div>
            <p className="mt-2 flex flex-wrap gap-2">
              {shownHoods.map((name) => {
                const slug = guideByTitle.get(name.toLowerCase()) ?? hoodGuide[name.toLowerCase()]
                const index = hits.findIndex((hit) => hit.id === tokenId('hood', name))
                return (
                  <Link
                    key={name}
                    id={tokenId('hood', name)}
                    role={query ? 'option' : undefined}
                    aria-selected={query ? index === active : undefined}
                    className={`chip inline-flex items-center${index === active ? ' is-active' : ''}`}
                    to={slug ? cityPath(`/guide/${slug}`) : cityPath(`/search?q=${encodeURIComponent(name)}`)}
                    onClick={() => remember(draft)}
                  >
                    <MatchText text={name} query={draft} />
                  </Link>
                )
              })}
            </p>
          </section>
        ) : null}
        {shownCuisines.length ? (
          <section className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-3xl italic">Cuisines</h2>
              <p className="text-sm font-bold">{shownCuisines.length === cuisines.length ? `${cuisines.length}` : `${shownCuisines.length} of ${cuisines.length}`}</p>
            </div>
            <p className="mt-2 flex flex-wrap gap-2">
              {shownCuisines.map((name) => {
                const index = hits.findIndex((hit) => hit.id === tokenId('cuisine', name))
                return (
                  <Link
                    key={name}
                    id={tokenId('cuisine', name)}
                    role={query ? 'option' : undefined}
                    aria-selected={query ? index === active : undefined}
                    className={`chip inline-flex items-center${index === active ? ' is-active' : ''}`}
                    to={cityPath(`/search?q=${encodeURIComponent(name)}`)}
                    onClick={() => remember(name)}
                  >
                    <MatchText text={name} query={draft} />
                  </Link>
                )
              })}
            </p>
          </section>
        ) : null}
        <section className="mt-6">
          {places.length ? (
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-serif text-3xl italic">{places.length} places</h2>
              {places.length > shownPlaces.length ? <p className="text-sm font-bold">Showing {shownPlaces.length}</p> : null}
            </div>
          ) : null}
          {query && places.length === 0 ? (
            guides.length || neighborhoods.length || cuisines.length ? (
              <p className="mt-3">No places match “{draft}”.</p>
            ) : (
              <p className="mt-3">Nothing matches “{draft}”. <Link className="font-bold" to={cityPath('/guides')}>Browse the guides</Link> or <Link className="font-bold" to={cityPath('/explore')}>open the map</Link>.</p>
            )
          ) : null}
          <ul className="mt-3 space-y-3">
            {shownPlaces.map((place) => {
              const index = hits.findIndex((hit) => hit.id === `place-${place.id}`)
              return (
                <li key={place.id}>
                  <Link
                    id={`place-${place.id}`}
                    role={query ? 'option' : undefined}
                    aria-selected={query ? index === active : undefined}
                    to={cityPath(`/place/${place.id}`)}
                    className={`hit-card min-w-0${index === active ? ' is-active' : ''}`}
                    viewTransition={!reduceMotion}
                    onClick={() => remember(draft)}
                  >
                    <span className="place-row">
                      <span className="place-row-shot" style={reduceMotion ? undefined : { viewTransitionName: `place-${place.id}` }}>
                        <PlaceThumb place={place} sizes="64px" />
                        <GoldenFork placeId={place.id} overlay />
                      </span>
                      <span className="place-row-copy py-1">
                        <span className="block font-serif text-2xl italic leading-tight"><MatchText text={place.name} query={draft} /></span>
                        <span className="mt-1 block text-sm">
                          <MatchText text={[place.cuisine.join(' · '), place.neighborhood, priceLabel(place.price)].filter(Boolean).join(' · ')} query={draft} />
                          {origin ? ` · ${milesBetween(origin, place).toFixed(1)} mi` : ''}
                        </span>
                        {publicReference(place) ? <span className="public-ref mt-1 block">{publicReference(place)}</span> : null}
                      </span>
                      <span className="score-col">
                        <ScoreBadge score={gustoScore(place.id)} size="sm" />
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </main>
  )
}
