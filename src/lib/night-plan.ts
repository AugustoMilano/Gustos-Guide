import type { CityId } from './city.ts'
import { areaPhrase, asCityId } from './city.ts'
import { formatMiles, milesBetween } from './format.ts'
import { isPlaceOpen } from './hours.ts'
import { isRestaurant } from './restaurant.ts'
import type { GuideSummary, SlimPlace } from '../types.ts'

export type NightRole = 'drinks' | 'meal' | 'dessert' | 'coffee'
export type NightVibe = 'date' | 'cozy' | 'fancy' | 'view' | 'family'
export type ScoreOf = (placeId: string) => number | null

export type NightStop = {
  role: NightRole
  label: string
  kinds: string[]
  cuisines: string[]
}

export type NightIntent = {
  mode: 'itinerary' | 'list'
  vibe: NightVibe[]
  priceMax?: number
  cheap: boolean
  openNow: boolean
  neighborhood?: string
  stops: NightStop[]
}

export type NightPick = {
  place: SlimPlace
  role: NightRole
  label: string
  why: string
}

export type NightLeg = {
  miles: number
  minutes: number
  label: string
}

export type NightResult = {
  mode: 'itinerary' | 'list' | 'empty'
  picks: NightPick[]
  legs: NightLeg[]
  gaps: string[]
  summary: string
}

/** The owner's example, unchanged. */
export const DATE_NIGHT_PROMPT =
  'I am going on a date night, first date, and we want to get drinks before dinner, and then after dinner have the restaurant be near an ice cream place for dessert.'

export const EASTSIDE_NIGHT_PROMPT = 'Date night in Bellevue. Drinks first, then dinner, then a bakery for dessert.'

const KINDS = new Set(['cocktail', 'wine', 'beer', 'ice-cream', 'dessert', 'bakery', 'donut', 'coffee'])
const VIBES = new Set<NightVibe>(['date', 'cozy', 'fancy', 'view', 'family'])
const ROLES = new Set<NightRole>(['drinks', 'meal', 'dessert', 'coffee'])

/** Seattle Cheap Eats never lists Alibi Room, even when the price band would. */
const CHEAP_BLOCK = new Set(['alibi-room'])

const HOOD_ALIASES: [string, string][] = [
  ['cap hill', 'capitol hill'],
  ['university district', 'u district'],
  ['international district', 'chinatown'],
  ['chinatown', 'chinatown'],
  ['pike place', 'pike place'],
  ['south lake union', 'south lake union'],
  ['slu', 'south lake union'],
]

type Finder = {
  source: string
  role: NightRole
  kinds: string[]
  cuisines: string[]
  label: string
}

const FINDERS: Finder[] = [
  { source: '\\bice cream\\b|\\bgelato\\b|\\bsoft serve\\b|\\bscoops?\\b', role: 'dessert', kinds: ['ice-cream'], cuisines: [], label: 'Ice cream' },
  { source: '\\bbakery\\b|\\bbakeries\\b|\\bpastries\\b|\\bpastry\\b', role: 'dessert', kinds: ['bakery'], cuisines: [], label: 'Bakery' },
  { source: '\\bdonuts?\\b|\\bdoughnuts?\\b', role: 'dessert', kinds: ['donut'], cuisines: [], label: 'Donuts' },
  { source: '\\bdesserts?\\b|\\bsweets?\\b', role: 'dessert', kinds: ['dessert'], cuisines: [], label: 'Dessert' },
  { source: '\\bcocktails?\\b', role: 'drinks', kinds: ['cocktail'], cuisines: [], label: 'Drinks' },
  { source: '\\bwine\\b', role: 'drinks', kinds: ['wine'], cuisines: [], label: 'Wine' },
  { source: '\\bbeers?\\b|\\bbrewer(?:y|ies)\\b|\\bpubs?\\b', role: 'drinks', kinds: ['beer'], cuisines: [], label: 'Beer' },
  { source: '\\bdrinks?\\b|\\bhappy hour\\b|\\bnightcaps?\\b', role: 'drinks', kinds: ['cocktail'], cuisines: [], label: 'Drinks' },
  { source: '\\bbars?\\b', role: 'drinks', kinds: ['cocktail'], cuisines: [], label: 'Drinks' },
  { source: '\\bcoffee\\b|\\bespresso\\b', role: 'coffee', kinds: ['coffee'], cuisines: [], label: 'Coffee' },
  { source: '\\bramen\\b', role: 'meal', kinds: [], cuisines: ['ramen'], label: 'Ramen' },
  { source: '\\bsushi\\b|\\bomakase\\b', role: 'meal', kinds: [], cuisines: ['sushi'], label: 'Sushi' },
  { source: '\\bpizza\\b|\\bpizzeria\\b', role: 'meal', kinds: [], cuisines: ['pizza'], label: 'Pizza' },
  { source: '\\btacos?\\b|\\bmexican\\b', role: 'meal', kinds: [], cuisines: ['mexican'], label: 'Tacos' },
  { source: '\\bitalian\\b|\\bpasta\\b', role: 'meal', kinds: [], cuisines: ['italian'], label: 'Italian' },
  { source: '\\bburgers?\\b', role: 'meal', kinds: [], cuisines: ['burger'], label: 'Burgers' },
  { source: '\\bdinner\\b', role: 'meal', kinds: [], cuisines: [], label: 'Dinner' },
  { source: '\\blunch\\b', role: 'meal', kinds: [], cuisines: [], label: 'Lunch' },
  { source: '\\bbrunch\\b', role: 'meal', kinds: [], cuisines: [], label: 'Brunch' },
  { source: '\\bbreakfast\\b', role: 'meal', kinds: [], cuisines: [], label: 'Breakfast' },
  { source: '\\brestaurant\\b', role: 'meal', kinds: [], cuisines: [], label: 'Dinner' },
]

