import { m, useReducedMotion } from 'framer-motion'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { ForkMark, GoldenFork } from '../components/GoldenFork.tsx'
import { ScoreBadge } from '../components/ScoreBadge.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { PlaceName } from '../components/PlaceName.tsx'
import { PriceFilter } from '../components/PriceFilter.tsx'
import { catalogPhase, ensureRegion, subscribeCatalog } from '../content/load.ts'
import { cityPath, regionName, regionOf, type RegionId } from '../lib/city.ts'
import { usePageMeta } from '../lib/meta.ts'
import { regionBoard, type TopRow } from '../lib/top25.ts'
import { placeCity, useCityId } from '../lib/use-city.ts'
import { hasUnknownPrice, matchesPrice } from '../lib/price-filter.ts'
import { useApp } from '../state/AppState.tsx'
import type { Price } from '../types.ts'

const TOP_REGIONS = ['seattle', 'la', 'sf', 'sandiego', 'vancouver', 'portland', 'nyc', 'pullman'] as const satisfies readonly RegionId[]
const TOP_LABEL: Record<RegionId, string> = { seattle: 'Seattle', la: 'Los Angeles', sf: 'San Francisco', sandiego: 'San Diego', vancouver: 'Vancouver', portland: 'Portland', nyc: 'New York', pullman: 'Pullman, WA' }
const TOP_INTRO: Partial<Record<RegionId, string>> = {
  vancouver: "Vancouver, ranked by Augusto's exact Gusto's Score.",
  portland: "Portland, ranked by Augusto's exact Gusto's Score.",
  nyc: "New York, ranked by Augusto's exact Gusto's Score.",
  pullman: "Pullman, WA and Moscow, ID, ranked by Augusto's exact Gusto's Score.",
}

function podiumOrder(rows: TopRow[]): TopRow[] {
  if (rows.length >= 3) return [rows[1], rows[0], rows[2]]
  if (rows.length === 2) return [rows[1], rows[0]]
  return rows.slice(0, 1)
}

