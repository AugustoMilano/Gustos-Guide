import { m, useReducedMotion } from 'framer-motion'
import { formatDay } from '../lib/day.ts'
import { readPosition } from '../lib/geo.ts'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { GuideEntryCard, GuideStrip } from '../components/GuideEntries.tsx'
import { PriceFilter } from '../components/PriceFilter.tsx'
import { ShareButton } from '../components/ShareButton.tsx'
import { StoryShareButton } from '../components/StoryShareButton.tsx'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { catalog, catalogPhase, ensureRegion, loadGuide, subscribeCatalog } from '../content/load.ts'
import { cityPath } from '../lib/city.ts'
import { cuisineMenuLabel } from '../lib/cuisine-label.ts'
import { useCityId } from '../lib/use-city.ts'
import { countPlaces, pageShareUrl, priceLabel } from '../lib/format.ts'
import { resolvedMembers } from '../lib/guide-members.ts'
import { rankByHouseScore } from '../lib/guide-rank.ts'
import { hasUnknownPrice, matchesPrice, type PriceChoice } from '../lib/price-filter.ts'
import { renderGuideStory } from '../lib/story-card.ts'
import { awardFor } from '../lib/top25.ts'
import { isPlaceOpen } from '../lib/hours.ts'
import { usePageMeta } from '../lib/meta.ts'
import { originCanonical } from '../lib/site.ts'
import { useApp } from '../state/AppState.tsx'
import type { Guide, Price, SlimPlace, VisitStatus } from '../types.ts'

/** Neighborhood lists that moved when East Bay became its own area. */
const GUIDE_MOVED: Record<string, string> = {
  'peninsula-fremont': 'east-bay',
  'peninsula-pleasanton': 'east-bay',
  'eastbay-berkeley': 'east-bay',
  'eastbay-fremont': 'east-bay',
  'eastbay-pleasanton': 'east-bay',
  'peninsula-half-moon-bay': 'peninsula',
  'peninsula-pacifica': 'peninsula',
  'peninsula-san-jose': 'peninsula',
  'peninsula-palo-alto': 'peninsula',
  'peninsula-santa-clara': 'peninsula',
  'northbay-corte-madera': 'north-bay',
  'northbay-larkspur': 'north-bay',
  'northbay-tiburon': 'north-bay',
  'northbay-sausalito': 'north-bay',
}

