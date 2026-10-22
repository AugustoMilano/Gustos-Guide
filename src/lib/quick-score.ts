import type { SlimPlace } from '../types.ts'
import { asCityId, type CityId } from './city.ts'

export type HouseMark = 'havent'
export type QuickRegion = 'all' | CityId

const CITY_ORDER = {
  seattle: 0,
  eastside: 1,
  la: 2,
  sf: 3,
  eastbay: 4,
  peninsula: 5,
  northbay: 6,
  sandiego: 7,
} as const satisfies Record<CityId, number>

export function cityOf(place: { city?: string }): CityId {
  return asCityId(place.city)
}

/** Digits typed on the keyboard. "8" is 8.0, "87" is 8.7, "10" is 10.0. */
export function parseScoreDigits(digits: string): number | null {
  if (!/^\d+$/.test(digits)) return null
  if (digits === '10' || digits.startsWith('10')) return 10
  if (digits.length === 1) return Number(digits)
  return Math.round((Number(digits[0]) + Number(digits[1]) / 10) * 10) / 10
}

export function pushScoreDigit(digits: string, digit: string): string {
  if (!/^\d$/.test(digit)) return digits
  if (digits === '10') return digits
  if (!digits) return digit
  if (digits === '1' && digit === '0') return '10'
  if (digits.length >= 2) return digits
  return digits + digit
}

export function digitsFromScore(score: number): string {
  const value = Math.min(10, Math.max(0, Math.round(score * 10) / 10))
  if (value >= 10) return '10'
  const tenths = Math.round(value * 10)
  const whole = Math.floor(tenths / 10)
  const tenth = tenths % 10
  return tenth === 0 ? String(whole) : `${whole}${tenth}`
}

export function quickQueue(
  places: SlimPlace[],
  options: {
    region: QuickRegion
    neighborhood: string
    cuisine: string
    unscoredOnly: boolean
    haventOnly: boolean
    score: (id: string) => number | null
    mark: (id: string) => HouseMark | null
  },
): SlimPlace[] {
  const rows = places.filter((place) => {
    if (options.region !== 'all' && cityOf(place) !== options.region) return false
    if (options.neighborhood && place.neighborhood !== options.neighborhood) return false
    if (options.cuisine && !place.cuisine.includes(options.cuisine)) return false
    const havent = options.mark(place.id) === 'havent'
    if (options.haventOnly) return havent
    if (havent) return false
    if (options.unscoredOnly && options.score(place.id) != null) return false
    return true
  })
  rows.sort((a, b) => {
    const city = CITY_ORDER[cityOf(a)] - CITY_ORDER[cityOf(b)]
    if (city) return city
    const hood = a.neighborhood.localeCompare(b.neighborhood)
    if (hood) return hood
    return a.name.localeCompare(b.name)
  })
  return rows
}
