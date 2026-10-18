import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PlaceArt } from './PlaceArt.tsx'
import { PlaceThumb } from './PlaceThumb.tsx'
import { Reveal } from './Reveal.tsx'
import { displayPhotos, type DisplayPhoto, type LivePhoto } from '../lib/gallery.ts'
import { priceLabel } from '../lib/format.ts'
import type { GuideEntry, SlimPlace, VisitStatus } from '../types.ts'

function scrollToEntry(placeId: string) {
  const node = document.getElementById(`entry-${placeId}`)
  if (!node) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

function StatusPills({
  status,
  onToggle,
  mini = false,
}: {
  status?: VisitStatus
  onToggle: (next: VisitStatus) => void
  mini?: boolean
}) {
  const size = mini ? 'btn-mini' : 'text-sm'
  return (
    <span className="inline-flex">
      <button type="button" className={`btn ${size} ${status === 'togo' ? 'btn-coral' : ''}`} aria-pressed={status === 'togo'} onClick={() => onToggle('togo')}>
        To go
      </button>
      <button type="button" className={`btn border-l-0 ${size} ${status === 'been' ? 'btn-leaf' : ''}`} aria-pressed={status === 'been'} onClick={() => onToggle('been')}>
        Been
      </button>
    </span>
  )
}

export function GuideStrip({
  rows,
  uploads,
  statuses,
  onToggle,
}: {
  rows: { place: SlimPlace; number: number }[]
  uploads: LivePhoto[]
  statuses: Record<string, VisitStatus>
  onToggle: (placeId: string, status: VisitStatus) => void
}) {
  return (
    <section aria-label="In this guide" className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-2xl italic sm:text-3xl">In this guide</h2>
        <p className="text-xs font-bold tracking-[0.14em] uppercase">{rows.length} places</p>
      </div>
      <div className="strip-scroll mt-3 flex snap-x gap-3 overflow-x-auto pb-3">
        {rows.map(({ place, number }, index) => (
          <article key={place.id} className="toc-card flex w-52 shrink-0 snap-start flex-col border-2 border-ink bg-[#fffaf3] sm:w-60">
            <a
              href={`#entry-${place.id}`}
              className="block min-w-0 flex-1"
              onClick={(event) => {
                event.preventDefault()
                scrollToEntry(place.id)
              }}
            >
              <div className="toc-shot relative h-20 overflow-hidden bg-navy sm:h-24 [&_.place-art]:aspect-auto [&_.place-art]:h-full">
                <PlaceThumb place={place} uploads={uploads} eager={index < 6} />
                <span className="absolute top-2 left-2 grid h-8 min-w-8 -rotate-6 place-items-center border-2 border-ink bg-coral px-1 text-sm font-bold shadow-[2px_2px_0_#181818]">{number}</span>
              </div>
              <div className="p-2.5">
                <h3 className="line-clamp-2 font-serif text-xl italic leading-none">{place.name}</h3>
                <p className="mt-1.5 text-[11px] font-bold tracking-wide uppercase">
                  {place.neighborhood} · {place.cuisine[0]} · {priceLabel(place.price)}
                </p>
                {place.perfectFor[0] ? <span className="tag mt-2">{place.perfectFor[0]}</span> : null}
              </div>
            </a>
            <div className="mt-auto px-3 pb-3">
              <StatusPills mini status={statuses[place.id]} onToggle={(status) => onToggle(place.id, status)} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Shot({
  place,
  photo,
  tall,
}: {
  place: SlimPlace
  photo: DisplayPhoto | undefined
  tall: boolean
}) {
  const [failed, setFailed] = useState(false)
  const art = photo?.illustration || !photo?.url || failed
  return (
    <figure className="min-w-0">
      <div className={`guide-shot relative overflow-hidden border-2 border-ink bg-navy ${tall ? 'h-72 sm:h-96' : 'h-64 sm:h-80'} [&_.place-art]:aspect-auto [&_.place-art]:h-full`}>
        {art ? (
          <PlaceArt id={place.id} cuisine={place.cuisine[0] ?? 'Seattle'} neighborhood={place.neighborhood} />
        ) : (
          <img src={photo.url} alt={photo.alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />
        )}
      </div>
      <figcaption className="border-x-2 border-b-2 border-ink bg-[#fffaf3] px-2 py-1 text-xs font-bold">
        {art ? 'Illustration' : photo?.credit}
      </figcaption>
    </figure>
  )
}

export function GuideEntryCard({
  place,
  entry,
  index,
  number,
  uploads,
  status,
  friends,
  onToggle,
  onNeedSignIn,
  signedIn,
}: {
  place: SlimPlace
  entry: GuideEntry
  index: number
  number: number
  uploads: LivePhoto[]
  status?: VisitStatus
  friends: { average: number | null; loved: number; count: number }
  onToggle: (status: VisitStatus) => void
  onNeedSignIn: () => void
  signedIn: boolean
}) {
  const shots = displayPhotos(place, uploads)
  const [active, setActive] = useState(0)
  const photo = shots[Math.min(active, shots.length - 1)]
  const layout = index % 3
  const image = (
    <div className="relative min-w-0">
      <span className="absolute top-3 left-3 z-10 grid h-12 min-w-12 -rotate-6 place-items-center border-2 border-ink bg-coral px-2 font-serif text-2xl italic shadow-[3px_3px_0_#181818]">{number}</span>
      <Shot place={place} photo={photo} tall={layout === 0} />
      {shots.length > 1 ? (
        <div className="absolute right-3 bottom-10 flex gap-1">
          {shots.slice(0, 4).map((shot, shotIndex) => (
            <button
              key={shot.key}
              type="button"
              className={`h-10 w-14 overflow-hidden border-2 ${shotIndex === active ? 'border-coral' : 'border-ink'} bg-cream`}
              onClick={() => setActive(shotIndex)}
              aria-label={`Photo ${shotIndex + 1} of ${place.name}`}
            >
              {shot.url && !shot.illustration ? <img src={shot.url} alt="" className="h-full w-full object-cover" /> : <span className="text-[10px] font-bold">Art</span>}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
  const title = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="max-w-full font-serif text-4xl leading-[0.9] italic [overflow-wrap:anywhere] sm:text-6xl">
          <span className="mr-2 text-coral not-italic">{number}</span>
          <Link to={`/place/${place.id}`}>{place.name}</Link>
        </h3>
        <p className="score-pill shrink-0">Not yet rated</p>
      </div>
      <p className="mt-3 text-sm font-bold tracking-wide uppercase">
        {place.cuisine.join(' · ')} · {place.neighborhood} · {priceLabel(place.price)}
      </p>
    </div>
  )
  const rest = (
    <div className="min-w-0">
      <blockquote className={`entry-quote mt-4 ${layout === 1 ? 'border-l-4 border-coral pl-4' : 'border-2 border-ink bg-[#fffaf3] px-4 py-3'}`}>
        “{entry.pullQuote}”
      </blockquote>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed">{entry.blurb}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {place.perfectFor.map((tag) => <span key={tag} className="tag">{tag}</span>)}
      </div>
      {place.publicRating ? <p className="mt-3 text-sm">{place.publicRating.value.toFixed(1)} on {place.publicRating.source}</p> : null}
      {place.appleRating ? <p className="text-sm">Apple Maps {place.appleRating.percent}%</p> : null}
      {friends.count ? <p className="text-sm">{friends.loved ? `${friends.loved} ${friends.loved === 1 ? 'friend loved' : 'friends loved'} this. ` : ''}Friend score {friends.average}.</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {place.website ? <a className="btn text-sm" href={place.website}>Website</a> : null}
        <a className="btn text-sm" href={place.appleMapsUrl}>Directions</a>
        {place.phone ? <a className="btn text-sm" href={`tel:${place.phone}`}>Call</a> : null}
        <button type="button" className={`btn text-sm ${status === 'togo' ? 'btn-coral' : ''}`} onClick={() => (signedIn ? onToggle('togo') : onNeedSignIn())}>To go</button>
        <button type="button" className={`btn text-sm ${status === 'been' ? 'btn-leaf' : ''}`} onClick={() => (signedIn ? onToggle('been') : onNeedSignIn())}>Been</button>
      </div>
    </div>
  )
  const copy = (
    <div className="min-w-0">
      {title}
      {rest}
    </div>
  )
  const body = layout === 0 ? (
    <article id={`entry-${place.id}`} className="guide-entry scroll-mt-24 border-t-2 border-ink pt-5">
      {title}
      <div className="mt-4">{image}</div>
      {rest}
    </article>
  ) : (
    <article
      id={`entry-${place.id}`}
      className="guide-entry scroll-mt-24 grid gap-4 border-t-2 border-ink pt-5 md:grid-cols-2 md:items-center md:gap-6"
    >
      {layout === 2 ? copy : image}
      {layout === 2 ? image : copy}
    </article>
  )
  if (index === 0) return body
  return <Reveal>{body}</Reveal>
}
