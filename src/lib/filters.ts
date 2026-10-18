import type { Place, VisitStatus } from '../types.ts'
import { milesBetween } from './format.ts'

export type StatusPill = 'all' | VisitStatus
export type SortKey = 'rating' | 'name' | 'distance' | 'order'

export interface PlaceFilters {
  cuisines: string[]
  neighborhoods: string[]
  prices: number[]
}

export const emptyFilters = (): PlaceFilters => ({
  cuisines: [],
  neighborhoods: [],
  prices: [],
})

export function filterPlaces(places: Place[], filters: PlaceFilters): Place[] {
  return places.filter((place) => {
    if (filters.cuisines.length && !filters.cuisines.includes(place.cuisine)) return false
    if (filters.neighborhoods.length && !filters.neighborhoods.includes(place.neighborhood)) return false
    if (filters.prices.length && !filters.prices.includes(place.price)) return false
    return true
  })
}

export function sortPlaces(
  places: Place[],
  sort: SortKey,
  order: string[],
  origin: { lat: number; lng: number } | null,
): Place[] {
  const rank = new Map(order.map((id, index) => [id, index]))
  const next = places.slice()
  next.sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name)
    if (sort === 'order') return (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0)
    if (sort === 'distance') {
      if (!origin) return a.name.localeCompare(b.name)
      return milesBetween(origin, a) - milesBetween(origin, b)
    }
    return b.rating - a.rating || a.name.localeCompare(b.name)
  })
  return next
}

export function statusCounts(
  places: Place[],
  statuses: Record<string, VisitStatus>,
): Record<StatusPill, number> {
  let togo = 0
  let been = 0
  for (const place of places) {
    const status = statuses[place.id]
    if (status === 'togo') togo += 1
    else if (status === 'been') been += 1
  }
  return { all: places.length, togo, been }
}

export function applyPill(
  places: Place[],
  pill: StatusPill,
  statuses: Record<string, VisitStatus>,
): Place[] {
  if (pill === 'all') return places
  return places.filter((place) => statuses[place.id] === pill)
}

export function ratingRanks(places: Place[]): Map<string, number> {
  const ranked = places
    .filter((place) => Number.isFinite(place.rating))
    .slice()
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))
  return new Map(ranked.map((place, index) => [place.id, index + 1]))
}

export function placeMatchesQuery(place: Place, cityName: string, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return false
  const haystack = [
    place.name,
    place.neighborhood,
    place.cuisine,
    place.dish,
    place.note,
    place.address,
    cityName,
  ]
    .join(' ')
    .toLowerCase()
  return words.every((word) => haystack.includes(word))
}

export function activeFilterCount(filters: PlaceFilters): number {
  return filters.cuisines.length + filters.neighborhoods.length + filters.prices.length
}
