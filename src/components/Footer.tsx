import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="site-footer on-navy mt-16 bg-navy text-cream">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-serif text-6xl italic leading-none sm:text-8xl">Go eat.</p>
          <p className="mt-4 max-w-md text-cream">
            Seattle, from the first coffee to the last stool.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.14em] uppercase">Around the guide</p>
          <ul className="mt-3 space-y-2">
            <li><Link to="/explore" className="font-serif text-2xl italic">Explore the map</Link></li>
            <li><Link to="/guides" className="font-serif text-2xl italic">All guides</Link></li>
            <li><Link to="/feed" className="font-serif text-2xl italic">Friend feed</Link></li>
            <li><Link to="/rank" className="font-serif text-2xl italic">Rank a place</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/20 px-4 py-4 text-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2">
          <p>House notes, still being eaten through.</p>
          <p>
            Maps © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://openfreemap.org">OpenFreeMap</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
