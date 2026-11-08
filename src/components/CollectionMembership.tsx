import { areaTitle } from '../lib/city.ts'
import { collectionsForCity, seattleCheapEatsBlocked } from '../lib/collections.ts'
import type { CityId } from '../lib/city.ts'
import { useApp } from '../state/AppState.tsx'

export function CollectionMembership({ placeId, city, compact = false }: { placeId: string; city: CityId; compact?: boolean }) {
  const app = useApp()
  if (!app.user?.isOwner) return null
  const lists = collectionsForCity(app.collections, city).filter((list) => !seattleCheapEatsBlocked(list.city, list.slug, placeId))
  return (
    <section className={compact ? 'mt-3' : 'mt-4'} aria-labelledby={`collections-${placeId}`}>
      <h2 id={`collections-${placeId}`} className={compact ? 'text-sm font-bold' : 'font-serif text-2xl italic'}>
        Collections
      </h2>
      {lists.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {lists.map((list) => {
            const on = list.placeIds.includes(placeId)
            return (
              <li key={list.id}>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={on}
                  onClick={() => app.setCollectionPlace(list.id, placeId, !on)}
                >
                  {list.title}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-2 text-sm">None in {areaTitle(city)} yet.</p>
      )}
    </section>
  )
}
