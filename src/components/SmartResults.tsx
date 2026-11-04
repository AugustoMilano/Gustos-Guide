import { Link } from 'react-router-dom'
import { cityPath, type CityId } from '../lib/city.ts'
import type { SmartResult } from '../lib/smart-search.ts'

function ResultList({ title, hits, onPick }: { title: string; hits: SmartResult['guides']; onPick?: () => void }) {
  if (!hits.length) return null
  return (
    <section className="mt-6">
      <h2 className="font-serif text-3xl italic">{title}</h2>
      <ul className="mt-3 grid gap-2">
        {hits.map((hit) => (
          <li key={`${hit.kind}-${hit.id}`}>
            <Link to={hit.href} className="smart-hit" onClick={onPick}>
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
  onPick,
}: {
  query: string
  result: SmartResult
  /** Called when a result is opened, so the page can remember the search. */
  onPick?: () => void
}) {
  const empty = result.guides.length === 0 && result.places.length === 0
  return (
    <div>
      {result.switched ? <p className="mt-4 text-sm font-bold">Showing {result.scopeLabel}.</p> : null}
      {empty ? (
        <div className="mt-4" role="status">
          <p className="font-bold">Nothing matches “{query}”.</p>
          <p className="mt-1 text-sm">Try a place name, a dish like ramen or tacos, or a neighborhood.</p>
        </div>
      ) : null}
      <ResultList title="Guides" hits={result.guides} onPick={onPick} />
      <ResultList title="Places" hits={result.places} onPick={onPick} />
      {empty ? <ResultList title="Close guides" hits={result.suggestions} onPick={onPick} /> : null}
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
    eastside: ['best-of-bellevue', 'bellevue', 'kirkland-waterfront', 'eastside-date-night', 'eastside-brunch'],
    la: ['la-date-night', 'santa-monica', 'venice', 'beverly-grove', 'la-sushi', 'downtown-la'],
    sf: ['sf-date-night', 'sf-mission-district', 'sf-north-beach', 'sf-italian', 'sf-seafood', 'sf-embarcadero'],
    eastbay: ['eastbay-berkeley', 'eastbay-fremont', 'eastbay-pleasanton'],
    peninsula: ['peninsula-palo-alto', 'peninsula-san-jose', 'peninsula-half-moon-bay', 'peninsula-santa-clara'],
    northbay: ['northbay-sausalito', 'northbay-tiburon', 'northbay-larkspur', 'northbay-corte-madera'],
    vancouver: ['van-granville-island-public-market', 'van-downtown', 'van-coal-harbour', 'van-seafood', 'van-italian', 'van-japanese', 'van-robson-street'],
    portland: ['pdx-downtown', 'pdx-pearl-district', 'pdx-new-american', 'pdx-pizza', 'pdx-health-food'],
    nyc: ['nyc-tribeca', 'nyc-west-village', 'nyc-soho', 'nyc-italian', 'nyc-french', 'nyc-steak'],
    pullman: ['pul-game-day', 'pul-cafe'],
    moscow: [],
    sandiego: ['sd-little-italy', 'sd-coronado', 'sd-la-jolla', 'sd-seafood', 'sd-mexican', 'sd-north-park'],
  }
  return lists[city]
}
