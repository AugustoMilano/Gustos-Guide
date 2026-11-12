import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PlaceGallery } from '../components/PlaceGallery.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { catalog, catalogPhase, ensureRegion, loadPlace, peekPlace, slimById, subscribeCatalog } from '../content/load.ts'
import { areaTitle, cityPath } from '../lib/city.ts'
import { placeCity, placesForCity, useCityId } from '../lib/use-city.ts'
import { demoFriendsEnabled } from '../lib/demo.ts'
import { displayPhotos } from '../lib/gallery.ts'
import { CollectionMembership } from '../components/CollectionMembership.tsx'
import { HouseScorePad } from '../components/HouseScorePad.tsx'
import { GoldenFork } from '../components/GoldenFork.tsx'
import { ScoreBadge } from '../components/ScoreBadge.tsx'
import { StoryShareButton } from '../components/StoryShareButton.tsx'
import { formatPeriods, placeHoursPhrase } from '../lib/hours.ts'
import { MapLinks } from '../components/MapLinks.tsx'
import { ShareButton } from '../components/ShareButton.tsx'
import { cuisineLabel } from '../lib/cuisine-label.ts'
import { placeNameClass } from '../lib/place-name.ts'
import { PlaceMeta } from '../components/PlaceName.tsx'
import { milesBetween, priceLabel, publicReference, shareUrl, yelpBizUrl } from '../lib/format.ts'
import { renderPlaceStory } from '../lib/story-card.ts'
import { awardFor } from '../lib/top25.ts'
import { bounceMark } from '../lib/motion.ts'
import { usePageMeta } from '../lib/meta.ts'
import { originCanonical } from '../lib/site.ts'
import { howToGetIn } from '../lib/visit.ts'
import { useApp } from '../state/AppState.tsx'
import { readRecentPlaces, rememberPlace } from '../lib/recent-places.ts'
import type { Place } from '../types.ts'

