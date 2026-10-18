import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PlaceCard } from '../components/PlaceCard.tsx'
import { placeMatchesQuery } from '../lib/filters.ts'
import { useGuide } from '../state/GuideContext.tsx'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const { places, cityById } = useGuide()

  useEffect(() => {
    document.title = query ? `Search “${query}” · Gusto's Guide` : "Search · Gusto's Guide"
  }, [query])

  const matches = useMemo(
    () =>
      places
        .filter((place) => placeMatchesQuery(place, cityById(place.cityId)?.name ?? '', query))
        .slice()
        .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name)),
    [places, cityById, query],
  )

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-24 pb-16 outline-none">
      <h1 className="font-serif text-5xl italic">Search</h1>
      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <label className="field max-w-xl">
          <span>Places, neighborhoods, dishes</span>
          <input
            value={query}
            onChange={(event) => {
              const next = event.target.value
              setParams(next ? { q: next } : {}, { replace: true })
            }}
          />
        </label>
      </form>
      {!query.trim() ? (
        <p className="mt-6 text-lg">Type a place, a neighborhood, or the dish you actually want.</p>
      ) : matches.length === 0 ? (
        <p className="mt-6 font-serif text-3xl italic">No places match “{query}”.</p>
      ) : (
        <>
          <p className="mt-6 font-bold">
            {matches.length} {matches.length === 1 ? 'place' : 'places'}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                showCity
                cityName={cityById(place.cityId)?.name}
              />
            ))}
          </div>
        </>
      )}
    </main>
  )
}