const MEAL_LABELS = new Set(['Dinner', 'Lunch', 'Brunch', 'Breakfast'])

type Hit = {
  start: number
  end: number
  role: NightRole
  kinds: string[]
  cuisines: string[]
  label: string
}

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9$]+/g, ' ')
    .trim()
}

function capitalize(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function titleHood(value: string): string {
  return value
    .split(' ')
    .map((word) => (word === 'u' || word === 'id' ? word.toUpperCase() : capitalize(word)))
    .join(' ')
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

export function nightExamples(city: CityId): { label: string; query: string }[] {
  if (city === 'seattle') {
    return [
      { label: 'Date night', query: DATE_NIGHT_PROMPT },
      { label: 'Cozy ramen', query: 'cozy ramen near Capitol Hill under $$' },
    ]
  }
  if (city === 'eastside') {
    return [
      { label: 'Bellevue date night', query: EASTSIDE_NIGHT_PROMPT },
      { label: 'Ramen in Bellevue', query: 'ramen in Bellevue' },
    ]
  }
  return [
    { label: 'Date night', query: 'Date night. Drinks first, then dinner, then dessert.' },
    { label: 'Dinner under $$', query: 'dinner under $$' },
  ]
}

const HOOD_SKIP = new Set(['market', 'center', 'street', 'avenue', 'district', 'square', 'heights', 'village', 'beach', 'house', 'place', 'north', 'south', 'point', 'water', 'union'])

function findHood(query: string, places: SlimPlace[]): string | undefined {
  const q = ` ${norm(query)} `
  const phrases: { match: string; needle: string }[] = []
  for (const place of places) {
    const name = norm(place.neighborhood)
    if (name.length >= 4) phrases.push({ match: name, needle: name })
    for (const word of name.split(' ')) {
      if (word.length >= 6 && !HOOD_SKIP.has(word)) phrases.push({ match: word, needle: word })
    }
  }
  for (const [alias, needle] of HOOD_ALIASES) phrases.push({ match: alias, needle })
  phrases.sort((a, b) => b.match.length - a.match.length)
  for (const phrase of phrases) {
    if (q.includes(` ${phrase.match} `)) return phrase.needle
  }
  return undefined
}

function inHood(neighborhood: string, hood: string): boolean {
  const name = norm(neighborhood)
  const needle = norm(hood)
  if (!name || !needle) return false
  return name === needle || name.includes(needle)
}

function cheapAsked(query: string): boolean {
  return /\b(cheap|budget|inexpensive)\b/i.test(query)
}

function openAsked(query: string): boolean {
  return /\b(open now|right now|open tonight|currently open)\b/i.test(query)
}

function priceAsked(query: string): number | undefined {
  const under = query.match(/\b(?:under|below|less than|max|up to)\s+(\${1,4})\b/i)
  if (under) return under[1].length
  const exact = query.match(/(?:^|\s)(\${1,4})(?:\s|$)/)
  return exact ? exact[1].length : undefined
}

function vibesIn(query: string): NightVibe[] {
  const vibe: NightVibe[] = []
  if (/\b(date|romantic|romance)\b/i.test(query)) vibe.push('date')
  if (/\b(cozy|intimate|quiet)\b/i.test(query)) vibe.push('cozy')
  if (/\b(fancy|splurge|fine dining|special occasion)\b/i.test(query)) vibe.push('fancy')
  if (/\b(rooftop|waterfront|with a view|views?)\b/i.test(query)) vibe.push('view')
  if (/\b(family|kids?)\b/i.test(query)) vibe.push('family')
  return vibe
}

function labelFor(role: NightRole, kinds: string[], cuisines: string[], mealLabel: string): string {
  if (kinds.includes('ice-cream')) return 'Ice cream'
  if (kinds.includes('bakery') && role === 'dessert') return 'Bakery'
  if (kinds.includes('donut') && role === 'dessert') return 'Donuts'
  if (role === 'drinks') {
    if (kinds.includes('wine') && !kinds.includes('cocktail') && !kinds.includes('beer')) return 'Wine'
    if (kinds.includes('beer') && !kinds.includes('cocktail')) return 'Beer'
    return 'Drinks'
  }
  if (role === 'coffee') return 'Coffee'
  if (MEAL_LABELS.has(mealLabel)) return mealLabel
  if (cuisines.length === 1) return capitalize(cuisines[0])
  if (role === 'dessert') return 'Dessert'
  return 'Dinner'
}

function finish(stops: NightStop[], query: string, places: SlimPlace[]): NightIntent {
  const cheap = cheapAsked(query)
  let priceMax = priceAsked(query)
  if (cheap) priceMax = Math.min(priceMax ?? 1, 1)
  const vibe = vibesIn(query)
  const neighborhood = findHood(query, places)
  let next = stops
  if (!next.length && (cheap || vibe.length || neighborhood || priceMax !== undefined || openAsked(query))) {
    next = [{
      role: 'meal',
      label: cheap ? 'Cheap eats' : vibe.includes('date') ? 'Date night' : 'Places',
      kinds: [],
      cuisines: [],
    }]
  }
  return {
    mode: next.length >= 2 ? 'itinerary' : 'list',
    vibe,
    ...(priceMax ? { priceMax } : {}),
    cheap,
    openNow: openAsked(query),
    ...(neighborhood ? { neighborhood } : {}),
    stops: next,
  }
}

export function parseNightQuery(query: string, places: SlimPlace[]): NightIntent {
  const hits: Hit[] = []
  for (const finder of FINDERS) {
    const re = new RegExp(finder.source, 'gi')
    for (const match of query.matchAll(re)) {
      const start = match.index ?? 0
      const end = start + match[0].length
      const overlap = hits.find((hit) => start < hit.end && end > hit.start)
      if (overlap) {
        if (end - start > overlap.end - overlap.start) {
          overlap.start = start
          overlap.end = end
          overlap.role = finder.role
          overlap.kinds = [...finder.kinds]
          overlap.cuisines = [...finder.cuisines]
          overlap.label = finder.label
        }
        continue
      }
      hits.push({
        start,
        end,
        role: finder.role,
        kinds: [...finder.kinds],
        cuisines: [...finder.cuisines],
        label: finder.label,
      })
    }
  }
  hits.sort((a, b) => a.start - b.start)
  const groups: Hit[] = []
  for (const hit of hits) {
    const prev = groups[groups.length - 1]
    const between = prev ? query.slice(prev.end, hit.start) : ''
    const split = /\b(?:then|after|before|followed by)\b/i.test(between)
    if (prev && !split && prev.role === hit.role) {
      prev.kinds = unique([...prev.kinds, ...hit.kinds])
      prev.cuisines = unique([...prev.cuisines, ...hit.cuisines])
      prev.end = hit.end
      if (MEAL_LABELS.has(hit.label)) prev.label = hit.label
      continue
    }
    groups.push({ ...hit, kinds: [...hit.kinds], cuisines: [...hit.cuisines] })
  }
  const stops: NightStop[] = []
  for (const group of groups) {
    const label = labelFor(group.role, group.kinds, group.cuisines, group.label)
    const prev = stops[stops.length - 1]
    if (prev && prev.role === group.role && prev.label === label && sameList(prev.kinds, group.kinds) && sameList(prev.cuisines, group.cuisines)) continue
    stops.push({ role: group.role, label, kinds: group.kinds, cuisines: group.cuisines })
  }
  return finish(stops, query, places)
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index])
}

