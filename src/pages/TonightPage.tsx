import { useMemo, useState } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { PriceFilter } from '../components/PriceFilter.tsx'
import { SlidingRow } from '../components/SlidingRow.tsx'
import { useCityCatalog } from '../lib/use-city.ts'
import { milesBetween, priceLabel } from '../lib/format.ts'
import { hasUnknownPrice, matchesPrice } from '../lib/price-filter.ts'
import { readPosition } from '../lib/geo.ts'
import { isPlaceOpen } from '../lib/hours.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'
import type { Price, SlimPlace } from '../types.ts'

export function TonightPage() {
  const app = useApp()
  const { places } = useCityCatalog()
  const reduceMotion = useReducedMotion()
  const [signIn, setSignIn] = useState(false)
  const [vibe, setVibe] = useState('')
  const [prices, setPrices] = useState<Price[]>([])
  const [unknownPrice, setUnknownPrice] = useState(false)
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [whereError, setWhereError] = useState('')
  const [pick, setPick] = useState<SlimPlace | null>(null)
  const [spinning, setSpinning] = useState(false)
  usePageMeta("Tonight · Gusto's Guide", 'Shuffle a To go place that is open now.', './og/og.png')

  const pool = useMemo(() => {
    const togo = places.filter((place) => app.statuses[place.id] === 'togo' && isPlaceOpen(place))
    const priced = togo.filter((place) => matchesPrice(place, { prices, unknown: unknownPrice }))
    const vibed = vibe ? priced.filter((place) => place.perfectFor.includes(vibe)) : priced
    const located = origin ? vibed.slice().sort((a, b) => milesBetween(origin, a) - milesBetween(origin, b)) : vibed
    const near = origin ? located.filter((place) => milesBetween(origin, place) <= 8) : located
    return near.length ? near : located
  }, [places, app.statuses, prices, unknownPrice, vibe, origin])

  const vibes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const place of places) {
      if (app.statuses[place.id] !== 'togo') continue
      for (const tag of place.perfectFor) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name)
  }, [places, app.statuses])

  async function locate() {
    setWhereError('')
    try {
      setOrigin(await readPosition())
    } catch (reason) {
      setWhereError(reason instanceof Error ? reason.message : 'Location is off.')
    }
  }

  function shuffle() {
    if (!pool.length || spinning) return
    const next = pool.filter((place) => place.id !== pick?.id)
    const bag = next.length ? next : pool
    const chosen = bag[Math.floor(Math.random() * bag.length)]
    if (reduceMotion) {
      setPick(chosen)
      return
    }
    setSpinning(true)
    window.setTimeout(() => {
      setPick(chosen)
      setSpinning(false)
    }, 280)
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <AreaKicker />
      <h1 className="mt-2 font-serif text-5xl italic">Where should we go?</h1>
      {!app.user ? (
        <div className="friend-empty mt-4">
          <p className="font-serif text-2xl italic">Sign in to shuffle.</p>
          <p className="mt-1 text-sm">It picks from places you marked To go that are open now.</p>
          <button type="button" className="btn btn-coral mt-3" onClick={() => setSignIn(true)}>Sign in</button>
        </div>
      ) : (
        <>
          <p className="mt-3 max-w-xl text-sm">{origin ? 'Open now, closest first, from your To go list.' : 'Open now from your To go list. Turn on location if you want nearby.'}</p>
          <div className="mt-4">
            <SlidingRow label="Vibe">
              <button type="button" className="chip" aria-pressed={vibe === ''} onClick={() => setVibe('')}>Any vibe</button>
              {vibes.map((tag) => (
                <button key={tag} type="button" className="chip" aria-pressed={vibe === tag} onClick={() => setVibe(tag)}>{tag}</button>
              ))}
            </SlidingRow>
          </div>
          <div className="mt-2">
            <SlidingRow label="Where">
              <button type="button" className="chip" aria-pressed={!origin} onClick={() => { setOrigin(null); setWhereError('') }}>Anywhere</button>
              <button type="button" className="chip" aria-pressed={Boolean(origin)} onClick={() => void locate()}>Nearby</button>
            </SlidingRow>
          </div>
          <div className="mt-2">
            <PriceFilter
              choice={{ prices, unknown: unknownPrice }}
              showUnknown={hasUnknownPrice(places.filter((place) => app.statuses[place.id] === 'togo'))}
              onChange={(next) => { setPrices(next.prices); setUnknownPrice(next.unknown) }}
            />
          </div>
          {whereError ? <p className="mt-2 text-sm">{whereError}</p> : null}
          <div className="tonight-stage mt-5">
            <AnimatePresence mode="wait">
              {pick ? (
                <m.div
                  key={pick.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -20, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                >
                  <Link to={`/place/${pick.id}`} className="tonight-card">
                    <span className="tonight-photo"><PlaceThumb place={pick} uploads={app.photos} eager priority sizes="(min-width: 768px) 280px, 40vw" /></span>
                    <span className="tonight-copy">
                      <span className="block font-serif text-4xl italic leading-none">{pick.name}</span>
                      <span className="mt-2 block text-sm">{[pick.neighborhood, priceLabel(pick.price)].filter(Boolean).join(' · ')}</span>
                    </span>
                  </Link>
                </m.div>
              ) : (
                <p className="font-serif text-3xl italic">{pool.length ? 'Tap shuffle.' : 'Nothing open matches. Mark more places To go, or loosen a filter.'}</p>
              )}
            </AnimatePresence>
          </div>
          <button type="button" className="btn btn-coral mt-4" disabled={!pool.length || spinning} onClick={shuffle}>Shuffle</button>
        </>
      )}
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </main>
  )
}
