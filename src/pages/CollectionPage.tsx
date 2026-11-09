import { lazy, Suspense, useState } from 'react'
import { m, useReducedMotion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
const GuideMap = lazy(() => import('../components/GuideMap.tsx').then((module) => ({ default: module.GuideMap })))
import { GoldenFork } from '../components/GoldenFork.tsx'
import { PriceFilter } from '../components/PriceFilter.tsx'
import { MapLinks } from '../components/MapLinks.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { ScoreBadge } from '../components/ScoreBadge.tsx'
import { areaTitle, cityPath } from '../lib/city.ts'
import { CHEAP_EATS_SLUG, CHEAP_EATS_TITLE, cheapEatsFor, cleanTitle, flagshipAimHint, movedPlaceIds, orderedMembers, renderableIds, usableCheapMembers } from '../lib/collections.ts'
import { cuisineLabel } from '../lib/cuisine-label.ts'
import { countPlaces, priceLabel } from '../lib/format.ts'
import { hasUnknownPrice, matchesPrice } from '../lib/price-filter.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useCityCatalog } from '../lib/use-city.ts'
import { useApp } from '../state/AppState.tsx'
import type { Price } from '../types.ts'

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 32 }

export function CollectionPage() {
  const { slug = '' } = useParams()
  const { city, places } = useCityCatalog()
  const app = useApp()
  const reduce = useReducedMotion()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sheet, setSheet] = useState(true)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [prices, setPrices] = useState<Price[]>([])
  const [unknownPrice, setUnknownPrice] = useState(false)
  const isCheap = slug === CHEAP_EATS_SLUG
  const stored = app.collections.find((row) => row.city === city && row.slug === slug && (row.published || app.user?.isOwner)) ?? null
  const loading = app.collectionsStatus === 'loading'
  const storedIds = renderableIds(stored?.placeIds)
  const cheapMembers = isCheap ? usableCheapMembers(stored, places) : null
  const members = isCheap
    ? cheapMembers ?? cheapEatsFor(places, city, app.gustoScore)
    : storedIds
      ? orderedMembers(storedIds, places)
      : []
  const usingStored = isCheap ? cheapMembers != null : storedIds != null
  const shown = members.filter((place) => matchesPrice(place, { prices, unknown: unknownPrice }))
  const heading = stored?.title ?? (isCheap ? CHEAP_EATS_TITLE : 'Collection')
  const blurb = stored?.blurb ?? ''
  const owner = Boolean(app.user?.isOwner && stored && usingStored && storedIds)
  usePageMeta(
    `${heading} · Gusto's Guide`,
    blurb || `${countPlaces(members.length)} · ${areaTitle(city)}`,
    './og/og.png',
  )

  if (loading) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto min-h-dvh max-w-3xl px-4 pt-28 outline-none" aria-busy="true">
        <p className="sr-only">Loading</p>
        <div className="skeleton h-12 w-48" />
      </main>
    )
  }

  if (!isCheap && !stored) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto min-h-dvh max-w-3xl px-4 pt-28 outline-none">
        <h1 className="font-serif text-5xl italic">That collection is not on this list.</h1>
        <Link to={cityPath('/')} className="btn mt-6">Home</Link>
      </main>
    )
  }

  return (
    <main id="main" tabIndex={-1} className="explore-shell outline-none">
      <section className={`explore-list ${sheet ? '' : 'is-peek'}`} aria-label={heading}>
        <div className="explore-bar panel-pad flex items-end justify-between gap-3 border-b border-ink/10">
          <m.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : SPRING}
          >
            <p className="area-kicker">{areaTitle(city)}</p>
            <h1 className="mt-0.5 font-serif text-3xl italic leading-none">{heading}</h1>
            <p className="mt-1 text-sm tabular-nums">{shown.length === members.length ? countPlaces(members.length) : `${shown.length} of ${countPlaces(members.length)}`}</p>
            {app.user?.isOwner ? (
              <p className="mt-1 text-sm">{flagshipAimHint(usingStored && storedIds ? storedIds.length : members.length)}</p>
            ) : null}
          </m.div>
          <button
            type="button"
            className="btn text-sm sheet-toggle"
            aria-expanded={sheet}
            onClick={() => setSheet((value) => !value)}
          >
            {sheet ? 'Map' : 'List'}
          </button>
        </div>
        <div className={sheet ? '' : 'max-md:hidden'}>
          {stored && !stored.published ? <p className="panel-pad text-sm" role="status">Not published.</p> : null}
          {blurb ? <p className="glass mx-3 mt-3 p-3 text-sm">{blurb}</p> : null}
          {owner && stored ? (
            <div className="panel-pad flex flex-wrap gap-2 py-3">
              <button
                type="button"
                className="btn text-sm"
                onClick={() => {
                  setTitle(stored.title)
                  setNote(stored.blurb ?? '')
                  setEditing((value) => !value)
                }}
              >
                Rename
              </button>
              <button
                type="button"
                className="btn text-sm"
                onClick={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true)
                    return
                  }
                  void app.deleteCollection(stored.id)
                }}
              >
                {confirmDelete ? 'Delete this collection' : 'Delete'}
              </button>
            </div>
          ) : null}
          {owner && stored && editing ? (
            <form
              className="panel-pad grid gap-3 pb-3"
              onSubmit={(event) => {
                event.preventDefault()
                void app.renameCollection(stored.id, title, note).then((ok) => {
                  if (ok) setEditing(false)
                })
              }}
            >
              <label className="field">
                <span>Title</span>
                <input value={title} maxLength={40} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label className="field">
                <span>Note</span>
                <textarea value={note} maxLength={280} rows={2} onChange={(event) => setNote(event.target.value)} />
              </label>
              <button type="submit" className="btn btn-coral text-sm" disabled={!cleanTitle(title)}>Save</button>
            </form>
          ) : null}
          {members.length ? (
            <div className="panel-pad pt-3">
              <PriceFilter
                choice={{ prices, unknown: unknownPrice }}
                showUnknown={hasUnknownPrice(members)}
                onChange={(next) => { setPrices(next.prices); setUnknownPrice(next.unknown) }}
              />
            </div>
          ) : null}
          {members.length === 0 ? <p className="panel-pad font-serif text-2xl italic">No places in this collection.</p> : null}
          {members.length > 0 && shown.length === 0 ? (
            <div className="panel-pad">
              <p className="font-serif text-2xl italic">Nothing matches that price.</p>
              <button type="button" className="btn mt-3" onClick={() => { setPrices([]); setUnknownPrice(false) }}>Clear filters</button>
            </div>
          ) : null}
          <ul className="panel-pad space-y-3 pb-4">
            {shown.map((place) => (
              <li
                key={place.id}
                id={`collection-${place.id}`}
                className={`explore-card relative border-2 bg-[#fffaf3] ${activeId === place.id ? 'is-hot border-coral' : 'border-ink'}`}
                onMouseEnter={() => setActiveId(place.id)}
                onMouseLeave={() => setActiveId((current) => (current === place.id ? null : current))}
              >
                <Link to={cityPath(`/place/${place.id}`)} className="place-row after:absolute after:inset-0">
                  <span className="place-row-shot">
                    <PlaceThumb place={place} uploads={app.photos} sizes="64px" />
                    <GoldenFork placeId={place.id} overlay />
                  </span>
                  <span className="place-row-copy">
                    <span className="block font-serif text-xl italic leading-tight">{place.name}</span>
                    <span className="mt-1 block text-xs font-bold tracking-wide uppercase">
                      {[cuisineLabel(place.cuisine?.[0] ?? ''), priceLabel(place.price), place.neighborhood].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="score-col">
                    <ScoreBadge score={app.gustoScore(place.id)} size="sm" />
                  </span>
                </Link>
                <div className="action-row relative z-10 mt-2">
                  <MapLinks place={place} />
                  {owner && stored ? (
                    <>
                      <button
                        type="button"
                        className="btn text-sm"
                        aria-label={`Move ${place.name} up`}
                        disabled={members[0]?.id === place.id}
                        onClick={() => {
                          if (!storedIds) return
                          const next = movedPlaceIds(storedIds, members.map((item) => item.id), place.id, -1)
                          if (next) app.reorderCollection(stored.id, next)
                        }}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="btn text-sm"
                        aria-label={`Move ${place.name} down`}
                        disabled={members[members.length - 1]?.id === place.id}
                        onClick={() => {
                          if (!storedIds) return
                          const next = movedPlaceIds(storedIds, members.map((item) => item.id), place.id, 1)
                          if (next) app.reorderCollection(stored.id, next)
                        }}
                      >
                        Down
                      </button>
                      <button type="button" className="btn text-sm" onClick={() => app.setCollectionPlace(stored.id, place.id, false)}>
                        Remove
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <div className="explore-map">
        <Suspense fallback={<div className="map-frame skeleton h-full" aria-hidden="true" />}>
          <GuideMap
            places={shown}
            statuses={app.statuses}
            activeId={activeId}
            onHover={setActiveId}
            onSelect={(id) => {
              setActiveId(id)
              setSheet(true)
              window.requestAnimationFrame(() => {
                document.getElementById(`collection-${id}`)?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
              })
            }}
          />
        </Suspense>
      </div>
    </main>
  )
}