function roleGrounded(role: NightRole, query: string): boolean {
  if (role === 'drinks') return /\b(cocktails?|drinks?|wine|beers?|brewer(?:y|ies)|pubs?|happy hour|nightcaps?|bars?)\b/i.test(query)
  if (role === 'dessert') return /\b(ice cream|gelato|desserts?|baker(?:y|ies)|pastr(?:y|ies)|donuts?|doughnuts?|sweets?|scoops?|soft serve)\b/i.test(query)
  if (role === 'coffee') return /\b(coffee|espresso)\b/i.test(query)
  return /\b(dinner|lunch|brunch|breakfast|ramen|sushi|pizza|pizzeria|tacos?|mexican|italian|pasta|restaurant|burgers?)\b/i.test(query)
}

function kindGrounded(kind: string, query: string): boolean {
  if (kind === 'cocktail') return /\b(cocktails?|drinks?|nightcaps?|bars?|happy hour)\b/i.test(query)
  if (kind === 'wine') return /\bwine\b/i.test(query)
  if (kind === 'beer') return /\b(beers?|brewer(?:y|ies)|pubs?)\b/i.test(query)
  if (kind === 'ice-cream') return /\b(ice cream|gelato|scoops?|soft serve)\b/i.test(query)
  if (kind === 'dessert') return /\b(desserts?|sweets?)\b/i.test(query)
  if (kind === 'bakery') return /\b(baker(?:y|ies)|pastr(?:y|ies))\b/i.test(query)
  if (kind === 'donut') return /\b(donuts?|doughnuts?)\b/i.test(query)
  if (kind === 'coffee') return /\b(coffee|espresso)\b/i.test(query)
  return false
}

