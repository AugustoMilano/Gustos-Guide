import { Link } from 'react-router-dom'
import { ParticleHero } from '../components/ParticleHero.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { catalog } from '../content/load.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'
import type { GuideGroup, SlimPlace } from '../types.ts'

const GROUPS: GuideGroup[] = ['Best of', 'Cuisine', 'Occasion', 'Neighborhoods', 'Drinks']
const FEATURED = ['best-pizza', 'date-night', 'capitol-hill', 'cheap-eats', 'cocktail-bars', 'seafood', 'brunch', 'ballard']

function hitList(): SlimPlace[] {
  const ranked = catalog.places
    .filter((place) => place.publicRating || place.appleRating)
    .slice()
    .sort((a, b) => (b.publicRating?.value ?? 0) - (a.publicRating?.value ?? 0) || (b.appleRating?.percent ?? 0) - (a.appleRating?.percent ?? 0))
  const picked: SlimPlace[] = []
  const hoods = new Set<string>()
  for (const place of ranked) {
    if (hoods.has(place.neighborhood)) continue
    hoods.add(place.neighborhood)
    picked.push(place)
    if (picked.length === 12) break
  }
  return picked
}

const TICKER = ['Pizza', 'Oysters', 'Capitol Hill', 'Ballard', 'Date night', 'Cheap eats', 'Cocktail bars', 'Brunch', 'Georgetown', 'Fremont', 'Late night', 'Seafood']

export function HomePage() {
  usePageMeta("Gusto's Guide", 'Eat your way through Seattle: pizza, oysters, coffee, neighborhood dinners, and the bars worth the hill.')
  const { photos } = useApp()
  const featured = FEATURED.map((slug) => catalog.guides.find((guide) => guide.slug === slug)).filter((guide) => guide != null)
  const hits = hitList()
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <section className="hero on-navy relative overflow-hidden">
        <ParticleHero />
        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-28 pb-12 sm:pt-32">
          <p className="font-serif text-5xl italic leading-[1.12] text-cream sm:text-7xl sm:leading-[1.08] lg:text-8xl">Gusto's Guide</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl italic leading-tight sm:text-5xl">Eat your way through Seattle.</h1>
          <p className="mt-3 max-w-xl text-lg text-cream">
            From a 7am bun to the last good stool on Pike. Pizza, oysters, teriyaki, and the bars worth the hill.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/guides" className="btn btn-coral">Browse the guides</Link>
            <Link to="/search" className="btn">Search the list</Link>
          </div>
        </div>
      </section>
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="marquee-group">
              {TICKER.map((item) => (
                <span key={`${copy}-${item}`} className="font-serif text-xl italic">{item} ·</span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <section>
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-serif text-4xl italic">Featured guides</h2>
            <Link to="/guides" className="text-sm font-bold">All guides</Link>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {featured.map((guide) => (
              <Link key={guide.slug} to={`/guide/${guide.slug}`} className="guide-card w-72 shrink-0">
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <p className="text-xs font-bold tracking-[0.14em] uppercase">{guide.group}</p>
                    <h3 className="mt-2 font-serif text-3xl italic leading-none">{guide.title}</h3>
                    <p className="mt-2 text-sm">{guide.dek}</p>
                  </span>
                  <span className="sticker shrink-0">{guide.count}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className="mt-10">
          <h2 className="font-serif text-4xl italic">The hit list</h2>
          <p className="mt-2 max-w-xl">The rooms people already cross town for, one neighborhood at a time.</p>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {hits.map((place, index) => (
              <Link key={place.id} to={`/place/${place.id}`} className="hit-card w-56 shrink-0">
                <div className="h-28 overflow-hidden bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
                  <PlaceThumb place={place} uploads={photos} eager={index < 4} />
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold tracking-[0.14em] uppercase">{place.neighborhood}</p>
                  <h3 className="mt-1 font-serif text-2xl italic leading-none">{place.name}</h3>
                  <p className="mt-2 text-sm">{place.cuisine[0]}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
        {GROUPS.map((group) => (
          <section key={group} className="mt-10">
            <h2 className="font-serif text-4xl italic">{group}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.guides.filter((guide) => guide.group === group).slice(0, group === 'Neighborhoods' ? 6 : 4).map((guide) => (
                <Link key={guide.slug} to={`/guide/${guide.slug}`} className="guide-card">
                  <p className="text-xs font-bold tracking-[0.14em] uppercase">{guide.count} places</p>
                  <h3 className="mt-2 font-serif text-3xl italic leading-none">{guide.title}</h3>
                  <p className="mt-2 text-sm">{guide.dek}</p>
                </Link>
              ))}
            </div>
            <Link to="/guides" className="mt-3 inline-block text-sm font-bold">All {group.toLowerCase()} guides</Link>
          </section>
        ))}
      </div>
    </main>
  )
}
