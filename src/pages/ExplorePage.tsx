import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GuideMap, type MapBounds } from '../components/GuideMap.tsx'
import { MapLinks } from '../components/MapLinks.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { GoldenFork } from '../components/GoldenFork.tsx'
import { ScoreBadge, scoreBand } from '../components/ScoreBadge.tsx'
import { areaPhrase, areaTitle, cityPath } from '../lib/city.ts'
import { useCityCatalog } from '../lib/use-city.ts'
import { isOpen } from '../lib/hours.ts'
import { priceLabel } from '../lib/format.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'
import type { SlimPlace } from '../types.ts'

const BANDS = [
  { id: 'any', label: 'Any score' },
  { id: 'best', label: 'Best of the best' },
  { id: 'great', label: 'Great' },
  { id: 'good', label: 'Good' },
  { id: 'fine', label: "It's fine" },
  { id: 'skip', label: 'Skip' },
  { id: 'unrated', label: 'Not yet rated' },
] as const

function bandId(score: number | null): string {
  if (score == null) return 'unrated'
  if (score >= 9) return 'best'
  return scoreBand(score).tone
}

function inside(place: SlimPlace, box: MapBounds): boolean {
  return place.lat >= box.south && place.lat <= box.north && place.lng >= box.west && place.lng <= box.east
}

