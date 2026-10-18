import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GuideHero } from '../components/GuideHero.tsx'
import { GuideMap } from '../components/GuideMap.tsx'
import { PhotoFrame } from '../components/PhotoFrame.tsx'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { catalog, loadGuide } from '../content/load.ts'
import { displayPhotos } from '../lib/gallery.ts'
import { isOpen } from '../lib/hours.ts'
import { priceLabel } from '../lib/format.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'
import type { Guide, SlimPlace } from '../types.ts'

export function GuidePage() {
  const { slug = '' } = useParams()
  const { statuses, setStatus, user, photos, friendScore } = useApp()
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
    void loadGuide(slug).then((next) => {
      if (cancelled) return
      if (!next) setMissing(true)
      else setGuide(next)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  usePageMeta(guide ? `${guide.title} · Gusto's Guide` : "Guide · Gusto's Guide", guide?.dek ?? 'A Seattle guide from Gusto.')

  const rows = useMemo(() => {
    if (!guide) return []
    return guide.entries
      .map((entry, index) => ({ entry, index, place: catalog.places.find((place) => place.id === entry.placeId) }))
      .filter((row): row is { entry: Guide['entries'][number]; index: number; place: SlimPlace } => Boolean(row.place))
  }, [guide])

  const shown = rows.filter(({ place }) => {
    if (neighborhood && place.neighborhood !== neighborhood) return false
    if (cuisine && !place.cuisine.includes(cuisine)) return false
    if (price && place.price !== price) return false
    if (tag && !place.perfectFor.includes(tag)) return false
    if (openNow && !isOpen(place.periods)) return false
    return true
  })

  const summary = catalog.guides.find((item) => item.slug === slug)

  if (missing || (!guide && !summary)) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
        <h1 className="font-serif text-5xl italic">That guide is not on the list.</h1>
        <Link to="/guides" className="btn mt-6">All guides</Link>
      </main>
    )
  }
  if (!guide) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-24 outline-none">
        <p className="text-xs font-bold tracking-[0.14em] uppercase">{summary?.group}</p>
        <h1 className="mt-1 font-serif text-5xl italic">{summary?.title}</h1>
        <p className="mt-3 max-w-2xl font-serif text-2xl italic">{summary?.dek}</p>
      </main>
    )
  }

  const neighborhoods = [...new Set(rows.map((row) => row.place.neighborhood))].sort()
  const cuisines = [...new Set(rows.flatMap((row) => row.place.cuisine))].sort()
  const tags = [...new Set(rows.flatMap((row) => row.place.perfectFor))].sort()
  const mobileMap = !desktop && pane === 'map'
  const activeFilters = [
    neighborhood,
    cuisine,
    price ? '$'.repeat(price) : '',
    tag,
    openNow ? 'Open now' : '',
  ].filter(Boolean)

  return (
    <main id="main" tabIndex={-1} className={`mx-auto max-w-6xl px-4 outline-none ${mobileMap ? 'flex h-dvh max-h-dvh flex-col overflow-hidden pt-20 pb-3' : 'pt-24 pb-16'}`}>
      <div className={mobileMap ? 'shrink-0' : undefined}>
        <Link to="/guides" className="text-sm font-bold">← All guides</Link>
        {!mobileMap ? <GuideHero title={guide.title} places={rows.map((row) => row.place)} uploads={photos} /> : <h1 className="mt-2 font-serif text-4xl italic">{guide.title}</h1>}
        <p className="mt-3 text-xs font-bold tracking-[0.14em] uppercase">{guide.group} · Updated {guide.updatedAt}</p>
        <p className="mt-2 max-w-2xl font-serif text-2xl italic">{guide.dek}</p>
        {!mobileMap ? guide.intro.split('\n\n').map((paragraph) => <p key={paragraph.slice(0, 24)} className="mt-3 max-w-2xl">{paragraph}</p>) : null}
        <nav className="mt-5" aria-label="On this page">
          <ol className="hidden list-none gap-x-8 lg:grid lg:grid-cols-3">
            {shown.map(({ place }, index) => (
              <li key={place.id} className="border-b border-ink/15 py-1.5">
                <a href={`#entry-${place.id}`} className="font-bold"><span className="mr-2 text-coral">{index + 1}</span>{place.name}</a>
              </li>
            ))}
          </ol>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
            {shown.map(({ place }, index) => (
              <a key={place.id} href={`#entry-${place.id}`} className="chip shrink-0 whitespace-nowrap">{index + 1}. {place.name}</a>
            ))}
          </div>
        </nav>
        <div className="mt-4 hidden gap-2 lg:grid lg:grid-cols-5">
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
        <div className="mt-4 lg:hidden">
          <button type="button" className="btn w-full" onClick={() => setFiltersOpen(true)}>
            Filters{activeFilters.length ? ` · ${activeFilters.length}` : ''}
          </button>
          {activeFilters.length ? (
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
        </div>
        {filtersOpen ? (
          <div className="fixed inset-0 z-50 flex items-end">
            <button type="button" className="absolute inset-0 bg-ink/50" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />
            <div className="relative max-h-[85dvh] w-full overflow-auto border-t-2 border-ink bg-cream p-4">
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
        <div className="mt-4 flex lg:hidden" role="group" aria-label="List or map">
          <button type="button" className={`btn flex-1 text-sm ${pane === 'list' ? 'btn-navy' : ''}`} onClick={() => setPane('list')}>List</button>
          <button type="button" className={`btn flex-1 border-l-0 text-sm ${pane === 'map' ? 'btn-navy' : ''}`} onClick={() => setPane('map')}>Map</button>
        </div>
      </div>
      <div className={mobileMap ? 'mt-3 grid min-h-0 flex-1' : 'mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]'}>
        <div className={pane === 'map' && !desktop ? 'hidden' : 'grid gap-8'}>
          {shown.map(({ entry, place }, index) => {
            const photo = displayPhotos(place, photos)[0]
            const friends = friendScore(place.id)
            return (
              <article key={place.id} id={`entry-${place.id}`} className="scroll-mt-24 border-t-2 border-ink pt-4">
                <PhotoFrame photo={photo} />
                <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-serif text-4xl italic">
                    {guide.ranked ? <span className="mr-2 text-xl not-italic">{index + 1}</span> : null}
                    <Link to={`/place/${place.id}`}>{place.name}</Link>
                  </h2>
                  <p className="score-pill">Not yet rated</p>
                </div>
                <p className="mt-1 text-sm font-bold uppercase tracking-wide">{place.cuisine.join(' · ')} · {place.neighborhood} · {priceLabel(place.price)}</p>
                <p className="mt-2 font-serif text-2xl italic">“{entry.pullQuote}”</p>
                <p className="mt-2 max-w-2xl">{entry.blurb}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {place.perfectFor.map((item) => <span key={item} className="tag">{item}</span>)}
                </div>
                {place.publicRating ? <p className="mt-2 text-sm">{place.publicRating.value.toFixed(1)} on {place.publicRating.source}</p> : null}
                {place.appleRating ? <p className="text-sm">Apple Maps {place.appleRating.percent}%</p> : null}
                {friends.count ? <p className="text-sm">{friends.loved ? `${friends.loved} ${friends.loved === 1 ? 'friend loved' : 'friends loved'} this. ` : ''}Friend score {friends.average} from {friends.count}.</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {place.website ? <a className="btn text-sm" href={place.website}>Website</a> : null}
                  <a className="btn text-sm" href={place.appleMapsUrl}>Directions</a>
                  {place.phone ? <a className="btn text-sm" href={`tel:${place.phone}`}>Call</a> : null}
                  <button type="button" className={`btn text-sm ${statuses[place.id] === 'togo' ? 'btn-coral' : ''}`} onClick={() => (user ? setStatus(place.id, 'togo') : setSignInOpen(true))}>To go</button>
                  <button type="button" className={`btn text-sm ${statuses[place.id] === 'been' ? 'btn-leaf' : ''}`} onClick={() => (user ? setStatus(place.id, 'been') : setSignInOpen(true))}>Been</button>
                </div>
                {!user ? <p className="mt-2 text-sm">Sign in to save or mark Been.</p> : null}
              </article>
            )
          })}
        </div>
        <div className={mobileMap ? 'h-full min-h-0' : `lg:sticky lg:top-20 lg:h-[calc(100dvh-5rem-1.5rem)] ${pane === 'list' ? 'hidden lg:block' : ''}`}>
          {(desktop || pane === 'map') && <GuideMap places={shown.map((row) => row.place)} statuses={statuses} />}
        </div>
      </div>
      <SignInSheet open={signInOpen} onClose={() => setSignInOpen(false)} />
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
