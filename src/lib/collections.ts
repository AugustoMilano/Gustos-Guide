import { asCityId, type CityId } from './city.ts'
import { uniqueSlug } from './format.ts'
import type { SlimPlace } from '../types.ts'

/** Live collection. A stored cheap-eats row replaces this ranking. */
export const CHEAP_EATS_SLUG = 'cheap-eats'
export const CHEAP_EATS_TITLE = 'Cheap eats'

/** Seattle Cheap Eats must not list these places, even if a stored collection still has the id. */
const SEATTLE_CHEAP_EATS_EXCLUDED = new Set(['alibi-room', 'starbucks-coffee-company'])

export function seattleCheapEatsBlocked(city: string, slug: string, placeId: string): boolean {
  return city === 'seattle' && slug === CHEAP_EATS_SLUG && SEATTLE_CHEAP_EATS_EXCLUDED.has(placeId)
}

export function omitSeattleCheapEats(city: string, ids: readonly string[]): string[] {
  if (city !== 'seattle') return [...ids]
  return ids.filter((id) => !SEATTLE_CHEAP_EATS_EXCLUDED.has(id))
}
export const FAVORITES_TITLE = "Gusto's favorites"
export const FAVORITES_SCORE = 8.5

/** Target length for his published guides and house collections. Not a limit. */
export const FLAGSHIP_AIM = 25

export function flagshipAimHint(count: number): string {
  const noun = count === 1 ? 'place' : 'places'
  return `${count} ${noun}, aim for ${FLAGSHIP_AIM}`
}

const RESERVED_SLUGS = [CHEAP_EATS_SLUG]

export type CollectionsStatus = 'loading' | 'ready' | 'missing' | 'offline' | 'error'

export type HouseCollection = {
  id: string
  city: CityId
  title: string
  slug: string
  blurb: string | null
  position: number
  placeIds: string[]
  published: boolean
}

export type CollectionSuggestion = {
  key: string
  title: string
  placeIds: string[]
}

export type PublicChip = {
  slug: string
  title: string
  count: number
}

/** City on the place itself. Eastside stays Eastside; it does not fold into Seattle. */
export function collectionCity(place: { city?: string }): CityId {
  return asCityId(place.city)
}

export function isCheapEat(place: { price?: number; closed?: boolean }): boolean {
  return place.closed !== true && place.price === 1
}

function yelpRank(place: { publicRating?: { value: number; count: number; source: string } }): { rating: number | null; count: number | null } {
  const rating = place.publicRating
  if (!rating || rating.source !== 'Yelp') return { rating: null, count: null }
  return {
    rating: typeof rating.value === 'number' ? rating.value : null,
    count: typeof rating.count === 'number' ? rating.count : null,
  }
}

/** House score, then Yelp rating, then Yelp review count. Missing numbers sort last. */
export function compareCheapEats(
  a: SlimPlace,
  b: SlimPlace,
  score: (id: string) => number | null,
): number {
  const aRaw = score(a.id)
  const bRaw = score(b.id)
  const aHouse = typeof aRaw === 'number' ? aRaw : null
  const bHouse = typeof bRaw === 'number' ? bRaw : null
  if (aHouse == null && bHouse != null) return 1
  if (aHouse != null && bHouse == null) return -1
  if (aHouse != null && bHouse != null && aHouse !== bHouse) return bHouse - aHouse
  const aYelp = yelpRank(a)
  const bYelp = yelpRank(b)
  if (aYelp.rating == null && bYelp.rating != null) return 1
  if (aYelp.rating != null && bYelp.rating == null) return -1
  if (aYelp.rating != null && bYelp.rating != null && aYelp.rating !== bYelp.rating) return bYelp.rating - aYelp.rating
  if (aYelp.count == null && bYelp.count != null) return 1
  if (aYelp.count != null && bYelp.count == null) return -1
  if (aYelp.count != null && bYelp.count != null && aYelp.count !== bYelp.count) return bYelp.count - aYelp.count
  return (a.name || '').localeCompare(b.name || '')
}

/**
 * Top 25 open $ places when no stored list is usable.
 * Gusto's Score descending. Unscored places stay after scored ones.
 * Ties keep the catalog order this list was filtered from.
 */
export function cheapEatsFor(
  places: SlimPlace[],
  city: CityId,
  score: (id: string) => number | null = () => null,
): SlimPlace[] {
  return places
    .filter((place) => collectionCity(place) === city && isCheapEat(place) && !seattleCheapEatsBlocked(city, CHEAP_EATS_SLUG, place.id))
    .sort((a, b) => {
      const aRaw = score(a.id)
      const bRaw = score(b.id)
      const aHouse = typeof aRaw === 'number' ? aRaw : null
      const bHouse = typeof bRaw === 'number' ? bRaw : null
      if (aHouse == null && bHouse != null) return 1
      if (aHouse != null && bHouse == null) return -1
      if (aHouse != null && bHouse != null && aHouse !== bHouse) return bHouse - aHouse
      return 0
    })
    .slice(0, FLAGSHIP_AIM)
}

export function storedCheapEats(collections: HouseCollection[], city: CityId, owner = false): HouseCollection | null {
  return collections.find((row) => row.city === city && row.slug === CHEAP_EATS_SLUG && (owner || row.published)) ?? null
}

/** String ids, or null when the stored row has no usable id list. */
export function renderableIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const ids: string[] = []
  for (const id of value) {
    if (typeof id === 'string' && id.length > 0) ids.push(id)
  }
  return ids
}

