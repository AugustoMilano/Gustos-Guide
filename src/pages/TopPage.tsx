import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { ForkMark, GoldenFork } from '../components/GoldenFork.tsx'
import { ScoreBadge } from '../components/ScoreBadge.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { cityPath, regionName, regionOf } from '../lib/city.ts'
import { usePageMeta } from '../lib/meta.ts'
import { regionBoard, type TopRow } from '../lib/top25.ts'
import { placeCity, useCityId } from '../lib/use-city.ts'
import { useApp } from '../state/AppState.tsx'

function podiumOrder(rows: TopRow[]): TopRow[] {
  if (rows.length >= 3) return [rows[1], rows[0], rows[2]]
  if (rows.length === 2) return [rows[1], rows[0]]
  return rows.slice(0, 1)
}

export function TopPage() {
  const app = useApp()
  const city = useCityId()
  const region = regionOf(city)
  const board = regionBoard(region, app.gustoScore)
  const reduce = useReducedMotion()
  const name = regionName(city)
  const others = (['seattle', 'la', 'sf'] as const).filter((item) => item !== region)
  const podium = podiumOrder(board.shown)
  const rest = board.shown.slice(Math.min(3, board.shown.length))
  usePageMeta(
    `Top 25 · ${name} · Gusto's Guide`,
    `The Golden Fork list for ${name}, ranked by Augusto's exact Gusto's Score.`,
  )

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <AreaKicker />
      <p className="mt-3 text-xs font-bold tracking-[0.16em] uppercase">Golden Fork · 2026</p>
      <h1 className="mt-1 font-serif text-5xl italic leading-none sm:text-6xl">Top 25 · {name}</h1>
      <p className="mt-3 max-w-xl">
        {region === 'seattle'
          ? "Seattle and the Eastside, ranked by Augusto's exact Gusto's Score."
          : region === 'la'
            ? "Los Angeles, ranked by Augusto's exact Gusto's Score."
            : "San Francisco, the East Bay, the Peninsula, and the North Bay, ranked by Augusto's exact Gusto's Score."}
        {' '}Owner scores only. A place with no score stays off the list.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="btn text-sm" to={cityPath('/rank')}>Rank a place</Link>
        {others.map((item) => (
          <Link key={item} className="btn text-sm" to={item === 'la' ? '/la/top' : item === 'sf' ? '/sf/top' : '/seattle/top'}>
            {item === 'la' ? 'Los Angeles Top 25' : item === 'sf' ? 'San Francisco Top 25' : 'Seattle Top 25'}
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
          <div className={`top-podium mt-5${podium.length < 3 ? ' is-short' : ''}`} style={{ ['--podium' as string]: String(podium.length) }}>
            {podium.map((row, index) => (
              <motion.div
                key={row.place.id}
                initial={reduce ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32, delay: index * 0.05 }}
              >
                <Link
                  to={cityPath(`/place/${row.place.id}`, placeCity(row.place))}
                  className={`top-podium-card glass${row.rank === 1 ? ' is-first' : ''}`}
                >
                  <GoldenFork placeId={row.place.id} size="lg" />
                  <span className="top-podium-shot">
                    <PlaceThumb place={row.place} uploads={app.photos} eager={row.rank === 1} />
                  </span>
                  <span className="mt-2 block font-serif text-xl italic leading-tight sm:text-2xl">{row.place.name}</span>
                  <span className="mt-1 block text-xs font-bold tracking-wide uppercase">{row.place.neighborhood}</span>
                  <span className="podium-score">{row.score.toFixed(1)}</span>
                </Link>
              </motion.div>
            ))}
          </div>
          {rest.length ? (
            <ol className="mt-6 space-y-3">
              {rest.map((row, index) => (
                <motion.li
                  key={row.place.id}
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34, delay: Math.min(index, 10) * 0.035 }}
                >
                  <Link to={cityPath(`/place/${row.place.id}`, placeCity(row.place))} className="top-row glass">
                    <span className="top-rank">{row.rank}</span>
                    <span className="top-row-shot">
                      <PlaceThumb place={row.place} uploads={app.photos} />
                      <GoldenFork placeId={row.place.id} overlay />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-serif text-2xl italic leading-tight">{row.place.name}</span>
                      <span className="mt-1 block truncate text-xs font-bold tracking-wide uppercase">{row.place.neighborhood}</span>
                    </span>
                    <span className="score-col"><ScoreBadge score={row.score} size="sm" /></span>
                  </Link>
                </motion.li>
              ))}
            </ol>
          ) : null}
        </>
      )}
    </main>
  )
}
