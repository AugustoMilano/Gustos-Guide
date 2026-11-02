import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SmartResults, featuredSlugs } from '../components/SmartResults.tsx'
import { catalog } from '../content/load.ts'
import { cityPath, regionOf, type CityId } from '../lib/city.ts'
import { countPlaces } from '../lib/format.ts'
import { isOpen } from '../lib/hours.ts'
import { regionBoard } from '../lib/top25.ts'
import { usePageMeta } from '../lib/meta.ts'
import { smartSearch } from '../lib/smart-search.ts'
import { useApp } from '../state/AppState.tsx'
import { useCityCatalog } from '../lib/use-city.ts'

function heroTitle(city: CityId): string {
  if (city === 'la') return 'Eat across Los Angeles.'
  if (city === 'sf') return 'Eat across San Francisco.'
  if (city === 'eastbay') return 'Eat across the East Bay.'
  if (city === 'peninsula') return 'Eat across the Peninsula.'
  if (city === 'northbay') return 'Eat across the North Bay.'
  if (city === 'sandiego') return 'Eat across San Diego.'
  if (city === 'eastside') return 'Eat across the Eastside.'
  return 'Eat your way through Seattle.'
}

function heroDek(city: CityId): string {
  if (city === 'la') return 'Venice, Santa Monica, West Hollywood, Beverly Hills, Downtown, and Hollywood, from the same list.'
  if (city === 'eastside') return 'Bellevue, Kirkland, Redmond, and Issaquah, on the same map as Seattle.'
  if (city === 'seattle') return 'From a 7am bun to the last good stool on Pike. Pizza, oysters, teriyaki, and the bars worth the hill.'
  if (city === 'sandiego') return 'San Diego, La Jolla, Coronado, Chula Vista, and North County on one list.'
  if (city === 'eastbay') return 'Berkeley, Fremont, and Pleasanton.'
  if (city === 'peninsula') return 'Palo Alto, Santa Clara, San Jose, and the coast.'
  if (city === 'northbay') return 'Sausalito, Tiburon, Corte Madera, and Larkspur.'
  return 'Neighborhoods and cuisines on the San Francisco list.'
}

function openNowLine(count: number): string {
  if (count === 0) return 'Nothing open right now'
  return `${count} ${count === 1 ? 'place' : 'places'} open now`
}

function topLine(city: CityId, count: number): string {
  const region = regionOf(city)
  const where = region === 'seattle'
    ? 'Seattle and the Eastside'
    : region === 'la'
      ? 'Los Angeles'
      : region === 'sandiego'
        ? 'San Diego'
        : 'San Francisco and the Bay'
  return `The ${count} best in ${where}, ranked by Gusto's Score`
}

function Chevron() {
  return (
    <svg className="home-shortcut-arrow" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function HomePage() {
  const { city, guides, places, ready, failed } = useCityCatalog()
  const [draft, setDraft] = useState('')
  usePageMeta("Gusto's Guide", heroDek(city), './og/og.png')
  const query = draft.trim()
  const { gustoScore } = useApp()
  // Same rule as the Tonight page: a place is open when its published hours say so right now.
  const openCount = useMemo(() => (ready ? places.filter((place) => isOpen(place.periods)).length : 0), [places, ready])
  const topCount = useMemo(() => regionBoard(regionOf(city), gustoScore).shown.length, [city, gustoScore])
  const result = useMemo(
    () => (query && ready ? smartSearch(query, city, catalog.places, catalog.guides, gustoScore) : null),
    [query, city, ready, gustoScore],
  )
  const featured = featuredSlugs(city)
    .map((slug) => guides.find((guide) => guide.slug === slug))
    .filter((guide) => guide != null)
    .slice(0, 6)

  return (
    <main id="main" tabIndex={-1} className="home-main outline-none">
      <section className="hero on-navy relative overflow-hidden">
        <div className="hero-copy relative mx-auto max-w-6xl px-4 pt-28 pb-10 sm:pt-32">
          <h1 className="max-w-3xl font-serif text-5xl italic leading-[1.05] text-cream sm:text-6xl">{heroTitle(city)}</h1>
          <p className="hero-dek">{heroDek(city)}</p>
          <form className="mt-6" role="search" onSubmit={(event) => event.preventDefault()}>
            <label className="field home-search" htmlFor="home-search">
              <span className="text-cream">Search guides and places</span>
              <input
                id="home-search"
                className="glass-input w-full"
                value={draft}
                autoComplete="off"
                placeholder="Try a date night, brunch, or a neighborhood"
                onChange={(event) => setDraft(event.target.value)}
              />
            </label>
          </form>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-16">
        {query && !ready ? (
          <div className="mt-6 grid gap-2" aria-hidden="true">
            <div className="skeleton home-pending" />
            <div className="skeleton home-pending" />
            <div className="skeleton home-pending" />
          </div>
        ) : result ? <SmartResults query={query} result={result} /> : (
          <>
            <section aria-labelledby="featured-guides">
              <h2 id="featured-guides" className="font-serif text-4xl italic">Featured guides</h2>
              {failed ? <p className="mt-4">The guide list didn't load. <button type="button" className="btn" onClick={() => window.location.reload()}>Try again</button></p> : null}
              <div className="home-featured mt-4">
                {!ready && !failed ? Array.from({ length: 6 }, (_, index) => <div key={index} className="skeleton" aria-hidden="true" />) : null}
                {featured.map((guide) => (
                  <Link key={guide.slug} to={cityPath(`/guide/${guide.slug}`)} className="guide-card">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] tabular-nums">{countPlaces(guide.count)}</p>
                    <h3 className="mt-2 font-serif text-3xl italic">{guide.title}</h3>
                    {guide.dek ? <p className="mt-2 line-clamp-2 text-sm">{guide.dek}</p> : null}
                  </Link>
                ))}
              </div>
            </section>
            <section className="home-shortcuts mt-6" aria-label="Tonight and Top 25">
              <Link to={cityPath('/tonight')} className="guide-card home-shortcut">
                <span className="home-shortcut-copy">
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">Open now</p>
                  <h2 className="mt-2 font-serif text-3xl italic">Tonight</h2>
                  {ready ? <p className="mt-2 text-sm tabular-nums">{openNowLine(openCount)}</p> : null}
                </span>
                <Chevron />
              </Link>
              <Link to={cityPath('/top')} className="guide-card home-shortcut">
                <span className="home-shortcut-copy">
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">Ranked</p>
                  <h2 className="mt-2 font-serif text-3xl italic">Top 25</h2>
                  {topCount ? <p className="mt-2 text-sm tabular-nums">{topLine(city, topCount)}</p> : null}
                </span>
                <Chevron />
              </Link>
            </section>
            <p className="mt-8">
              <Link to={cityPath('/guides')} className="btn btn-coral">Browse all guides</Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
