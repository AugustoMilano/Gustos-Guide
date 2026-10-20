import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { loadGuides } from '../content/load.ts'
import { cityPath } from '../lib/city.ts'
import { placesForCity, useCityId } from '../lib/use-city.ts'
import { usePageMeta } from '../lib/meta.ts'
import { photoQueue, type RankedGuide } from '../lib/photo-queue.ts'
import { useApp } from '../state/AppState.tsx'

const PAGE = 12

export function PhotoQueuePage() {
  const app = useApp()
  const city = useCityId()
  const [shown, setShown] = useState(PAGE)
  const [signIn, setSignIn] = useState(false)
  const [busy, setBusy] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [guides, setGuides] = useState<RankedGuide[] | null>(null)
  usePageMeta("Needs a photo · Gusto's Guide", 'Illustration-only places, busiest first.', 'https://gustosguide.com/og/og.svg')
  useEffect(() => {
    let cancel = false
    void loadGuides().then((rows) => {
      if (!cancel) setGuides(rows)
    }).catch(() => {
      if (!cancel) setGuides([])
    })
    return () => {
      cancel = true
    }
  }, [])
  const queue = guides ? photoQueue(placesForCity(city), guides, app.photos) : []
  const visible = queue.slice(0, shown)

  async function onFile(placeId: string, file: File | undefined) {
    if (!file) return
    setBusy(placeId)
    setErrors((current) => ({ ...current, [placeId]: '' }))
    try {
      await app.uploadPhoto(placeId, file)
    } catch (reason) {
      setErrors((current) => ({ ...current, [placeId]: reason instanceof Error ? reason.message : 'Could not add that photo.' }))
    } finally {
      setBusy('')
    }
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <AreaKicker />
      <h1 className="mt-2 font-serif text-5xl italic">Needs a photo</h1>
      {!app.user ? (
        <div className="friend-empty mt-4">
          <p className="font-serif text-2xl italic">Sign in to add house photos.</p>
          <p className="mt-1 text-sm">These shots show for everyone, ahead of the drawing.</p>
          <button type="button" className="btn btn-coral mt-3" onClick={() => setSignIn(true)}>Sign in</button>
        </div>
      ) : !app.user.isOwner ? (
        <p className="mt-4">House photos stay with the house. A photo you took still belongs on the place page after you mark Been.</p>
      ) : !app.photosReady || !guides ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-busy="true">
          <p className="sr-only">Loading places that still need a photo.</p>
          <div className="skeleton h-64" />
          <div className="skeleton h-64" />
        </div>
      ) : queue.length === 0 ? (
        <div className="friend-empty mt-4">
          <p className="font-serif text-2xl italic">Nothing here is still a drawing.</p>
          <p className="mt-1 text-sm">The busy places already have a house photo or a Wikimedia shot.</p>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm">{queue.length} places still use a drawing. Busiest first. Camera or library, saved as a WebP.</p>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visible.map(({ place, reason }) => (
              <li key={place.id} className="feed-card">
                <Link to={cityPath(`/place/${place.id}`)} className="block h-36 overflow-hidden bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full" aria-label={place.name}>
                  <PlaceThumb place={place} uploads={app.photos} />
                </Link>
                <h2 className="mt-2 font-serif text-2xl italic leading-none">{place.name}</h2>
                <p className="mt-1 text-sm">{place.neighborhood} · {reason}</p>
                <label className={`btn btn-coral relative mt-3 w-full overflow-hidden ${busy === place.id ? 'pointer-events-none' : ''}`}>
                  {busy === place.id ? 'Saving…' : 'Add a photo'}
                  <input
                    className="file-hit"
                    type="file"
                    accept="image/*"
                    aria-label={busy === place.id ? `Saving a photo of ${place.name}` : `Add a photo of ${place.name}`}
                    disabled={busy === place.id}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ''
                      void onFile(place.id, file)
                    }}
                  />
                </label>
                {errors[place.id] ? <p className="mt-2 text-sm text-[#9d1c08]" role="alert">{errors[place.id]}</p> : null}
              </li>
            ))}
          </ul>
          {shown < queue.length ? (
            <button type="button" className="btn mt-4" onClick={() => setShown((count) => count + PAGE)}>More places</button>
          ) : null}
        </>
      )}
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </main>
  )
}
