import { Link, Navigate, useParams } from 'react-router-dom'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { cityPath } from '../lib/city.ts'
import { groupEastsideCities } from '../lib/eastside-city.ts'
import { countPlaces } from '../lib/format.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useCityCatalog } from '../lib/use-city.ts'

/** Curated lists stay on their own routes. The city page does not use their membership. */
const CURATED: Record<string, { slug: string; title: string }> = {
  bellevue: { slug: 'bellevue', title: 'Bellevue Essentials' },
  kirkland: { slug: 'kirkland', title: 'Best of Kirkland' },
  redmond: { slug: 'redmond', title: 'Redmond' },
}

export function EastsideCityPage() {
  const { slug = '' } = useParams()
  const { city, places, ready } = useCityCatalog()
  const grouped = groupEastsideCities(places)
  const match = grouped.cities.find((item) => item.slug === slug)
  usePageMeta(match ? `${match.name} · Gusto's Guide` : 'City · Gusto\'s Guide', match ? `Every catalog place in ${match.name}.` : 'Eastside city')

  if (city !== 'eastside') return <Navigate to={cityPath('/guides', city)} replace />
  if (!ready) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-24 outline-none" aria-busy="true">
        <p className="sr-only">Loading</p>
      </main>
    )
  }
  if (!match) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
        <h1 className="font-serif text-5xl italic">That city is not on the list.</h1>
        <Link to={cityPath('/guides')} className="btn mt-6">All guides</Link>
      </main>
    )
  }
  const curated = CURATED[match.slug]

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-24 pb-16 outline-none">
      <AreaKicker />
      <Link to={cityPath('/guides')} className="mt-2 inline-flex min-h-11 items-center text-sm font-bold">← All guides</Link>
      <h1 className="mt-2 font-serif text-5xl italic">{match.name}</h1>
      <p className="mt-2 max-w-xl">Every catalog place with a {match.name} address.</p>
      <p className="mt-2 text-sm font-bold tabular-nums">{countPlaces(match.places.length)}</p>
      {curated ? (
        <p className="mt-3">
          <Link className="btn" to={cityPath(`/guide/${curated.slug}`)}>{curated.title}</Link>
        </p>
      ) : null}
      <ul className="card-grid mt-6" aria-label={`Places in ${match.name}`}>
        {match.places.map((place) => (
          <li key={place.id}>
            <Link to={cityPath(`/place/${place.id}`)} className="guide-card">
              <span className="font-serif text-2xl italic leading-tight">{place.name}</span>
              <span className="mt-1 text-xs font-bold tracking-wide uppercase">{place.neighborhood}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
