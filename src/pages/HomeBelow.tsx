import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { PlanCard } from '../components/PlanSheet.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { Reveal } from '../components/Reveal.tsx'
import { GoldenFork } from '../components/GoldenFork.tsx'
import { ScoreBadge } from '../components/ScoreBadge.tsx'
import { slimById } from '../content/load.ts'
import { cityPath, type CityId } from '../lib/city.ts'
import { useCityCatalog } from '../lib/use-city.ts'
import { homeHitList, RIGHT_NOW_FALLBACK } from '../lib/photo-queue.ts'
import { hoursPhrase, isOpen } from '../lib/hours.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'
import type { GuideGroup, SlimPlace } from '../types.ts'

const GuideMap = lazy(() => import('../components/GuideMap.tsx').then((module) => ({ default: module.GuideMap })))

function MapWhenVisible({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setShow(true)
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShow(true)
        observer.disconnect()
      }
    }, { rootMargin: '240px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} className="h-full">
      {show ? children : <div className="map-frame skeleton h-full" aria-busy="true"><span className="sr-only">Loading map</span></div>}
    </div>
  )
}

const GROUPS: GuideGroup[] = ['Best of', 'Cuisine', 'Occasion', 'Neighborhoods', 'Drinks']
const FEATURED = ['best-pizza', 'date-night', 'capitol-hill', 'cheap-eats', 'cocktail-bars', 'fun-dive-bars', 'seafood', 'brunch', 'ballard']

const OCCASIONS = ['date-night', 'cheap-eats', 'brunch', 'late-night', 'happy-hour', 'fun-dive-bars', 'bring-the-parents']

function diverse(places: SlimPlace[], limit: number): SlimPlace[] {
  const picked: SlimPlace[] = []
  const hoods = new Set<string>()
  const ranked = places.slice().sort((a, b) => {
    const left = a.publicRating?.source === 'Yelp' ? a.publicRating.value : 0
    const right = b.publicRating?.source === 'Yelp' ? b.publicRating.value : 0
    return right - left
  })
  for (const place of ranked) {
    if (hoods.has(place.neighborhood)) continue
    hoods.add(place.neighborhood)
    picked.push(place)
    if (picked.length === limit) break
  }
  return picked
}

function whyNow(place: SlimPlace): string {
  const phrase = hoursPhrase(place.periods)
  if (phrase?.startsWith('Open now · until ')) {
    return `Open till ${phrase.slice('Open now · until '.length)} · ${place.neighborhood}`
  }
  return `${place.neighborhood} · ${place.cuisine[0]}`
}

function rightNow(city: CityId, places: SlimPlace[]): { places: SlimPlace[]; open: boolean } {
  const open = diverse(places.filter((place) => isOpen(place.periods)), 6)
  if (open.length >= 3) return { places: open, open: true }
  if (city !== 'seattle') return { places: diverse(places, 6), open: false }
  const editorial = RIGHT_NOW_FALLBACK.map((id) => slimById(id)).filter((place): place is SlimPlace => place != null)
  return { places: editorial, open: false }
}

