import { useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { cityPath } from '../lib/city.ts'
import { PlaceArt } from './PlaceArt.tsx'
import { PlaceThumb } from './PlaceThumb.tsx'
import { ThumbImg } from './ThumbImg.tsx'
import { Reveal } from './Reveal.tsx'
import { displayPhotos, type DisplayPhoto, type LivePhoto } from '../lib/gallery.ts'
import { responsivePhoto } from '../lib/responsivePhoto.ts'
import { ForkMark, GoldenFork } from './GoldenFork.tsx'
import { ScoreBadge } from './ScoreBadge.tsx'
import { MapLinks } from './MapLinks.tsx'
import { demoFriendsEnabled } from '../lib/demo.ts'
import { countPlaces, priceLabel, publicReference, yelpBizUrl } from '../lib/format.ts'
import { bounceMark } from '../lib/motion.ts'
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
    <span className={mini ? 'status-pair' : 'inline-flex gap-2'}>
      <button type="button" className={`btn status-mark ${size} ${status === 'togo' ? 'btn-coral' : ''}`} aria-pressed={status === 'togo'} onClick={(event) => { bounceMark(event); onToggle('togo') }}>
        To go
      </button>
      <button type="button" className={`btn status-mark ${size} ${status === 'been' ? 'btn-leaf' : ''}`} aria-pressed={status === 'been'} onClick={(event) => { bounceMark(event); onToggle('been') }}>
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
  rows: { place: SlimPlace; number: number | null; score: number | null; vibe?: string }[]
  uploads: LivePhoto[]
  statuses: Record<string, VisitStatus>
  onToggle: (placeId: string, status: VisitStatus) => void
}) {
  return (
    <section aria-label="In this guide" className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-2xl italic sm:text-3xl">In this guide</h2>
        <p className="text-xs font-bold tracking-[0.14em] uppercase">{countPlaces(rows.length)}</p>
      </div>
      <div className="strip-scroll mt-3 flex snap-x items-stretch gap-3 overflow-x-auto pb-3">
        {rows.map(({ place, number, score, vibe }, index) => {
          return (
            <article key={place.id} style={{ '--i': Math.min(index, 8) } as React.CSSProperties} className="stagger-in toc-card flex w-52 shrink-0 snap-start flex-col border-2 border-ink bg-[#fffaf3] sm:w-60">
              <a
                href={`#entry-${place.id}`}
                className="flex h-full min-w-0 flex-col"
                onClick={(event) => {
                  event.preventDefault()
                  scrollToEntry(place.id)
                }}
              >
                <div className="toc-shot relative h-24 overflow-hidden bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
                  <PlaceThumb place={place} uploads={uploads} eager={index < 2} sizes="208px" />
                  <RankMedal number={number} size="sm" className="absolute top-2 left-2 z-10" />
                  <GoldenFork placeId={place.id} overlay />
                </div>
                <div className="toc-pad flex flex-1 flex-col">
                  <div className="toc-badge">
                    <ScoreBadge score={score} size="sm" />
                  </div>
                  <h3 className="mt-2 line-clamp-2 min-h-[2.6rem] font-serif text-xl italic leading-tight">{number != null ? <span className="mr-1.5 text-coral not-italic">{number}</span> : null}{place.name}</h3>
                  <p className="mt-2 line-clamp-2 min-h-[2rem] text-xs font-bold tracking-wide uppercase">
                    {[place.neighborhood, place.cuisine[0], priceLabel(place.price)].filter(Boolean).join(' · ')}
                  </p>
                  {vibe || place.perfectFor[0] ? <span className={`tag mt-1.5 min-h-6 ${vibe ? 'tag-vibe' : ''}`}>{vibe ?? place.perfectFor[0]}</span> : null}
                </div>
              </a>
              <div className="toc-pad mt-auto pt-0">
                <StatusPills mini status={statuses[place.id]} onToggle={(status) => onToggle(place.id, status)} />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function GuideShotImg({
  url,
  alt,
  priority,
  onError,
}: {
  url: string
  alt: string
  priority: boolean
  onError: () => void
}) {
  const picture = responsivePhoto(url, '(min-width: 1024px) 40vw, calc(100vw - 2rem)')
  return (
    <picture>
      {picture.webpSrcSet ? <source type="image/webp" srcSet={picture.webpSrcSet} sizes={picture.sizes} /> : null}
      <img
        src={picture.src}
        srcSet={picture.srcSet}
        sizes={picture.sizes}
        width={picture.width}
        height={picture.height}
        alt={alt}
        className="h-full w-full object-cover"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        onError={onError}
      />
    </picture>
  )
}

function Shot({
  place,
  photo,
  tall,
  priority = false,
}: {
  place: SlimPlace
  photo: DisplayPhoto | undefined
  tall: boolean
  priority?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const shotUrl = photo?.url
  const art = photo?.illustration || !shotUrl || failed
  return (
    <figure className="min-w-0">
      <div className={`guide-shot relative overflow-hidden border-2 border-ink bg-navy ${tall ? 'h-72 sm:h-96' : 'h-64 sm:h-80'} [&_.place-art]:aspect-auto [&_.place-art]:h-full`}>
        {art || !photo || !shotUrl ? (
          <PlaceArt id={place.id} cuisine={place.cuisine[0] ?? 'Seattle'} neighborhood={place.neighborhood} />
        ) : (
          <GuideShotImg url={shotUrl} alt={photo.alt} priority={priority} onError={() => setFailed(true)} />
        )}
      </div>
      <figcaption className="border-x-2 border-b-2 border-ink bg-[#fffaf3] px-2 py-1 text-xs font-bold">
        {!art && photo?.caption ? `${photo.caption} · ` : null}
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
  score,
  onToggle,
  onNeedSignIn,
  signedIn,
  hot = false,
  onPoint,
}: {
  place: SlimPlace
  entry: GuideEntry
  index: number
  number: number | null
  uploads: LivePhoto[]
  status?: VisitStatus
  friends: { average: number | null; loved: number; count: number; demo?: boolean }
  score: number | null
  onToggle: (status: VisitStatus) => void
  onNeedSignIn: () => void
  signedIn: boolean
  hot?: boolean
  onPoint?: (id: string | null) => void
}) {
  const reduceMotion = useReducedMotion()
  const shots = displayPhotos(place, uploads)
  const reference = publicReference(place)
  const [active, setActive] = useState(0)
  const photo = shots[Math.min(active, shots.length - 1)]
  const artOnly = !photo?.url || photo.illustration
  const layout = index % 3
  const image = (
    <div className="relative min-w-0">
      <RankMedal number={number} size="md" className="absolute top-3 left-3 z-10" />
      <Link to={cityPath(`/place/${place.id}`)} className="block" aria-label={place.name} viewTransition={!reduceMotion}>
        <span className="block" style={reduceMotion ? undefined : { viewTransitionName: `place-${place.id}` }}>
          <Shot place={place} photo={photo} tall={layout === 0} priority={index === 0} />
        </span>
      </Link>
      {shots.length > 1 ? (
        <div className="absolute right-3 bottom-10 flex gap-1">
          {shots.slice(0, 4).map((shot, shotIndex) => (
            <button
              key={shot.key}
              type="button"
              className={`h-11 min-h-11 w-16 min-w-11 overflow-hidden border-2 ${shotIndex === active ? 'border-coral' : 'border-ink'} bg-cream`}
              onClick={() => setActive(shotIndex)}
              aria-label={`Photo ${shotIndex + 1} of ${place.name}`}
            >
              {shot.url && !shot.illustration ? <ThumbImg url={shot.url} /> : <span className="text-[10px] font-bold">Art</span>}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
  const splitTitle = !artOnly && layout !== 0
  const title = (
    <div className="min-w-0">
      <div className="entry-head">
        <h3 className={`max-w-full font-serif italic text-balance leading-[1.15] ${splitTitle ? 'text-3xl sm:text-4xl' : 'text-3xl sm:text-4xl lg:text-5xl'}`}>
          {number != null ? <span className="rank-slot text-coral not-italic">{number}</span> : null}
          <Link to={cityPath(`/place/${place.id}`)} viewTransition={!reduceMotion}>{place.name}</Link>
        </h3>
        <span className="score-col">
          <ScoreBadge score={score} size="sm" />
          <GoldenFork placeId={place.id} size="sm" />
        </span>
      </div>
      <p className="mt-3 text-sm font-bold tracking-wide uppercase">
        {[place.cuisine.join(' · '), place.neighborhood, priceLabel(place.price), place.closed ? 'Closed' : ''].filter(Boolean).join(' · ')}
      </p>
    </div>
  )
  const rest = (
    <div className="min-w-0">
      {entry.pullQuote ? (
      <blockquote className={`entry-quote mt-4 ${layout === 1 ? 'border-l-4 border-coral pl-4' : 'border-2 border-ink bg-[#fffaf3] px-4 py-3'}`}>
        “{entry.pullQuote}”
      </blockquote>
      ) : null}
      {entry.blurb !== entry.pullQuote ? <p className="mt-4 max-w-2xl text-lg leading-relaxed">{entry.blurb}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {entry.vibe ? <span className="tag tag-vibe">{entry.vibe}</span> : null}
        {place.perfectFor.map((tag) => <span key={tag} className="tag">{tag}</span>)}
      </div>
      {reference ? <p className="public-ref mt-3">{reference}</p> : null}
      {signedIn && friends.count ? (
        <p className="text-sm text-ink/70">
          {demoFriendsEnabled && friends.demo ? 'Seeded friends · ' : ''}
          {friends.loved ? `${friends.loved} ${friends.loved === 1 ? 'friend loved' : 'friends loved'} this. ` : ''}
          Friend score {friends.average == null ? '' : friends.average.toFixed(1)}.
        </p>
      ) : null}
      <div className="action-row mt-4">
        {place.website ? <a className="btn text-sm" href={place.website}>Website</a> : null}
        {place.yelpSlug ? <a className="btn text-sm" href={yelpBizUrl(place.yelpSlug)}>Yelp</a> : null}
        <MapLinks place={place} />
        {place.phone ? <a className="btn text-sm" href={`tel:${place.phone}`}>Call</a> : null}
        <button type="button" className={`btn status-mark text-sm ${status === 'togo' ? 'btn-coral' : ''}`} aria-pressed={status === 'togo'} onClick={(event) => { if (!signedIn) { onNeedSignIn(); return } bounceMark(event); onToggle('togo') }}>To go</button>
        <button type="button" className={`btn status-mark text-sm ${status === 'been' ? 'btn-leaf' : ''}`} aria-pressed={status === 'been'} onClick={(event) => { if (!signedIn) { onNeedSignIn(); return } bounceMark(event); onToggle('been') }}>Been</button>
      </div>
    </div>
  )
  const copy = (
    <div className="min-w-0">
      {title}
      {rest}
    </div>
  )
  const point = {
    onMouseEnter: () => onPoint?.(place.id),
    onMouseLeave: () => onPoint?.(null),
    onFocus: () => onPoint?.(place.id),
    onBlur: () => onPoint?.(null),
  }
  const hotClass = hot ? ' is-hot' : ''
  const compact = (
    <article id={`entry-${place.id}`} className={`guide-entry scroll-mt-24 border-t-2 border-ink${hotClass}`} {...point}>
      {title}
      <div className="mt-3 flex items-start gap-3">
        <figure className="w-24 shrink-0">
          <Link to={cityPath(`/place/${place.id}`)} className="block" aria-label={place.name} viewTransition={!reduceMotion}>
            <div className="h-24 w-24 overflow-hidden border-2 border-ink bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
              <PlaceArt id={place.id} cuisine={place.cuisine[0] ?? 'Seattle'} neighborhood={place.neighborhood} />
            </div>
          </Link>
          <figcaption className="mt-1 text-[10px] font-bold tracking-wide uppercase">Illustration</figcaption>
        </figure>
        {entry.pullQuote ? <blockquote className="entry-quote min-w-0 flex-1 border-l-4 border-coral pl-3">“{entry.pullQuote}”</blockquote> : null}
      </div>
      {entry.blurb !== entry.pullQuote ? <p className="mt-4 max-w-2xl text-lg leading-relaxed">{entry.blurb}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {entry.vibe ? <span className="tag tag-vibe">{entry.vibe}</span> : null}
        {place.perfectFor.map((tag) => <span key={tag} className="tag">{tag}</span>)}
      </div>
      {reference ? <p className="public-ref mt-3">{reference}</p> : null}
      {signedIn && friends.count ? (
        <p className="text-sm text-ink/70">
          {demoFriendsEnabled && friends.demo ? 'Seeded friends · ' : ''}
          {friends.loved ? `${friends.loved} ${friends.loved === 1 ? 'friend loved' : 'friends loved'} this. ` : ''}
          Friend score {friends.average == null ? '' : friends.average.toFixed(1)}.
        </p>
      ) : null}
      <div className="action-row mt-4">
        {place.website ? <a className="btn text-sm" href={place.website}>Website</a> : null}
        {place.yelpSlug ? <a className="btn text-sm" href={yelpBizUrl(place.yelpSlug)}>Yelp</a> : null}
        <MapLinks place={place} />
        {place.phone ? <a className="btn text-sm" href={`tel:${place.phone}`}>Call</a> : null}
        <button type="button" className={`btn status-mark text-sm ${status === 'togo' ? 'btn-coral' : ''}`} aria-pressed={status === 'togo'} onClick={(event) => { if (!signedIn) { onNeedSignIn(); return } bounceMark(event); onToggle('togo') }}>To go</button>
        <button type="button" className={`btn status-mark text-sm ${status === 'been' ? 'btn-leaf' : ''}`} aria-pressed={status === 'been'} onClick={(event) => { if (!signedIn) { onNeedSignIn(); return } bounceMark(event); onToggle('been') }}>Been</button>
      </div>
    </article>
  )
  const stagger = Math.min(index, 6) * 0.05
  if (artOnly) return index === 0 ? compact : <Reveal delay={stagger}>{compact}</Reveal>
  const body = layout === 0 ? (
    <article id={`entry-${place.id}`} className={`guide-entry scroll-mt-24 border-t-2 border-ink${hotClass}`} {...point}>
      {title}
      <div className="mt-4">{image}</div>
      {rest}
    </article>
  ) : (
    <article
      id={`entry-${place.id}`}
      className={`guide-entry scroll-mt-24 grid gap-4 border-t-2 border-ink md:grid-cols-2 md:items-center md:gap-6${hotClass}`}
      {...point}
    >
      {layout === 2 ? copy : image}
      {layout === 2 ? image : copy}
    </article>
  )
  if (index === 0) return body
  return <Reveal delay={stagger}>{body}</Reveal>
}

const MEDALS = ['gold', 'silver', 'bronze'] as const

/** Gold, silver and bronze medal for guide ranks 1 to 3; ranks 4 and below rely on the plain number in the title. */
function RankMedal({ number, size, className }: { number: number | null; size: 'sm' | 'md'; className: string }) {
  if (number == null || number > 3) return null
  return (
    <span className={className}>
      <ForkMark metal={MEDALS[number - 1]} rank={number} gem={number === 1} size={size} caption="" label={`Number ${number} in this guide`} />
    </span>
  )
}
