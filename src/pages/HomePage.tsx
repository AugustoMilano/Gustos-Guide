import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { catalog } from '../content/load.ts'
import { cityPath, type CityId } from '../lib/city.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useCityId } from '../lib/use-city-id.ts'

const HomeBelow = lazy(() => import('./HomeBelow.tsx').then((module) => ({ default: module.HomeBelow })))

const TICKER = ['Pizza', 'Oysters', 'Capitol Hill', 'Ballard', 'Date night', 'Cheap eats', 'Cocktail bars', 'Fun & dive bars', 'Brunch', 'Georgetown', 'Fremont', 'Late night', 'Seafood']

function tickerFor(city: CityId) {
  if (city === 'la') return ['Venice', 'Santa Monica', 'West Hollywood', 'Beverly Hills', 'Downtown', 'Hollywood', 'Malibu', 'Sushi']
  if (city === 'eastside') return ['Bellevue', 'Kirkland waterfront', 'Juanita', 'Redmond', 'Issaquah', 'Bothell', 'Houghton', 'The Bravern']
  if (city === 'sf' || city === 'peninsula') {
    const titles = catalog.guides
      .filter((guide) => guide.city === city && (guide.group === 'Neighborhoods' || guide.group === 'Cuisine'))
      .slice(0, 8)
      .map((guide) => guide.title)
    return titles.length ? titles : city === 'peninsula' ? ['Palo Alto', 'Santa Clara', 'San Jose'] : ['San Francisco']
  }
  return TICKER
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
  const la = city === 'la'
  const east = city === 'eastside'
  const sf = city === 'sf'
  const pen = city === 'peninsula'
  const hoods = catalog.guides.filter((guide) => guide.city === city && guide.group === 'Neighborhoods').slice(0, 4).map((guide) => guide.title)
  usePageMeta(
    "Gusto's Guide",
    la
      ? 'Eat across Los Angeles: Venice, Santa Monica, West Hollywood, Downtown, and the rooms on the list.'
      : sf
        ? `Eat across San Francisco${hoods.length ? `: ${hoods.join(', ')}` : ''}.`
        : pen
          ? `Eat across the Peninsula and South Bay${hoods.length ? `: ${hoods.join(', ')}` : ''}.`
          : east
          ? 'Eat across the Eastside: Bellevue, Kirkland, Redmond, Issaquah, and Bothell.'
          : 'Eat your way through Seattle: pizza, oysters, coffee, neighborhood dinners, and the bars worth the hill.',
    './og/og.png',
  )
  const ticker = tickerFor(city)
  return (
    <main id="main" tabIndex={-1} className="home-main outline-none">
      <section className="hero on-navy relative overflow-hidden">
        <div className="hero-copy relative mx-auto max-w-6xl px-4 pt-28 pb-14 sm:pt-32">
          <h1 className="max-w-3xl font-serif text-5xl italic leading-[1.05] text-cream sm:text-7xl">{la ? 'Eat across Los Angeles.' : sf ? 'Eat across San Francisco.' : pen ? 'Eat across the Peninsula.' : east ? 'Eat across the Eastside.' : 'Eat your way through Seattle.'}</h1>
          <p className="hero-dek">
            {la
              ? 'Venice, Santa Monica, West Hollywood, Beverly Hills, Downtown, and Hollywood, from the same list.'
              : sf
                ? hoods.length
                  ? `${hoods.join(', ')}, and the other San Francisco neighborhoods on this list.`
                  : 'Neighborhoods and cuisines on the San Francisco list.'
                : pen
                  ? hoods.length
                    ? `${hoods.join(', ')}, and the other Peninsula and South Bay stops on this list.`
                    : 'Palo Alto, Santa Clara, San Jose, and the coast.'
                  : east
                  ? 'Bellevue, Kirkland, Redmond, Issaquah, and Bothell, on the same map as Seattle.'
                  : 'From a 7am bun to the last good stool on Pike. Pizza, oysters, teriyaki, and the bars worth the hill.'}
          </p>
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
