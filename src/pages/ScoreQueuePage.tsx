import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HouseScorePad } from '../components/HouseScorePad.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { catalog } from '../content/load.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'

const PAGE = 12

export function ScoreQueuePage() {
  const app = useApp()
  const [shown, setShown] = useState(PAGE)
  const [signIn, setSignIn] = useState(false)
  usePageMeta("Needs a score · Gusto's Guide", 'Places still waiting on a house score.', './og/og.svg')
  const queue = catalog.places.filter((place) => app.gustoScore(place.id) == null)
  const visible = queue.slice(0, shown)

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <p className="text-xs font-bold tracking-[0.14em] uppercase">House</p>
      <h1 className="font-serif text-5xl italic">Needs a score</h1>
      {!app.user ? (
        <div className="friend-empty mt-4">
          <p className="font-serif text-2xl italic">Sign in to score.</p>
          <p className="mt-1 text-sm">House scores stay with the house. Nothing here is filled in for you.</p>
          <button type="button" className="btn btn-coral mt-3" onClick={() => setSignIn(true)}>Sign in</button>
        </div>
      ) : !app.user.isOwner ? (
        <p className="mt-4">These scores stay with the house. Your own ranks live on Rank.</p>
      ) : queue.length === 0 ? (
        <p className="mt-4">Every place on the guide has a house score.</p>
      ) : (
        <>
          <p className="mt-3 text-sm">{queue.length} places still open. Tap a number. It publishes as the house score.</p>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visible.map((place) => (
              <li key={place.id} className="feed-card">
                <Link to={`/place/${place.id}`} className="block h-36 overflow-hidden bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
                  <PlaceThumb place={place} uploads={app.photos} />
                </Link>
                <h2 className="mt-2 font-serif text-2xl italic leading-none">{place.name}</h2>
                <p className="mt-1 text-sm">{place.neighborhood}</p>
                <HouseScorePad placeId={place.id} compact />
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
