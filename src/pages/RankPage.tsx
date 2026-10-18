import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { ScoreBadge } from '../components/ScoreBadge.tsx'
import { catalog } from '../content/load.ts'
import { BUCKETS } from '../lib/rank.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'
import { SignInSheet } from '../components/SignInSheet.tsx'

export function RankPage() {
  const app = useApp()
  const [query, setQuery] = useState('')
  const [signIn, setSignIn] = useState(false)
  usePageMeta("Rank · Gusto's Guide", 'Loved, liked, fine, or did not. Then pick which meal you would rather eat again.')
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.places.filter((place) => !q || place.name.toLowerCase().includes(q)).slice(0, 12)
  }, [query])
  const opponentId = app.compare ? app.order[app.compare.bucket].filter((id) => id !== app.compare?.placeId)[Math.floor((app.compare.low + app.compare.high) / 2)] : undefined
  const opponent = catalog.places.find((place) => place.id === opponentId)
  const current = catalog.places.find((place) => place.id === app.compare?.placeId)

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <h1 className="font-serif text-5xl italic">Rank it</h1>
      <p className="mt-3 max-w-2xl">
        {app.user?.isOwner
          ? "You are the owner. A finished rank publishes Gusto's Score on this device. Yelp stays a separate 1–5 star line."
          : "Loved, Liked, Fine, or Didn't. Your score stays personal until the owner publishes Gusto's Score."}
      </p>
      {!app.user ? <button type="button" className="btn btn-coral mt-4" onClick={() => setSignIn(true)}>Sign in to rank</button> : null}
      <label className="field mt-4"><span>Find a place</span><input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <ul className="mt-4 space-y-4">
        {matches.map((place) => (
          <li key={place.id} className="border-2 border-ink p-3">
            <Link to={`/place/${place.id}`} className="flex items-center gap-3">
              <span className="h-14 w-16 shrink-0 overflow-hidden border-2 border-ink bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
                <PlaceThumb place={place} uploads={app.photos} />
              </span>
              <span className="font-serif text-2xl italic leading-none">{place.name}</span>
            </Link>
            <div className="mt-2"><ScoreBadge score={app.gustoScore(place.id)} size="sm" /></div>
            {app.user && !app.user.isOwner && app.scores[place.id] ? <p className="mt-1 text-sm">Your score {app.scores[place.id].score.toFixed(1)}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {BUCKETS.map((bucket) => (
                <button key={bucket.id} type="button" className="btn text-sm" disabled={!app.user} onClick={() => app.startRank(place.id, bucket.id)}>
                  {bucket.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {app.compare && current && opponent ? (
        <section className="mt-8 border-2 border-ink bg-white p-4" aria-labelledby="prefer-heading">
          <h2 id="prefer-heading" className="font-serif text-4xl italic">Which did you prefer?</h2>
          <p className="mt-2">{current.name} or {opponent.name}?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-coral" onClick={() => app.answerRank('new')}>{current.name}</button>
            <button type="button" className="btn" onClick={() => app.answerRank('old')}>{opponent.name}</button>
            <button type="button" className="btn" onClick={() => app.answerRank('close')}>Too close</button>
            <button type="button" className="btn" onClick={() => app.answerRank('skip')}>Skip</button>
          </div>
        </section>
      ) : null}
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </main>
  )
}
