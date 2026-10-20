import { useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { catalog } from '../content/load.ts'
import { cityPath } from '../lib/city.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useCityCatalog } from '../lib/use-city.ts'
import type { GuideGroup } from '../types.ts'

const GROUPS: GuideGroup[] = ['Best of', 'Cuisine', 'Occasion', 'Neighborhoods', 'Drinks']

export function GuideIndexPage() {
  const reduceMotion = useReducedMotion()
  const { city, guides } = useCityCatalog()
  const east = city === 'eastside'
  const la = city === 'la'
  usePageMeta(
    "Guides · Gusto's Guide",
    la
      ? 'Los Angeles guides for Venice, Santa Monica, West Hollywood, Downtown, and a few cuisines.'
      : east
        ? 'Eastside guides for Bellevue, the Kirkland waterfront, Redmond, Issaquah, and Bothell.'
        : 'Seattle guides for pizza, neighborhoods, late nights, and the bars worth crossing town for.',
  )
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-24 pb-16 outline-none">
      <AreaKicker />
      <h1 className="mt-2 font-serif text-6xl italic">{la ? 'Los Angeles guides' : east ? 'Eastside guides' : 'Seattle guides'}</h1>
      <p className="mt-3 max-w-2xl">
        {la
          ? 'Venice, Santa Monica, West Hollywood, Beverly Hills, Downtown, and Hollywood.'
          : east
            ? 'Bellevue, Kirkland, Redmond, Issaquah, and Bothell.'
            : `Updated ${catalog.updatedAt}. Pizza, neighborhoods, late nights, and the bars worth crossing town for.`}
      </p>
      {GROUPS.map((group) => {
        const rows = guides.filter((guide) => guide.group === group)
        if (!rows.length) return null
        return (
        <section key={group} className="mt-10">
          <h2 className="font-serif text-4xl italic">{group}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {rows.map((guide, index) => (
              <Link
                key={guide.slug}
                to={cityPath(`/guide/${guide.slug}`)}
                className="guide-card rise-in"
                style={reduceMotion ? undefined : { animationDelay: `${Math.min(index, 6) * 40}ms` }}
                viewTransition={!reduceMotion}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <p className="text-xs font-bold tracking-[0.14em] uppercase">Updated {guide.updatedAt}</p>
                    <h3 className="mt-2 font-serif text-3xl italic leading-none">{guide.title}</h3>
                    <p className="mt-2 text-sm">{guide.dek}</p>
                  </span>
                  <span className="sticker shrink-0">{guide.count}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
        )
      })}
    </main>
  )
}