export function GuidePage() {
  const reduceMotion = useReducedMotion()
  const { slug = '' } = useParams()
  const urlCity = useCityId()
  useSyncExternalStore(subscribeCatalog, catalogPhase, catalogPhase)
  useEffect(() => { void ensureRegion(urlCity) }, [urlCity])
  const { statuses, setStatus, user, photos, friendScore, gustoScore } = useApp()
  const [guide, setGuide] = useState<Guide | null>(null)
  const [missing, setMissing] = useState(false)
  const [neighborhood, setNeighborhood] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [prices, setPrices] = useState<Price[]>([])
  const [unknownPrice, setUnknownPrice] = useState(false)
  const [tag, setTag] = useState('')
  const [openNow, setOpenNow] = useState(false)
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const [signInOpen, setSignInOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState<'guide' | 'score' | 'near'>('score')
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null)
  const [nearNote, setNearNote] = useState<string | null>(null)
  function sortNear() {
    setNearNote('Finding you…')
    readPosition().then((pos) => {
      setHere(pos)
      setSort('near')
      setNearNote(null)
    }, (error: Error) => setNearNote(error.message))
  }
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const onChange = () => setDesktop(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    let cancelled = false
    setGuide(null)
    setMissing(false)
    setNeighborhood('')
    setCuisine('')
    setPrices([])
    setUnknownPrice(false)
    setTag('')
    setOpenNow(false)
    setSort('score')
    void loadGuide(slug).then((next) => {
      if (cancelled) return
      if (!next) setMissing(true)
      else setGuide(next)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  usePageMeta(
    guide ? `${guide.title} · Gusto's Guide` : "Guide · Gusto's Guide",
    guide ? guide.title : 'A guide from Gusto.',
    guide ? `./og/guides/${guide.slug}.png` : './og/og.png',
    guide ? originCanonical(`/share/guide/${guide.slug}`) : undefined,
  )

  const loadedPlaces = catalog.places.length
  const rows = useMemo(() => {
    if (!guide) return []
    const placeIds = new Set(catalog.places.map((place) => place.id))
    return resolvedMembers(guide.entries, placeIds).map((entry, index) => ({
      entry,
      number: index + 1,
      place: catalog.places.find((place) => place.id === entry.placeId) as SlimPlace,
    }))
  }, [guide, loadedPlaces])

  const shown = rows.filter(({ place, entry }) => {
    if (neighborhood && place.neighborhood !== neighborhood) return false
    if (cuisine && !place.cuisine.includes(cuisine)) return false
    if (!matchesPrice(place, { prices, unknown: unknownPrice })) return false
    if (tag && !place.perfectFor.includes(tag) && entry.vibe !== tag) return false
    if (openNow && !isPlaceOpen(place)) return false
    return true
  })
  const byDistance = sort === 'near' && here
    ? shown.slice().sort((a, b) => milesBetween(here, a.place) - milesBetween(here, b.place))
    : shown
  const presented = sort === 'score'
    ? rankByHouseScore(byDistance, gustoScore)
    : byDistance.map((row) => ({ ...row, rank: null as number | null }))
  const ranked = presented.filter((row) => row.rank != null)
  const toVisit = presented.filter((row) => row.rank == null)
  const stripRows = presented.map(({ place, rank, entry }) => ({
    place,
    number: rank,
    score: gustoScore(place.id),
    vibe: entry.vibe,
  }))
  const summary = catalog.guides.find((item) => item.slug === slug)
  const movedSlug = GUIDE_MOVED[slug]
  const moved = movedSlug ? catalog.guides.find((item) => item.slug === movedSlug) : undefined
  if (moved?.city) {
    return <Navigate to={cityPath(`/guide/${moved.slug}`, moved.city)} replace />
  }
  if (summary?.city && summary.city !== urlCity) {
    return <Navigate to={cityPath(`/guide/${summary.slug}`, summary.city)} replace />
  }

  function clearFilters() {
    setNeighborhood('')
    setCuisine('')
    setPrices([])
    setUnknownPrice(false)
    setTag('')
    setOpenNow(false)
  }

  function onToggle(placeId: string, status: VisitStatus) {
    if (!user) setSignInOpen(true)
    else setStatus(placeId, status)
  }

  if (missing || (!guide && !summary)) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto min-h-dvh max-w-3xl px-4 pt-28 outline-none">
        <h1 className="font-serif text-5xl italic">That guide is not on the list.</h1>
        <Link to={cityPath('/guides')} className="btn mt-6">All guides</Link>
      </main>
    )
  }
  if (!guide) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto min-h-dvh max-w-6xl px-4 pt-20 outline-none" aria-busy="true">
        <p className="sr-only">Loading</p>
        <p className="text-xs font-bold tracking-[0.14em] uppercase">{summary?.group}</p>
        <h1 className="mt-1 font-serif text-4xl italic leading-none sm:text-5xl">{summary?.title}</h1>
        <div className="mt-4 flex gap-3 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton h-52 w-52 shrink-0 sm:w-60" />
          ))}
        </div>
      </main>
    )
  }

  const neighborhoods = [...new Set(rows.map((row) => row.place.neighborhood))].sort()
  const cuisines = [...new Set(rows.flatMap((row) => row.place.cuisine))].sort()
  const tags = [...new Set(rows.flatMap((row) => [row.entry.vibe, ...row.place.perfectFor].filter((item): item is string => Boolean(item))))].sort()
  const activeFilters = [
    neighborhood,
    cuisine,
    ...prices.map((item) => priceLabel(item)),
    unknownPrice ? 'No price' : '',
    tag,
    openNow ? 'Open now' : '',
  ].filter(Boolean)

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-20 pb-16 outline-none">
      <div>
        <AreaKicker />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Link to={cityPath('/guides')} className="inline-flex min-h-11 items-center text-sm font-bold">← All guides</Link>
          <div className="guide-tools flex flex-wrap items-center gap-2">
            <ShareButton title={guide.title} url={pageShareUrl(`/guide/${guide.slug}`)} />
            <StoryShareButton
              filename={`${guide.slug}-story.png`}
              title={guide.title}
              build={() => renderGuideStory({
                title: guide.title,
                items: rows.map(({ place }) => {
                  const award = awardFor(place.id, gustoScore)
                  return { name: place.name, neighborhood: place.neighborhood, score: gustoScore(place.id), metal: award?.metal ?? null }
                }),
              })}
            />
          </div>
        </div>
        <p className="mt-2 text-xs font-bold tracking-[0.14em] uppercase">{guide.group} · Updated {formatDay(guide.updatedAt)}</p>
        <h1 className="mt-1 font-serif text-4xl italic leading-none sm:text-5xl">{guide.title}</h1>
        <div className="city-switch sort-seg mt-3" role="group" aria-label="Sort this guide">
          {([['score', "Gusto's Score"], ['guide', 'Guide order'], ['near', 'Near me']] as [typeof sort, string][]).map(([id, label]) => (
            <button key={id} type="button" className="city-switch-btn" aria-pressed={sort === id} onClick={() => (id === 'near' ? sortNear() : setSort(id))}>
              {sort === id ? <m.span layoutId="sort-pill" className="city-switch-glint" transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }} /> : null}
              <span className="city-switch-label">{label}</span>
            </button>
          ))}
        </div>
            {nearNote ? <p className="mt-2 text-sm" role="status">{nearNote}</p> : null}
        <p className="mt-2 text-sm font-bold">{presented.length === rows.length ? countPlaces(rows.length) : `${presented.length} of ${countPlaces(rows.length)}`}</p>
        <div className="guide-filters guide-sticky mt-3 hidden lg:flex">
          <FilterFields
            neighborhoods={neighborhoods}
            cuisines={cuisines}
            tags={tags}
            neighborhood={neighborhood}
            cuisine={cuisine}
            prices={prices}
            unknownPrice={unknownPrice}
            showUnknown={hasUnknownPrice(rows.map((row) => row.place))}
            tag={tag}
            openNow={openNow}
            setNeighborhood={setNeighborhood}
            setCuisine={setCuisine}
            onPrice={(next) => { setPrices(next.prices); setUnknownPrice(next.unknown) }}
            setTag={setTag}
            setOpenNow={setOpenNow}
          />
        </div>
        <div className="guide-sticky mt-3 flex gap-2 lg:hidden">
          <button type="button" className="btn flex-1 text-sm" onClick={() => setFiltersOpen(true)}>
            Filters{activeFilters.length ? ` · ${activeFilters.length}` : ''}
          </button>
          <Link to={cityPath('/explore')} className="btn flex-1 text-sm">Map</Link>
        </div>
        {activeFilters.length && !desktop ? (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {activeFilters.map((item) => (
              <button
                key={item}
                type="button"
                className="chip shrink-0"
                onClick={() => {
                  if (item === neighborhood) setNeighborhood('')
                  else if (item === cuisine) setCuisine('')
                  else if (item === tag) setTag('')
                  else if (item === 'Open now') setOpenNow(false)
                  else if (item === 'No price') setUnknownPrice(false)
                  else setPrices((current) => current.filter((price) => priceLabel(price) !== item))
                }}
              >
                {item} ×
              </button>
            ))}
          </div>
        ) : null}
        {filtersOpen ? (
          <div className="fixed inset-0 z-50 flex items-end">
            <button type="button" className="absolute inset-0 bg-ink/50" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />
            <div className="bottom-sheet relative max-h-[85dvh] w-full overflow-auto border-t border-ink/10 bg-cream p-4">
              <h2 className="font-serif text-3xl italic">Filters</h2>
              <div className="guide-filters mt-3">
                <FilterFields
                  neighborhoods={neighborhoods}
                  cuisines={cuisines}
                  tags={tags}
                  neighborhood={neighborhood}
                  cuisine={cuisine}
                  prices={prices}
                  unknownPrice={unknownPrice}
                  showUnknown={hasUnknownPrice(rows.map((row) => row.place))}
                  tag={tag}
                  openNow={openNow}
                  setNeighborhood={setNeighborhood}
                  setCuisine={setCuisine}
                  onPrice={(next) => { setPrices(next.prices); setUnknownPrice(next.unknown) }}
                  setTag={setTag}
                  setOpenNow={setOpenNow}
                />
              </div>
              <button type="button" className="btn btn-coral mt-4 w-full" onClick={() => { if (presented.length === 0) clearFilters(); setFiltersOpen(false) }}>{presented.length === 0 ? 'Clear filters' : `Show ${presented.length}`}</button>
            </div>
          </div>
        ) : null}
        <div className="mt-4">
          <GuideStrip rows={stripRows} uploads={photos} statuses={statuses} onToggle={onToggle} />
        </div>
        <div className="mt-5 grid gap-8">
            {presented.length === 0 ? (
              <div className="border-t border-ink/10 pt-4">
                <p className="font-serif text-2xl italic">Nothing on this list matches.</p>
                <button type="button" className="btn mt-3" onClick={clearFilters}>Clear filters</button>
              </div>
            ) : null}
            {(sort === 'score' ? ranked : presented).map((row, index) => (
              <GuideEntryCard
                key={row.place.id}
                place={row.place}
                entry={row.entry}
                index={index}
                number={row.rank}
                uploads={photos}
                status={statuses[row.place.id]}
                friends={friendScore(row.place.id)}
                score={gustoScore(row.place.id)}
                signedIn={Boolean(user)}
                onToggle={(status) => onToggle(row.place.id, status)}
                onNeedSignIn={() => setSignInOpen(true)}
                hot={activeId === row.place.id}
                onPoint={setActiveId}
              />
            ))}
            {sort === 'score' && toVisit.length > 0 ? (
              <section aria-labelledby="yet-to-visit" className="yet-to-visit grid gap-8">
                <div className="yet-head">
                  <h2 id="yet-to-visit" className="font-serif text-3xl italic">Yet to visit</h2>
                  <p className="text-xs font-bold tracking-[0.14em] uppercase">Saved, not scored yet</p>
                </div>
                {toVisit.map((row, i) => (
                  <GuideEntryCard
                key={row.place.id}
                place={row.place}
                entry={row.entry}
                index={ranked.length + i}
                number={null}
                uploads={photos}
                status={statuses[row.place.id]}
                friends={friendScore(row.place.id)}
                score={gustoScore(row.place.id)}
                signedIn={Boolean(user)}
                onToggle={(status) => onToggle(row.place.id, status)}
                onNeedSignIn={() => setSignInOpen(true)}
                hot={activeId === row.place.id}
                onPoint={setActiveId}
              />
                ))}
              </section>
            ) : null}
        </div>
        <p className="mt-8"><Link className="btn" to={cityPath('/explore')}>Open the map</Link></p>
        <SignInSheet open={signInOpen} onClose={() => setSignInOpen(false)} />
      </div>
    </main>
  )
}

