import { Link } from 'react-router-dom'
import { cityPath, type CityId } from '../lib/city.ts'
import type { SmartResult } from '../lib/smart-search.ts'

function ResultList({ title, hits }: { title: string; hits: SmartResult['guides'] }) {
  if (!hits.length) return null
  return (
    <section className="mt-6">
      <h2 className="font-serif text-3xl italic">{title}</h2>
      <ul className="mt-3 grid gap-2">
        {hits.map((hit) => (
          <li key={`${hit.kind}-${hit.id}`}>
            <Link to={hit.href} className="smart-hit">
              <span className="min-w-0">
                <span className="block truncate font-serif text-2xl italic leading-tight">{hit.title}</span>
                <span className="mt-1 block truncate text-sm">{hit.why}</span>
              </span>
              <span className="smart-hit-meta">{hit.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function SmartResults({
  query,
  result,
}: {
  query: string
  result: SmartResult
}) {
  const empty = result.guides.length === 0 && result.places.length === 0
  return (
    <div>
      {result.switched ? <p className="mt-4 text-sm font-bold">Showing {result.scopeLabel}.</p> : null}
      {empty ? (
        <p className="mt-4">Nothing matches “{query}”.</p>
      ) : null}
      <ResultList title="Guides" hits={result.guides} />
      <ResultList title="Places" hits={result.places} />
      {empty ? <ResultList title="Close guides" hits={result.suggestions} /> : null}
      {empty ? (
        <p className="mt-4">
          <Link className="btn" to={cityPath('/guides', result.scope)}>Browse the guides</Link>
        </p>
      ) : null}
    </div>
  )
}

export function featuredSlugs(city: CityId): string[] {
  const lists: Record<CityId, string[]> = {
    seattle: ['pike-place', 'date-night', 'best-pizza', 'late-night', 'cocktail-bars', 'bring-the-parents'],
    eastside: ['best-of-bellevue', 'bellevue', 'kirkland-waterfront', 'eastside-date-night', 'woodinville', 'eastside-brunch'],
    la: ['la-date-night', 'santa-monica', 'venice', 'beverly-grove', 'la-sushi', 'downtown-la'],
    sf: ['sf-date-night', 'sf-mission-district', 'sf-north-beach', 'sf-italian', 'sf-seafood', 'sf-embarcadero'],
    eastbay: ['eastbay-berkeley', 'eastbay-fremont', 'eastbay-pleasanton'],
    peninsula: ['peninsula-palo-alto', 'peninsula-san-jose', 'peninsula-half-moon-bay', 'peninsula-santa-clara'],
    northbay: ['northbay-sausalito', 'northbay-tiburon', 'northbay-larkspur', 'northbay-corte-madera'],
    sandiego: ['sd-little-italy', 'sd-coronado', 'sd-la-jolla', 'sd-seafood', 'sd-mexican', 'sd-north-park'],
  }
  return lists[city]
}
