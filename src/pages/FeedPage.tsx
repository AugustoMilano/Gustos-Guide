import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { catalog } from '../content/load.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'

export function FeedPage() {
  const app = useApp()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [signIn, setSignIn] = useState(false)
  usePageMeta("Feed · Gusto's Guide", 'What demo friends and you have saved, ranked, and photographed in Seattle.')
  const names = new Map([[app.user?.id ?? '', app.user?.name ?? ''], ...app.demoUsers.map((user) => [user.id, user.name] as const)])
  const board = [
    ...app.demoUsers.map((user) => ({ id: user.id, name: user.name, count: user.been.length, streak: user.streak, demo: true })),
    { id: app.user?.id ?? 'you', name: app.user?.name ?? 'You', count: Object.keys(app.scores).length, streak: 0, demo: false },
  ].sort((a, b) => b.count - a.count)

  return (
    <main id="main" tabIndex={-1} className="mx-auto grid max-w-6xl gap-8 px-4 pt-24 pb-16 outline-none lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <p className="text-xs font-bold tracking-[0.14em] uppercase">Demo friends are labeled</p>
        <h1 className="font-serif text-5xl italic">The feed</h1>
        <ul className="mt-6 space-y-4">
          {app.activities.map((activity) => {
            const person = app.demoUsers.find((user) => user.id === activity.userId)
            const place = activity.placeId ? catalog.places.find((item) => item.id === activity.placeId) : undefined
            return (
              <li key={activity.id} className="border-2 border-ink p-4">
                <p className="text-sm font-bold">
                  {names.get(activity.userId) ?? 'Someone'}
                  {person?.demo ? ' · Demo' : ''}
                </p>
                <p className="mt-1">{activity.text}</p>
                {place ? <Link className="font-serif text-2xl italic" to={`/place/${place.id}`}>{place.name}</Link> : null}
                {activity.score ? <p className="text-sm">Their score {activity.score.toFixed(1)}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className={`btn text-sm ${app.likes.includes(activity.id) ? 'btn-coral' : ''}`} onClick={() => (app.user ? app.toggleLike(activity.id) : setSignIn(true))}>
                    Like
                  </button>
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {app.comments.filter((comment) => comment.activityId === activity.id).map((comment) => (
                    <li key={comment.id}><strong>{names.get(comment.userId) ?? 'You'}:</strong> {comment.text}</li>
                  ))}
                </ul>
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!app.user) {
                      setSignIn(true)
                      return
                    }
                    app.addComment(activity.id, drafts[activity.id] ?? '')
                    setDrafts((current) => ({ ...current, [activity.id]: '' }))
                  }}
                >
                  <input className="min-h-11 flex-1 border-2 border-ink bg-cream px-2" value={drafts[activity.id] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [activity.id]: event.target.value }))} placeholder="Comment" />
                  <button className="btn text-sm" type="submit">Post</button>
                </form>
              </li>
            )
          })}
        </ul>
      </div>
      <aside>
        <h2 className="font-serif text-3xl italic">Leaderboard</h2>
        <ol className="mt-3 space-y-2">
          {board.map((row) => (
            <li key={row.id}>
              <Link to={row.demo ? `/u/${row.id.replace('demo-', '')}` : '/my'} className="font-bold">{row.name}</Link>
              {row.demo ? ' · Demo' : ''} · {row.count} ranked · streak {row.streak}
            </li>
          ))}
        </ol>
        <h2 className="mt-8 font-serif text-3xl italic">Friends</h2>
        <ul className="mt-3 space-y-2">
          {app.demoUsers.map((user) => (
            <li key={user.id}>
              <Link to={`/u/${user.handle}`} className="font-bold">{user.name}</Link>
              <span className="text-sm"> · Demo · {app.following.includes(user.id) ? 'Following' : 'Not following'}</span>
              <button type="button" className="btn ml-2 text-sm" onClick={() => app.user && app.toggleFollow(user.id)}>
                {app.following.includes(user.id) ? 'Unfollow' : 'Follow'}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </main>
  )
}
