import { areaTitle } from '../lib/city.ts'
import { collectionsForCity, GUIDE_LIMIT_MESSAGE, GUIDE_OVER_MESSAGE, GUIDE_PLACE_LIMIT, guideCountLabel } from '../lib/collections.ts'
import type { CityId } from '../lib/city.ts'
import { useApp } from '../state/AppState.tsx'

export function CollectionMembership({ placeId, city, compact = false }: { placeId: string; city: CityId; compact?: boolean }) {
  const app = useApp()
  if (!app.user?.isOwner) return null
  const lists = collectionsForCity(app.collections, city)
  const note = lists.some((list) => list.placeIds.length > GUIDE_PLACE_LIMIT)
    ? GUIDE_OVER_MESSAGE
    : lists.some((list) => !list.placeIds.includes(placeId) && list.placeIds.length >= GUIDE_PLACE_LIMIT)
      ? GUIDE_LIMIT_MESSAGE
      : null
  return (
    <section className={compact ? 'mt-3' : 'mt-4'} aria-labelledby={`collections-${placeId}`}>
      <h2 id={`collections-${placeId}`} className={compact ? 'text-sm font-bold' : 'font-serif text-2xl italic'}>
        Collections
      </h2>
      {lists.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {lists.map((list) => {
            const on = list.placeIds.includes(placeId)
            const full = !on && list.placeIds.length >= GUIDE_PLACE_LIMIT
            return (
              <li key={list.id}>
                <button
                  type="button"
                  className="chip disabled:cursor-not-allowed disabled:opacity-40"
                  aria-pressed={on}
                  disabled={full}
                  onClick={() => app.setCollectionPlace(list.id, placeId, !on)}
                >
                  {list.title}
                  <span className="tabular-nums"> {guideCountLabel(list.placeIds.length)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-2 text-sm">None in {areaTitle(city)} yet.</p>
      )}
      {note ? <p className="mt-2 text-sm" role="status">{note}</p> : null}
    </section>
  )
}
