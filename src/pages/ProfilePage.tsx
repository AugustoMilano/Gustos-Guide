import { Link, useParams } from 'react-router-dom'
import { GuideMap } from '../components/GuideMap.tsx'
import { catalog, slimById } from '../content/load.ts'
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
  usePageMeta(
    mine ? `${app.user?.name ?? 'You'} · Gusto's Guide` : person ? `${person.name} · Gusto's Guide` : friend ? `${friend.name} · Gusto's Guide` : 'Profile',
    mine ? 'Your Seattle stats.' : 'A friend on Gusto’s Guide.',
    './og/og.svg',
  )

  if (!person && !friend && !mine) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
        <h1 className="font-serif text-5xl italic">No one by that name.</h1>
        <p className="mt-3">Sign in to open your own profile.</p>
      </main>
    )
  }

  const beenIds = mine
    ? Object.entries(app.statuses).filter(([, status]) => status === 'been').map(([id]) => id)
    : person?.been ?? []
  const beenPlaces = beenIds.map((id) => slimById(id)).filter((place): place is SlimPlace => place != null)
  const scoreRows: Row[] = mine
    ? Object.entries(app.scores).map(([id, score]) => ({ id, name: slimById(id)?.name ?? id, score: score.score }))
    : Object.entries(person?.scores ?? {}).map(([id, score]) => ({ id, name: slimById(id)?.name ?? id, score }))
  scoreRows.sort((a, b) => b.score - a.score)
  const top = scoreRows.slice(0, 10)
  const cuisines = topCuisines(beenPlaces)
  const match = person && !mine ? app.tasteMatch(person.id) : null
  const shared = person ? Object.keys(app.scores).filter((id) => person.scores[id] !== undefined).length : 0

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <p className="text-xs font-bold uppercase tracking-wide">{mine ? 'Your profile' : 'Friend'}</p>
      <h1 className="font-serif text-5xl italic">{mine ? app.user?.name : person?.name ?? friend?.name}</h1>
      {mine && app.user?.avatarUrl ? <img src={app.user.avatarUrl} alt="" className="mt-4 h-16 w-16 rounded-full border-2 border-ink object-cover" /> : null}
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
      <h2 className="mt-8 font-serif text-3xl italic">Top cuisines</h2>
      {cuisines.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {cuisines.map((item) => <li key={item.name} className="tag">{item.name} · {item.count}</li>)}
        </ul>
      ) : <p className="mt-2">Mark a few places Been and the cuisines show up here.</p>}
      <h2 className="mt-8 font-serif text-3xl italic">Neighborhoods</h2>
      <div className="mt-3 h-72">
        {beenPlaces.length ? <GuideMap places={beenPlaces} statuses={app.statuses} /> : <p>No been pins yet.</p>}
      </div>
      <h2 className="mt-8 font-serif text-3xl italic">Top 10</h2>
      {top.length ? (
        <ol className="mt-3 space-y-2">
          {top.map((row, index) => (
            <li key={row.id} className="flex items-baseline justify-between gap-3 border-b border-ink/20 py-1">
              <span><span className="font-bold">{index + 1}.</span> <Link className="font-bold" to={`/place/${row.id}`}>{row.name}</Link></span>
              <span>{row.score.toFixed(1)}</span>
            </li>
          ))}
        </ol>
      ) : <p className="mt-2">No scores yet.</p>}
      {!mine && person ? (
        <p className="mt-6 text-sm">Scores on this page are theirs. They are not Gusto's Score.</p>
      ) : null}
      <p className="mt-4 text-sm">{catalog.places.length} places are on the guide.</p>
    </main>
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