export function PlacePage() {
  const { slug = '' } = useParams()
  const urlCity = useCityId()
  const navigate = useNavigate()
  const location = useLocation()
  const app = useApp()
  // Re-render when the deferred catalog lands so guides, awards and nearby places fill in.
  useSyncExternalStore(subscribeCatalog, catalogPhase, catalogPhase)
  const slim = slimById(slug)
  const [nav, setNav] = useState(() => ({ slug, active: 0, full: peekPlace(slug) ?? null as Place | null }))
  // One update, and the render that sees the new slug already uses photo 0 of that place.
  if (nav.slug !== slug) setNav({ slug, active: 0, full: peekPlace(slug) ?? null })
  const active = nav.slug === slug ? nav.active : 0
  const full = nav.slug === slug ? nav.full : (peekPlace(slug) ?? null)
  function choose(index: number) {
    setNav((current) => (current.slug === slug ? { ...current, active: index } : current))
  }
  const [error, setError] = useState('')
  const [signIn, setSignIn] = useState(false)
  const [busy, setBusy] = useState(false)
  const reduceMotion = useReducedMotion()

  // index.html may have painted this place's hero before the app (C1); React's gallery has replaced it.
  useEffect(() => { void ensureRegion(urlCity) }, [urlCity])

  useEffect(() => {
    const root = document.documentElement
    if (root.dataset.prerender === 'place') delete root.dataset.prerender
    delete root.dataset.preRegion
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadPlace(slug).then((next) => {
      if (!cancelled && next) {
        setNav((current) => (current.slug === slug && current.full !== next ? { ...current, full: next } : current))
      }
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  const loaded = (full && full.id === slug ? full : null) ?? peekPlace(slug) ?? null
  const place = loaded ?? slim

  const photos = useMemo(() => (place ? displayPhotos(place, app.photos) : []), [place, app.photos])
  const ownerImage = photos.find((photo) => photo.shareUrl)?.shareUrl

  usePageMeta(
    place ? `${place.name} · Gusto's Guide` : "Place · Gusto's Guide",
    place ? `${place.name} in ${place.neighborhood}.` : 'A place on the guide.',
    ownerImage || './og/place.png',
    place ? originCanonical(`/share/place/${place.id}`) : undefined,
  )
  const similar = useMemo(() => {
    if (!place) return []
    return placesForCity(placeCity(place))
      .filter((item) => item.id !== place.id && item.cuisine.some((cuisine) => place.cuisine.includes(cuisine)))
      .map((item) => ({ item, miles: milesBetween(place, item) }))
      .sort((a, b) => a.miles - b.miles)
      .slice(0, 4)
      .map((row) => row.item)
  }, [place])

  useEffect(() => {
    if (place) rememberPlace(place.id)
  }, [place])

  if (place && placeCity(place) !== urlCity) {
    return <Navigate to={cityPath(`/place/${place.id}`, placeCity(place))} replace />
  }

  if (!place) {
    // Offline, an unopened place has nothing to show yet; point at the ones saved on this device (C4).
    const offline = typeof navigator !== 'undefined' && !navigator.onLine
    const saved = offline ? readRecentPlaces().map((id) => slimById(id) ?? null).filter((item) => item !== null).slice(0, 8) : []
    return (
      <main id="main" tabIndex={-1} className="mx-auto min-h-dvh max-w-3xl px-4 pt-28 outline-none">
        <h1 className="font-serif text-5xl italic">{offline ? 'This place needs a connection.' : 'That place is not on the list.'}</h1>
        {offline ? <p className="mt-3 max-w-xl">You are offline, and this place was not opened on this device yet.</p> : null}
        {saved.length ? (
          <section className="mt-6" aria-label="Opened on this device">
            <h2 className="font-serif text-3xl italic">Opened on this device</h2>
            <ul className="mt-3 grid gap-2">
              {saved.map((item) => (
                <li key={item.id}>
                  <Link className="smart-hit" to={cityPath(`/place/${item.id}`, placeCity(item))}>
                    <span className="min-w-0">
                      <span className="block truncate font-serif text-2xl italic leading-tight">{item.name}</span>
                      <span className="mt-1 block truncate text-sm">{item.neighborhood}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <Link to={cityPath('/search')} className="btn mt-6">Search</Link>
      </main>
    )
  }

  const reference = publicReference(place)
  const guides = catalog.guides.filter((guide) => place.guideSlugs.includes(guide.slug))
  const friends = app.friendScore(place.id)
  const been = app.statuses[place.id] === 'been'

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      await app.uploadPhoto(place!.id, file)
      choose(0)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not add that photo.')
    } finally {
      setBusy(false)
    }
  }

  function goBack() {
    if (location.key !== 'default') {
      navigate(-1)
      return
    }
    if (place) navigate(cityPath('/explore', placeCity(place)))
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto min-h-dvh max-w-6xl px-4 pt-24 pb-16 outline-none">
      <div>
      <p className="place-back">
        <button type="button" className="btn" onClick={goBack}>Back</button>
      </p>
      <div className="place-grid">
        <PlaceGallery
          key={place.id}
          photos={photos}
          active={active}
          onChange={choose}
          known={loaded !== null}
          transitionName={reduceMotion ? undefined : `place-${place.id}`}
        />
        <div className="place-identity">
          <p className="area-kicker">{areaTitle(placeCity(place))}</p>
          <PlaceMeta parts={[...place.cuisine.map((item) => cuisineLabel(item)), place.neighborhood]} className="mt-2 text-xs font-bold tracking-[0.14em] uppercase" />
          <h1 className={placeNameClass(place.name, 'mt-1 italic leading-none')}>{place.name}</h1>
          {place.closed ? <p className="closed-banner mt-3" role="status">Closed.</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ScoreBadge score={app.gustoScore(place.id)} />
            <GoldenFork placeId={place.id} size="md" />
          </div>
          <HouseScorePad placeId={place.id} />
          {app.user && !app.user.isOwner && app.scores[place.id] ? <p className="mt-2 text-sm">Your score {app.scores[place.id].score.toFixed(1)}</p> : null}
          {reference ? <p className="public-ref mt-2">{reference}</p> : null}
          {app.user && friends.count ? (
            <p className="mt-2 text-sm text-ink/70">
              {demoFriendsEnabled && friends.demo ? 'Seeded friends · ' : ''}
              {friends.loved ? `${friends.loved} ${friends.loved === 1 ? 'friend loved' : 'friends loved'} this. ` : ''}
              Friend score {friends.average == null ? '' : friends.average.toFixed(1)}.
            </p>
          ) : null}
          <section className="place-facts" aria-label="Address and hours">
            {place.price ? <p className="font-bold">{priceLabel(place.price)}</p> : null}
            {place.address ? <p className="place-address">{place.address}</p> : null}
            {place.closed ? <p>Closed.</p> : place.periods.length ? (
              <details className="place-hours">
                <summary>{placeHoursPhrase(place) ?? 'Hours'}</summary>
                <ul>{formatPeriods(place.periods).map((line) => <li key={line}>{line}</li>)}</ul>
              </details>
            ) : <p>Hours are not posted. Call before you trek across town.</p>}
          </section>
          <div className="mt-4 flex flex-wrap gap-2">
            {place.perfectFor.map((tag) => <span key={tag} className="tag">{tag}</span>)}
          </div>
          <div className="action-row mt-4">
            <MapLinks place={place} prominent />
            {place.website ? <a className="btn text-sm" href={place.website}>Website</a> : null}
            {place.phone ? <a className="btn text-sm" href={`tel:${place.phone}`}>Call</a> : null}
            {place.yelpSlug ? <a className="btn text-sm" href={yelpBizUrl(place.yelpSlug)}>Yelp</a> : null}
            <button type="button" className={`btn status-mark text-sm ${app.statuses[place.id] === 'togo' ? 'btn-coral' : ''}`} aria-pressed={app.statuses[place.id] === 'togo'} onClick={(event) => { if (!app.user) { setSignIn(true); return } bounceMark(event); app.setStatus(place.id, 'togo') }}>To go</button>
            <button type="button" className={`btn status-mark text-sm ${been ? 'btn-leaf' : ''}`} aria-pressed={been} onClick={(event) => { if (!app.user) { setSignIn(true); return } bounceMark(event); app.setStatus(place.id, 'been') }}>Been</button>
            <ShareButton title={place.name} url={shareUrl(place.id)} />
            <StoryShareButton
              filename={`${place.id}-story.png`}
              title={place.name}
              build={() => {
                const shot = photos.find((photo) => photo.url && !photo.illustration)
                return renderPlaceStory({
                  name: place.name,
                  neighborhood: place.neighborhood,
                  cuisine: place.cuisine[0],
                  photoUrl: shot?.url,
                  credit: shot?.credit,
                  license: shot?.license,
                  score: app.gustoScore(place.id),
                  award: awardFor(place.id, app.gustoScore),
                })
              }}
            />
          </div>
          {place.closed ? null : <CollectionMembership placeId={place.id} city={placeCity(place)} />}
        </div>
      </div>
      <section className="place-upload" aria-labelledby="upload-heading">
            <h2 id="upload-heading" className="font-serif text-3xl italic">Add a photo</h2>
            <p className="mt-2 text-sm">Been here? Add a photo. House shots are credited Photo by Gusto.</p>
            {!app.user ? (
              <button type="button" className="btn btn-coral mt-3" onClick={() => setSignIn(true)}>Sign in to add a photo</button>
            ) : !been && !app.user.isOwner ? (
              <button type="button" className="btn mt-3" onClick={() => app.setStatus(place.id, 'been')}>Mark Been to add a photo</button>
            ) : (
              <label className={`btn relative mt-3 overflow-hidden ${busy ? 'pointer-events-none' : ''}`}>
                {busy ? 'Saving…' : 'Upload photo'}
                <input
                  className="file-hit"
                  type="file"
                  accept="image/*"
                  aria-label={busy ? `Saving a photo of ${place.name}` : `Add a photo of ${place.name}`}
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    void onFile(file)
                  }}
                />
              </label>
            )}
            {error ? <p className="mt-2 text-sm" role="alert">{error}</p> : null}
      </section>
      <article className="mt-8">
          {full?.blurb ? <p className="max-w-2xl text-lg leading-relaxed">{full.blurb}</p> : null}
          {howToGetIn(place) ? (
            <section className="mt-6">
              <h2 className="font-serif text-3xl italic">How to get in</h2>
              <p className="mt-2 max-w-2xl">{howToGetIn(place)}</p>
            </section>
          ) : null}
          <FriendsBeen placeId={place.id} onSignIn={() => setSignIn(true)} />
          {full?.orderThis.length ? (
            <section className="mt-6">
              <h2 className="font-serif text-3xl italic">What to order</h2>
              <ul className="mt-2 space-y-2">
                {full.orderThis.map((item) => <li key={item.dish}><strong>{item.dish}.</strong>{item.note ? ` ${item.note}` : null}</li>)}
              </ul>
            </section>
          ) : null}
          <section className="mt-6">
            <h2 className="font-serif text-3xl italic">Included in</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {guides.map((guide) => <Link key={guide.slug} to={cityPath(`/guide/${guide.slug}`, placeCity(place))} className="chip inline-flex items-center" viewTransition={!reduceMotion}>{guide.title}</Link>)}
            </div>
          </section>
          <section className="mt-6">
            <h2 className="font-serif text-3xl italic">Similar places nearby</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {similar.map((item) => (
                <Link key={item.id} to={cityPath(`/place/${item.id}`, placeCity(place))} className="hit-card" viewTransition={!reduceMotion}>
                  <div className="relative h-24 overflow-hidden bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full" style={reduceMotion ? undefined : { viewTransitionName: `place-${item.id}` }}>
                    <PlaceThumb place={item} uploads={app.photos} sizes="(min-width: 1024px) 200px, 45vw" />
                    <GoldenFork placeId={item.id} overlay />
                  </div>
                  <div className="place-card-body is-dense">
                    <div className="min-w-0">
                      <h3 className={placeNameClass(item.name, 'italic leading-tight')}>{item.name}</h3>
                      <p className="mt-1 text-xs font-bold tracking-wide uppercase">{item.neighborhood}</p>
                    </div>
                    <span className="score-col"><ScoreBadge score={app.gustoScore(item.id)} size="sm" /></span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </article>
        <p className="mt-8"><Link className="btn" to={cityPath('/explore', placeCity(place))}>Open the map</Link></p>
        <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
      </div>
    </main>
  )
}

function FriendsBeen({ placeId, onSignIn }: { placeId: string; onSignIn: () => void }) {
  const app = useApp()
  const people = app.demoUsers.filter((person) => person.been.includes(placeId) || person.scores[placeId] !== undefined)
  const scored = app.friendMarks(placeId)
  if (!app.user && !people.length) {
    return (
      <section className="mt-6">
        <h2 className="font-serif text-3xl italic">Friends who've been</h2>
        <p className="mt-2 text-sm">Sign in to see which friends have scored this.</p>
        <button type="button" className="btn mt-3" onClick={onSignIn}>Sign in</button>
      </section>
    )
  }
  const rows = [
    ...people.map((person) => ({ id: person.id, name: person.name, handle: person.handle, demo: true, score: person.scores[placeId] as number | undefined })),
    ...scored.map((person) => ({ id: person.id, name: person.name, handle: person.handle, demo: false, score: person.score })),
  ]
  return (
    <section className="mt-6">
      <h2 className="font-serif text-3xl italic">Friends who've been</h2>
      {rows.length === 0 ? <p className="mt-2 text-sm">None of your friends have scored this yet.</p> : (
        <ul className="rsvp-list mt-2">
          {rows.map((person) => (
            <li key={person.id} className="rsvp-row">
              <span className="avatar" aria-hidden="true">{person.name.split(' ').map((part) => part[0] ?? '').join('').slice(0, 2)}</span>
              <Link className="inline-flex min-h-11 min-w-0 flex-1 items-center truncate font-bold" to={`/u/${person.handle}`}>{person.name}</Link>
              {demoFriendsEnabled && person.demo ? <span className="tag">Seeded</span> : null}
              {person.score !== undefined ? <span className="tag">{person.score.toFixed(1)}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