export function TopPage() {
  const app = useApp()
  const city = useCityId()
  useSyncExternalStore(subscribeCatalog, catalogPhase, catalogPhase)
  useEffect(() => { void ensureRegion(city) }, [city])
  const region = regionOf(city)
  const board = regionBoard(region, app.gustoScore)
  const [prices, setPrices] = useState<Price[]>([])
  const [unknownPrice, setUnknownPrice] = useState(false)
  const shown = board.shown.filter((row) => matchesPrice(row.place, { prices, unknown: unknownPrice }))
  const reduce = useReducedMotion()
  const name = regionName(city)
  const others = TOP_REGIONS.filter((item) => item !== region)
  const podium = podiumOrder(shown)
  const rest = shown.slice(Math.min(3, shown.length))
  // index.html painted a static copy of this intro (fix77); React's identical markup has replaced it.
  useEffect(() => {
    if (document.documentElement.dataset.prerender === 'top') delete document.documentElement.dataset.prerender
    delete document.documentElement.dataset.preRegion
  }, [])
  usePageMeta(
    `Top 25 · ${name} · Gusto's Guide`,
    `The Golden Fork list for ${name}, ranked by Augusto's exact Gusto's Score.`,
    `./og/top/${region}.png`,
  )

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <AreaKicker />
      <p className="mt-3 text-xs font-bold tracking-[0.16em] uppercase">Golden Fork · 2026</p>
      <h1 className="mt-1 font-serif text-5xl italic leading-none sm:text-6xl">Top 25 · {name}</h1>
      <p className="mt-3 max-w-xl">
        {region === 'seattle'
          ? "Seattle, Bellevue, Kirkland, and Redmond, ranked by Augusto's exact Gusto's Score."
          : region === 'la'
            ? "Los Angeles, ranked by Augusto's exact Gusto's Score."
            : region === 'sandiego'
              ? "San Diego, ranked by Augusto's exact Gusto's Score."
              : region === 'sf'
                ? "San Francisco, the East Bay, the Peninsula, and the North Bay, ranked by Augusto's exact Gusto's Score."
                : TOP_INTRO[region]}
        {' '}Restaurants only, one per brand. Owner scores only; a place with no score stays off the list.
      </p>
      {board.scored > 0 ? (
        <div className="mt-4">
          <PriceFilter
            choice={{ prices, unknown: unknownPrice }}
            showUnknown={hasUnknownPrice(board.shown.map((row) => row.place))}
            onChange={(next) => { setPrices(next.prices); setUnknownPrice(next.unknown) }}
          />
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="btn text-sm" to={cityPath('/rank')}>Rank a place</Link>
        {others.map((item) => (
          <Link key={item} className="btn text-sm" to={`/${item}/top`}>
            {TOP_LABEL[item]} Top 25
          </Link>
        ))}
      </div>
      {board.scored === 0 ? (
        <section className="glass mt-6 px-5 py-8 text-center">
          <ForkMark metal="gold" gem size="lg" caption="Golden Fork" label="Golden Fork" />
          <h2 className="mt-3 font-serif text-4xl italic">More coming</h2>
          <p className="mx-auto mt-2 max-w-md">No Gusto's Scores in {name} yet. The list fills in as Augusto publishes them.</p>
        </section>
      ) : (
        <>
          {board.scored < 25 ? (
            <p className="glass mt-5 px-4 py-3 text-sm font-bold">{board.scored} of 25 scored. More coming.</p>
          ) : null}
          {shown.length === 0 ? (
            <div className="mt-5">
              <p className="font-serif text-2xl italic">Nothing in the Top 25 matches that price.</p>
              <button type="button" className="btn mt-3" onClick={() => { setPrices([]); setUnknownPrice(false) }}>Clear filters</button>
            </div>
          ) : (
          <div className={`top-podium mt-5${podium.length < 3 ? ' is-short' : ''}`} style={{ ['--podium' as string]: String(podium.length) }}>
            {podium.map((row) => (
              <m.div
                key={row.place.id}
                className={`podium-col is-rank-${row.rank}`}
                initial={reduce ? false : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                // Third rises first, then second, and the winner last.
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 28, delay: (3 - row.rank) * 0.12 }}
              >
                <Link
                  to={cityPath(`/place/${row.place.id}`, placeCity(row.place))}
                  viewTransition={!reduce}
                  className={`top-podium-card glass${row.rank === 1 ? ' is-first' : ''}`}
                >
                  <GoldenFork placeId={row.place.id} size="lg" />
                  <span className="top-podium-shot" style={reduce ? undefined : { viewTransitionName: `place-${row.place.id}` }}>
                    <PlaceThumb place={row.place} uploads={app.photos} eager={row.rank === 1} />
                  </span>
                  <PlaceName name={row.place.name} className="podium-name italic leading-tight" />
                  <span className="podium-area text-xs font-bold tracking-wide uppercase">{row.place.neighborhood}</span>
                  <span className="podium-score">{row.score.toFixed(1)}</span>
                </Link>
                <span className="podium-step" aria-hidden="true">{row.rank}</span>
              </m.div>
            ))}
          </div>
          )}
          {rest.length ? (
            <ol className="mt-6 space-y-3">
              {rest.map((row, index) => (
                <m.li
                  key={row.place.id}
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34, delay: Math.min(index, 10) * 0.035 }}
                >
                  <Link to={cityPath(`/place/${row.place.id}`, placeCity(row.place))} viewTransition={!reduce} className="top-row glass">
                    <span className="top-rank">{row.rank}</span>
                    <span className="top-row-shot" style={reduce ? undefined : { viewTransitionName: `place-${row.place.id}` }}>
                      <PlaceThumb place={row.place} uploads={app.photos} />
                      <GoldenFork placeId={row.place.id} overlay />
                    </span>
                    <span className="place-row-copy">
                      <PlaceName name={row.place.name} className="italic leading-tight" />
                      <span className="place-meta mt-1 text-xs font-bold tracking-wide uppercase"><span>{row.place.neighborhood}</span></span>
                    </span>
                    <span className="score-col"><ScoreBadge score={row.score} size="sm" /></span>
                  </Link>
                </m.li>
              ))}
            </ol>
          ) : null}
        </>
      )}
    </main>
  )
}
