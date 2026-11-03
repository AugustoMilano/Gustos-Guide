import { brandKey } from './brand.ts'
import { isRestaurant } from './restaurant.ts'
import { catalog } from '../content/load.ts'
import { regionOf, type RegionId } from './city.ts'
import type { ForkMetal } from './fork-mark.ts'
import { isListed, placeCity } from './use-city.ts'
import type { SlimPlace } from '../types.ts'

export type ForkAward = {
  rank: number
  metal: ForkMetal
  region: RegionId
  score: number
}

export type TopRow = {
  place: SlimPlace
  score: number
  rank: number
  metal: ForkMetal
}

const TOP = 25

export function metalForRank(rank: number): ForkMetal {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return 'navy'
}

type Cache = {
  key: string
  map: Map<string, ForkAward>
  boards: Record<RegionId, { shown: TopRow[]; scored: number }>
}

let cache: Cache | null = null

function scoreKey(scoreOf: (placeId: string) => number | null): string {
  const parts: string[] = []
  for (const place of catalog.places) {
    const score = scoreOf(place.id)
    if (typeof score === 'number') parts.push(`${place.id}:${score}`)
  }
  return parts.join('|')
}

function build(scoreOf: (placeId: string) => number | null): Cache {
  const map = new Map<string, ForkAward>()
  const boards = {} as Cache['boards']
  for (const region of ['seattle', 'la', 'sf', 'sandiego', 'vancouver', 'portland', 'nyc', 'pullman'] as const) {
    const ranked = catalog.places
      // Restaurants only, the same test the profile Top 10 uses; one per brand.
      .filter((place) => isListed(place) && isRestaurant(place) && regionOf(placeCity(place)) === region)
      .flatMap((place) => {
        const score = scoreOf(place.id)
        return typeof score === 'number' ? [{ place, score }] : []
      })
      .sort((a, b) => (a.score === b.score ? a.place.name.localeCompare(b.place.name) : b.score - a.score))
      .filter((row, _i, all) => all.find((other) => brandKey(other.place.name) === brandKey(row.place.name)) === row)
    const shown: TopRow[] = ranked.slice(0, TOP).map((row, index) => {
      const rank = index + 1
      const metal = metalForRank(rank)
      map.set(row.place.id, { rank, metal, region, score: row.score })
      return { place: row.place, score: row.score, rank, metal }
    })
    boards[region] = { shown, scored: ranked.length }
  }
  return { key: scoreKey(scoreOf), map, boards }
}

function ensure(scoreOf: (placeId: string) => number | null): Cache {
  const key = scoreKey(scoreOf)
  if (cache?.key === key) return cache
  cache = build(scoreOf)
  return cache
}

/** Owner Gusto's Score only. Personal rankings never enter this list. */
export function regionBoard(region: RegionId, scoreOf: (placeId: string) => number | null) {
  return ensure(scoreOf).boards[region]
}

export function awardFor(placeId: string, scoreOf: (placeId: string) => number | null): ForkAward | null {
  return ensure(scoreOf).map.get(placeId) ?? null
}
