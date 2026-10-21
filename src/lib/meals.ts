import { compareCheapEats } from './collections.ts'
import { isOpenAt } from './hours.ts'
import type { Period, SlimPlace } from '../types.ts'

/**
 * Meal tags from place type, cuisine, and hours.
 * Apple Maps "good for" attributes were not harvested, and `perfectFor` is generated, so neither is used.
 * No tag is written into the catalogs and no copy is generated.
 */
export type Meal = 'breakfast' | 'coffee' | 'brunch' | 'lunch' | 'afternoon' | 'dinner' | 'late'

/** Half-open minute windows. 17:00 starts dinner. Closing at 21:30 does not count as late. */
const BREAKFAST: Array<[number, number]> = [[360, 630]]
const COFFEE: Array<[number, number]> = [[360, 720]]
const BRUNCH: Array<[number, number]> = [[540, 840]]
const LUNCH: Array<[number, number]> = [[660, 870]]
const AFTERNOON: Array<[number, number]> = [[870, 1020]]
const DINNER: Array<[number, number]> = [[1020, 1290]]

const WEEKEND = new Set([0, 6])

const LABELS: Record<Meal, string> = {
  breakfast: 'Breakfast spots open now',
  coffee: 'Coffee and pastry open now',
  brunch: 'Brunch spots open now',
  lunch: 'Lunch spots open now',
  afternoon: 'Afternoon spots open now',
  dinner: 'Dinner spots open now',
  late: 'Late-night spots open now',
}

/** When several meals overlap, the label follows this order. */
const LABEL_ORDER: Meal[] = ['late', 'dinner', 'afternoon', 'brunch', 'lunch', 'breakfast', 'coffee']

const DRINK_TYPES = new Set([
  'cocktail bar',
  'wine bar',
  'beer bar',
  'dive bar',
  'rooftop bar',
  'listening bar',
  'nightclub',
  'bar (arcade)',
  'bar (games)',
])

const DRINK_CUISINES = new Set([
  'cocktails',
  'wine',
  'beer',
  'bar',
  'nightlife',
  'wine bar',
  'cocktail bar',
  'tavern',
  'tiki bar',
  'ginger beer',
  'wine tasting room',
])

/** Cuisines that are not a savory meal. A bakery stays a bakery; sandwiches do not. */
const NOT_SAVORY = new Set([
  'coffee',
  'cafe',
  'tea',
  'tea room',
  'afternoon tea',
  'bakery',
  'pastry',
  'patisserie',
  'donut',
  'donuts',
  'bagel',
  'bagels',
  'cookie',
  'cookies',
  'pie',
  'pies',
  'crumpet',
  'crumpets',
  'dessert',
  'ice cream',
  'gelato',
  'chocolate',
  'juice',
  'juice and smoothie bar',
  'yogurt',
  'french bakery',
  'candy',
  ...DRINK_CUISINES,
])

const SWEET = new Set([
  'ice cream',
  'gelato',
  'dessert',
  'cookie',
  'cookies',
  'chocolate',
  'candy',
  'frozen yogurt',
  'yogurt',
  'juice',
  'juice and smoothie bar',
  'pie',
  'pies',
])

const LIGHT_TYPES = new Set(['bakery', 'coffee shop', 'cafe', 'tea room', 'dessert'])

const COFFEE_RE = /\b(coffee|cafe|tea room|teahouse|bakery|pastry|patisserie|donuts?|bagels?|cookies?|pies?|crumpets?|afternoon tea)\b/
const BREAKFAST_RE = /\b(breakfast|brunch|diner|bagels?|bakery|pastry|patisserie|donuts?|crumpets?|cafe|coffee)\b/
const BRUNCH_RE = /\b(breakfast|brunch|diner|cafe|bakery|patisserie|coffee|bagels?)\b/
const AFTERNOON_RE = /\b(coffee|cafes?|pastry|patisserie|dessert|ice cream|gelato|snack|cookies?|chocolate|teas?|juice|bakery|donuts?|pies?|crumpets?|yogurt|bagels?)\b/

const NOW_LIMIT = 6

export type WallClock = { day: number; mins: number }

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Seattle, Eastside, Los Angeles, and San Francisco all use Pacific time. */
export function pacificWall(now = new Date()): WallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? 'Sun'
  let hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')
  if (hour === 24) hour = 0
  const day = WEEKDAYS.indexOf(weekday)
  return { day: day < 0 ? 0 : day, mins: hour * 60 + minute }
}

export function activeMeals(day: number, mins: number): Meal[] {
  const meals: Meal[] = []
  if (mins >= 1290 || mins < 360) meals.push('late')
  if (mins >= 1020 && mins < 1290) meals.push('dinner')
  if (mins >= 870 && mins < 1020) meals.push('afternoon')
  if ((day === 0 || day === 6) && mins >= 540 && mins < 840) meals.push('brunch')
  if (mins >= 660 && mins < 870) meals.push('lunch')
  if (mins >= 360 && mins < 630) meals.push('breakfast')
  if (mins >= 360 && mins < 720) meals.push('coffee')
  return meals
}

export function mealLabel(meals: readonly Meal[]): string {
  const winner = LABEL_ORDER.find((meal) => meals.includes(meal))
  return winner ? LABELS[winner] : 'Open now'
}

function norm(value: string): string {
  return value.toLowerCase().replace(/é/g, 'e').replace(/&/g, ' and ').replace(/\s+/g, ' ').trim()
}