function vibeGrounded(vibe: NightVibe, query: string): boolean {
  return vibesIn(query).includes(vibe)
}

/** Keep a model parse only when every constraint is already in the person's words. */
export function acceptNightIntent(raw: unknown, query: string, places: SlimPlace[]): NightIntent | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (!Array.isArray(row.stops) || row.stops.length === 0 || row.stops.length > 4) return null
  const stops: NightStop[] = []
  for (const item of row.stops) {
    if (!item || typeof item !== 'object') return null
    const stop = item as Record<string, unknown>
    if (typeof stop.role !== 'string' || !ROLES.has(stop.role as NightRole)) return null
    const role = stop.role as NightRole
    if (!roleGrounded(role, query)) return null
    const kinds = Array.isArray(stop.kinds)
      ? unique(stop.kinds.filter((kind): kind is string => typeof kind === 'string' && KINDS.has(kind) && kindGrounded(kind, query))).slice(0, 4)
      : []
    const cuisines = Array.isArray(stop.cuisines)
      ? unique(
          stop.cuisines
            .filter((cuisine): cuisine is string => typeof cuisine === 'string' && norm(cuisine).length >= 3 && norm(query).includes(norm(cuisine)))
            .map((cuisine) => norm(cuisine)),
        ).slice(0, 3)
      : []
    const mealLabel = typeof stop.label === 'string' && MEAL_LABELS.has(stop.label) ? stop.label : ''
    stops.push({ role, label: labelFor(role, kinds, cuisines, mealLabel), kinds, cuisines })
  }
  const collapsed: NightStop[] = []
  for (const stop of stops) {
    const prev = collapsed[collapsed.length - 1]
    if (prev && prev.role === stop.role && prev.label === stop.label && sameList(prev.kinds, stop.kinds) && sameList(prev.cuisines, stop.cuisines)) continue
    collapsed.push(stop)
  }
  if (!collapsed.length) return null
  const vibe = Array.isArray(row.vibe)
    ? unique(row.vibe.filter((item): item is NightVibe => typeof item === 'string' && VIBES.has(item as NightVibe) && vibeGrounded(item as NightVibe, query))) as NightVibe[]
    : []
  const cheap = row.cheap === true && cheapAsked(query)
  let priceMax: number | undefined
  if (typeof row.priceMax === 'number' && Number.isInteger(row.priceMax) && row.priceMax >= 1 && row.priceMax <= 4 && (query.includes('$') || cheap)) {
    priceMax = row.priceMax
  }
  const asked = priceAsked(query)
  if (asked && priceMax && priceMax > asked) priceMax = asked
  if (cheap) priceMax = 1
  let neighborhood: string | undefined
  if (typeof row.neighborhood === 'string') {
    const needle = norm(row.neighborhood)
    const q = ` ${norm(query)} `
    if (needle.length >= 4 && q.includes(` ${needle} `) && places.some((place) => inHood(place.neighborhood, needle))) neighborhood = needle
  }
  return {
    mode: collapsed.length >= 2 ? 'itinerary' : 'list',
    vibe,
    ...(priceMax ? { priceMax } : {}),
    cheap,
    openNow: row.openNow === true && openAsked(query),
    ...(neighborhood ? { neighborhood } : {}),
    stops: collapsed,
  }
}

