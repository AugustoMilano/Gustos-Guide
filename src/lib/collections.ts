import type { CityId } from './city.ts'
import { uniqueSlug } from './format.ts'
import type { SlimPlace } from '../types.ts'

/** Live collection. A stored cheap-eats row replaces this ranking. */
export const CHEAP_EATS_SLUG = 'cheap-eats'
export const CHEAP_EATS_TITLE = 'Cheap eats'
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
  if (place.city === 'la' || place.city === 'eastside') return place.city
  return 'seattle'
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
  return a.name.localeCompare(b.name)
}

/** Top 25 open $ places. His score, then Yelp rating, then Yelp review count. */
export function cheapEatsFor(
  places: SlimPlace[],
  city: CityId,
  score: (id: string) => number | null = () => null,
): SlimPlace[] {
  return places
    .filter((place) => collectionCity(place) === city && isCheapEat(place))
    .sort((a, b) => compareCheapEats(a, b, score))
    .slice(0, FLAGSHIP_AIM)
}

export function storedCheapEats(collections: HouseCollection[], city: CityId, owner = false): HouseCollection | null {
  return collections.find((row) => row.city === city && row.slug === CHEAP_EATS_SLUG && (owner || row.published)) ?? null
}

export function orderedMembers(placeIds: string[], places: SlimPlace[]): SlimPlace[] {
  const byId = new Map(places.map((place) => [place.id, place]))
  const out: SlimPlace[] = []
  for (const id of placeIds) {
    const place = byId.get(id)
    if (place && place.closed !== true) out.push(place)
  }
  return out
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
  if (storedCheap) {
    chips.push({
      slug: CHEAP_EATS_SLUG,
      title: storedCheap.title,
      count: orderedMembers(storedCheap.placeIds, places).length,
    })
  } else if (allowComputed) {
    const cheap = cheapEatsFor(places, city, score)
    if (cheap.length) chips.push({ slug: CHEAP_EATS_SLUG, title: CHEAP_EATS_TITLE, count: cheap.length })
  }
  const stored = collections
    .filter((row) => row.published && row.city === city && row.slug !== CHEAP_EATS_SLUG)
    .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title))
  for (const row of stored) {
    chips.push({ slug: row.slug, title: row.title, count: orderedMembers(row.placeIds, places).length })
  }
  return chips
}

export function collectionsForCity(collections: HouseCollection[], city: CityId): HouseCollection[] {
  return collections
    .filter((row) => row.city === city)
    .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title))
}
