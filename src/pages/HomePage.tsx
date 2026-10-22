import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { catalog } from '../content/load.ts'
import { cityPath, type CityId } from '../lib/city.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useCityId } from '../lib/use-city-id.ts'

const HomeBelow = lazy(() => import('./HomeBelow.tsx').then((module) => ({ default: module.HomeBelow })))

const TICKER = ['Pizza', 'Oysters', 'Capitol Hill', 'Ballard', 'Date night', 'Cheap eats', 'Cocktail bars', 'Fun & dive bars', 'Brunch', 'Georgetown', 'Fremont', 'Late night', 'Seafood']

const BAY_FALLBACK: Partial<Record<CityId, string[]>> = {
  sf: ['San Francisco'],
  eastbay: ['Berkeley', 'Fremont', 'Pleasanton'],
  peninsula: ['Palo Alto', 'Santa Clara', 'San Jose'],
  northbay: ['Sausalito', 'Tiburon', 'Corte Madera', 'Larkspur'],
}

function tickerFor(city: CityId) {
  if (city === 'la') return ['Venice', 'Santa Monica', 'West Hollywood', 'Beverly Hills', 'Downtown', 'Hollywood', 'Malibu', 'Sushi']
  if (city === 'eastside') return ['Bellevue', 'Kirkland waterfront', 'Juanita', 'Redmond', 'Issaquah', 'Bothell', 'Houghton', 'The Bravern']
  if (city === 'sf' || city === 'eastbay' || city === 'peninsula' || city === 'northbay') {
    const titles = catalog.guides
      .filter((guide) => guide.city === city && (guide.group === 'Neighborhoods' || guide.group === 'Cuisine'))
      .slice(0, 8)
      .map((guide) => guide.title)
    return titles.length ? titles : BAY_FALLBACK[city] ?? ['San Francisco']
  }
  return TICKER
}

function heroTitle(city: CityId): string {
  if (city === 'la') return 'Eat across Los Angeles.'
  if (city === 'sf') return 'Eat across San Francisco.'
  if (city === 'eastbay') return 'Eat across the East Bay.'
  if (city === 'peninsula') return 'Eat across the Peninsula.'
  if (city === 'northbay') return 'Eat across the North Bay.'
  if (city === 'eastside') return 'Eat across the Eastside.'
  return 'Eat your way through Seattle.'
}

function heroDek(city: CityId, hoods: string[]): string {
  if (city === 'la') return 'Venice, Santa Monica, West Hollywood, Beverly Hills, Downtown, and Hollywood, from the same list.'
  if (city === 'eastside') return 'Bellevue, Kirkland, Redmond, Issaquah, and Bothell, on the same map as Seattle.'
  if (city === 'seattle') return 'From a 7am bun to the last good stool on Pike. Pizza, oysters, teriyaki, and the bars worth the hill.'
  if (!hoods.length) {
    if (city === 'eastbay') return 'Berkeley, Fremont, and Pleasanton.'
    if (city === 'peninsula') return 'Palo Alto, Santa Clara, San Jose, and the coast.'
    if (city === 'northbay') return 'Sausalito, Tiburon, Corte Madera, and Larkspur.'
    return 'Neighborhoods and cuisines on the San Francisco list.'
  }
  const tail = city === 'sf'
    ? 'San Francisco neighborhoods'
    : city === 'eastbay'
      ? 'East Bay stops'
      : city === 'northbay'
        ? 'North Bay stops'
        : 'Peninsula and South Bay stops'
  return `${hoods.join(', ')}, and the other ${tail} on this list.`
}

function heroMeta(city: CityId, hoods: string[]): string {
  if (city === 'la') return 'Eat across Los Angeles: Venice, Santa Monica, West Hollywood, Downtown, and the rooms on the list.'
  if (city === 'eastside') return 'Eat across the Eastside: Bellevue, Kirkland, Redmond, Issaquah, and Bothell.'
  if (city === 'seattle') return 'Eat your way through Seattle: pizza, oysters, coffee, neighborhood dinners, and the bars worth the hill.'
  const named = hoods.length ? `: ${hoods.join(', ')}` : ''
  if (city === 'eastbay') return `Eat across the East Bay${named}.`
  if (city === 'peninsula') return `Eat across the Peninsula and South Bay${named}.`
  if (city === 'northbay') return `Eat across the North Bay${named}.`
  return `Eat across San Francisco${named}.`
}

function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true">
      <p className="sr-only">Loading the list</p>
      <div className="skeleton h-10 w-64" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="skeleton h-52" />
        <div className="skeleton h-52" />
        <div className="skeleton h-52" />
      </div>
    </div>
  )
}

export function HomePage() {
  const city = useCityId()
  const hoods = catalog.guides.filter((guide) => guide.city === city && guide.group === 'Neighborhoods').slice(0, 4).map((guide) => guide.title)
  usePageMeta("Gusto's Guide", heroMeta(city, hoods), './og/og.png')
  const ticker = tickerFor(city)
  return (
    <main id="main" tabIndex={-1} className="home-main outline-none">
      <section className="hero on-navy relative overflow-hidden">
        <div className="hero-copy relative mx-auto max-w-6xl px-4 pt-28 pb-14 sm:pt-32">
          <h1 className="max-w-3xl font-serif text-5xl italic leading-[1.05] text-cream sm:text-7xl">{heroTitle(city)}</h1>
          <p className="hero-dek">{heroDek(city, hoods)}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={cityPath('/guides')} className="btn btn-coral">Browse the guides</Link>
            <Link to={cityPath('/search')} className="btn">Search the list</Link>
          </div>
        </div>
      </section>
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="marquee-group">
              {ticker.map((item) => (
                <span key={`${copy}-${item}`} className="font-serif text-xl italic">{item} ·</span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <Suspense fallback={<HomeSkeleton />}>
        <HomeBelow />
      </Suspense>
    </main>
  )
}