function isSubsequence(longer: string[], shorter: string[]): boolean {
  let index = 0
  for (const item of longer) {
    if (item === shorter[index]) index += 1
    if (index >= shorter.length) return true
  }
  return index >= shorter.length
}

/** The keyword parse wins. A grounded reading can add a stop or fill a blank, and cannot drop one. */
export function selectIntent(local: NightIntent, model: NightIntent | null): { intent: NightIntent; usedModel: boolean } {
  if (!model || model.stops.length === 0) return { intent: local, usedModel: false }
  if (local.stops.length === 0) return { intent: model, usedModel: true }
  const localRoles = local.stops.map((stop) => stop.role)
  const modelRoles = model.stops.map((stop) => stop.role)
  if (!isSubsequence(modelRoles, localRoles)) return { intent: local, usedModel: false }
  if (model.stops.length === local.stops.length) {
    return {
      usedModel: true,
      intent: {
        ...local,
        vibe: unique([...local.vibe, ...model.vibe]) as NightVibe[],
        priceMax: local.priceMax ?? model.priceMax,
        cheap: local.cheap || model.cheap,
        openNow: local.openNow || model.openNow,
        neighborhood: local.neighborhood ?? model.neighborhood,
        stops: local.stops.map((stop, index) => ({
          ...stop,
          kinds: stop.kinds.length ? stop.kinds : model.stops[index]?.kinds ?? [],
          cuisines: stop.cuisines.length ? stop.cuisines : model.stops[index]?.cuisines ?? [],
        })),
      },
    }
  }
  return {
    usedModel: true,
    intent: {
      ...model,
      vibe: unique([...local.vibe, ...model.vibe]) as NightVibe[],
      priceMax: model.priceMax ?? local.priceMax,
      cheap: model.cheap || local.cheap,
      openNow: model.openNow || local.openNow,
      neighborhood: model.neighborhood ?? local.neighborhood,
    },
  }
}

type Spec = NightStop & {
  vibe: NightVibe[]
  priceMax?: number
  cheap: boolean
  openNow: boolean
  neighborhood?: string
  now: Date
}

function cheapBlocked(place: SlimPlace, cheap: boolean): boolean {
  return cheap && CHEAP_BLOCK.has(place.id) && asCityId(place.city) === 'seattle'
}

function cuisineHit(place: SlimPlace, cuisine: string): boolean {
  const blob = norm(`${place.cuisine.join(' ')} ${place.name} ${place.placeType}`)
  return blob.includes(norm(cuisine))
}

function wantsEvening(spec: Spec): boolean {
  if (spec.label === 'Breakfast' || spec.label === 'Brunch' || spec.label === 'Lunch' || spec.role === 'coffee') return false
  if (spec.vibe.includes('date') || spec.label === 'Dinner' || spec.role === 'drinks') return true
  return spec.role === 'dessert' && spec.kinds.includes('ice-cream')
}

function servesEvening(place: SlimPlace): boolean | null {
  if (!place.periods?.length) return null
  const open = 17 * 60
  const shut = 22 * 60
  return place.periods.some((period) => {
    if (period.end === period.start) return false
    const finish = period.end > period.start ? period.end : period.end + 1440
    return period.start < shut && finish > open
  })
}

