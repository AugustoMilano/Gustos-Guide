import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PriceFilter } from './PriceFilter.tsx'
import { cityPath, type CityId } from '../lib/city.ts'
import { placeNameClass } from '../lib/place-name.ts'
import { hasUnknownPrice, matchesPrice } from '../lib/price-filter.ts'
import type { SmartResult } from '../lib/smart-search.ts'
import type { Price } from '../types.ts'

function ResultList({ title, hits, onPick }: { title: string; hits: SmartResult['guides']; onPick?: () => void }) {
  if (!hits.length) return null
  return (
    <section className="mt-6">
      <h2 className="font-serif text-3xl italic">{title}</h2>
      <ul className="mt-3 grid gap-2">
        {hits.map((hit) => (
          <li key={`${hit.kind}-${hit.id}`}>
            <Link to={hit.href} className="smart-hit" onClick={onPick}>
              <span className="place-row-copy">
                <span className={hit.kind === 'place' ? placeNameClass(hit.title, 'italic leading-tight') : 'block font-serif text-2xl italic leading-tight'}>{hit.title}</span>
                <span className="mt-1 block text-sm">{hit.why}</span>
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
  const [prices, setPrices] = useState<Price[]>([])
  const [unknownPrice, setUnknownPrice] = useState(false)
  const [forQuery, setForQuery] = useState(query)
  if (query !== forQuery) {
    setForQuery(query)
    setPrices([])
    setUnknownPrice(false)
  }
  const choice = { prices, unknown: unknownPrice }
  const places = result.places.filter((hit) => matchesPrice({ price: hit.price ?? undefined }, choice))
  const empty = result.guides.length === 0 && result.places.length === 0
  const pricedOut = !empty && result.places.length > 0 && places.length === 0
  return (
    <div>
      {result.switched ? <p className="mt-4 text-sm font-bold">Showing {result.scopeLabel}.</p> : null}
      {result.places.length ? (
        <div className="mt-4">
          <PriceFilter
            choice={choice}
            showUnknown={hasUnknownPrice(result.places.map((hit) => ({ price: hit.price ?? undefined })))}
            onChange={(next) => { setPrices(next.prices); setUnknownPrice(next.unknown) }}
          />
        </div>
      ) : null}
      {empty ? (
        <div className="mt-4" role="status">
          <p className="font-bold">Nothing matches “{query}”.</p>
          <p className="mt-1 text-sm">Try a place name, a dish like ramen or tacos, or a neighborhood.</p>
        </div>
      ) : null}
      <ResultList title="Guides" hits={result.guides} onPick={onPick} />
      <ResultList title="Places" hits={places} onPick={onPick} />
      {pricedOut ? <p className="mt-4" role="status">No places at that price.</p> : null}
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
    seattle: ['pike-place', 'best-bakeries', 'best-pizza', 'late-night', 'cocktail-bars', 'classics'],
    eastside: ['best-of-bellevue', 'bellevue', 'kirkland', 'best-breakfast-on-the-east-side', 'eastside-drinks', 'eastside-date-night'],
    la: ['la-date-night', 'santa-monica', 'venice', 'beverly-grove', 'la-sushi', 'downtown-la'],
    sf: ['sf-mission-district', 'sf-north-beach', 'sf-italian', 'sf-seafood', 'sf-embarcadero', 'sf-new-american'],
    eastbay: ['east-bay'],
    peninsula: ['peninsula'],
    northbay: ['north-bay'],
    vancouver: ['van-granville-island-public-market', 'van-downtown', 'van-coal-harbour', 'van-seafood', 'van-italian', 'van-japanese', 'van-robson-street'],
    portland: ['pdx-downtown', 'pdx-pearl-district', 'pdx-new-american', 'pdx-pizza', 'pdx-health-food'],
    nyc: ['nyc-tribeca', 'nyc-west-village', 'nyc-soho', 'nyc-italian', 'nyc-french', 'nyc-steak'],
    pullman: ['pul-game-day', 'pul-cafe'],
    moscow: ['best-of-moscow-id'],
    sandiego: ['sd-little-italy', 'sd-coronado', 'sd-la-jolla', 'sd-seafood', 'sd-mexican', 'sd-north-park'],
  }
  return lists[city]
}
