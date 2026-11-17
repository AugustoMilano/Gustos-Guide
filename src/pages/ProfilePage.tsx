import { cuisineMenuLabel } from '../lib/cuisine-label.ts'
import { isRestaurant } from '../lib/restaurant.ts'
import { onePerBrand } from '../lib/brand.ts'
import { Link, useParams } from 'react-router-dom'
import { m, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Achievements } from '../components/Achievements.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { ProfileSheet } from '../components/ProfileSheet.tsx'
import { Avatar } from '../components/Avatar.tsx'
import type { FriendProfile, PersonView } from '../social/account.ts'
import { PlaceName } from '../components/PlaceName.tsx'
import { PriceFilter } from '../components/PriceFilter.tsx'
import { slimById } from '../content/load.ts'
import { areaTitle, cityPath, regionOf, REGIONS, type RegionId } from '../lib/city.ts'
import { placeCity, placesForCity, useCityId } from '../lib/use-city.ts'
import { usePageMeta } from '../lib/meta.ts'
import { hasUnknownPrice, matchesPrice } from '../lib/price-filter.ts'
import { useApp } from '../state/AppState.tsx'
import type { Price, SlimPlace } from '../types.ts'

type Row = { id: string; name: string; score: number }

const SHORT: Record<RegionId, string> = { seattle: 'Seattle', la: 'LA', sf: 'SF Bay', sandiego: 'San Diego', vancouver: 'Vancouver', portland: 'Portland', nyc: 'NYC', pullman: 'Pullman' }