function FilterFields({
  neighborhoods,
  cuisines,
  tags,
  neighborhood,
  cuisine,
  prices,
  unknownPrice,
  showUnknown,
  tag,
  openNow,
  setNeighborhood,
  setCuisine,
  onPrice,
  setTag,
  setOpenNow,
}: {
  neighborhoods: string[]
  cuisines: string[]
  tags: string[]
  neighborhood: string
  cuisine: string
  prices: Price[]
  unknownPrice: boolean
  showUnknown: boolean
  tag: string
  openNow: boolean
  setNeighborhood: (value: string) => void
  setCuisine: (value: string) => void
  onPrice: (next: PriceChoice) => void
  setTag: (value: string) => void
  setOpenNow: (value: boolean | ((current: boolean) => boolean)) => void
}) {
  return (
    <>
      <select className={`filter-select${neighborhood ? ' is-set' : ''}`} value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} aria-label="Neighborhood">
        <option value="">All neighborhoods</option>
        {neighborhoods.map((item) => <option key={item}>{item}</option>)}
      </select>
      <select className={`filter-select${cuisine ? ' is-set' : ''}`} value={cuisine} onChange={(event) => setCuisine(event.target.value)} aria-label="Cuisine">
        <option value="">All cuisines</option>
        {cuisines.map((item) => <option key={item} value={item}>{cuisineMenuLabel(item, cuisines)}</option>)}
      </select>
      <PriceFilter choice={{ prices, unknown: unknownPrice }} showUnknown={showUnknown} onChange={onPrice} />
      <select className={`filter-select${tag ? ' is-set' : ''}`} value={tag} onChange={(event) => setTag(event.target.value)} aria-label="Perfect for">
        <option value="">Perfect for</option>
        {tags.map((item) => <option key={item}>{item}</option>)}
      </select>
      <button type="button" className={`btn text-sm ${openNow ? 'btn-navy' : ''}`} aria-pressed={openNow} onClick={() => setOpenNow((value) => !value)}>
        Open now
      </button>
    </>
  )
}

function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}