function onDateList(place: SlimPlace): boolean {
  return place.guideSlugs.some((slug) => slug === 'date-night' || slug.endsWith('-date-night'))
}

function drinksScore(place: SlimPlace, kinds: string[], vibe: NightVibe[]): number {
  const type = norm(place.placeType)
  const cuisine = norm(place.cuisine.join(' '))
  const guides = place.guideSlugs
  const dive = /dive|sports|arcade|games/.test(type)
  let best = -1
  const take = (ok: boolean, points: number) => {
    if (ok) best = Math.max(best, points)
  }
  const wantCocktail = kinds.includes('cocktail') || kinds.length === 0
  if (wantCocktail) {
    take(guides.includes('cocktail-bars') || /cocktail/.test(type), 70)
    take(/wine/.test(type) || guides.includes('wine-bars'), 42)
    take(/\b(bar|lounge|pub)\b/.test(type) && !dive, 30)
    take(dive, vibe.includes('date') ? 6 : 22)
  }
  if (kinds.includes('wine')) take(/wine/.test(type) || /wine/.test(cuisine) || guides.includes('wine-bars'), 74)
  if (kinds.includes('beer')) take(/brewery|beer|pub/.test(type) || guides.some((slug) => slug.includes('beer')), 74)
  if (vibe.includes('date') && dive) best -= 28
  if (vibe.includes('date') && /ginger/.test(cuisine)) best -= 22
  return best
}

function dessertScore(place: SlimPlace, kinds: string[]): number {
  const blob = norm(`${place.placeType} ${place.cuisine.join(' ')}`)
  const ice = /ice cream|gelato/.test(blob)
  const froyo = /frozen yogurt/.test(blob)
  const bakery = /bakery|pastry|patisserie/.test(blob)
  const donut = /donut|doughnut/.test(blob)
  const dessert = place.placeType.toLowerCase() === 'dessert' || /dessert/.test(blob)
  if (kinds.includes('ice-cream')) {
    if (ice) return 80
    if (froyo) return 34
    return -1
  }
  if (kinds.includes('bakery')) {
    if (bakery) return 72
    if (dessert) return 20
    return -1
  }
  if (kinds.includes('donut')) return donut ? 72 : -1
  if (ice) return 64
  if (bakery || donut || dessert) return 40
  return -1
}

function mealScore(place: SlimPlace, spec: Spec): number {
  if (spec.cheap && spec.cuisines.length === 0 && spec.kinds.length === 0) {
    if (place.price !== 1) return -1
    return 28 + (place.guideSlugs.includes('cheap-eats') ? 24 : 0)
  }
  if (spec.cuisines.length) {
    if (!spec.cuisines.some((cuisine) => cuisineHit(place, cuisine))) return -1
  } else if (!isRestaurant(place)) return -1
  const blob = norm(`${place.placeType} ${place.cuisine.join(' ')}`)
  if (!spec.cuisines.length && /ice cream|gelato|bakery|donut/.test(blob)) return -1
  let score = 26
  if (spec.cuisines.some((cuisine) => cuisineHit(place, cuisine))) score += 36
  if (spec.vibe.includes('date') && onDateList(place)) score += 36
  if (spec.vibe.includes('date') && place.perfectFor.some((tag) => norm(tag) === 'date night')) score += 12
  return score
}

function coffeeScore(place: SlimPlace): number {
  const type = norm(place.placeType)
  const cuisine = norm(place.cuisine.join(' '))
  if (/coffee/.test(type) || /coffee/.test(cuisine) || place.guideSlugs.some((slug) => slug.includes('coffee'))) return 60
  if (/cafe/.test(type)) return 36
  return -1
}

function roleScore(place: SlimPlace, spec: Spec): number {
  if (spec.role === 'drinks') return drinksScore(place, spec.kinds, spec.vibe)
  if (spec.role === 'dessert') return dessertScore(place, spec.kinds)
  if (spec.role === 'coffee') return coffeeScore(place)
  return mealScore(place, spec)
}

type Ranked = { place: SlimPlace; score: number; evening: boolean | null }

