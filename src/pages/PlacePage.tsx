import { useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import { GuideMap } from '../components/GuideMap.tsx'
import { PhotoFrame } from '../components/PhotoFrame.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { catalog, loadPlace, slimById } from '../content/load.ts'
import { areaTitle, cityPath } from '../lib/city.ts'
import { placeCity, placesForCity } from '../lib/use-city.ts'
import { demoFriendsEnabled } from '../lib/demo.ts'
import { displayPhotos } from '../lib/gallery.ts'
import { responsivePhoto } from '../lib/responsivePhoto.ts'
import { HouseScorePad } from '../components/HouseScorePad.tsx'
import { GoldenFork } from '../components/GoldenFork.tsx'
import { ScoreBadge } from '../components/ScoreBadge.tsx'
import { StoryShareButton } from '../components/StoryShareButton.tsx'
import { formatPeriods, hoursPhrase } from '../lib/hours.ts'
import { MapLinks } from '../components/MapLinks.tsx'
import { ShareButton } from '../components/ShareButton.tsx'
import { milesBetween, priceLabel, publicReference, shareUrl, yelpBizUrl } from '../lib/format.ts'
import { renderPlaceStory } from '../lib/story-card.ts'
import { awardFor } from '../lib/top25.ts'
import { bounceMark } from '../lib/motion.ts'
import { usePageMeta } from '../lib/meta.ts'
import { howToGetIn } from '../lib/visit.ts'
import { useApp } from '../state/AppState.tsx'
import type { Place } from '../types.ts'

export function PlacePage() {
  const { slug = '' } = useParams()
  const app = useApp()
  const slim = slimById(slug)
  const [full, setFull] = useState<Place | null>(null)
  const [active, setActive] = useState(0)
  const [error, setError] = useState('')
  const [signIn, setSignIn] = useState(false)
  const [busy, setBusy] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    let cancelled = false
    setFull(null)
    setActive(0)
    void loadPlace(slug).then((next) => {
      if (!cancelled && next) setFull(next)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  const place = full ?? slim

  const photos = useMemo(() => (place ? displayPhotos(place, app.photos) : []), [place, app.photos])
  const ownerImage = photos.find((photo) => photo.shareUrl)?.shareUrl

  usePageMeta(
    place ? `${place.name} · Gusto's Guide` : "Place · Gusto's Guide",
    place ? place.oneLiner || `${place.name} in ${place.neighborhood}.` : 'A Seattle restaurant.',
    ownerImage || './og/place.svg',
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

  if (!place) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
        <h1 className="font-serif text-5xl italic">That place is not on the list.</h1>
        <Link to={cityPath('/search')} className="btn mt-6">Search</Link>
      </main>
    )
  }

  const reference = publicReference(place)
  const guides = catalog.guides.filter((guide) => place.guideSlugs.includes(guide.slug))
  const friends = app.friendScore(place.id)
  const been = app.statuses[place.id] === 'been'
  const current = photos[Math.min(active, photos.length - 1)]

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      await app.uploadPhoto(place!.id, file)
      setActive(0)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not add that photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main id="main" tabIndex={-1} className="bleed-stage place-stage outline-none max-lg:mx-auto max-lg:max-w-6xl max-lg:px-4 max-lg:pt-24 max-lg:pb-16">
      <div className="bleed-copy max-lg:contents">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div>
          <PhotoFrame
            photo={current}
            priority
            compact={Boolean(current?.illustration || !current?.url)}
            transitionName={reduceMotion ? undefined : `place-${place.id}`}
          />
          <div className="mt-2 flex gap-2 overflow-auto">
            {photos.map((photo, index) => (
              <button key={photo.key} type="button" className={`h-16 w-24 shrink-0 border-2 ${index === active ? 'border-coral' : 'border-ink'}`} aria-label={`Photo ${index + 1} of ${photos.length}`} onClick={() => setActive(index)}>
                {photo.url && !photo.illustration ? <img {...responsivePhoto(photo.url, '96px')} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <span className="text-xs font-bold">Illustration</span>}
              </button>
            ))}
          </div>
          <section className="mt-4 border-2 border-ink p-4" aria-labelledby="upload-heading">
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
        </div>
        <div>
          <p className="area-kicker">{areaTitle(placeCity(place))}</p>
          <p className="mt-2 text-xs font-bold tracking-[0.14em] uppercase">{[place.cuisine.join(' · '), place.neighborhood].filter(Boolean).join(' · ')}</p>
          <h1 className="mt-1 font-serif text-5xl italic leading-none sm:text-6xl">{place.name}</h1>
          {place.oneLiner ? <p className="review-headline mt-4 border-2 border-ink bg-[#fffaf3] px-4 py-3 font-serif text-2xl italic leading-snug">“{place.oneLiner}”</p> : null}
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
          <p className="mt-2 font-bold">{[priceLabel(place.price), hoursPhrase(place.periods)].filter(Boolean).join(' · ')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {place.perfectFor.map((tag) => <span key={tag} className="tag">{tag}</span>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {place.website ? <a className="btn text-sm" href={place.website}>Website</a> : null}
            {place.yelpSlug ? <a className="btn text-sm" href={yelpBizUrl(place.yelpSlug)}>Yelp</a> : null}
            <MapLinks place={place} />
            {place.phone ? <a className="btn text-sm" href={`tel:${place.phone}`}>Call</a> : null}
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
        </div>
      </div>
      <article className="mt-8">
          {full?.blurb && full.blurb !== place.oneLiner ? <p className="max-w-2xl text-lg leading-relaxed">{full.blurb}</p> : null}
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
            <h2 className="font-serif text-3xl italic">Hours</h2>
            {place.periods.length ? <ul className="mt-2">{formatPeriods(place.periods).map((line) => <li key={line}>{line}</li>)}</ul> : <p className="mt-2">Hours are not posted. Call before you trek across town.</p>}
            <p className="mt-3">{place.address}</p>
          </section>
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
                  <div className="p-2">
                    <ScoreBadge score={app.gustoScore(item.id)} size="sm" />
                    <h3 className="mt-1 font-serif text-xl italic leading-tight">{item.name}</h3>
                    <p className="mt-1 text-xs font-bold tracking-wide uppercase">{item.neighborhood}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </article>
        <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
      </div>
      <div className="bleed-map mt-8 h-80 lg:mt-0 lg:h-auto">
        <GuideMap places={[place]} statuses={app.statuses} />
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
