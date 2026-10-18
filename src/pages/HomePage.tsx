import { Link } from 'react-router-dom'
import { ParticleHero } from '../components/ParticleHero.tsx'
import { catalog } from '../content/load.ts'
import { usePageMeta } from '../lib/meta.ts'
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

export function HomePage() {
  usePageMeta("Gusto's Guide", 'Eat your way through Seattle: pizza, oysters, coffee, neighborhood dinners, and the bars worth the hill.')
  const featured = FEATURED.map((slug) => catalog.guides.find((guide) => guide.slug === slug)).filter((guide) => guide != null)
  const hits = hitList()
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <section className="hero on-navy relative overflow-hidden">
        <ParticleHero />
        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-8 pb-12">
          <p className="font-serif text-6xl italic leading-none text-cream sm:text-8xl">Gusto's Guide</p>
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
      <div className="mx-auto max-w-6xl px-4 py-10">
        <section>
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-serif text-4xl italic">Featured guides</h2>
            <Link to="/guides" className="text-sm font-bold">All guides</Link>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {featured.map((guide) => (
              <Link key={guide.slug} to={`/guide/${guide.slug}`} className="guide-card w-72 shrink-0">
                <p className="text-xs font-bold tracking-[0.14em] uppercase">{guide.group} · {guide.count} places</p>
                <h3 className="mt-2 font-serif text-3xl italic leading-none">{guide.title}</h3>
                <p className="mt-2 text-sm">{guide.dek}</p>
              </Link>
            ))}
          </div>
        </section>
        <section className="mt-10">
          <h2 className="font-serif text-4xl italic">The hit list</h2>
          <p className="mt-2 max-w-xl">The rooms people already cross town for, one neighborhood at a time.</p>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {hits.map((place) => (
              <Link key={place.id} to={`/place/${place.id}`} className="w-56 shrink-0 border-2 border-ink bg-cream p-3">
                <p className="text-xs font-bold tracking-[0.14em] uppercase">{place.neighborhood}</p>
                <h3 className="mt-1 font-serif text-2xl italic leading-none">{place.name}</h3>
                <p className="mt-2 text-sm">{place.cuisine[0]}</p>
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
