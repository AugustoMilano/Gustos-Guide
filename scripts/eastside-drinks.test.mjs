import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Prices published on Nov 11, 2026 come from data/price-sources-2026-11-11.json; anything else stays unpriced.
const laterPrices = new Map(
  JSON.parse(readFileSync(new URL('../data/price-sources-2026-11-11.json', import.meta.url), 'utf8')).places.map((row) => [row.id, row.price]),
)
const priceOrLedger = (place) => assert.equal(place.price ?? null, laterPrices.get(place.id) ?? null, place.id)


const eastside = JSON.parse(readFileSync(new URL('../src/content/eastside.json', import.meta.url), 'utf8'))
const order = [
  'woodblock',
  'postdoc-brewing',
  'bellevue-brewing',
  'earls-kitchen-bar',
  'tavern-hall',
  'moss-bay-hall',
  'central-bar-restaurant',
  'palmers-east',
  'central-tavern',
  'the-goose-pub',
  '520-bar-and-grill',
  'civility-and-unrest',
]
const guide = eastside.guides.find((item) => item.slug === 'eastside-drinks')
assert.ok(guide)
assert.equal(guide.title, 'Drinks on the Eastside')
assert.equal(guide.group, 'Drinks')
assert.equal(guide.city, 'eastside')
assert.deepEqual(guide.entries.map((entry) => entry.placeId), order)
assert.equal(guide.entries.some((entry) => entry.placeId === 'barrels-wine-bar'), false)

const byId = new Map(eastside.places.map((place) => [place.id, place]))
for (const id of order) {
  assert.ok(byId.get(id).guideSlugs.includes('eastside-drinks'), id)
}
assert.equal(byId.get('barrels-wine-bar').guideSlugs.includes('eastside-drinks'), false)
assert.equal(byId.get('woodblock').price, 2)
assert.equal(byId.get('moss-bay-hall').price, 2)
priceOrLedger(byId.get('postdoc-brewing'))
for (const id of ['palmers-east', 'central-tavern', 'the-goose-pub']) {
  const place = byId.get(id)
  priceOrLedger(place)
  assert.equal(place.gustoScore, null)
  assert.equal(place.photos[0].source, 'illustration')
  assert.equal(place.photos[0].credit, 'Illustration')
  assert.equal(place.blurb, '')
}
const palmers = byId.get('palmers-east')
assert.equal(palmers.name, "Palmer's East")
assert.equal(palmers.address, '7853 Leary Way NE, Redmond, WA 98052')
assert.equal(palmers.website, 'https://www.facebook.com/PalmersEast')
assert.equal(palmers.lat, 47.6738115)
assert.equal(palmers.lng, -122.1231437)
const central = byId.get('central-tavern')
assert.equal(central.address, '124 Kirkland Ave, Kirkland, WA 98033')
assert.equal(central.website, 'https://www.thestedmangroup.com/centraltavern')
assert.equal(central.website.includes('centralclubkirkland.com'), false)
assert.deepEqual(central.periods, [{ days: [0, 1, 2, 3, 4, 5, 6], start: 960, end: 120 }])
const goose = byId.get('the-goose-pub')
assert.equal(goose.name, 'The Goose Pub & Eatery')
assert.equal(goose.address, '12001 NE 12th Street, Bellevue, WA 98005')
assert.equal(goose.website, 'https://thegoosepub.com/')
assert.equal(goose.lat, 47.6198092)
assert.equal(goose.lng, -122.1788807)
assert.deepEqual(goose.periods, [{ days: [0, 1, 2, 3, 4, 5, 6], start: 600, end: 120 }])
assert.equal(eastside.places.length, 85)
assert.ok(eastside.guides.find((item) => item.slug === 'bellevue'))
assert.equal(eastside.guides.some((item) => item.slug === 'eastside-brunch'), false)
assert.ok(eastside.guides.find((item) => item.slug === 'best-breakfast-on-the-east-side'))
console.log('eastside drinks ok')
