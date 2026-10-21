import { Link, useLocation } from 'react-router-dom'
import { cityPath, isCityPicker } from '../lib/city.ts'
import { useCityId } from '../lib/use-city-id.ts'

export function Footer() {
  const city = useCityId()
  const { pathname } = useLocation()
  const line = isCityPicker(pathname)
    ? 'Seattle and the Eastside, Los Angeles, or San Francisco.'
    : city === 'la'
    ? 'Los Angeles, from Abbot Kinney to the last stool on Sunset.'
    : city === 'sf'
      ? 'San Francisco and the Bay Area, from the places on this list.'
    : city === 'eastside'
      ? 'The Eastside, from Old Bellevue to the lake.'
      : 'Seattle, from the first coffee to the last stool.'
  return (
    <footer className="site-footer on-navy mt-16 bg-navy text-cream">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="font-serif text-6xl italic leading-none sm:text-8xl">Go eat.</p>
          <p className="mt-4 max-w-md text-cream">
            {line}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.14em] uppercase">Around the guide</p>
          <ul className="mt-3 space-y-2">
            <li><Link to={cityPath('/explore')} className="font-serif text-2xl italic">Explore the map</Link></li>
            <li><Link to={cityPath('/guides')} className="font-serif text-2xl italic">All guides</Link></li>
            <li><Link to={cityPath('/tonight')} className="font-serif text-2xl italic">Tonight</Link></li>
            <li><Link to={cityPath('/feed')} className="font-serif text-2xl italic">Friend feed</Link></li>
            <li><Link to={cityPath('/rank')} className="font-serif text-2xl italic">Rank a place</Link></li>
            <li><Link to="/cities" className="font-serif text-2xl italic">Choose a city</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/20 px-4 py-4 text-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2">
          <p>House notes, still being eaten through.</p>
          <p className="flex flex-wrap gap-x-4">
            <a href="/terms/">Terms</a>
            <a href="/privacy/">Privacy</a>
          </p>
          <p>
            Maps © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://openfreemap.org">OpenFreeMap</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
