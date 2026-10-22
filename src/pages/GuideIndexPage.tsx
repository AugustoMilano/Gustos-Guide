import { useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { catalog } from '../content/load.ts'
import { cityPath } from '../lib/city.ts'
import { countPlaces } from '../lib/format.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useCityCatalog } from '../lib/use-city.ts'
import type { GuideGroup } from '../types.ts'

const GROUPS: GuideGroup[] = ['Best of', 'Cuisine', 'Occasion', 'Neighborhoods', 'Drinks']

function guideIndexTitle(city: string): string {
  if (city === 'la') return 'Los Angeles guides'
  if (city === 'peninsula') return 'Peninsula guides'
  if (city === 'eastbay') return 'East Bay guides'
  if (city === 'northbay') return 'North Bay guides'
  if (city === 'sandiego') return 'San Diego guides'
  if (city === 'sf') return 'San Francisco guides'
  if (city === 'eastside') return 'Eastside guides'
  return 'Seattle guides'
}

function guideIndexMeta(city: string): string {
  if (city === 'la') return 'Los Angeles guides for Venice, Santa Monica, West Hollywood, Downtown, and a few cuisines.'
  if (city === 'sf') return 'San Francisco guides, grouped by neighborhood and cuisine.'
  if (city === 'peninsula') return 'Peninsula and South Bay guides, grouped by city.'
  if (city === 'eastbay') return 'East Bay guides for Berkeley, Fremont, and Pleasanton.'
  if (city === 'northbay') return 'North Bay guides for Sausalito, Tiburon, Corte Madera, and Larkspur.'
  if (city === 'sandiego') return 'San Diego guides for Little Italy, Coronado, La Jolla, North Park, and East Village.'
  if (city === 'eastside') return 'Eastside guides for Bellevue, the Kirkland waterfront, Redmond, Issaquah, and Bothell.'
  return 'Seattle guides for pizza, neighborhoods, late nights, and the bars worth crossing town for.'
}

function guideIndexDek(city: string): string {
  if (city === 'la') return 'Venice, Santa Monica, West Hollywood, Beverly Hills, Downtown, and Hollywood.'
  if (city === 'sf') return 'Neighborhoods and cuisines from the San Francisco list.'
  if (city === 'peninsula') return 'Palo Alto, Santa Clara, San Jose, and the other cities on this list.'
  if (city === 'eastbay') return 'Berkeley, Fremont, and Pleasanton.'
  if (city === 'northbay') return 'Sausalito, Tiburon, Corte Madera, and Larkspur.'
  if (city === 'sandiego') return 'Little Italy, Coronado, La Jolla, North Park, and East Village.'
  if (city === 'eastside') return 'Bellevue, Kirkland, Redmond, Issaquah, and Bothell.'
  return `Updated ${catalog.updatedAt}. Pizza, neighborhoods, late nights, and the bars worth crossing town for.`
}

export function GuideIndexPage() {
  const reduceMotion = useReducedMotion()
  const { city, guides } = useCityCatalog()
  usePageMeta("Guides · Gusto's Guide", guideIndexMeta(city))
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-24 pb-16 outline-none">
      <AreaKicker />
      <h1 className="mt-2 font-serif text-6xl italic">{guideIndexTitle(city)}</h1>
      <p className="mt-3 max-w-2xl">{guideIndexDek(city)}</p>
      {GROUPS.map((group) => {
        const rows = guides.filter((guide) => guide.group === group)
        if (!rows.length) return null
        return (
        <section key={group} className="mt-10">
          <h2 className="font-serif text-4xl italic">{group}</h2>
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
