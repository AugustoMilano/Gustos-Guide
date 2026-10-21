import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { GuideEntryCard, GuideStrip } from '../components/GuideEntries.tsx'
import { GuideMap } from '../components/GuideMap.tsx'
import { ShareButton } from '../components/ShareButton.tsx'
import { SlidingRow } from '../components/SlidingRow.tsx'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { catalog, loadGuide } from '../content/load.ts'
import { cityPath } from '../lib/city.ts'
import { pageShareUrl } from '../lib/format.ts'
import { isOpen } from '../lib/hours.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'
import type { Guide, SlimPlace, VisitStatus } from '../types.ts'

export function GuidePage() {
  const { slug = '' } = useParams()
  const { statuses, setStatus, user, photos, friendScore, gustoScore } = useApp()
  const [guide, setGuide] = useState<Guide | null>(null)
  const [missing, setMissing] = useState(false)
  const [pane, setPane] = useState<'list' | 'map'>('list')
  const [neighborhood, setNeighborhood] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [price, setPrice] = useState(0)
  const [tag, setTag] = useState('')
  const [openNow, setOpenNow] = useState(false)
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const [signInOpen, setSignInOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sort, setSort] = useState<'guide' | 'score'>('guide')

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
    setPrice(0)
    setTag('')
    setOpenNow(false)
    setSort('guide')
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
    guide?.dek ?? 'A Seattle guide from Gusto.',
    guide ? `./og/guides/${guide.slug}.svg` : './og/og.svg',
  )

  const rows = useMemo(() => {
    if (!guide) return []
    return guide.entries
      .map((entry, index) => ({ entry, number: index + 1, place: catalog.places.find((place) => place.id === entry.placeId) }))
      .filter((row): row is { entry: Guide['entries'][number]; number: number; place: SlimPlace } => Boolean(row.place))
  }, [guide])

  const shown = rows.filter(({ place, entry }) => {
    if (neighborhood && place.neighborhood !== neighborhood) return false
    if (cuisine && !place.cuisine.includes(cuisine)) return false
    if (price && place.price !== price) return false
    if (tag && !place.perfectFor.includes(tag) && entry.vibe !== tag) return false
    if (openNow && !isOpen(place.periods)) return false
    return true
  })
  const ordered = sort === 'guide' ? shown : shown.slice().sort((a, b) => {
    const left = gustoScore(a.place.id)
    const right = gustoScore(b.place.id)
    if (left == null && right == null) return a.number - b.number
    if (left == null) return 1
    if (right == null) return -1
    if (right !== left) return right - left
    return a.number - b.number
  })

  const summary = catalog.guides.find((item) => item.slug === slug)

  function onToggle(placeId: string, status: VisitStatus) {
    if (!user) setSignInOpen(true)
    else setStatus(placeId, status)
  }

  if (missing || (!guide && !summary)) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
        <h1 className="font-serif text-5xl italic">That guide is not on the list.</h1>
        <Link to={cityPath('/guides')} className="btn mt-6">All guides</Link>
      </main>
    )
  }
  if (!guide) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-20 outline-none">
        <p className="text-xs font-bold tracking-[0.14em] uppercase">{summary?.group}</p>
        <h1 className="mt-1 font-serif text-4xl italic leading-none sm:text-5xl">{summary?.title}</h1>
        <p className="mt-2 max-w-2xl font-serif text-xl italic">{summary?.dek}</p>
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
  const mobileMap = !desktop && pane === 'map'
  const activeFilters = [
    neighborhood,
    cuisine,
    price ? '$'.repeat(price) : '',
    tag,
    openNow ? 'Open now' : '',
  ].filter(Boolean)

  return (
    <main id="main" tabIndex={-1} className={desktop ? 'bleed-stage outline-none' : `mx-auto max-w-6xl px-4 outline-none ${mobileMap ? 'flex h-dvh max-h-dvh flex-col overflow-hidden pt-20 pb-3' : 'pt-20 pb-16'}`}>
      <div className={desktop ? 'bleed-copy' : mobileMap ? 'shrink-0' : undefined}>
        <AreaKicker />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Link to={cityPath('/guides')} className="inline-flex min-h-11 items-center text-sm font-bold">← All guides</Link>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold tracking-[0.14em] uppercase">{guide.group} · Updated {guide.updatedAt}</p>
            <ShareButton title={guide.title} url={pageShareUrl(`/guide/${guide.slug}`)} />
            <SlidingRow label="Sort this guide">
              <button type="button" className="sort-chip" aria-pressed={sort === 'guide'} onClick={() => setSort('guide')}>Guide order</button>
              <button type="button" className="sort-chip" aria-pressed={sort === 'score'} onClick={() => setSort('score')}>Gusto's Score</button>
            </SlidingRow>
          </div>
        </div>
        <h1 className="mt-1 font-serif text-4xl italic leading-none sm:text-5xl">{guide.title}</h1>
        {!mobileMap ? <p className="mt-2 line-clamp-1 max-w-2xl font-serif text-xl italic">{guide.dek}</p> : null}
        {!mobileMap ? (
          <details className="guide-note mt-2 max-w-2xl">
            <summary>About this guide</summary>
            {guide.intro.split('\n\n').map((paragraph) => <p key={paragraph.slice(0, 24)}>{paragraph}</p>)}
          </details>
        ) : null}
        <div className="mt-3 hidden gap-2 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))]">
          <FilterFields
            neighborhoods={neighborhoods}
            cuisines={cuisines}
            tags={tags}
            neighborhood={neighborhood}
            cuisine={cuisine}
            price={price}
            tag={tag}
            openNow={openNow}
            setNeighborhood={setNeighborhood}
            setCuisine={setCuisine}
            setPrice={setPrice}
            setTag={setTag}
            setOpenNow={setOpenNow}
          />
        </div>
        <div className="mt-3 flex gap-2 lg:hidden">
          <button type="button" className="btn flex-1 text-sm" onClick={() => setFiltersOpen(true)}>
            Filters{activeFilters.length ? ` · ${activeFilters.length}` : ''}
          </button>
          <div className="flex flex-1 gap-2" role="group" aria-label="List or map">
            <button type="button" className={`btn flex-1 text-sm ${pane === 'list' ? 'btn-navy' : ''}`} onClick={() => setPane('list')}>List</button>
            <button type="button" className={`btn flex-1 text-sm ${pane === 'map' ? 'btn-navy' : ''}`} onClick={() => setPane('map')}>Map</button>
          </div>
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
                  else setPrice(0)
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
            <div className="bottom-sheet relative max-h-[85dvh] w-full overflow-auto border-t-2 border-ink bg-cream p-4">
              <h2 className="font-serif text-3xl italic">Filters</h2>
              <div className="mt-3 grid gap-2">
                <FilterFields
                  neighborhoods={neighborhoods}
                  cuisines={cuisines}
                  tags={tags}
                  neighborhood={neighborhood}
                  cuisine={cuisine}
                  price={price}
                  tag={tag}
                  openNow={openNow}
                  setNeighborhood={setNeighborhood}
                  setCuisine={setCuisine}
                  setPrice={setPrice}
                  setTag={setTag}
                  setOpenNow={setOpenNow}
                />
              </div>
              <button type="button" className="btn btn-coral mt-4 w-full" onClick={() => setFiltersOpen(false)}>Show {shown.length}</button>
            </div>
          </div>
        ) : null}
        {!mobileMap ? (
          <div className="mt-4">
            <GuideStrip rows={ordered.map(({ place, number, entry }) => ({ place, number, score: gustoScore(place.id), vibe: entry.vibe }))} uploads={photos} statuses={statuses} onToggle={onToggle} />
          </div>
        ) : null}
        {!mobileMap ? (
          <div className="mt-5 grid gap-8">
            {ordered.length === 0 ? <p className="border-t-2 border-ink pt-4 font-serif text-2xl italic">Nothing on this list matches. Loosen a filter.</p> : null}
            {ordered.map(({ entry, place, number }, index) => (
              <GuideEntryCard
                key={place.id}
                place={place}
                entry={entry}
                index={index}
                number={number}
                uploads={photos}
                status={statuses[place.id]}
                friends={friendScore(place.id)}
                score={gustoScore(place.id)}
                signedIn={Boolean(user)}
                onToggle={(status) => onToggle(place.id, status)}
                onNeedSignIn={() => setSignInOpen(true)}
              />
            ))}
          </div>
        ) : null}
        <SignInSheet open={signInOpen} onClose={() => setSignInOpen(false)} />
      </div>
      <div className={desktop ? 'bleed-map' : mobileMap ? 'mt-3 min-h-0 flex-1' : 'hidden'}>
        {(desktop || pane === 'map') && <GuideMap places={ordered.map((row) => row.place)} statuses={statuses} />}
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
  price,
  tag,
  openNow,
  setNeighborhood,
  setCuisine,
  setPrice,
  setTag,
  setOpenNow,
}: {
  neighborhoods: string[]
  cuisines: string[]
  tags: string[]
  neighborhood: string
  cuisine: string
  price: number
  tag: string
  openNow: boolean
  setNeighborhood: (value: string) => void
  setCuisine: (value: string) => void
  setPrice: (value: number) => void
  setTag: (value: string) => void
  setOpenNow: (value: boolean | ((current: boolean) => boolean)) => void
}) {
  return (
    <>
      <select className="border-2 border-ink bg-cream px-2 py-2" value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} aria-label="Neighborhood">
        <option value="">All neighborhoods</option>
        {neighborhoods.map((item) => <option key={item}>{item}</option>)}
      </select>
      <select className="border-2 border-ink bg-cream px-2 py-2" value={cuisine} onChange={(event) => setCuisine(event.target.value)} aria-label="Cuisine">
        <option value="">All cuisines</option>
        {cuisines.map((item) => <option key={item}>{item}</option>)}
      </select>
      <select className="border-2 border-ink bg-cream px-2 py-2" value={price} onChange={(event) => setPrice(Number(event.target.value))} aria-label="Price">
        <option value={0}>Any price</option>
        <option value={1}>$</option>
        <option value={2}>$$</option>
        <option value={3}>$$$</option>
        <option value={4}>$$$$</option>
      </select>
      <select className="border-2 border-ink bg-cream px-2 py-2" value={tag} onChange={(event) => setTag(event.target.value)} aria-label="Perfect for">
        <option value="">Perfect for</option>
        {tags.map((item) => <option key={item}>{item}</option>)}
      </select>
      <button type="button" className={`btn text-sm ${openNow ? 'btn-navy' : ''}`} aria-pressed={openNow} onClick={() => setOpenNow((value) => !value)}>
        Open now
      </button>
    </>
  )
}
