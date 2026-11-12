import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { expandCatalog } from '../src/content/expand-catalog.ts'
import { isRestaurant } from '../src/lib/restaurant.ts'
import {
  acceptNightIntent,
  DATE_NIGHT_PROMPT,
  EASTSIDE_NIGHT_PROMPT,
  parseNightQuery,
  planNight,
  selectIntent,
} from '../src/lib/night-plan.ts'
import type { GuideSummary, SlimPlace } from '../src/types.ts'

const catalog = expandCatalog(JSON.parse(readFileSync(new URL('../src/content/slim-catalog.json', import.meta.url), 'utf8')))
const places = catalog.places
const guides = catalog.guides as GuideSummary[]

function names(city: 'seattle' | 'eastside', query: string, scoreOf?: (id: string) => number | null) {
  const result = planNight(query, city, places, guides, scoreOf)
  return result
}

test('seattle date night is drinks, then dinner, then ice cream within a short walk', () => {
  const result = names('seattle', DATE_NIGHT_PROMPT)
  assert.equal(result.mode, 'itinerary')
  assert.deepEqual(result.picks.map((pick) => pick.role), ['drinks', 'meal', 'dessert'])
  assert.deepEqual(result.picks.map((pick) => pick.label), ['Drinks', 'Dinner', 'Ice cream'])
  assert.equal(result.picks.length, 3)
  assert.equal(result.legs.length, 2)
  for (const pick of result.picks) assert.equal(pick.place.city ?? 'seattle', 'seattle')
  assert.equal(result.picks[0].place.id === 'alibi-room', false)
  assert.match(result.picks[0].place.placeType, /bar|pub|lounge/i)
  assert.equal(isRestaurant(result.picks[1].place), true)
  assert.match(`${result.picks[2].place.cuisine.join(' ')} ${result.picks[2].place.placeType}`, /ice cream|gelato/i)
  for (const leg of result.legs) {
    assert.ok(leg.miles < 0.8, `${leg.label} is too far`)
    assert.match(leg.label, /min walk/)
  }
  for (const pick of result.picks) assert.match(pick.why, /Listed on|from the guide/)
  console.log('seattle', result.picks.map((pick) => `${pick.label}: ${pick.place.name} (${pick.place.neighborhood})`).join(' → '), result.legs.map((leg) => leg.label).join(' | '))
})

test('cozy ramen near Capitol Hill under $$ stays in that neighborhood and price', () => {
  const result = names('seattle', 'cozy ramen near Capitol Hill under $$')
  assert.equal(result.mode, 'list')
  assert.ok(result.picks.length >= 2)
  for (const pick of result.picks) {
    assert.match(pick.place.neighborhood, /Capitol Hill/)
    assert.ok((pick.place.price ?? 99) <= 2)
    assert.match(`${pick.place.name} ${pick.place.cuisine.join(' ')}`, /ramen/i)
    assert.equal(pick.place.city ?? 'seattle', 'seattle')
  }
  console.log('ramen', result.picks.map((pick) => pick.place.name).join(', '))
})

test('owner score lifts a Capitol Hill ramen shop to the front', () => {
  const plain = names('seattle', 'cozy ramen near Capitol Hill under $$')
  const target = plain.picks[plain.picks.length - 1]?.place.id
  assert.ok(target)
  const scored = names('seattle', 'cozy ramen near Capitol Hill under $$', (id) => (id === target ? 9.5 : null))
  assert.equal(scored.picks[0].place.id, target)
  assert.match(scored.picks[0].why, /9\.5/)
})

test('Alibi Room is left out of cheap eats even if its price is $', () => {
  const alibi = places.find((place) => place.id === 'alibi-room')
  assert.ok(alibi)
  const priced = { ...alibi, price: 1 } as SlimPlace
  const pool = places.filter((place) => place.id !== 'alibi-room').concat(priced)
  const result = planNight('cheap eats', 'seattle', pool, guides)
  assert.ok(result.picks.length > 0)
  assert.equal(result.picks.some((pick) => pick.place.id === 'alibi-room'), false)
  for (const pick of result.picks) assert.equal(pick.place.price, 1)
})

test('eastside date-night ice cream is honest and stays on the Eastside', () => {
  const result = names('eastside', DATE_NIGHT_PROMPT)
  assert.ok(result.gaps.some((gap) => /ice cream or gelato/i.test(gap)))
  for (const pick of result.picks) {
    assert.equal(pick.place.city, 'eastside')
    assert.doesNotMatch(`${pick.place.cuisine.join(' ')} ${pick.place.name}`, /ice cream|gelato/i)
  }
  console.log('eastside ice', result.summary, result.gaps.join(' '))
})

test('eastside Bellevue night is drinks, dinner, and a bakery within a walk', () => {
  const result = names('eastside', EASTSIDE_NIGHT_PROMPT)
  assert.equal(result.mode, 'itinerary')
  assert.deepEqual(result.picks.map((pick) => pick.role), ['drinks', 'meal', 'dessert'])
  assert.equal(result.picks[2].label, 'Bakery')
  for (const pick of result.picks) {
    assert.equal(pick.place.city, 'eastside')
    assert.match(pick.place.neighborhood, /Bellevue/i)
  }
  for (const leg of result.legs) assert.ok(leg.miles < 2, leg.label)
  console.log('eastside', result.picks.map((pick) => `${pick.label}: ${pick.place.name} (${pick.place.neighborhood}) ${pick.why}`).join(' → '))
  console.log(result.legs.map((leg) => leg.label).join(' | '))
})

test('a city only contributes its own places', () => {
  const result = names('seattle', 'pizza')
  assert.ok(result.picks.length > 0)
  for (const pick of result.picks) assert.equal(pick.place.city ?? 'seattle', 'seattle')
})

test('an unmatched craving says so', () => {
  const result = names('seattle', 'martian brine tartare')
  assert.equal(result.picks.length, 0)
  assert.match(result.summary, /Nothing in Seattle fits/)
})

test('a model parse cannot drop a stop or invent a neighborhood', () => {
  const local = parseNightQuery(DATE_NIGHT_PROMPT, places.filter((place) => (place.city ?? 'seattle') === 'seattle'))
  assert.deepEqual(local.stops.map((stop) => stop.role), ['drinks', 'meal', 'dessert'])
  const dropped = acceptNightIntent({ mode: 'list', stops: [{ role: 'meal', label: 'Dinner', kinds: [], cuisines: [] }] }, DATE_NIGHT_PROMPT, places)
  assert.ok(dropped)
  const picked = selectIntent(local, dropped)
  assert.equal(picked.usedModel, false)
  assert.deepEqual(picked.intent.stops.map((stop) => stop.role), ['drinks', 'meal', 'dessert'])
  const invented = acceptNightIntent(
    { stops: [{ role: 'meal', kinds: [], cuisines: ['ramen'], neighborhood: 'Narnia' }], neighborhood: 'Narnia' },
    'ramen near Capitol Hill',
    places,
  )
  assert.equal(invented?.neighborhood, undefined)
  assert.deepEqual(invented?.stops[0]?.cuisines, ['ramen'])
})
