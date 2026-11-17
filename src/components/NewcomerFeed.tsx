import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HOME_FEATURED } from '../content/home-featured.ts'
import { areaTitle, cityPath } from '../lib/city.ts'
import { placesForCity, useCityId } from '../lib/use-city.ts'
import type { FriendProfile } from '../social/account.ts'
import { useApp } from '../state/AppState.tsx'
import { PersonRow } from './PeopleSearch.tsx'
import { PlaceThumb } from './PlaceThumb.tsx'
import { PlaceName } from './PlaceName.tsx'

/**
 * What the feed shows before someone has friends: people to add, Gusto's top-scored places in the
 * city being browsed, and the featured guides. Nothing here is invented; it is the guide's own data.
 */
export function NewcomerFeed() {
  const app = useApp()
  const city = useCityId()
  const [people, setPeople] = useState<FriendProfile[] | null>(null)
  useEffect(() => {
    if (!app.user || !app.supabase) return
    let live = true
    void app.suggestPeople().then((rows) => { if (live) setPeople(rows) }).catch(() => { if (live) setPeople([]) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.user?.id, app.supabase, app.friends.length])
  const picks = placesForCity(city)
    .map((place) => ({ place, score: app.gustoScore(place.id) }))
    .filter((row): row is { place: typeof row.place; score: number } => typeof row.score === 'number')
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
  const guides = (HOME_FEATURED[city] ?? []).slice(0, 4)
  return (
    <div className="newcomer-feed mt-6 space-y-6" data-newcomer-feed>
      <section className="feed-card">
        <p className="font-serif text-2xl italic">Start your feed</p>
        <p className="mt-1 text-sm">Your feed fills with friends’ saves, ranks, and plans. Until then, here is where to begin.</p>
        {people && people.length ? (
          <>
            <h2 className="mt-4 text-sm font-bold uppercase tracking-wide">People to add</h2>
            <ul className="people-results">{people.map((person) => <PersonRow key={person.id} person={person} />)}</ul>
          </>
        ) : null}
      </section>
      {picks.length ? (
        <section aria-labelledby="newcomer-picks">
          <h2 id="newcomer-picks" className="font-serif text-3xl italic">Gusto’s top picks in {areaTitle(city)}</h2>
          <ul className="newcomer-grid mt-3">
            {picks.map(({ place, score }) => (
              <li key={place.id} className="feed-card !p-2">
                <Link to={`/place/${place.id}`} className="block">
                  <span className="block h-28 overflow-hidden rounded-xl bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
                    <PlaceThumb place={place} uploads={app.photos} />
                  </span>
                  <PlaceName name={place.name} className="mt-2 italic leading-none" />
                  <span className="mt-1 block text-xs font-bold">Gusto’s Score {score.toFixed(1)} · {place.neighborhood}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {guides.length ? (
        <section aria-labelledby="newcomer-guides">
          <h2 id="newcomer-guides" className="font-serif text-3xl italic">Popular guides</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <Link to={cityPath(`/guide/${guide.slug}`)} className="feed-card block">
                  <span className="block font-bold">{guide.title}</span>
                  <span className="block text-xs">{guide.count} places</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link to={cityPath('/guides')} className="btn mt-3">Browse all guides</Link>
        </section>
      ) : null}
    </div>
  )
}
