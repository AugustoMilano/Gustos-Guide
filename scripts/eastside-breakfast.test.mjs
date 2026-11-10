import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { rankByHouseScore } from '../src/lib/guide-rank.ts'

const eastside = JSON.parse(readFileSync(new URL('../src/content/eastside.json', import.meta.url), 'utf8'))
const order = [
  'village-square-cafe',
  'deru-market',
  'sparrow',
  'semicolon-cafe',
  'lexperience-paris',
  'doppio-cafe-and-creperie',
  'farine-bakery',
  'chaces-pancake-corral',
  'third-culture-coffee',
  'the-british-pantry',
  'lil-jon-restaurant-and-lounge',
  '13-coins',
]
const guide = eastside.guides.find((item) => item.slug === 'best-breakfast-on-the-east-side')
assert.equal(guide.title, 'Best Breakfast on the East Side')
assert.equal(guide.group, 'Best of')
assert.deepEqual(guide.entries.map((entry) => entry.placeId), order)
assert.equal(eastside.guides.some((item) => item.slug === 'eastside-brunch'), false)
const byId = new Map(eastside.places.map((place) => [place.id, place]))
for (const id of order) assert.equal(byId.get(id).guideSlugs.includes('best-breakfast-on-the-east-side'), true, id)
for (const id of ['deru-market', 'sparrow', 'farine-bakery', 'the-british-pantry', '13-coins']) {
  assert.equal(byId.get(id).guideSlugs.includes('eastside-brunch'), false, id)
}
assert.equal(byId.get('deru-market').guideSlugs.includes('kirkland'), true)
assert.equal(byId.get('sparrow').guideSlugs.includes('kirkland'), true)
assert.equal(byId.get('the-british-pantry').guideSlugs.includes('redmond'), true)
assert.equal(byId.get('lexperience-paris').price, 2)
assert.equal(byId.get('sparrow').price, 3)
assert.equal(Object.hasOwn(byId.get('village-square-cafe'), 'price'), false)
assert.equal(Object.hasOwn(byId.get('doppio-cafe-and-creperie'), 'price'), false)
assert.equal(Object.hasOwn(byId.get('chaces-pancake-corral'), 'price'), false)
assert.equal(Object.hasOwn(byId.get('lil-jon-restaurant-and-lounge'), 'price'), false)
assert.equal(byId.get('village-square-cafe').address, '16150 NE 85th St, Redmond, WA 98052')
assert.equal(byId.get('doppio-cafe-and-creperie').address, '8296 160th Ave NE, Suite 106, Redmond, WA 98052')
assert.equal(byId.get('chaces-pancake-corral').address, '1606 Bellevue Way SE, Bellevue, WA 98004')
assert.equal(byId.get('lil-jon-restaurant-and-lounge').address, '3080 148th Ave SE, Suite 201, Bellevue, WA 98007')
assert.equal(byId.get('lil-jon-restaurant-and-lounge').website, 'https://liljonrestaurant.net/')
assert.equal(byId.get('chaces-pancake-corral').website, 'https://www.pancakecorral.com/')
assert.equal(byId.get('village-square-cafe').photos[0].source, 'illustration')
assert.equal(byId.get('doppio-cafe-and-creperie').photos[0].credit, 'Illustration')
assert.equal(byId.get('woodblock').blurb.includes('Blake and Cam'), true)
assert.equal(eastside.guides.find((item) => item.slug === 'eastside-drinks').entries.length, 12)
assert.equal(eastside.guides.find((item) => item.slug === 'japanese-food-in-bellevue').entries.length, 9)
assert.equal(eastside.guides.find((item) => item.slug === 'bellevue').entries.length, 15)
assert.equal(eastside.guides.find((item) => item.slug === 'best-of-bellevue').entries.length, 7)
assert.equal(eastside.guides.find((item) => item.slug === 'eastside-date-night').entries.length, 9)
assert.equal(eastside.guides.find((item) => item.slug === 'eastside-asian').title, 'Eastside Asian food')
assert.equal(eastside.guides.find((item) => item.slug === 'eastside-asian').entries.length, 20)

const scores = {
  'village-square-cafe': 8.1,
  'deru-market': 7.8,
  sparrow: 7.7,
  'semicolon-cafe': 7.6,
  'lexperience-paris': 7.3,
  'doppio-cafe-and-creperie': 7.2,
  'farine-bakery': 6.8,
  'chaces-pancake-corral': 6.8,
  'third-culture-coffee': 6.5,
  'the-british-pantry': 6.5,
  'lil-jon-restaurant-and-lounge': 6.5,
  '13-coins': 5.8,
}
const rows = order.map((id) => ({ place: { id, name: byId.get(id).name } }))
const ranked = rankByHouseScore(rows, (id) => scores[id] ?? null, 'guide')
assert.deepEqual(ranked.map((row) => row.place.id), order)
const byName = rankByHouseScore(rows, (id) => scores[id] ?? null)
assert.deepEqual(byName.map((row) => row.place.id).slice(6, 8), ['chaces-pancake-corral', 'farine-bakery'])
assert.deepEqual(byName.map((row) => row.place.id).slice(8, 11), ['lil-jon-restaurant-and-lounge', 'the-british-pantry', 'third-culture-coffee'])
console.log('eastside breakfast ok')