export function HomeBelow() {
  const { city, places, guides } = useCityCatalog()
  const east = city === 'eastside'
  const la = city === 'la'
  usePageMeta(
    "Gusto's Guide",
    la
      ? 'Eat across Los Angeles: Venice, Santa Monica, West Hollywood, Downtown, and the rooms on the list.'
      : east
        ? 'Eat across the Eastside: Bellevue, Kirkland, Redmond, Issaquah, and Bothell.'
        : 'Eat your way through Seattle: pizza, oysters, coffee, neighborhood dinners, and the bars worth the hill.',
    './og/og.svg',
  )
  const app = useApp()
  const reduceMotion = useReducedMotion()
  const { photos } = app
  const featuredSlugs = la
    ? ['santa-monica', 'venice', 'west-hollywood', 'beverly-hills', 'downtown-la', 'hollywood', 'la-sushi', 'la-date-night']
    : east
      ? ['best-of-bellevue', 'kirkland-waterfront', 'best-of-kirkland', 'redmond', 'issaquah', 'bothell']
      : FEATURED
  const occasionSlugs = la
    ? ['la-date-night', 'la-sushi', 'la-italian', 'la-mexican', 'la-coffee-bakeries', 'santa-monica']
    : east
      ? featuredSlugs
      : OCCASIONS
  const featured = featuredSlugs.map((slug) => guides.find((guide) => guide.slug === slug)).filter((guide) => guide != null)
  const occasions = occasionSlugs.map((slug) => guides.find((guide) => guide.slug === slug)).filter((guide) => guide != null)
  const hits = east || la ? places : homeHitList(places)
  const now = rightNow(city, places)
  const hoodPins = diverse(places, 18)
  const neighborhoods = guides.filter((guide) => guide.group === 'Neighborhoods').slice(0, 8)
  const toGo = Object.values(app.statuses).filter((status) => status === 'togo').length
  const recent = Object.entries(app.scores)
    .map(([id, score]) => ({ place: slimById(id), score: score.score }))
    .filter((row) => row.place)
    .slice(0, 4)
  return (
    <>
      <motion.div
        key={city}
        className="mx-auto max-w-6xl px-4 py-10"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }}
      >
        <section aria-labelledby="right-now">
          <h2 id="right-now" className="font-serif text-4xl italic">Where to eat right now</h2>
          <p className="mt-2 max-w-xl">
            {now.open
              ? 'Open at this hour, spread across neighborhoods.'
              : "Editor's picks for the next time you are hungry. Nothing on the list is open at this hour, so these are not a live open-now claim."}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {now.places.map((place, index) => (
              <Reveal key={place.id} delay={Math.min(index, 6) * 0.04}>
              <Link to={cityPath(`/place/${place.id}`)} className="hit-card" viewTransition={!reduceMotion}>
                <div className="relative h-32 overflow-hidden bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full" style={reduceMotion ? undefined : { viewTransitionName: `place-${place.id}` }}>
                  <PlaceThumb place={place} uploads={photos} eager={index < 2} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
                  <GoldenFork placeId={place.id} overlay />
                </div>
                <div className="p-3">
                  <ScoreBadge score={app.gustoScore(place.id)} size="sm" />
                  <h3 className="mt-2 font-serif text-2xl italic leading-none">{place.name}</h3>
                  <p className="mt-2 text-sm">{whyNow(place)}</p>
                </div>
              </Link>
              </Reveal>
            ))}
          </div>
        </section>
        <section className="mt-10" aria-labelledby="occasions">
          <h2 id="occasions" className="font-serif text-4xl italic">{east || la ? 'Start here' : 'Guides by occasion'}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {occasions.map((guide, index) => (
              <Reveal key={guide.slug} delay={Math.min(index, 6) * 0.04}>
              <Link to={cityPath(`/guide/${guide.slug}`)} className="guide-card" viewTransition={!reduceMotion}>
                <p className="text-xs font-bold tracking-[0.14em] uppercase">{guide.count} places</p>
                <h3 className="mt-2 font-serif text-3xl italic leading-none">{guide.title}</h3>
                <p className="mt-2 text-sm">{guide.dek}</p>
              </Link>
              </Reveal>
            ))}
          </div>
        </section>
        {app.user ? (
          <section className="glass glass-dark mt-10 p-5" aria-labelledby={la ? 'your-la' : east ? 'your-eastside' : 'your-seattle'}>
            <h2 id={la ? 'your-la' : east ? 'your-eastside' : 'your-seattle'} className="font-serif text-4xl italic">{la ? 'Your Los Angeles' : east ? 'Your Eastside' : 'Your Seattle'}</h2>
            <p className="mt-2">{toGo} on your To go list.</p>
            <h3 className="mt-4 font-serif text-2xl italic">Recently rated</h3>
            {recent.length ? (
              <ul className="mt-2 space-y-2">
                {recent.map((row) => (
                  <li key={row.place!.id}>
                    <Link className="plan-tray-item" to={cityPath(`/place/${row.place!.id}`)} viewTransition={!reduceMotion}>
                      <span className="plan-tray-shot"><PlaceThumb place={row.place!} uploads={photos} sizes="72px" /></span>
                      <span className="min-w-0 flex-1 truncate font-bold">{row.place!.name}</span>
                      <span className="pr-3 font-serif text-2xl italic">{row.score.toFixed(1)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2">Nothing ranked yet. <Link className="font-bold text-cream underline" to={cityPath('/rank')}>Rank a place</Link> and it will land here.</p>}
            <h3 className="mt-4 font-serif text-2xl italic">Plans</h3>
            <ul className="mt-2 space-y-2">
              {app.plans.slice(0, 3).map((plan) => (
                <li key={plan.id}><PlanCard planId={plan.id} /></li>
              ))}
            </ul>
            <Link to={cityPath('/plans/wizard')} className="btn btn-coral mt-4">Plan dinner</Link>
          </section>
        ) : null}
        <section className="mt-10" aria-labelledby="hood-teaser">
          <div className="flex items-end justify-between gap-3">
            <h2 id="hood-teaser" className="font-serif text-4xl italic">{east ? 'Cities' : 'Neighborhoods'}</h2>
            <Link to={cityPath('/explore')} className="text-sm font-bold">Open the map</Link>
          </div>
          <p className="mt-2 max-w-xl">One pin per neighborhood. The full list, all {places.length} places, is on the explore map.</p>
          <div className="mt-4 h-80">
            <MapWhenVisible>
              <Suspense fallback={<div className="map-frame skeleton h-full" aria-busy="true"><span className="sr-only">Loading map</span></div>}>
                <GuideMap places={hoodPins} statuses={app.statuses} />
              </Suspense>
            </MapWhenVisible>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {neighborhoods.map((guide) => (
              <li key={guide.slug}><Link className="chip inline-flex items-center" to={cityPath(`/guide/${guide.slug}`)}>{guide.title}</Link></li>
            ))}
          </ul>
        </section>
        <section className="mt-10">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-serif text-4xl italic">Featured guides</h2>
            <Link to={cityPath('/guides')} className="text-sm font-bold">All guides</Link>
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {featured.map((guide) => (
              <Link key={guide.slug} to={cityPath(`/guide/${guide.slug}`)} className="guide-card w-72 shrink-0" viewTransition={!reduceMotion}>
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <p className="text-xs font-bold tracking-[0.14em] uppercase">{guide.group}</p>
                    <h3 className="mt-2 font-serif text-3xl italic leading-none">{guide.title}</h3>
                    <p className="mt-2 text-sm">{guide.dek}</p>
                  </span>
                  <span className="sticker shrink-0">{guide.count}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className="mt-10">
          <h2 className="font-serif text-4xl italic">{la ? 'The Los Angeles list' : east ? 'The Eastside list' : 'The hit list'}</h2>
          <p className="mt-2 max-w-xl">{la ? 'Every Los Angeles room on the guide so far.' : east ? 'Every Eastside room on the guide so far.' : 'The rooms people already cross town for, one neighborhood at a time.'}</p>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {hits.map((place) => (
              <Link key={place.id} to={cityPath(`/place/${place.id}`)} className="hit-card w-56 shrink-0" viewTransition={!reduceMotion}>
                <div className="h-28 overflow-hidden bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
                  <PlaceThumb place={place} uploads={photos} sizes="224px" />
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold tracking-[0.14em] uppercase">{place.neighborhood}</p>
                  <h3 className="mt-1 font-serif text-2xl italic leading-none">{place.name}</h3>
                  <p className="mt-2 text-sm">{place.cuisine[0]}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
        {GROUPS.map((group) => {
          const rows = guides.filter((guide) => guide.group === group).slice(0, group === 'Neighborhoods' ? 6 : 4)
          if (!rows.length) return null
          return (
          <section key={group} className="mt-10">
            <h2 className="font-serif text-4xl italic">{group}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((guide) => (
                <Link key={guide.slug} to={cityPath(`/guide/${guide.slug}`)} className="guide-card" viewTransition={!reduceMotion}>
                  <p className="text-xs font-bold tracking-[0.14em] uppercase">{guide.count} places</p>
                  <h3 className="mt-2 font-serif text-3xl italic leading-none">{guide.title}</h3>
                  <p className="mt-2 text-sm">{guide.dek}</p>
                </Link>
              ))}
            </div>
            <Link to={cityPath('/guides')} className="mt-3 inline-block text-sm font-bold">All {group.toLowerCase()} guides</Link>
          </section>
          )
        })}
      </motion.div>
    </>
  )
}
