import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { catalog } from '../content/load.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'

export function FeedPage() {
  const app = useApp()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [signIn, setSignIn] = useState(false)
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [invite, setInvite] = useState('')
  const [friendError, setFriendError] = useState('')
  usePageMeta(
    "Feed · Gusto's Guide",
    app.supabase ? 'What you and your friends have saved, ranked, and photographed in Seattle.' : 'What demo friends and you have saved, ranked, and photographed in Seattle.',
    './og/og.svg',
  )
  const names = new Map<string, string>([[app.user?.id ?? '', app.user?.name ?? '']])
  for (const user of app.demoUsers) names.set(user.id, user.name)
  for (const user of app.friends) names.set(user.id, user.name)
  const board = [
    ...app.demoUsers.map((user) => ({ id: user.id, name: user.name, count: user.been.length, streak: user.streak, demo: true })),
    { id: app.user?.id ?? 'you', name: app.user?.name ?? 'You', count: Object.keys(app.scores).length, streak: 0, demo: false },
  ].sort((a, b) => b.count - a.count)

  return (
    <main id="main" tabIndex={-1} className="mx-auto grid max-w-6xl gap-8 px-4 pt-24 pb-16 outline-none lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <p className="text-xs font-bold tracking-[0.14em] uppercase">{app.supabase ? 'Friends only' : 'Demo friends are labeled'}</p>
        <h1 className="font-serif text-5xl italic">The feed</h1>
        <ul className="mt-6 space-y-4">
          {app.activities.length === 0 ? <li className="border-2 border-ink p-4">Nothing on the feed yet.</li> : null}
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
                {place ? (
                  <Link className="mt-2 flex items-center gap-3" to={`/place/${place.id}`}>
                    <span className="h-28 w-36 shrink-0 overflow-hidden border-2 border-ink bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
                      <PlaceThumb place={place} uploads={app.photos} />
                    </span>
                    <span className="font-serif text-2xl italic leading-none">{place.name}</span>
                  </Link>
                ) : null}
                {activity.score ? <p className="text-sm">Their score {activity.score.toFixed(1)}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className={`btn text-sm ${app.likes.includes(activity.id) ? 'btn-coral' : ''}`} onClick={() => (app.user ? app.toggleLike(activity.id) : setSignIn(true))}>
                    Like
                  </button>
                </div>
                <section className="mt-3" aria-label="Comments">
                  <h2 className="text-sm font-bold">Comments · {app.comments.filter((comment) => comment.activityId === activity.id).length}</h2>
                  <ul className="mt-2 space-y-2 text-sm">
                    {app.comments.filter((comment) => comment.activityId === activity.id).map((comment) => (
                      <li key={comment.id} className="border-l-2 border-ink pl-2">
                        <strong>{names.get(comment.userId) ?? 'You'}</strong>
                        {app.demoUsers.some((user) => user.id === comment.userId) ? ' · Demo' : ''}
                        <span className="mt-1 block">{comment.text}</span>
                      </li>
                    ))}
                  </ul>
                </section>
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
          {board.map((row, index) => (
            <li key={row.id} className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center border-2 border-ink bg-coral text-sm font-bold">{index + 1}</span>
              <span>
                <Link to={row.demo ? `/u/${row.id.replace('demo-', '')}` : '/my'} className="font-bold">{row.name}</Link>
                {row.demo ? ' · Demo' : ''} · {row.count} ranked · streak {row.streak}
              </span>
            </li>
          ))}
        </ol>
        <h2 className="mt-8 font-serif text-3xl italic">Friends</h2>
        {app.supabase && app.user ? (
          <form
            className="mt-3 space-y-2"
            onSubmit={(event) => {
              event.preventDefault()
              setFriendError('')
              setInvite('')
              const run = email.trim()
                ? app.inviteByEmail(email).then((link) => setInvite(link))
                : app.requestFriend(handle)
              void run.catch((reason: unknown) => setFriendError(reason instanceof Error ? reason.message : 'Could not send that.'))
            }}
          >
            <label className="field"><span>Username</span><input value={handle} onChange={(event) => setHandle(event.target.value)} /></label>
            <label className="field"><span>Or email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <button type="button" className="btn text-sm" disabled={!handle.trim()} onClick={() => { setFriendError(''); void app.requestFriend(handle).catch((reason: unknown) => setFriendError(reason instanceof Error ? reason.message : 'Could not send that.')) }}>Request</button>
            <button type="button" className="btn ml-2 text-sm" disabled={!email.trim()} onClick={() => { setFriendError(''); void app.inviteByEmail(email).then(setInvite).catch((reason: unknown) => setFriendError(reason instanceof Error ? reason.message : 'Could not send that.')) }}>Invite link</button>
            {invite ? <p className="text-sm break-all">{invite}</p> : null}
            {friendError ? <p className="text-sm">{friendError}</p> : null}
          </form>
        ) : null}
        <ul className="mt-3 space-y-2">
          {app.requests.map((request) => (
            <li key={request.id}>
              <span className="font-bold">{request.name}</span>
              <span className="text-sm"> · {request.direction === 'in' ? 'Wants to be friends' : 'Request sent'}</span>
              {request.direction === 'in' ? (
                <span className="mt-1 flex gap-2">
                  <button type="button" className="btn text-sm" onClick={() => void app.respondFriend(request.id, true)}>Accept</button>
                  <button type="button" className="btn text-sm" onClick={() => void app.respondFriend(request.id, false)}>Decline</button>
                </span>
              ) : null}
            </li>
          ))}
          {app.friends.map((user) => (
            <li key={user.id}>
              <Link to={`/u/${user.handle}`} className="font-bold">{user.name}</Link>
              <span className="text-sm"> · @{user.handle}</span>
            </li>
          ))}
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
