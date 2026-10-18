import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GuideMap } from '../components/GuideMap.tsx'
import { PhotoFrame } from '../components/PhotoFrame.tsx'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { catalog, loadPlace } from '../content/load.ts'
import { displayPhotos } from '../lib/gallery.ts'
import { formatPeriods, isOpen } from '../lib/hours.ts'
import { milesBetween, priceLabel, shareUrl } from '../lib/format.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'
import type { Place } from '../types.ts'

export function PlacePage() {
  const { slug = '' } = useParams()
  const app = useApp()
  const [place, setPlace] = useState<Place | null>(null)
  const [missing, setMissing] = useState(false)
  const [active, setActive] = useState(0)
  const [error, setError] = useState('')
  const [signIn, setSignIn] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setPlace(null)
    setMissing(false)
    setActive(0)
    void loadPlace(slug).then((next) => {
      if (cancelled) return
      if (!next) setMissing(true)
      else setPlace(next)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  usePageMeta(place ? `${place.name} · Gusto's Guide` : "Place · Gusto's Guide", place?.oneLiner ?? 'A Seattle place on Gusto’s list.')

  const photos = useMemo(() => (place ? displayPhotos(place, app.photos) : []), [place, app.photos])
  const similar = useMemo(() => {
    if (!place) return []
    return catalog.places
      .filter((item) => item.id !== place.id && item.cuisine.some((cuisine) => place.cuisine.includes(cuisine)))
      .map((item) => ({ item, miles: milesBetween(place, item) }))
      .sort((a, b) => a.miles - b.miles)
      .slice(0, 4)
      .map((row) => row.item)
  }, [place])

  if (missing) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
        <h1 className="font-serif text-5xl italic">That place is not on the list.</h1>
        <Link to="/search" className="btn mt-6">Search</Link>
      </main>
    )
  }
  if (!place) return <main className="px-4 pt-28">Loading…</main>

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
    <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-24 pb-16 outline-none">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div>
          <PhotoFrame photo={current} priority />
          <div className="mt-2 flex gap-2 overflow-auto">
            {photos.map((photo, index) => (
              <button key={photo.key} type="button" className={`h-16 w-24 shrink-0 border-2 ${index === active ? 'border-coral' : 'border-ink'}`} onClick={() => setActive(index)}>
                {photo.url && !photo.illustration ? <img src={photo.url} alt="" className="h-full w-full object-cover" /> : <span className="text-xs font-bold">Illustration</span>}
              </button>
            ))}
          </div>
          <section className="mt-4 border-2 border-ink p-4" aria-labelledby="upload-heading">
            <h2 id="upload-heading" className="font-serif text-3xl italic">Add a photo</h2>
            <p className="mt-2 text-sm">Been here? Upload a picture. It is resized to WebP on this device. Augusto’s uploads become the primary photo, credited Photo by Gusto.</p>
            {!app.user ? (
              <button type="button" className="btn btn-coral mt-3" onClick={() => setSignIn(true)}>Sign in to add a photo</button>
            ) : !been ? (
              <button type="button" className="btn mt-3" onClick={() => app.setStatus(place.id, 'been')}>Mark Been to add a photo</button>
            ) : (
              <label className="btn mt-3 cursor-pointer">
                {busy ? 'Saving…' : 'Upload photo'}
                <input className="sr-only" type="file" accept="image/*" onChange={(event) => void onFile(event.target.files?.[0])} />
              </label>
            )}
            {error ? <p className="mt-2 text-sm">{error}</p> : null}
          </section>
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.14em] uppercase">{place.cuisine.join(' · ')} · {place.neighborhood}</p>
          <h1 className="mt-1 font-serif text-5xl italic leading-none sm:text-6xl">{place.name}</h1>
          <p className="mt-3 font-serif text-2xl italic">“{place.oneLiner}”</p>
          <p className="score-pill mt-3">Gusto's score · Not yet rated</p>
          {app.scores[place.id] ? <p className="mt-2 text-sm">Your draft score {app.scores[place.id].score.toFixed(1)} · {app.scores[place.id].bucket}</p> : null}
          {place.publicRating ? <p className="mt-2 text-sm">{place.publicRating.value.toFixed(1)} from {place.publicRating.count} on {place.publicRating.source}</p> : null}
          {place.appleRating ? <p className="text-sm">Apple Maps {place.appleRating.percent}%{place.appleRating.count ? ` · ${place.appleRating.count} ratings` : ''}</p> : null}
          {friends.count ? <p className="mt-2 text-sm">{friends.loved ? `${friends.loved} ${friends.loved === 1 ? 'friend loved' : 'friends loved'} this. ` : ''}Friend score {friends.average}.</p> : null}
          <p className="mt-2 font-bold">{priceLabel(place.price)} · {isOpen(place.periods) ? 'Open now' : 'Closed now, or hours unknown'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {place.perfectFor.map((tag) => <span key={tag} className="tag">{tag}</span>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {place.website ? <a className="btn text-sm" href={place.website}>Website</a> : null}
            <a className="btn text-sm" href={place.appleMapsUrl}>Directions</a>
            {place.phone ? <a className="btn text-sm" href={`tel:${place.phone}`}>Call</a> : null}
            <button type="button" className={`btn text-sm ${app.statuses[place.id] === 'togo' ? 'btn-coral' : ''}`} onClick={() => (app.user ? app.setStatus(place.id, 'togo') : setSignIn(true))}>To go</button>
            <button type="button" className={`btn text-sm ${been ? 'btn-leaf' : ''}`} onClick={() => (app.user ? app.setStatus(place.id, 'been') : setSignIn(true))}>Been</button>
            <button type="button" className="btn text-sm" onClick={() => void navigator.clipboard.writeText(shareUrl(place.id))}>Share</button>
          </div>
        </div>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article>
          {place.review.split('\n\n').map((paragraph) => <p key={paragraph.slice(0, 32)} className="mt-4 max-w-2xl text-lg">{paragraph}</p>)}
          <p className="mt-3 text-xs font-bold uppercase tracking-wide">Draft copy</p>
          {place.orderThis.length ? (
            <section className="mt-6">
              <h2 className="font-serif text-3xl italic">What to order</h2>
              <ul className="mt-2 space-y-2">
                {place.orderThis.map((item) => <li key={item.dish}><strong>{item.dish}.</strong> {item.note}</li>)}
              </ul>
            </section>
          ) : null}
          <section className="mt-6">
            <h2 className="font-serif text-3xl italic">Hours</h2>
            {place.periods.length ? <ul className="mt-2">{formatPeriods(place.periods).map((line) => <li key={line}>{line}</li>)}</ul> : <p className="mt-2">No hours in the saved listing.</p>}
            <p className="mt-3">{place.address}</p>
          </section>
          <section className="mt-6">
            <h2 className="font-serif text-3xl italic">Included in</h2>
            <ul className="mt-2 space-y-1">
              {guides.map((guide) => <li key={guide.slug}><Link to={`/guide/${guide.slug}`} className="font-bold">{guide.title}</Link></li>)}
            </ul>
          </section>
          <section className="mt-6">
            <h2 className="font-serif text-3xl italic">Similar places</h2>
            <ul className="mt-2 space-y-1">
              {similar.map((item) => <li key={item.id}><Link to={`/place/${item.id}`} className="font-bold">{item.name}</Link> · {item.neighborhood}</li>)}
            </ul>
          </section>
        </article>
        <div className="h-80 lg:sticky lg:top-24">
          <GuideMap places={[place]} statuses={app.statuses} />
        </div>
      </div>
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </main>
  )
}
