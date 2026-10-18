import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ParticleHero } from '../components/ParticleHero.tsx'
import { catalog } from '../content/load.ts'
import { usePageMeta } from '../lib/meta.ts'
import type { GuideGroup } from '../types.ts'

const GROUPS: GuideGroup[] = ['Best of', 'Cuisine', 'Occasion', 'Neighborhoods', 'Drinks']

export function HomePage() {
  const progressRef = useRef(0)
  useEffect(() => {
    const onScroll = () => {
      progressRef.current = Math.min(1, window.scrollY / 420)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  usePageMeta("Gusto's Guide", 'Augusto’s Seattle restaurant guide: house lists, a map, and a place to rank what you have actually eaten.')
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <section className="hero on-navy">
        <ParticleHero progressRef={progressRef} />
        <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16">
          <p className="text-xs font-bold tracking-[0.16em] uppercase">Seattle</p>
          <p className="mt-4 max-w-xl text-lg text-cream">
            {catalog.placeCount} saved restaurants and bars. House guides you can read tonight. Scores when Augusto ranks them, not before.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/guides" className="btn btn-coral">Browse the guides</Link>
            <Link to="/search" className="btn">Search the list</Link>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-12">
        {GROUPS.map((group) => (
          <section key={group} className="mt-10">
            <h2 className="font-serif text-4xl italic">{group}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.guides.filter((guide) => guide.group === group).slice(0, group === 'Neighborhoods' ? 6 : 4).map((guide) => (
                <Link key={guide.slug} to={`/guide/${guide.slug}`} className="guide-card">
                  <p className="text-xs font-bold tracking-[0.14em] uppercase">{guide.count} places</p>
                  <h3 className="mt-2 font-serif text-3xl italic leading-none">{guide.title}</h3>
                  <p className="mt-2 text-sm">{guide.dek}</p>
                </Link>
              ))}
            </div>
            <Link to="/guides" className="mt-3 inline-block text-sm font-bold">All {group.toLowerCase()} guides</Link>
          </section>
        ))}
      </div>
    </main>
  )
}
