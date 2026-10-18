import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="site-footer on-navy mt-16 bg-navy text-cream">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-serif text-6xl italic leading-none sm:text-8xl">Go eat.</p>
          <p className="mt-4 max-w-md text-cream">
            Seattle only, for now. House guides are Augusto's saved places. Scores stay blank until he ranks them.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.14em] uppercase">Around the guide</p>
          <ul className="mt-3 space-y-2">
            <li><Link to="/guides" className="font-serif text-2xl italic">All guides</Link></li>
            <li><Link to="/feed" className="font-serif text-2xl italic">Friend feed</Link></li>
            <li><Link to="/rank" className="font-serif text-2xl italic">Rank a place</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/20 px-4 py-4 text-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2">
          <p>Draft copy, marked for review.</p>
          <p>
            Maps © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://openfreemap.org">OpenFreeMap</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
