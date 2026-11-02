import type { SlimPlace } from '../types.ts'

const NOT_FOOD_TYPE = /\b(bar|pub|brewery|cafe|coffee|bakery|dessert|tea room|nightclub|market)\b/
const NOT_FOOD_CUISINE = /\b(cocktails?|coffee|bakery|bagels?|pastry|dessert|ice cream|gelato|doughnuts?|donuts?)\b/

/** True for places that are primarily restaurants, by placeType and cuisine, never by name. */
export function isRestaurant(place: Pick<SlimPlace, 'placeType' | 'cuisine'>): boolean {
  const type = place.placeType.toLowerCase()
  if (type === 'bar & grill' || type === 'butcher/restaurant') return true
  if (NOT_FOOD_TYPE.test(type)) return false
  return !place.cuisine.some((c) => NOT_FOOD_CUISINE.test(c.toLowerCase()))
}
