import { slugify } from './format.ts'

/** The three cities that already have tiles, then any other locality in the catalog. */
const LEADING = ['Bellevue', 'Kirkland', 'Redmond']

/**
 * Locality from a street address. This is the ", Bellevue, WA 98004" segment,
 * not a guess from the restaurant name or the neighborhood label.
 */
export function eastsideLocality(address: string | undefined): string | null {
  const match = address?.match(/,\s*([^,]+),\s*WA\s+\d{5}(?:-\d{4})?\s*$/)
  const locality = match?.[1]?.trim()
  return locality || null
}

export type EastsideCityGroup<T> = {
  name: string
  slug: string
  places: T[]
}

export function groupEastsideCities<T extends { id: string; name: string; address?: string }>(places: T[]): {
  cities: EastsideCityGroup<T>[]
  unassigned: T[]
} {
  const buckets = new Map<string, T[]>()
  const unassigned: T[] = []
  for (const place of places) {
    const locality = eastsideLocality(place.address)
    if (!locality) {
      unassigned.push(place)
      continue
    }
    const list = buckets.get(locality) ?? []
    list.push(place)
    buckets.set(locality, list)
  }
  const names = [...buckets.keys()].sort((a, b) => {
    const ai = LEADING.indexOf(a)
    const bi = LEADING.indexOf(b)
    if (ai !== -1 || bi !== -1) return (ai === -1 ? LEADING.length : ai) - (bi === -1 ? LEADING.length : bi)
    return a.localeCompare(b)
  })
  return {
    cities: names.map((name) => ({
      name,
      slug: slugify(name),
      places: [...(buckets.get(name) ?? [])].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
    })),
    unassigned,
  }
}