function rankStop(places: SlimPlace[], spec: Spec, scoreOf: ScoreOf): Ranked[] {
  const ranked: Ranked[] = []
  for (const place of places) {
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) continue
    if (cheapBlocked(place, spec.cheap)) continue
    if (spec.priceMax && (place.price == null || place.price > spec.priceMax)) continue
    if (spec.neighborhood && !inHood(place.neighborhood, spec.neighborhood)) continue
    if (spec.openNow && !isPlaceOpen(place, spec.now)) continue
    let score = roleScore(place, spec)
    if (score < 0) continue
    const evening = servesEvening(place)
    if (wantsEvening(spec)) {
      if (evening === true) score += 6
      if (evening === false) score -= 8
    }
    if (spec.vibe.includes('date') && (place.price === 2 || place.price === 3)) score += 8
    if (spec.vibe.includes('fancy') && (place.price ?? 0) >= 3) score += 10
    if (spec.vibe.includes('cozy') && place.price != null && place.price <= 2) score += 6
    if (spec.vibe.includes('view') && (/rooftop/.test(norm(place.placeType)) || place.perfectFor.some((tag) => /view|waterfront/i.test(tag)))) score += 16
    const gusto = scoreOf(place.id)
    if (gusto != null) score += gusto * 6
    ranked.push({ place, score, evening })
  }
  ranked.sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name) || a.place.id.localeCompare(b.place.id))
  return ranked
}

function listedOn(place: SlimPlace, spec: Spec, guides: GuideSummary[]): string | null {
  const prefer: string[] = []
  if (spec.role === 'drinks') {
    if (spec.kinds.includes('wine')) prefer.push('wine-bars')
    if (spec.kinds.includes('beer')) prefer.push('beer', 'eastside-breweries')
    prefer.push('cocktail-bars', 'the-bar-list')
  } else if (spec.role === 'dessert') {
    if (spec.kinds.includes('ice-cream')) prefer.push('ice-cream')
    if (spec.kinds.includes('bakery')) prefer.push('best-bakeries')
    if (spec.kinds.includes('donut')) prefer.push('donuts-bagels')
  } else if (spec.role === 'coffee') prefer.push('best-coffee', 'eastside-coffee')
  else if (spec.cheap) prefer.push('cheap-eats')
  for (const slug of prefer) {
    if (!place.guideSlugs.includes(slug)) continue
    const title = guides.find((guide) => guide.slug === slug)?.title
    if (title) return title
  }
  if (spec.role === 'meal' && spec.vibe.includes('date')) {
    const slug = place.guideSlugs.find((item) => item === 'date-night' || item.endsWith('-date-night'))
    if (slug) return guides.find((guide) => guide.slug === slug)?.title ?? null
  }
  return null
}

function whyPick(place: SlimPlace, spec: Spec, guides: GuideSummary[], score: number | null, evening: boolean | null): string {
  const listed = listedOn(place, spec, guides)
  const head = listed
    ? `Listed on ${listed}.`
    : spec.cuisines.length
      ? `${spec.cuisines.map((cuisine) => capitalize(cuisine)).join(' and ')} from the guide.`
      : `${capitalize(place.placeType)} from the guide.`
  const scored = score != null ? `Gusto's Score ${score.toFixed(1)}.` : ''
  const hours = wantsEvening(spec) && evening === false ? 'Hours in the guide do not show an evening opening.' : ''
  return [head, scored, hours].filter(Boolean).join(' ')
}

function gapFor(spec: Spec, city: CityId): string {
  const area = areaPhrase(city)
  const where = spec.neighborhood ? titleHood(spec.neighborhood) : area
  if (spec.kinds.includes('ice-cream')) return `No ice cream or gelato in ${where}.`
  if (spec.openNow) return `Nothing for ${spec.label.toLowerCase()} is open right now in the published hours.`
  return `No ${spec.label.toLowerCase()} in ${where} fits.`
}

type Chain = { picks: Ranked[]; maxLeg: number }