export function orderedMembers(placeIds: readonly string[], places: SlimPlace[]): SlimPlace[] {
  const byId = new Map<string, SlimPlace>()
  if (Array.isArray(places)) {
    for (const place of places) {
      if (place && typeof place.id === 'string') byId.set(place.id, place)
    }
  }
  const out: SlimPlace[] = []
  if (!Array.isArray(placeIds)) return out
  for (const id of placeIds) {
    if (typeof id !== 'string') continue
    const place = byId.get(id)
    if (!place || place.closed === true) continue
    if (!place.name || !Array.isArray(place.cuisine)) continue
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) continue
    out.push(place)
  }
  return out
}

/**
 * Places for a stored Cheap eats row.
 * Null means the row is missing or unusable, and the caller should use the computed list.
 * An empty array is a real stored list with nothing left to show.
 */
export function usableCheapMembers(row: HouseCollection | null, places: SlimPlace[]): SlimPlace[] | null {
  if (!row) return null
  const raw = renderableIds(row.placeIds)
  if (!raw) return null
  if (raw.length === 0) return []
  const ids = omitSeattleCheapEats(row.city, raw)
  if (ids.length === 0) return null
  const known = raw.some((id) => places.some((place) => place.id === id))
  if (!known) return null
  return orderedMembers(ids, places)
}

export function movedPlaceIds(placeIds: string[], visibleIds: string[], placeId: string, direction: -1 | 1): string[] | null {
  const next = visibleIds.slice()
  const index = next.indexOf(placeId)
  const target = index + direction
  if (index < 0 || target < 0 || target >= next.length) return null
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  const hidden = placeIds.filter((id) => !visibleIds.includes(id))
  return [...next, ...hidden]
}

export function collectionSlug(title: string, taken: string[]): string {
  return uniqueSlug(title, [...taken, ...RESERVED_SLUGS])
}

export function cleanTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function cleanBlurb(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function titleProblem(title: string, cityTitles: string[], ignore?: string): string | null {
  if (!title) return 'Add a title.'
  if (title.length > 40) return 'Keep the title to 40 characters.'
  const keepingCheapEats = ignore?.toLowerCase() === CHEAP_EATS_TITLE.toLowerCase()
  if (title.toLowerCase() === CHEAP_EATS_TITLE.toLowerCase() && !keepingCheapEats) return 'Cheap eats is already on the list.'
  const taken = cityTitles.some((item) => item !== ignore && item.toLowerCase() === title.toLowerCase())
  if (taken) return 'That title is already a collection in this city.'
  return null
}

export function blurbProblem(blurb: string | null): string | null {
  if (blurb && blurb.length > 280) return 'Keep the note to 280 characters.'
  return null
}

export function suggestionsFor(
  places: SlimPlace[],
  city: CityId,
  score: (id: string) => number | null,
  takenTitles: string[],
): CollectionSuggestion[] {
  const open = places.filter((place) => collectionCity(place) === city && place.closed !== true)
  const taken = new Set(takenTitles.map((title) => title.toLowerCase()))
  const out: CollectionSuggestion[] = []
  if (!taken.has(FAVORITES_TITLE.toLowerCase())) {
    const favorites = open.filter((place) => {
      const value = score(place.id)
      return value != null && value >= FAVORITES_SCORE
    })
    if (favorites.length) {
      out.push({
        key: 'favorites',
        title: FAVORITES_TITLE,
        placeIds: favorites.map((place) => place.id),
      })
    }
  }
  const byCuisine = new Map<string, string[]>()
  for (const place of open) {
    if (!Array.isArray(place.cuisine)) continue
    for (const cuisine of place.cuisine) {
      const name = cuisine.trim()
      if (!name || name.toLowerCase() === CHEAP_EATS_TITLE.toLowerCase()) continue
      const list = byCuisine.get(name) ?? []
      if (!list.includes(place.id)) list.push(place.id)
      byCuisine.set(name, list)
    }
  }
  const cuisines = [...byCuisine.entries()]
    .filter(([name, ids]) => ids.length > 0 && !taken.has(name.toLowerCase()))
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
  for (const [name, ids] of cuisines) {
    out.push({ key: `cuisine:${name}`, title: name, placeIds: ids })
  }
  return out
}

export function publicChips(
  city: CityId,
  places: SlimPlace[],
  collections: HouseCollection[],
  score: (id: string) => number | null = () => null,
  allowComputed = true,
): PublicChip[] {
  const chips: PublicChip[] = []
  const storedCheap = storedCheapEats(collections, city)
  const storedMembers = storedCheap ? usableCheapMembers(storedCheap, places) : null
  if (storedCheap && storedMembers) {
    chips.push({
      slug: CHEAP_EATS_SLUG,
      title: storedCheap.title,
      count: storedMembers.length,
    })
  } else if (allowComputed) {
    const cheap = cheapEatsFor(places, city, score)
    if (cheap.length) chips.push({ slug: CHEAP_EATS_SLUG, title: CHEAP_EATS_TITLE, count: cheap.length })
  }
  const stored = collections
    .filter((row) => row.published && row.city === city && row.slug !== CHEAP_EATS_SLUG)
    .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title))
  for (const row of stored) {
    chips.push({ slug: row.slug, title: row.title, count: orderedMembers(renderableIds(row.placeIds) ?? [], places).length })
  }
  return chips
}

export function collectionsForCity(collections: HouseCollection[], city: CityId): HouseCollection[] {
  return collections
    .filter((row) => row.city === city)
    .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title))
}
