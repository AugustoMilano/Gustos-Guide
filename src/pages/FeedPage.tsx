import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { FriendEmpty } from '../components/FriendEmpty.tsx'
import { PullToRefresh } from '../components/PullToRefresh.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { PlaceName } from '../components/PlaceName.tsx'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { catalog, ensureAllCities } from '../content/load.ts'
import { demoFriendsEnabled } from '../lib/demo.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'

export function FeedPage() {
  const app = useApp()
  useEffect(() => { void ensureAllCities() }, [])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [signIn, setSignIn] = useState(false)
  usePageMeta(
    "Feed · Gusto's Guide",
    'What you and your friends have saved, ranked, and photographed in the cities we cover.',
    './og/og.png',
  )
  const names = new Map<string, string>([[app.user?.id ?? '', app.user?.name ?? '']])
  for (const user of app.demoUsers) names.set(user.id, user.name)
  for (const user of app.friends) names.set(user.id, user.name)
  const board = [
    ...app.demoUsers.map((user) => ({ id: user.id, name: user.name, href: `/u/${user.handle}`, count: user.been.length, streak: user.streak, demo: true })),
    ...app.friends.map((user) => ({ id: user.id, name: user.name, href: `/u/${user.handle}`, count: 0, streak: 0, demo: false })),
    ...(app.user ? [{ id: app.user.id, name: app.user.name, href: '/my', count: Object.keys(app.scores).length, streak: 0, demo: false }] : []),
  ].sort((a, b) => b.count - a.count)

  return (
    <PullToRefresh onRefresh={app.refresh}>
    <main id="main" tabIndex={-1} className="mx-auto grid max-w-6xl gap-8 px-4 pt-24 pb-16 outline-none lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <AreaKicker />
        <p className="mt-2 text-xs font-bold tracking-[0.14em] uppercase">Friends only</p>
        <h1 className="font-serif text-5xl italic">The feed</h1>
        <ul className="mt-6 space-y-4">
          {app.activities.length === 0 ? (
            <li className="feed-card">
              {app.user ? (
                <>
                  <p className="font-serif text-2xl italic">The feed is quiet.</p>
                  <p className="mt-1 text-sm">When friends save a place or start a plan, it shows up here.</p>
                </>
              ) : (
                <>
                  <p className="font-serif text-2xl italic">Sign in to see the feed.</p>
                  <p className="mt-1 text-sm">Saves, plans, and photos from people you know land here.</p>
                  <button type="button" className="btn btn-coral mt-3" onClick={() => setSignIn(true)}>Sign in</button>
                </>
              )}
            </li>
          ) : null}
          {app.activities.map((activity) => {
            const person = app.demoUsers.find((user) => user.id === activity.userId)
            const place = activity.placeId ? catalog.places.find((item) => item.id === activity.placeId) : undefined
            return (
              <li key={activity.id} className="feed-card">
                <p className="text-sm font-bold">
                  {names.get(activity.userId) ?? 'Someone'}
                  {demoFriendsEnabled && person?.demo ? ' · Seeded' : ''}
                </p>
                <p className="mt-1">{activity.text}</p>
                {place ? (
                  <Link className="mt-2 flex items-center gap-3" to={`/place/${place.id}`}>
                    <span className="h-28 w-36 shrink-0 overflow-hidden soft-media bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
                      <PlaceThumb place={place} uploads={app.photos} />
                    </span>
                    <PlaceName name={place.name} className="italic leading-none" />
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
                      <li key={comment.id} className="border-l-2 border-ink/15 pl-2">
                        <strong>{names.get(comment.userId) ?? 'You'}</strong>
                        {demoFriendsEnabled && app.demoUsers.some((user) => user.id === comment.userId) ? ' · Seeded' : ''}
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
                  <input className="min-h-11 flex-1 soft-field bg-cream px-2" value={drafts[activity.id] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [activity.id]: event.target.value }))} placeholder="Comment" />
                  <button className="btn text-sm" type="submit">Post</button>
                </form>
              </li>
            )
          })}
        </ul>
      </div>
      <aside>
        <h2 className="font-serif text-3xl italic">Leaderboard</h2>
        <ol className="leaderboard mt-3 space-y-2">
          {board.map((row, index) => (
            <li key={row.id} className="flex items-center gap-2">
              <span className="rank-pip">{index + 1}</span>
              <span>
                <Link to={row.href} className="font-bold">{row.name}</Link>
                {demoFriendsEnabled && row.demo ? ' · Seeded' : ''} · {row.count} ranked · streak {row.streak}
              </span>
            </li>
          ))}
        </ol>
        <h2 className="mt-8 font-serif text-3xl italic">Friends</h2>
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
              <span className="text-sm"> · {demoFriendsEnabled ? 'Seeded · ' : ''}{app.following.includes(user.id) ? 'Following' : 'Not following'}</span>
              <button type="button" className="btn ml-2 text-sm" onClick={() => app.user && app.toggleFollow(user.id)}>
                {app.following.includes(user.id) ? 'Unfollow' : 'Follow'}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <FriendEmpty
            onSignIn={() => setSignIn(true)}
            title={app.friends.length || app.demoUsers.length ? 'Invite someone else' : 'No friends yet'}
          />
        </div>
      </aside>
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </main>
    </PullToRefresh>
  )
}
