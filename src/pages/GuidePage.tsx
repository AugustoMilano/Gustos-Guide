import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Modal } from '../components/Modal.tsx'
import { FilterBar } from '../components/FilterBar.tsx'
import { GuideMap } from '../components/GuideMap.tsx'
import { PlaceCard } from '../components/PlaceCard.tsx'
import {
  activeFilterCount,
  applyPill,
  emptyFilters,
  filterPlaces,
  ratingRanks,
  sortPlaces,
  statusCounts,
  type PlaceFilters,
  type SortKey,
  type StatusPill,
} from '../lib/filters.ts'
import { milesBetween, spotLabel } from '../lib/format.ts'
import { readPosition } from '../lib/geo.ts'
import { useGuide } from '../state/GuideContext.tsx'
import type { Place } from '../types.ts'

function useDesktopMap() {
  const query = '(min-width: 1024px)'
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return matches
}

export function GuidePage({
  slugOverride,
  idOverride,
}: {
  slugOverride?: string
  idOverride?: string
}) {
  const navigate = useNavigate()
  const params = useParams()
  const slug = slugOverride ?? params.slug
  const guideId = idOverride ?? params.guideId
  const {
    guideBySlug,
    guideById,
    placeById,
    cityById,
    places: allPlaces,
    statuses,
    user,
    requestSignIn,
    openSheet,
    renameGuide,
    deleteGuide,
    removePlaceFromGuide,
    reorderGuidePlaces,
    addPlaceToGuide,
  } = useGuide()
  const guide = slug ? guideBySlug(slug) : guideId ? guideById(guideId) : undefined
  const city = guide ? cityById(guide.cityId) : undefined
  const editable = guide?.kind === 'user'
  const [filters, setFilters] = useState<PlaceFilters>(emptyFilters)
  const [pill, setPill] = useState<StatusPill>('all')
  const [sort, setSort] = useState<SortKey>(editable ? 'order' : 'rating')
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [pane, setPane] = useState<'list' | 'map'>('list')
  const [title, setTitle] = useState(guide?.title ?? '')
  const [renaming, setRenaming] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [existingQuery, setExistingQuery] = useState('')
  const desktop = useDesktopMap()
  const dragRef = useRef<string | null>(null)

  useEffect(() => {
    if (!guide) return
    setTitle(guide.title)
    setSort(guide.kind === 'user' ? 'order' : 'rating')
    setFilters(emptyFilters())
    setPill('all')
  }, [guide?.id, guide?.kind, guide?.title])

  useEffect(() => {
    document.title = guide ? `${guide.title} · Gusto's Guide` : "Gusto's Guide"
  }, [guide])

  const members = useMemo(() => {
    if (!guide) return []
    return guide.placeIds.map((id) => placeById(id)).filter((place): place is Place => Boolean(place))
  }, [guide, placeById])

  const ranks = useMemo(() => ratingRanks(members), [members])
  const filtered = useMemo(() => filterPlaces(members, filters), [members, filters])
  const counts = useMemo(() => statusCounts(filtered, statuses), [filtered, statuses])
  const shown = useMemo(() => {
    const picked = applyPill(filtered, pill, statuses)
    return sortPlaces(picked, sort, guide?.placeIds ?? [], origin)
  }, [filtered, pill, statuses, sort, guide?.placeIds, origin])

  async function nearMe() {
    setLocating(true)
    setLocationError('')
    try {
      const position = await readPosition()
      setOrigin(position)
      setSort('distance')
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'Location unavailable.')
    } finally {
      setLocating(false)
    }
  }

  if (!guide || !city) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 pb-16 outline-none">
        <h1 className="font-serif text-5xl italic">That guide is not on the list.</h1>
        <Link to="/" className="btn mt-6">
          Back home
        </Link>
      </main>
    )
  }

  const existingMatches = allPlaces.filter((place) => {
    if (guide.placeIds.includes(place.id)) return false
    const q = existingQuery.trim().toLowerCase()
    if (!q) return true
    return `${place.name} ${place.neighborhood} ${place.cuisine}`.toLowerCase().includes(q)
  })

  const activeGuide = guide
  const mobileMap = !desktop && pane === 'map'
  function move(placeId: string, direction: -1 | 1) {
    const index = activeGuide.placeIds.indexOf(placeId)
    const target = activeGuide.placeIds[index + direction]
    if (target) reorderGuidePlaces(activeGuide.id, placeId, target)
  }

  return (
    <main
      id="main"
      tabIndex={-1}
      className={`mx-auto max-w-6xl px-4 outline-none ${mobileMap ? 'flex h-dvh max-h-dvh flex-col overflow-hidden pt-20 pb-3' : 'pt-24 pb-16'}`}
    >
      <div className={mobileMap ? 'flex min-h-0 flex-1 flex-col' : 'lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-6'}>
      <div className={mobileMap ? 'shrink-0' : undefined}>
      <Link to={city.slug === 'seattle' ? '/' : `/city/${city.slug}`} className="text-sm font-bold">
        ← {city.name}
      </Link>
      <p className="meta-line mt-4">{editable ? 'My guide' : "Gusto's guide"} · {city.name}</p>
      {renaming && editable ? (
        <form
          className="mt-2 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            renameGuide(guide.id, title)
            setRenaming(false)
          }}
        >
          <label className="sr-only" htmlFor="rename-guide">
            Guide name
          </label>
          <input
            id="rename-guide"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="min-h-11 flex-1 border-2 border-ink bg-white px-3 font-serif text-3xl"
          />
          <button type="submit" className="btn btn-coral">
            Save name
          </button>
        </form>
      ) : (
        <h1 className="mt-1 font-serif text-5xl italic leading-none sm:text-7xl">{guide.title}</h1>
      )}
      <p className={`note mt-4 max-w-2xl ${mobileMap ? 'hidden' : ''}`}>{guide.dek}</p>
      <p className={`mt-3 text-sm font-bold ${mobileMap ? 'hidden' : ''}`}>
        {spotLabel(members.length)}
        {editable ? ' · drag or use the arrows to reorder' : ' · ranked by rating'}
      </p>
      <details className={`mt-4 max-w-2xl border-2 border-ink p-4 ${mobileMap ? 'hidden' : ''}`}>
        <summary className="cursor-pointer font-bold">What the ratings mean</summary>
        <p className="mt-2 text-sm">
          Scores are Gusto's, from 10 (cross town tonight) down to 0. Every ranked place has one. The number on the
          card follows the score, and the count is the real number of places on the list.
        </p>
      </details>
      {editable ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn text-sm" onClick={() => setRenaming(true)}>
            Rename
          </button>
          <button
            type="button"
            className="btn text-sm"
            onClick={() => {
              if (!user) requestSignIn({ type: 'add-place', guideId: guide.id })
              else openSheet({ type: 'add-place', guideId: guide.id })
            }}
          >
            Add a new place
          </button>
          <button type="button" className="btn text-sm" onClick={() => setConfirmDelete(true)}>
            Delete guide
          </button>
        </div>
      ) : null}

      <div className="mt-6">
        <FilterBar
          places={members}
          filters={filters}
          onFilters={setFilters}
          sort={sort}
          onSort={(next) => {
            if (next === 'distance' && !origin) {
              void nearMe()
              return
            }
            setSort(next)
          }}
          pill={pill}
          onPill={setPill}
          counts={counts}
          onNearMe={() => void nearMe()}
          locating={locating}
          locationError={locationError}
          hasOrigin={Boolean(origin)}
          allowOrder={Boolean(editable)}
        />
      </div>

      <div className="mt-4 flex lg:hidden" role="group" aria-label="List or map">
        <button type="button" className={`btn flex-1 text-sm ${pane === 'list' ? 'btn-navy' : ''}`} aria-pressed={pane === 'list'} onClick={() => setPane('list')}>
          List
        </button>
        <button type="button" className={`btn flex-1 border-l-0 text-sm ${pane === 'map' ? 'btn-navy' : ''}`} aria-pressed={pane === 'map'} onClick={() => setPane('map')}>
          Map
        </button>
      </div>

      <div className={`mt-4 ${pane === 'map' && !desktop ? 'hidden' : ''}`}>
          <h2 id="spots" className="font-serif text-4xl italic">
            The spots
          </h2>
          {shown.length === 0 ? (
            <div className="mt-4 border-2 border-dashed border-ink p-6">
              <p className="font-serif text-2xl italic">
                {pill === 'togo'
                  ? 'Nothing here is marked to go.'
                  : pill === 'been'
                    ? 'Nothing here is marked been.'
                    : 'Nothing matches those filters.'}
              </p>
              {activeFilterCount(filters) > 0 ? (
                <button type="button" className="btn mt-4 text-sm" onClick={() => setFilters(emptyFilters())}>
                  Clear filters
                </button>
              ) : null}
              {!user && pill !== 'all' ? (
                <button type="button" className="btn btn-coral mt-4 text-sm" onClick={() => requestSignIn()}>
                  Sign in to keep a status
                </button>
              ) : null}
            </div>
          ) : (
            <div className="@container">
              <div className="mt-4 grid gap-4 @min-[680px]:grid-cols-2">
              {shown.map((place) => {
                const index = guide.placeIds.indexOf(place.id)
                return (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    rank={ranks.get(place.id)}
                    cityName={city.name}
                    distance={origin ? milesBetween(origin, place) : null}
                    reorder={
                      editable
                        ? {
                            disableUp: index <= 0,
                            disableDown: index === guide.placeIds.length - 1,
                            onUp: () => move(place.id, -1),
                            onDown: () => move(place.id, 1),
                            onRemove: () => removePlaceFromGuide(guide.id, place.id),
                            onDragStart: () => {
                              dragRef.current = place.id
                            },
                            onDrop: () => {
                              if (dragRef.current) reorderGuidePlaces(guide.id, dragRef.current, place.id)
                              dragRef.current = null
                            },
                          }
                        : undefined
                    }
                  />
                )
              })}
            </div>
              </div>
          )}
          {editable ? (
            <section className="mt-8" aria-labelledby="existing-heading">
              <h2 id="existing-heading" className="font-serif text-3xl italic">
                Add a place already in the guide
              </h2>
              <label className="field mt-3 max-w-md">
                <span>Search places</span>
                <input value={existingQuery} onChange={(event) => setExistingQuery(event.target.value)} />
              </label>
              <ul className="mt-3 max-h-64 space-y-2 overflow-auto">
                {existingMatches.map((place) => (
                  <li key={place.id}>
                    <button type="button" className="btn w-full justify-between text-sm" onClick={() => addPlaceToGuide(guide.id, place.id)}>
                      <span>
                        {place.name} · {place.neighborhood}
                      </span>
                      <span>Add</span>
                    </button>
                  </li>
                ))}
              </ul>
              {existingMatches.length === 0 ? <p className="mt-2 text-sm">Every matching place is already on this list.</p> : null}
            </section>
          ) : null}
      </div>
      </div>
        <div
          className={
            mobileMap
              ? 'mt-3 min-h-0 flex-1'
              : `lg:sticky lg:top-20 lg:h-[calc(100dvh-5rem-1.5rem)] ${pane === 'list' ? 'hidden lg:block' : ''}`
          }
        >
          {(desktop || pane === 'map') && <GuideMap places={shown} statuses={statuses} />}
        </div>
      </div>

      {confirmDelete ? (
        <Modal onClose={() => setConfirmDelete(false)} labelId="delete-title">
          <div className="p-5">
            <h2 id="delete-title" className="font-serif text-3xl">
              Delete {guide.title}?
            </h2>
            <p className="mt-2 text-sm">The guide goes away. Places you added stay in your library.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn btn-coral"
                onClick={() => {
                  deleteGuide(guide.id)
                  setConfirmDelete(false)
                  navigate('/my')
                }}
              >
                Delete
              </button>
              <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </main>
  )
}
