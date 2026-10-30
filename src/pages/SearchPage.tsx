import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { SmartResults } from '../components/SmartResults.tsx'
import { catalog } from '../content/load.ts'
import { areaPhrase, cityPath } from '../lib/city.ts'
import { milesBetween } from '../lib/format.ts'
import { readPosition } from '../lib/geo.ts'
import { usePageMeta } from '../lib/meta.ts'
import { clearRecent, readRecent } from '../lib/recent-search.ts'
import { smartSearch } from '../lib/smart-search.ts'
import { useApp } from '../state/AppState.tsx'
import { useCityCatalog } from '../lib/use-city.ts'

export function SearchPage() {
  const { city, places: cityPlaces } = useCityCatalog()
  const area = areaPhrase(city)
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [draft, setDraft] = useState(q)
  const [recents, setRecents] = useState(() => readRecent())
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState('')
  usePageMeta(q ? `${q} · Search · Gusto's Guide` : "Search · Gusto's Guide", `Search ${area} guides and places.`)

  useEffect(() => {
    setDraft(q)
  }, [q])

  const query = draft.trim()
  const { gustoScore } = useApp()
  const result = useMemo(() => {
    if (!query) return null
    const found = smartSearch(query, city, catalog.places, catalog.guides, gustoScore)
    if (!origin) return found
    const places = found.places
      .map((hit) => {
        const place = cityPlaces.find((item) => item.id === hit.id)
        if (!place) return hit
        return { ...hit, score: milesBetween(origin, place), why: `${hit.why} · ${milesBetween(origin, place).toFixed(1)} mi` }
      })
      .sort((a, b) => a.score - b.score)
    return { ...found, places }
  }, [gustoScore, query, city, origin, cityPlaces])

  function type(value: string) {
    setDraft(value)
    setParams(value ? { q: value } : {}, { replace: true })
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <AreaKicker />
      <h1 className="mt-2 font-serif text-5xl italic">Search {area}</h1>
      <form className="mt-4" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="field" htmlFor="page-search">
          <span>Guides and places</span>
          <input
            id="page-search"
            value={draft}
            autoComplete="off"
            onChange={(event) => type(event.target.value)}
          />
        </label>
      </form>
      {!query && recents.length ? (
        <section className="mt-4" aria-label="Recent searches">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-3xl italic">Recent</h2>
            <button
              type="button"
              className="btn"
              onClick={() => {
                clearRecent()
                setRecents([])
              }}
            >
              Clear
            </button>
          </div>
          <p className="mt-2 flex flex-wrap gap-2">
            {recents.map((item) => (
              <button key={item} type="button" className="chip" onClick={() => type(item)}>{item}</button>
            ))}
          </p>
        </section>
      ) : null}
      <button
        type="button"
        className="btn mt-3"
        onClick={() => {
          setError('')
          void readPosition().then(setOrigin).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Location unavailable.'))
        }}
      >
        Near me
      </button>
      {error ? <p className="mt-2 text-sm" role="alert">{error}</p> : null}
      {origin ? <p className="mt-2 text-sm">Sorting places by distance from you.</p> : null}
      {result ? <SmartResults query={query} result={result} /> : (
        <p className="mt-6">
          <Link className="btn" to={cityPath('/guides')}>Browse the guides</Link>
        </p>
      )}
    </main>
  )
}