export function ProfilePage() {
  const { handle = '' } = useParams()
  const app = useApp()
  const person = app.demoUsers.find((user) => user.handle === handle)
  const friend = app.friends.find((user) => user.handle === handle)
  const mine = app.user?.handle === handle
  const city = useCityId()
  const reduce = useReducedMotion()
  // Top 10 area, picked right at the list. Starts on the city being browsed.
  const [topRegion, setTopRegion] = useState<RegionId>(() => regionOf(city))
  const [editing, setEditing] = useState(false)
  // Anyone else's profile is read from the account when the page opens: their real ranks, marks,
  // and lists, limited by the database to what this viewer may see.
  const [view, setView] = useState<{ handle: string; data: PersonView | null; failed?: boolean } | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (mine || person || !app.accounts) return
    let live = true
    void app.loadPerson(handle)
      .then((data) => {
        if (!live) return
        setView({ handle, data })
        // Friends on the server but not in this tab yet: someone accepted on their own phone.
        if (data?.friend && !app.friends.some((item) => item.id === data.profile.id)) app.refreshFriends(true)
      })
      .catch(() => { if (live) setView({ handle, data: null, failed: true }) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, mine, Boolean(person), app.accounts, app.user?.id, app.friends.length, attempt])
  const loaded = view?.handle === handle ? view : null
  const live = loaded?.data ?? null
  const loading = !mine && !person && app.accounts && !loaded
  const region = REGIONS.find((item) => item.id === topRegion) ?? REGIONS[0]
  const area = areaTitle(city)
  const displayName = mine ? app.user?.name : person?.name ?? live?.profile.name ?? friend?.name
  usePageMeta(
    displayName ? `${displayName} · Gusto's Guide` : 'Profile',
    mine ? `Your ${area} stats.` : 'A friend on Gusto’s Guide.',
    './og/og.png',
  )

  if (loading && !friend) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto min-h-dvh max-w-3xl px-4 pt-28 outline-none" aria-busy="true">
        <p className="sr-only">Loading</p>
        <div className="skeleton h-12 w-56" />
        <div className="skeleton mt-4 h-24 w-full" />
      </main>
    )
  }

  if (!person && !friend && !mine && !live) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto min-h-dvh max-w-3xl px-4 pt-28 outline-none">
        <h1 className="font-serif text-5xl italic">{loaded?.failed ? 'That profile did not load.' : 'No one by that name.'}</h1>
        {loaded?.failed ? (
          <button type="button" className="btn mt-4" onClick={() => { setView(null); setAttempt((n) => n + 1) }}>Try again</button>
        ) : <p className="mt-3">{app.user ? 'Check the username, or search for them on the feed.' : 'Sign in to open your own profile.'}</p>}
      </main>
    )
  }

  const personId = live?.profile.id ?? friend?.id ?? person?.id ?? ''
  const isFriend = Boolean(friend) || Boolean(live?.friend) || (personId !== '' && app.friends.some((item) => item.id === personId))
  const fallbackLists = friend ? app.friendLists[friend.id] : undefined
  const beenIds = mine
    ? Object.entries(app.statuses).filter(([, status]) => status === 'been').map(([id]) => id)
    : person?.been ?? live?.been ?? fallbackLists?.been ?? []
  const togoIds = mine
    ? Object.entries(app.statuses).filter(([, status]) => status === 'togo').map(([id]) => id)
    : live?.togo ?? fallbackLists?.togo ?? []
  const mineTogo = new Set(Object.entries(app.statuses).filter(([, status]) => status === 'togo').map(([id]) => id))
  const overlap = !mine ? togoIds.filter((id) => mineTogo.has(id)) : []
  const beenPlaces = beenIds.map((id) => slimById(id)).filter((place): place is SlimPlace => place != null)
  // The owner scores places as Gusto's Score (house_scores), not through Rank, so his own
  // Top 10 falls back to those when he has no personal rankings.
  const ownScores: Record<string, number> = Object.fromEntries(Object.entries(app.scores).map(([id, score]) => [id, score.score]))
  const mineScores = mine && app.user?.isOwner && Object.keys(ownScores).length === 0 ? app.houseScores : ownScores
  const theirScores: Record<string, number> = mine ? mineScores : person?.scores ?? live?.scores ?? {}
  const scoreRows: Row[] = Object.entries(theirScores).filter(([id]) => slimById(id)).map(([id, score]) => ({ id, name: slimById(id)?.name ?? id, score }))
  scoreRows.sort((a, b) => b.score - a.score)
  // Every kind of place they rank (restaurants, coffee, bakeries, bars, dessert), one per brand.
  const top = onePerBrand(scoreRows.filter((row) => { const spot = slimById(row.id); return spot != null && region.areas.includes(placeCity(spot)) }), (row) => row.name).slice(0, 10)
  const cuisines = topCuisines(beenPlaces)
  const match = mine ? null : person ? app.tasteMatch(person.id) : app.tasteMatchWith(theirScores)
  const shared = mine ? 0 : Object.keys(app.scores).filter((id) => theirScores[id] !== undefined).length
  const avatarUrl = mine ? app.user?.avatarUrl : live?.profile.avatarUrl ?? friend?.avatarUrl
  const theirHandle = live?.profile.handle ?? friend?.handle ?? person?.handle ?? handle
  const lists = mine ? [] : live?.lists ?? []
  const plansTogether = mine || !personId ? [] : app.plans.filter((plan) => plan.hostId === personId || plan.inviteIds.includes(personId))
  const hidden = !mine && !person && !isFriend

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <p className="text-xs font-bold uppercase tracking-wide">{mine ? 'Your profile' : isFriend || person ? 'Friend' : 'Profile'}</p>
      <div className="profile-head mt-1">
        {displayName ? <Avatar name={displayName} url={avatarUrl} size={64} className="border-2 border-white shadow-sm" /> : null}
        <h1 className="min-w-0 font-serif text-5xl italic">{displayName}</h1>
      </div>
      {mine && app.user?.handle ? <p className="mt-2 text-sm font-bold">Signed in as @{app.user.handle}</p> : null}
      {mine && app.accounts && app.user && !app.user.id.startsWith('local-') ? (
        <button type="button" className="btn mt-3" onClick={() => setEditing(true)}>{app.user.avatarUrl ? 'Edit profile' : 'Edit profile · add a photo'}</button>
      ) : null}
      {editing ? <ProfileSheet mode="edit" onClose={() => setEditing(false)} /> : null}
      <p className="mt-2">
        {mine ? (app.accounts && app.user && !app.user.id.startsWith('local-') ? 'Signed in' : 'Signed in on this browser') : person ? `${person.neighborhood} · streak ${person.streak} weeks` : `@${theirHandle}`}
        {hidden ? '' : ` · ${beenPlaces.length} been · ${scoreRows.length} ranked`}
      </p>
      {!mine && !person && live && !isFriend && app.user ? <AddFriend person={live.profile} /> : null}
      {mine ? (
        <p className="mt-3 max-w-xl">This is you. Taste match appears on a friend’s profile after you have both scored at least three of the same places.</p>
      ) : hidden ? (
        <section className="mt-4 glass p-4" aria-labelledby="friends-only">
          <h2 id="friends-only" className="font-serif text-3xl italic">Friends see more</h2>
          <p className="mt-2">{app.user ? 'Their ranks, Been, and To go show here once you are friends. Lists they made public are below.' : 'Sign in and add them as a friend to see their ranks, Been, and To go.'}</p>
        </section>
      ) : (
        <section className="mt-4 glass p-4" aria-labelledby="taste-match">
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
      {hidden ? null : (
        <Achievements
          been={beenIds}
          rated={Object.keys(theirScores)}
          userId={mine ? app.user?.id ?? null : null}
          gustoScore={app.gustoScore}
          mine={mine}
          city={city}
          who={mine ? (app.user?.handle ? `@${app.user.handle}` : app.user?.name) : displayName}
        />
      )}
      {!mine && lists.length ? (
        <>
          <h2 className="mt-8 font-serif text-3xl italic">Lists</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {lists.map((list) => (
              <li key={list.id}>
                <Link to={`/list/${list.id}`} className="feed-card flex items-center gap-3">
                  <span className="text-2xl" aria-hidden="true">{list.emoji ?? '🍽'}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{list.title}</span>
                    <span className="block text-xs">{list.placeIds.length} {list.placeIds.length === 1 ? 'place' : 'places'} · {list.visibility === 'friends' ? 'Friends' : 'Public'}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {!mine && plansTogether.length ? (
        <>
          <h2 className="mt-8 font-serif text-3xl italic">Plans together</h2>
          <ul className="mt-3 space-y-2">
            {plansTogether.map((plan) => (
              <li key={plan.id}><Link className="feed-card block font-bold" to={`/plan/${plan.id}`}>{plan.title}{plan.locked ? ' · Locked in' : ''}</Link></li>
            ))}
          </ul>
        </>
      ) : null}
      {!mine && !hidden ? (
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
                    <PlaceName name={spot.name} className="mt-2 italic leading-none" />
                    <Link className="btn mt-3 text-sm" to={`/plans?place=${id}`}>Go together</Link>
                  </li>
                )
              })}
            </ul>
          ) : <p className="mt-2">No overlap yet. When you both mark the same place To go, it lands here.</p>}
        </>
      ) : null}
      {hidden ? null : (
        <>
          <h2 className="mt-8 font-serif text-3xl italic">Top cuisines</h2>
          {cuisines.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {cuisines.map((item) => <li key={item.name} className="tag">{cuisineMenuLabel(item.name, cuisines.map((row) => row.name))} · {item.count}</li>)}
            </ul>
          ) : <p className="mt-2">Mark a few places Been and the cuisines show up here.</p>}
          <h2 className="mt-8 font-serif text-3xl italic">Neighborhoods</h2>
          <div className="mt-3">
            {beenPlaces.length ? <p>{beenPlaces.length} places marked Been.</p> : <p>No been pins yet.</p>}
            <Link className="btn mt-3" to={cityPath('/explore')}>Open the map</Link>
          </div>
          <div className="top10-head mt-8">
            <h2 className="font-serif text-3xl italic">Top 10 in {region.name}</h2>
            <div className="city-switch city-switch-inline" role="group" aria-label={`Top 10 city, ${region.name} selected`}>
              {REGIONS.map((item) => {
                const on = item.id === region.id
                return (
                  <button key={item.id} type="button" className="city-switch-btn" aria-pressed={on} onClick={() => setTopRegion(item.id)}>
                    {on ? <m.span layoutId="top10-pill" className="city-switch-glint" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }} /> : null}
                    <span className="city-switch-label">{SHORT[item.id]}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <p className="mt-1 text-xs">Every kind of place {mine ? 'you rank' : 'they rank'}: restaurants, coffee, bakeries, bars, and dessert.</p>
          {top.length ? (
            <ol className="mt-3 space-y-2">
              {top.map((row, index) => {
                const kind = placeKind(slimById(row.id))
                return (
                  <li key={row.id} className="score-line">
                    <span className="score-line-rank">{index + 1}</span>
                    <Link className="min-w-0 truncate font-bold" to={`/place/${row.id}`}>{row.name}{kind ? <span className="ml-2 text-xs font-normal">{kind}</span> : null}</Link>
                    <span className="score-line-num">{row.score.toFixed(1)}</span>
                  </li>
                )
              })}
            </ol>
          ) : <p className="mt-2">No scores yet.</p>}
          {!mine ? (
            <p className="mt-6 text-sm">Scores on this page are theirs. They are not Gusto's Score.</p>
          ) : null}
        </>
      )}
      <p className="mt-4 text-sm">{placesForCity(city).length} places are on the {area} guide.</p>
    </main>
  )
}