function cuisines(place: SlimPlace): string[] {
  return (place.cuisine ?? []).map(norm)
}

function blob(place: SlimPlace): string {
  return norm(`${place.placeType} ${(place.cuisine ?? []).join(' ')}`)
}

function drinksOnly(place: SlimPlace): boolean {
  const type = norm(place.placeType)
  if (!DRINK_TYPES.has(type) && type !== 'bar') return false
  const kinds = cuisines(place)
  if (!kinds.length) return true
  return kinds.every((kind) => DRINK_CUISINES.has(kind))
}

function servesDrinks(place: SlimPlace): boolean {
  const type = norm(place.placeType)
  if (drinksOnly(place) || type === 'bar' || type === 'pub' || type === 'brewery' || type === 'sports bar' || type === 'bar and grill') return true
  return /\b(nightclub|lounge|tavern|tiki)\b/.test(type)
}

function savoryCuisine(place: SlimPlace): boolean {
  return cuisines(place).some((kind) => {
    if (NOT_SAVORY.has(kind) || kind === 'market' || kind === 'cat cafe') return false
    if (/\b(coffee|teas?|cafes?|baker(?:y|ies)|pastr(?:y|ies)|gelato|dessert|juices?|cookies?|donuts?|ice cream)\b/.test(kind)) return false
    return true
  })
}

function dessertOnly(place: SlimPlace): boolean {
  if (norm(place.placeType) === 'dessert') return true
  const kinds = cuisines(place)
  return kinds.length > 0 && kinds.every((kind) => SWEET.has(kind))
}

function coffeeOnly(place: SlimPlace): boolean {
  if (savoryCuisine(place)) return false
  const type = norm(place.placeType)
  if (type === 'coffee shop' || type === 'cafe' || type === 'tea room') return true
  const kinds = cuisines(place)
  return kinds.length > 0 && kinds.every((kind) => /\b(coffee|cafe|tea)\b/.test(kind))
}

function slices(period: Period): Array<{ day: number; start: number; end: number }> {
  if (period.end === period.start || !period.days?.length) return []
  const out: Array<{ day: number; start: number; end: number }> = []
  if (period.end > period.start) {
    for (const day of period.days) out.push({ day, start: period.start, end: period.end })
    return out
  }
  for (const day of period.days) {
    out.push({ day, start: period.start, end: 1440 })
    if (period.end > 0) out.push({ day: (day + 1) % 7, start: 0, end: period.end })
  }
  return out
}

function overlaps(periods: Period[] | undefined, windows: Array<[number, number]>, days?: Set<number>): boolean {
  if (!periods?.length) return false
  for (const period of periods) {
    for (const slice of slices(period)) {
      if (days && !days.has(slice.day)) continue
      for (const [start, end] of windows) {
        if (slice.start < end && start < slice.end) return true
      }
    }
  }
  return false
}

/** Open after 21:30, or still open after midnight. A 5:00am opening is morning, not late-night. */
function openLate(periods: Period[] | undefined): boolean {
  if (!periods?.length) return false
  for (const period of periods) {
    if (period.end === period.start || !period.days?.length) continue
    if (period.end < period.start) return true
    if (period.end > 1290) return true
    if (period.start < 300 && period.end > period.start) return true
  }
  return false
}

export function mealTags(place: SlimPlace): Meal[] {
  const tags: Meal[] = []
  const text = blob(place)
  const food = !drinksOnly(place)
  const sweet = dessertOnly(place)
  if (food && overlaps(place.periods, BREAKFAST) && (BREAKFAST_RE.test(text) || !sweet)) tags.push('breakfast')
  if (COFFEE_RE.test(text) && overlaps(place.periods, COFFEE)) tags.push('coffee')
  if (food && BRUNCH_RE.test(text) && overlaps(place.periods, BRUNCH, WEEKEND)) tags.push('brunch')
  if (food && !sweet && overlaps(place.periods, LUNCH)) tags.push('lunch')
  if (AFTERNOON_RE.test(text) && !servesDrinks(place) && overlaps(place.periods, AFTERNOON)) tags.push('afternoon')
  const light = LIGHT_TYPES.has(norm(place.placeType))
  if (food && !sweet && !coffeeOnly(place) && !(light && !savoryCuisine(place)) && overlaps(place.periods, DINNER)) tags.push('dinner')
  if (openLate(place.periods)) tags.push('late')
  return tags
}

export type NowSuggestion = {
  places: SlimPlace[]
  /** Sentence-case label. Null when nothing is open. */
  label: string | null
  live: boolean
}

/** Open now in Pacific time, fitting the active meals. Ranked by his score, then Yelp. */
export function suggestNow(
  places: SlimPlace[],
  score: (id: string) => number | null,
  wall: WallClock,
): NowSuggestion {
  const meals = activeMeals(wall.day, wall.mins)
  const open = places.filter((place) => !place.closed && isOpenAt(place.periods, wall.day, wall.mins))
  const fitting = open.filter((place) => mealTags(place).some((tag) => meals.includes(tag)))
  const ranked = (rows: SlimPlace[]) => rows.slice().sort((a, b) => compareCheapEats(a, b, score)).slice(0, NOW_LIMIT)
  if (fitting.length) return { places: ranked(fitting), label: mealLabel(meals), live: true }
  if (open.length) return { places: ranked(open), label: 'Open now', live: true }
  return { places: [], label: null, live: false }
}