function chainStops(pools: Ranked[][], maxLeg: number): Chain | null {
  if (!pools.length || pools.some((pool) => pool.length === 0)) return null
  type Node = { picks: Ranked[]; quality: number; walk: number; maxLeg: number }
  let beam: Node[] = pools[0].slice(0, 18).map((row) => ({ picks: [row], quality: row.score, walk: 0, maxLeg: 0 }))
  for (let index = 1; index < pools.length; index += 1) {
    const next: Node[] = []
    const options = pools[index].slice(0, 18)
    for (const node of beam) {
      const prev = node.picks[node.picks.length - 1].place
      for (const row of options) {
        if (node.picks.some((pick) => pick.place.id === row.place.id)) continue
        const miles = milesBetween(prev, row.place)
        if (miles > maxLeg) continue
        const penalty = miles * 30 + (miles > 0.4 ? (miles - 0.4) * 55 : 0)
        next.push({
          picks: [...node.picks, row],
          quality: node.quality + row.score - penalty,
          walk: node.walk + miles,
          maxLeg: Math.max(node.maxLeg, miles),
        })
      }
    }
    if (!next.length) return null
    next.sort((a, b) => b.quality - a.quality || a.maxLeg - b.maxLeg || a.walk - b.walk)
    beam = next.slice(0, 16)
  }
  const best = beam[0]
  return best ? { picks: best.picks, maxLeg: best.maxLeg } : null
}

function walkLeg(miles: number): NightLeg {
  const minutes = Math.max(1, Math.round(miles * 20))
  return { miles, minutes, label: `${formatMiles(miles)} · ${minutes} min walk` }
}

export function planNight(
  query: string,
  city: CityId,
  places: SlimPlace[],
  guides: GuideSummary[],
  scoreOf: ScoreOf = () => null,
  now = new Date(),
  intent?: NightIntent | null,
): NightResult {
  const cityPlaces = places.filter((place) => !place.closed && asCityId(place.city) === city)
  const parsed = intent ?? parseNightQuery(query, cityPlaces)
  const empty = (summary: string): NightResult => ({ mode: 'empty', picks: [], legs: [], gaps: [], summary })
  if (!query.trim()) return empty('')
  if (!parsed.stops.length) return empty(`Nothing in ${areaPhrase(city)} fits that.`)

  const specs: Spec[] = parsed.stops.map((stop) => ({
    ...stop,
    vibe: parsed.vibe,
    ...(parsed.priceMax ? { priceMax: parsed.priceMax } : {}),
    cheap: parsed.cheap,
    openNow: parsed.openNow,
    ...(parsed.neighborhood ? { neighborhood: parsed.neighborhood } : {}),
    now,
  }))
  const ranked = specs.map((spec) => rankStop(cityPlaces, spec, scoreOf))
  const gaps: string[] = []
  const kept: { spec: Spec; pool: Ranked[] }[] = []
  ranked.forEach((pool, index) => {
    if (pool.length) kept.push({ spec: specs[index], pool })
    else gaps.push(gapFor(specs[index], city))
  })
  if (!kept.length) {
    return { mode: 'empty', picks: [], legs: [], gaps, summary: `Nothing in ${areaPhrase(city)} fits that.` }
  }

  let chosen: Ranked[]
  if (parsed.mode === 'list' || kept.length === 1 && parsed.mode !== 'itinerary') {
    chosen = kept[0].pool.slice(0, 8)
  } else if (kept.length === 1) {
    chosen = kept[0].pool.slice(0, 1)
  } else {
    const pools = kept.map((row) => row.pool)
    const tight = chainStops(pools, 1.2) ?? chainStops(pools, 3) ?? chainStops(pools, 12)
    chosen = tight ? tight.picks : pools.map((pool) => pool[0])
  }

  const picks: NightPick[] = chosen.map((row, index) => {
    const spec = kept.length === chosen.length ? kept[index].spec : kept[0].spec
    return {
      place: row.place,
      role: spec.role,
      label: spec.label,
      why: whyPick(row.place, spec, guides, scoreOf(row.place.id), row.evening),
    }
  })
  const legs: NightLeg[] = []
  if (picks.length > 1 && kept.length === picks.length) {
    for (let index = 1; index < picks.length; index += 1) {
      legs.push(walkLeg(milesBetween(picks[index - 1].place, picks[index].place)))
    }
  }
  if (legs.some((leg) => leg.miles > 1)) {
    gaps.push('These stops are the closest matches, and at least one walk is longer than a mile.')
  }
  const mode = parsed.mode === 'itinerary' && (picks.length > 1 || gaps.length > 0) ? 'itinerary' : 'list'
  const summary = mode === 'itinerary'
    ? `${picks.map((pick, index) => (index === 0 ? pick.label : pick.label.toLowerCase())).join(', then ')} in ${areaPhrase(city)}.`
    : `${picks.length} ${picks.length === 1 ? 'place' : 'places'} in ${areaPhrase(city)}.`
  return { mode, picks, legs, gaps, summary }
}
