import { isRestaurant } from '../lib/restaurant.ts'
import { onePerBrand } from '../lib/brand.ts'
import { Link, useParams } from 'react-router-dom'
import { CitySwitcher } from '../components/CitySwitcher.tsx'
import { Achievements } from '../components/Achievements.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { slimById } from '../content/load.ts'
import { areaPhrase, areaTitle, areasFor, cityPath } from '../lib/city.ts'
import { placeCity, placesForCity, useCityId } from '../lib/use-city.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'
import type { SlimPlace } from '../types.ts'

type Row = { id: string; name: string; score: number }

export function ProfilePage() {
  const { handle = '' } = useParams()
  const app = useApp()
  const person = app.demoUsers.find((user) => user.handle === handle)
  const friend = app.friends.find((user) => user.handle === handle)
  const mine = app.user?.handle === handle
  const city = useCityId()
  const area = areaTitle(city)
  usePageMeta(
    mine ? `${app.user?.name ?? 'You'} · Gusto's Guide` : person ? `${person.name} · Gusto's Guide` : friend ? `${friend.name} · Gusto's Guide` : 'Profile',
    mine ? `Your ${area} stats.` : 'A friend on Gusto’s Guide.',
    './og/og.png',
  )

  if (!person && !friend && !mine) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
        <h1 className="font-serif text-5xl italic">No one by that name.</h1>
        <p className="mt-3">Sign in to open your own profile.</p>
      </main>
    )
  }

  const lists = friend ? app.friendLists[friend.id] : undefined
  const beenIds = mine
    ? Object.entries(app.statuses).filter(([, status]) => status === 'been').map(([id]) => id)
    : person?.been ?? lists?.been ?? []
  const togoIds = mine
    ? Object.entries(app.statuses).filter(([, status]) => status === 'togo').map(([id]) => id)
    : lists?.togo ?? []
  const mineTogo = new Set(Object.entries(app.statuses).filter(([, status]) => status === 'togo').map(([id]) => id))
  const overlap = friend ? togoIds.filter((id) => mineTogo.has(id)) : []
  const beenPlaces = beenIds.map((id) => slimById(id)).filter((place): place is SlimPlace => place != null)
  // The owner scores places as Gusto's Score (house_scores), not through Rank, so his own
  // Top 10 falls back to those when he has no personal rankings.
  const ownScores: Record<string, number> = Object.fromEntries(Object.entries(app.scores).map(([id, score]) => [id, score.score]))
  const mineScores = mine && app.user?.isOwner && Object.keys(ownScores).length === 0 ? app.houseScores : ownScores
  const scoreRows: Row[] = mine
    ? Object.entries(mineScores).filter(([id]) => slimById(id)).map(([id, score]) => ({ id, name: slimById(id)?.name ?? id, score }))
    : Object.entries(person?.scores ?? {}).map(([id, score]) => ({ id, name: slimById(id)?.name ?? id, score }))
  scoreRows.sort((a, b) => b.score - a.score)
  const top = onePerBrand(scoreRows.filter((row) => { const spot = slimById(row.id); return spot != null && placeCity(spot) === city && isRestaurant(spot) }), (row) => row.name).slice(0, 10)
  const cuisines = topCuisines(beenPlaces)
  const match = person && !mine ? app.tasteMatch(person.id) : null
  const shared = person ? Object.keys(app.scores).filter((id) => person.scores[id] !== undefined).length : 0

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <p className="text-xs font-bold uppercase tracking-wide">{mine ? 'Your profile' : 'Friend'}</p>
      <h1 className="font-serif text-5xl italic">{mine ? app.user?.name : person?.name ?? friend?.name}</h1>
      {mine && app.user?.avatarUrl ? <img src={app.user.avatarUrl} alt="" width={64} height={64} referrerPolicy="no-referrer" className="mt-4 h-16 w-16 rounded-full border-2 border-ink object-cover" /> : null}
      {mine && app.user?.handle ? <p className="mt-2 text-sm font-bold">Signed in as @{app.user.handle}</p> : null}
      <p className="mt-2">
        {mine ? (app.supabase ? 'Signed in' : 'Signed in on this browser') : person ? `${person.neighborhood} · streak ${person.streak} weeks` : `@${friend?.handle ?? handle}`}
        {' '}· {beenPlaces.length} been
      </p>
      {mine ? (
        <p className="mt-3 max-w-xl">This is you. Taste match appears on a friend’s profile after you have both scored at least three of the same places.</p>
      ) : (
        <section className="mt-4 border-2 border-ink p-4" aria-labelledby="taste-match">
          <h2 id="taste-match" className="font-serif text-3xl italic">Taste match</h2>
          <p className="mt-2">
            {match === null
              ? `Rank three of the same places. You overlap on ${shared} so far. The match is a correlation of those scores: 82% would mean you tend to rank the same meals high.`
              : `${match}%. That is a correlation over ${shared} places you have both scored. A high number means you tend to rank the same meals high.`}
          </p>
          {person ? (
            <button type="button" className="btn mt-3" onClick={() => app.user && app.toggleFollow(person.id)}>
              {app.following.includes(person.id) ? 'Following' : 'Follow'}
            </button>
          ) : null}
        </section>
      )}
      <Achievements
        been={beenIds}
        rated={mine ? Object.keys(app.scores) : Object.keys(person?.scores ?? {})}
        userId={mine ? app.user?.id ?? null : null}
        gustoScore={app.gustoScore}
        mine={mine}
        city={city}
        who={mine ? (app.user?.handle ? `@${app.user.handle}` : app.user?.name) : person?.name ?? friend?.name}
      />
      {!mine ? (
        <>
          <h2 className="mt-8 font-serif text-3xl italic">Been</h2>
          <PlaceGrid ids={beenIds} empty="No Been marks yet." />
          <h2 className="mt-8 font-serif text-3xl italic">To go</h2>
          <PlaceGrid ids={togoIds} empty="Nothing waiting on their list." />
          <h2 className="mt-8 font-serif text-3xl italic">You both want to try</h2>
          {overlap.length ? (
            <ul className="mt-3 grid grid-cols-2 gap-3">
              {overlap.map((id) => {
                const spot = slimById(id)
                if (!spot) return null
                return (
                  <li key={id} className="feed-card">
                    <Link to={`/place/${id}`} className="block h-28 overflow-hidden bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
                      <PlaceThumb place={spot} uploads={app.photos} />
                    </Link>
                    <p className="mt-2 font-serif text-xl italic leading-none">{spot.name}</p>
                    <Link className="btn mt-3 text-sm" to={`/plans?place=${id}`}>Go together</Link>
                  </li>
                )
              })}
            </ul>
          ) : <p className="mt-2">No overlap yet. When you both mark the same place To go, it lands here.</p>}
        </>
      ) : null}
      <h2 className="mt-8 font-serif text-3xl italic">Top cuisines</h2>
      {cuisines.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {cuisines.map((item) => <li key={item.name} className="tag">{item.name} · {item.count}</li>)}
        </ul>
      ) : <p className="mt-2">Mark a few places Been and the cuisines show up here.</p>}
      <h2 className="mt-8 font-serif text-3xl italic">Neighborhoods</h2>
      <div className="mt-3">
        {beenPlaces.length ? <p>{beenPlaces.length} places marked Been.</p> : <p>No been pins yet.</p>}
        <Link className="btn mt-3" to={cityPath('/explore')}>Open the map</Link>
      </div>
      <div className="top10-head mt-8">
        <h2 className="font-serif text-3xl italic">Top 10 in {areaPhrase(city)}</h2>
        {areasFor(city).filter((item) => item.ready).length > 1 ? <CitySwitcher inline /> : null}
      </div>
      {top.length ? (
        <ol className="mt-3 space-y-2">
          {top.map((row, index) => (
            <li key={row.id} className="score-line">
              <span className="score-line-rank">{index + 1}</span>
              <Link className="min-w-0 truncate font-bold" to={`/place/${row.id}`}>{row.name}</Link>
              <span className="score-line-num">{row.score.toFixed(1)}</span>
            </li>
          ))}
        </ol>
      ) : <p className="mt-2">No scores yet.</p>}
      {!mine && person ? (
        <p className="mt-6 text-sm">Scores on this page are theirs. They are not Gusto's Score.</p>
      ) : null}
      <p className="mt-4 text-sm">{placesForCity(city).length} places are on the {area} guide.</p>
    </main>
  )
}

function PlaceGrid({ ids, empty }: { ids: string[]; empty: string }) {
  const app = useApp()
  const places = ids.map((id) => slimById(id)).filter((place): place is SlimPlace => place != null).slice(0, 8)
  if (!places.length) return <p className="mt-2">{empty}</p>
  return (
    <ul className="mt-3 grid grid-cols-2 gap-3">
      {places.map((place) => (
        <li key={place.id}>
          <Link to={`/place/${place.id}`} className="hit-card">
            <div className="h-28 overflow-hidden bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
              <PlaceThumb place={place} uploads={app.photos} />
            </div>
            <div className="p-2">
              <h3 className="font-serif text-xl italic leading-tight">{place.name}</h3>
              <p className="mt-1 text-xs font-bold tracking-wide uppercase">{place.neighborhood}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function topCuisines(places: SlimPlace[]): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const place of places) {
    for (const cuisine of place.cuisine) counts.set(cuisine, (counts.get(cuisine) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}