function AddFriend({ person }: { person: FriendProfile }) {
  const app = useApp()
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const pending = sent || app.requests.some((request) => request.handle === person.handle && request.direction === 'out')
  const incoming = app.requests.find((request) => request.handle === person.handle && request.direction === 'in')
  return (
    <div className="mt-3">
      {pending ? <span className="tag">Request sent</span> : (
        <button
          type="button"
          className="btn btn-coral"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            setError('')
            const run = incoming ? app.respondFriend(incoming.id, true) : app.requestFriend(person.handle)
            void run.then(() => setSent(!incoming)).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not send that.')).finally(() => setBusy(false))
          }}
        >
          {busy ? 'Sending…' : incoming ? 'Accept friend request' : 'Add friend'}
        </button>
      )}
      {error ? <p className="mt-2 text-sm save-error" role="alert">{error} Try again.</p> : null}
    </div>
  )
}

/** A short type label for non-restaurants in a Top 10, so a coffee shop is not mistaken for a dinner spot. */
function placeKind(place: SlimPlace | null | undefined): string {
  if (!place || isRestaurant(place)) return ''
  const type = (place as SlimPlace & { placeType?: string }).placeType ?? ''
  const labels: Record<string, string> = { cafe: 'Coffee', coffee: 'Coffee', bakery: 'Bakery', bar: 'Bar', dessert: 'Dessert', market: 'Market' }
  return labels[type] ?? (place.cuisine[0] ?? '')
}

function PlaceGrid({ ids, empty }: { ids: string[]; empty: string }) {
  const app = useApp()
  const [prices, setPrices] = useState<Price[]>([])
  const [unknownPrice, setUnknownPrice] = useState(false)
  const places = ids.map((id) => slimById(id)).filter((place): place is SlimPlace => place != null).slice(0, 8)
  const shown = places.filter((place) => matchesPrice(place, { prices, unknown: unknownPrice }))
  if (!places.length) return <p className="mt-2">{empty}</p>
  return (
    <>
      <div className="mt-3">
        <PriceFilter
          choice={{ prices, unknown: unknownPrice }}
          showUnknown={hasUnknownPrice(places)}
          onChange={(next) => { setPrices(next.prices); setUnknownPrice(next.unknown) }}
        />
      </div>
      {shown.length === 0 ? <p className="mt-3">Nothing matches that price.</p> : null}
      <ul className="mt-3 grid grid-cols-2 gap-3">
      {shown.map((place) => (
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
    </>
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
