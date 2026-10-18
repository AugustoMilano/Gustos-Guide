import { Link } from 'react-router-dom'
import { SEED_GUIDES } from '../data/seed.ts'

export function Footer() {
  return (
    <footer className="site-footer on-navy mt-16 bg-navy text-cream">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-serif text-6xl italic leading-none sm:text-8xl">Go eat.</p>
          <p className="mt-4 max-w-md text-cream">
            Gusto's Guide is Augusto's field list: house rankings for Seattle, and private lists that stay in this
            browser until real accounts show up.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.14em] uppercase text-cream">House guides</p>
          <ul className="mt-3 space-y-2">
            {SEED_GUIDES.map((guide) => (
              <li key={guide.id}>
                <Link to={`/guide/${guide.slug}`} className="font-serif text-2xl italic">
                  {guide.title}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/my" className="font-serif text-2xl italic">
                My guides
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/20 px-4 py-4 text-sm text-cream">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2">
          <p>Seattle first. Los Angeles when the tacos are ready.</p>
          <p>Maps © OpenStreetMap contributors © CARTO</p>
        </div>
      </div>
    </footer>
  )
}
