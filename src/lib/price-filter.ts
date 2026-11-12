import type { Price } from '../types.ts'

export const PRICE_TIERS: Price[] = [1, 2, 3, 4]

export type PriceChoice = {
  prices: Price[]
  /** Include places with no published price. Ignored when nothing is selected. */
  unknown: boolean
}

export function priceFilterActive(choice: PriceChoice): boolean {
  return choice.prices.length > 0 || choice.unknown
}

/** Nothing selected means every place, including those with no price. */
export function matchesPrice(place: { price?: Price | null }, choice: PriceChoice): boolean {
  if (!priceFilterActive(choice)) return true
  if (place.price == null) return choice.unknown
  return choice.prices.includes(place.price)
}

export function hasUnknownPrice(places: { price?: Price | null }[]): boolean {
  return places.some((place) => place.price == null)
}
