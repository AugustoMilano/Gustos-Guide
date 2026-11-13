import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NightBox } from '../components/NightBox.tsx'
import { SmartResults, featuredSlugs } from '../components/SmartResults.tsx'
import { catalog, ensureAllCities, ensureRegion } from '../content/load.ts'
import { areaName, cityPath, regionOf, type CityId } from '../lib/city.ts'
import { countPlaces } from '../lib/format.ts'
import { isPlaceOpen } from '../lib/hours.ts'
import { regionBoard } from '../lib/top25.ts'
import { usePageMeta } from '../lib/meta.ts'
import { nightExamples, nightPlaceholder, planTitle } from '../lib/night-plan.ts'
import { smartSearch } from '../lib/smart-search.ts'
import { useApp } from '../state/AppState.tsx'
import { useCityCatalog } from '../lib/use-city.ts'

function openNowLine(count: number): string {
  if (count === 0) return 'Nothing open right now'
  return `${count} ${count === 1 ? 'place' : 'places'} open now`
}

function topLine(count: number): string {
  return `${count} ranked by Gusto's Score`
}

function Chevron() {
  return (
    <svg className="home-shortcut-arrow" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function HomePage() {
  const { city, guides, places, ready, failed } = useCityCatalog()
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState<Partial<Record<CityId, string>>>({})
  const draft = drafts[city] ?? ''
  const setDraft = (value: string) => setDrafts((current) => ({ ...current, [city]: value }))
  const [night, setNight] = useState('')
  const title = planTitle()
  const examples = nightExamples(city)
  const placeholder = nightPlaceholder()
  // Per-city title and share card (C5); sub-areas use their region's card.
  usePageMeta(`${areaName(city)} · Gusto's Guide`, `${areaName(city)} restaurants and places.`, `./og/cities/${regionOf(city)}.png`)
  const query = draft.trim()
  const { gustoScore } = useApp()
  useEffect(() => { void ensureRegion(city) }, [city])
  useEffect(() => { if (query.length >= 4) void ensureAllCities() }, [query])
  // Same rule as the Tonight page: a place is open when its published hours say so right now.
  const openCount = useMemo(() => (ready ? places.filter((place) => isPlaceOpen(place)).length : 0), [places, ready])
  const topCount = useMemo(() => regionBoard(regionOf(city), gustoScore).shown.length, [city, gustoScore, catalog.places.length])
  const result = useMemo(
    () => (query && ready ? smartSearch(query, city, catalog.places, catalog.guides, gustoScore) : null),
    [query, city, ready, gustoScore, catalog.places.length],
  )
  const featured = featuredSlugs(city)
    .filter((slug) => slug === 'eastside-date-night' || !slug.includes('date-night'))
    .map((slug) => guides.find((guide) => guide.slug === slug))
    .filter((guide) => guide != null)
    .slice(0, 6)

  return (
    <main id="main" tabIndex={-1} className="home-main outline-none">
      <section className="hero on-navy relative overflow-hidden">
        <div className="hero-copy relative mx-auto max-w-6xl px-4 pt-28 pb-8 sm:pt-32">
          <h1 className="max-w-3xl font-serif text-5xl italic leading-[1.05] text-cream sm:text-6xl">{areaName(city)}</h1>
          <form className="mt-5" role="search" onSubmit={(event) => event.preventDefault()}>
            <label className="field home-search" htmlFor="home-search">
              <span className="text-cream">Search guides and places</span>
              <input
                id="home-search"
                className="glass-input w-full"
                value={draft}
                autoComplete="off"
                placeholder="Place or neighborhood"
                onChange={(event) => setDraft(event.target.value)}
              />
            </label>
          </form>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-16">
        {query && !ready ? (
          <div className="mt-6 grid gap-2" aria-hidden="true">
            <div className="skeleton home-pending" />
            <div className="skeleton home-pending" />
            <div className="skeleton home-pending" />
          </div>
        ) : result ? <SmartResults query={query} result={result} /> : (
          <>
            <section aria-labelledby="plan-night">
              <h2 id="plan-night" className="font-serif text-4xl italic">{title}</h2>
              <p className="mt-2 max-w-xl text-sm">Say what you want, or the stops in order. Picks stay inside this guide.</p>
              <div className="mt-4 max-w-xl">
                <NightBox
                  id="home-night"
                  value={night}
                  onChange={setNight}
                  examples={examples}
                  placeholder={placeholder}
                  onSubmit={(value) => {
                    const next = value.trim()
                    if (!next) return
                    navigate(cityPath(`/night?q=${encodeURIComponent(next)}`))
                  }}
                />
              </div>
            </section>
            <section className="mt-8" aria-labelledby="featured-guides">
              <h2 id="featured-guides" className="font-serif text-4xl italic">Featured guides</h2>
              {failed ? <p className="mt-4">The guide list didn't load. <button type="button" className="btn" onClick={() => window.location.reload()}>Try again</button></p> : null}
              <div className="home-featured mt-4">
                {!ready && !failed ? Array.from({ length: 6 }, (_, index) => <div key={index} className="skeleton" aria-hidden="true" />) : null}
                {featured.map((guide) => (
                  <Link key={guide.slug} to={cityPath(`/guide/${guide.slug}`)} className="guide-card">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] tabular-nums">{countPlaces(guide.count)}</p>
                    <h3 className="mt-2 font-serif text-3xl italic">{guide.title}</h3>
                  </Link>
                ))}
              </div>
            </section>
            <section className="home-shortcuts mt-6" aria-label="Tonight and Top 25">
              <Link to={cityPath('/tonight')} className="guide-card home-shortcut">
                <span className="home-shortcut-copy">
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">Open now</p>
                  <h2 className="mt-2 font-serif text-3xl italic">Tonight</h2>
                  {ready ? <p className="mt-2 text-sm tabular-nums">{openNowLine(openCount)}</p> : null}
                </span>
                <Chevron />
              </Link>
              <Link to={cityPath('/top')} className="guide-card home-shortcut">
                <span className="home-shortcut-copy">
                  <p className="text-xs font-bold uppercase tracking-[0.14em]">Ranked</p>
                  <h2 className="mt-2 font-serif text-3xl italic">Top 25</h2>
                  {topCount ? <p className="mt-2 text-sm tabular-nums">{topLine(topCount)}</p> : null}
                </span>
                <Chevron />
              </Link>
            </section>
            <p className="mt-8">
              <Link to={cityPath('/guides')} className="btn btn-coral">Browse all guides</Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
