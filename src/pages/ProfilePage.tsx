import { Link, useParams } from 'react-router-dom'
import { catalog } from '../content/load.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'

export function ProfilePage() {
  const { handle = '' } = useParams()
  const app = useApp()
  const person = app.demoUsers.find((user) => user.handle === handle)
  usePageMeta(person ? `${person.name} · Gusto's Guide` : 'Profile', 'A demo friend on Gusto’s Guide.')
  if (!person) {
    return <main className="mx-auto max-w-3xl px-4 pt-28"><h1 className="font-serif text-5xl italic">No one by that name.</h1></main>
  }
  const match = app.tasteMatch(person.id)
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <p className="text-xs font-bold uppercase tracking-wide">Demo profile</p>
      <h1 className="font-serif text-5xl italic">{person.name}</h1>
      <p className="mt-2">{person.neighborhood} · streak {person.streak} weeks · {person.been.length} ranked</p>
      <p className="mt-2">{match === null ? 'Rank three of the same places to see a taste match.' : `Taste match ${match}%`}</p>
      <button type="button" className="btn mt-3" onClick={() => app.user && app.toggleFollow(person.id)}>
        {app.following.includes(person.id) ? 'Following' : 'Follow'}
      </button>
      <h2 className="mt-8 font-serif text-3xl italic">Their scores</h2>
      <ul className="mt-3 space-y-2">
        {Object.entries(person.scores).map(([id, score]) => {
          const place = catalog.places.find((item) => item.id === id)
          if (!place) return null
          return <li key={id}><Link className="font-bold" to={`/place/${id}`}>{place.name}</Link> · {score.toFixed(1)}{score >= 9 ? ' · loved' : ''}</li>
        })}
      </ul>
    </main>
  )
}