export function ExplorePage() {
  const { city, places } = useCityCatalog()
  const areaName = areaPhrase(city)
  usePageMeta("Explore · Gusto's Guide", `Every ${areaName} place on the guide, on one map.`, './og/og.svg')
  const app = useApp()
  const reduceMotion = useReducedMotion()
  const cuisines = useMemo(() => {
    const set = new Set<string>()
    for (const place of places) for (const cuisine of place.cuisine) set.add(cuisine)
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [places])
  const neighborhoods = useMemo(
    () => [...new Set(places.map((place) => place.neighborhood))].sort((a, b) => a.localeCompare(b)),
    [places],
  )
  const [cuisine, setCuisine] = useState('any')
  const [neighborhood, setNeighborhood] = useState('any')
  const [price, setPrice] = useState('any')
  const [band, setBand] = useState('any')
  const [visit, setVisit] = useState('any')
  const [openNow, setOpenNow] = useState(false)
  const [area, setArea] = useState<MapBounds | null>(null)
  const [pending, setPending] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const armedAt = useRef(Number.POSITIVE_INFINITY)
  const latest = useRef<MapBounds | null>(null)

  useEffect(() => {
    armedAt.current = Date.now() + 900
  }, [])

  function resetArea() {
    armedAt.current = Date.now() + 900
    setArea(null)
    setPending(false)
  }

  const filtered = places.filter((place) => {
    if (cuisine !== 'any' && !place.cuisine.includes(cuisine)) return false
    if (neighborhood !== 'any' && place.neighborhood !== neighborhood) return false
    if (price !== 'any' && place.price !== Number(price)) return false
    if (band !== 'any' && bandId(app.gustoScore(place.id)) !== band) return false
    if (visit === 'togo' || visit === 'been') {
      if (app.statuses[place.id] !== visit) return false
    }
    if (visit === 'unmarked' && app.statuses[place.id]) return false
    if (openNow && !isOpen(place.periods)) return false
    return true
  })
  const listed = area ? filtered.filter((place) => inside(place, area)) : filtered
  const rows = listed.slice(0, 80)

  return (
    <main id="main" tabIndex={-1} className="explore-shell outline-none">
      <h1 className="sr-only">Explore {areaName}</h1>
      <section className={`explore-list ${sheet ? 'is-open' : 'is-peek'}`} aria-label="Places in this view">
        <button type="button" className="explore-grab" aria-expanded={sheet} onClick={() => setSheet((value) => !value)}>
          <span aria-hidden="true" />
          <span className="sr-only">{sheet ? 'Show the map' : 'Show the list'}</span>
        </button>
        <div className="explore-bar flex items-center justify-between gap-2 border-b-2 border-ink px-3 py-2">
          <p className="min-w-0">
            <span className="area-kicker">{areaTitle(city)}</span>
            <span className="mt-0.5 block font-serif text-2xl italic leading-none">{listed.length} places</span>
          </p>
          <button
            type="button"
            className="btn text-sm md:hidden"
            aria-expanded={sheet}
            onClick={() => setSheet((value) => !value)}
          >
            {sheet ? 'Map' : 'List'}
          </button>
        </div>
        <div className={sheet ? '' : 'max-md:hidden'}>
          <form className="explore-filters grid grid-cols-2 gap-2 p-3" aria-label="Map filters">
            <label className="field">
              <span>Cuisine</span>
              <select value={cuisine} onChange={(event) => { setCuisine(event.target.value); resetArea() }}>
                <option value="any">Any</option>
                {cuisines.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Neighborhood</span>
              <select value={neighborhood} onChange={(event) => { setNeighborhood(event.target.value); resetArea() }}>
                <option value="any">Any</option>
                {neighborhoods.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Price</span>
              <select value={price} onChange={(event) => { setPrice(event.target.value); resetArea() }}>
                <option value="any">Any</option>
                {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{priceLabel(item as 1 | 2 | 3 | 4)}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Gusto's Score</span>
              <select value={band} onChange={(event) => { setBand(event.target.value); resetArea() }}>
                {BANDS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>To go / Been</span>
              <select value={visit} onChange={(event) => { setVisit(event.target.value); resetArea() }}>
                <option value="any">Any</option>
                <option value="togo">To go</option>
                <option value="been">Been</option>
                <option value="unmarked">Unmarked</option>
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
              <input className="open-check" type="checkbox" checked={openNow} onChange={(event) => { setOpenNow(event.target.checked); resetArea() }} />
              Open now
            </label>
          </form>
          {area ? (
            <p className="px-3 pb-2 text-sm">
              Searching this area.{' '}
              <button type="button" className="btn text-sm" onClick={resetArea}>Clear</button>
            </p>
          ) : null}
          <ul className="space-y-2 px-3 pb-4">
            {rows.map((place) => (
              <li
                key={place.id}
                id={`explore-${place.id}`}
                className={`explore-card relative border-2 bg-[#fffaf3] p-2 ${activeId === place.id ? 'is-hot border-coral' : 'border-ink'}`}
                onMouseEnter={() => setActiveId(place.id)}
                onMouseLeave={() => setActiveId((current) => (current === place.id ? null : current))}
              >
                <Link to={cityPath(`/place/${place.id}`)} className="place-row after:absolute after:inset-0" viewTransition={!reduceMotion}>
                  <span className="place-row-shot" style={reduceMotion ? undefined : { viewTransitionName: `place-${place.id}` }}>
                    <PlaceThumb place={place} uploads={app.photos} sizes="64px" />
                    <GoldenFork placeId={place.id} overlay />
                  </span>
                  <span className="place-row-copy">
                    <span className="block font-serif text-xl italic leading-tight">{place.name}</span>
                    <span className="mt-1 block text-xs font-bold tracking-wide uppercase">
                      {[place.cuisine[0], priceLabel(place.price), place.neighborhood].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="score-col">
                    <ScoreBadge score={app.gustoScore(place.id)} size="sm" />
                  </span>
                </Link>
                <div className="relative z-10 mt-2 flex flex-wrap gap-2">
                  <MapLinks place={place} />
                </div>
              </li>
            ))}
          </ul>
          {listed.length > rows.length ? <p className="px-3 pb-4 text-sm">Showing {rows.length} of {listed.length}. Zoom in and search this area to narrow it.</p> : null}
          {listed.length === 0 ? (
            <div className="px-3 pb-6">
              <p className="font-serif text-2xl italic">Nothing in this view.</p>
              <button
                type="button"
                className="btn mt-3"
                onClick={() => {
                  setCuisine('any')
                  setNeighborhood('any')
                  setPrice('any')
                  setBand('any')
                  setVisit('any')
                  setOpenNow(false)
                  resetArea()
                }}
              >
                Clear filters
              </button>
            </div>
          ) : null}
        </div>
      </section>
      <div className="explore-map">
        <GuideMap
          places={filtered}
          statuses={app.statuses}
          activeId={activeId}
          onHover={setActiveId}
          onSelect={(id) => {
            setActiveId(id)
            setSheet(true)
            window.requestAnimationFrame(() => {
              document.getElementById(`explore-${id}`)?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
            })
          }}
          onMoveEnd={(box) => {
            latest.current = box
            if (Date.now() < armedAt.current) return
            setPending(true)
          }}
        />
        {pending ? (
          <button
            type="button"
            className="btn btn-coral search-area"
            onClick={() => {
              if (latest.current) setArea(latest.current)
              setPending(false)
              setSheet(true)
            }}
          >
            Search this area
          </button>
        ) : null}
      </div>
    </main>
  )
}
