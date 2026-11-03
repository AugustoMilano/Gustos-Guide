import { formatDay } from '../lib/day.ts'
import { useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { SmartResults } from '../components/SmartResults.tsx'
import { catalog } from '../content/load.ts'
import { cityPath } from '../lib/city.ts'
import { countPlaces } from '../lib/format.ts'
import { usePageMeta } from '../lib/meta.ts'
import { smartSearch } from '../lib/smart-search.ts'
import { useApp } from '../state/AppState.tsx'
import { useCityCatalog } from '../lib/use-city.ts'
import type { GuideGroup } from '../types.ts'

const GROUPS: GuideGroup[] = ['Best of', 'Cuisine', 'Occasion', 'Neighborhoods', 'Drinks']

const GROUP_LABEL: Record<GuideGroup, string> = {
  'Best of': 'Best of',
  Cuisine: 'Cuisines',
  Occasion: 'Occasions',
  Neighborhoods: 'Neighborhoods',
  Drinks: 'Drinks',
}

function guideIndexTitle(city: string): string {
  if (city === 'la') return 'Los Angeles guides'
  if (city === 'peninsula') return 'Peninsula guides'
  if (city === 'eastbay') return 'East Bay guides'
  if (city === 'northbay') return 'North Bay guides'
  if (city === 'sandiego') return 'San Diego guides'
  if (city === 'sf') return 'San Francisco guides'
  if (city === 'eastside') return 'Seattle’s Eastside guides'
  return 'Seattle guides'
}

function guideIndexMeta(city: string): string {
  if (city === 'la') return 'Los Angeles guides for Venice, Santa Monica, West Hollywood, Downtown, and a few cuisines.'
  if (city === 'sf') return 'San Francisco guides, grouped by neighborhood and cuisine.'
  if (city === 'peninsula') return 'Peninsula and South Bay guides, grouped by city.'
  if (city === 'eastbay') return 'East Bay guides for Berkeley, Fremont, and Pleasanton.'
  if (city === 'northbay') return 'North Bay guides for Sausalito, Tiburon, Corte Madera, and Larkspur.'
  if (city === 'sandiego') return 'San Diego guides for Little Italy, Coronado, La Jolla, North Park, and East Village.'
  if (city === 'eastside') return 'Eastside guides for Bellevue, the Kirkland waterfront, Redmond, and Issaquah.'
  return 'Seattle guides for pizza, neighborhoods, late nights, and the bars worth crossing town for.'
}

function guideIndexDek(city: string): string {
  if (city === 'la') return 'Venice, Santa Monica, West Hollywood, Beverly Hills, Downtown, and Hollywood.'
  if (city === 'sf') return 'Neighborhoods and cuisines from the San Francisco list.'
  if (city === 'peninsula') return 'Palo Alto, Santa Clara, San Jose, and the other cities on this list.'
  if (city === 'eastbay') return 'Berkeley, Fremont, and Pleasanton.'
  if (city === 'northbay') return 'Sausalito, Tiburon, Corte Madera, and Larkspur.'
  if (city === 'sandiego') return 'Little Italy, Coronado, La Jolla, North Park, and East Village.'
  if (city === 'eastside') return 'Bellevue, Kirkland, Redmond, and Issaquah.'
  return `Updated ${formatDay(catalog.updatedAt)}. Pizza, neighborhoods, late nights, and the bars worth crossing town for.`
}

export function GuideIndexPage() {
  const reduceMotion = useReducedMotion()
  const { city, guides } = useCityCatalog()
  const [draft, setDraft] = useState('')
  const [group, setGroup] = useState<GuideGroup | 'All'>('All')
  usePageMeta("Guides · Gusto's Guide", guideIndexMeta(city))
  const query = draft.trim()
  const { gustoScore } = useApp()
  const result = useMemo(() => {
    if (!query) return null
    const found = smartSearch(query, city, catalog.places, catalog.guides, gustoScore)
    if (group === 'All') return found
    return {
      ...found,
      guides: found.guides.filter((hit) => hit.group === group),
      suggestions: found.suggestions.filter((hit) => hit.group === group),
    }
  }, [query, city, group, gustoScore])
  const visibleGroups = GROUPS.filter((item) => guides.some((guide) => guide.group === item))

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-24 pb-16 outline-none">
      <AreaKicker />
      <h1 className="mt-2 font-serif text-6xl italic">{guideIndexTitle(city)}</h1>
      <p className="mt-3 max-w-2xl">{guideIndexDek(city)}</p>
      <form className="mt-6" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="field" htmlFor="guides-search">
          <span>Search these guides</span>
          <input
            id="guides-search"
            value={draft}
            autoComplete="off"
            placeholder="Date night, brunch, a neighborhood"
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
      </form>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Guide categories">
        <button type="button" className="chip" aria-pressed={group === 'All'} onClick={() => setGroup('All')}>All</button>
        {visibleGroups.map((item) => (
          <button key={item} type="button" className="chip" aria-pressed={group === item} onClick={() => setGroup(item)}>
            {GROUP_LABEL[item]}
          </button>
        ))}
      </div>
      {result ? <SmartResults query={query} result={result} /> : visibleGroups.filter((item) => group === 'All' || item === group).map((item) => {
        const rows = guides.filter((guide) => guide.group === item)
        return (
          <section key={item} className="mt-10">
            <h2 className="font-serif text-4xl italic">{GROUP_LABEL[item]}</h2>
            <div className="guide-index card-grid mt-4">
              {rows.map((guide, index) => (
                <Link
                  key={guide.slug}
                  to={cityPath(`/guide/${guide.slug}`)}
                  className="guide-card rise-in"
                  style={reduceMotion ? undefined : { animationDelay: `${Math.min(index, 6) * 40}ms` }}
                  viewTransition={!reduceMotion}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] tabular-nums">{countPlaces(guide.count)}</p>
                  <h3 className="mt-2 font-serif text-3xl italic">{guide.title}</h3>
                  {guide.dek ? <p className="mt-2 line-clamp-3 text-sm">{guide.dek}</p> : null}
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </main>
  )
}
