import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const eastside = JSON.parse(readFileSync(new URL('../src/content/eastside.json', import.meta.url), 'utf8'))
const main = [
  'ascend-prime-steak-and-sushi',
  'daniels-broiler',
  'water-grill-bellevue',
  'la-mar-bellevue',
  'carmines',
  'stk-bellevue',
  'cantinetta-bellevue',
  'cantina-monarca',
  'barons-sino-kitchen-and-bar',
  'wild-ginger',
  'farzi-cafe',
  'seastar-restaurant-and-raw-bar',
  'castilla',
  'fern-thai-on-main',
  'joey-bellevue',
  'monsoon-bellevue',
  'fogo-de-chao',
]
const japanese = [
  'minamoto',
  'ramen-nori',
  'hokkaido-ramen-santouka',
  'japonessa',
  'ginza',
  'fob-poke-bar-bellevue',
  'rolls-and-rolls',
  'kura-revolving-sushi',
  'takai-by-kashiba',
]
const bellevue = eastside.guides.find((guide) => guide.slug === 'bellevue')
const japaneseGuide = eastside.guides.find((guide) => guide.slug === 'japanese-food-in-bellevue')
assert.equal(bellevue.title, 'Bellevue Essentials')
assert.equal(bellevue.group, 'Neighborhoods')
assert.equal(bellevue.city, 'eastside')
assert.deepEqual(bellevue.entries.map((entry) => entry.placeId), main)
assert.equal(japaneseGuide.title, 'Japanese food in Bellevue')
assert.equal(japaneseGuide.group, 'Cuisine')
assert.deepEqual(japaneseGuide.entries.map((entry) => entry.placeId), japanese)
assert.equal(japaneseGuide.dek.includes('FOB Poke Bar'), true)

const byId = new Map(eastside.places.map((place) => [place.id, place]))
assert.equal(eastside.places.length, 81)
for (const id of ['desi-tadka', 'dough-zone-bellevue', 'pagliacci-pizza', 'ezells-famous-chicken', 'barrels-wine-bar']) {
  assert.ok(byId.has(id), id)
  assert.equal(byId.get(id).guideSlugs.includes('bellevue'), false, id)
}
for (const id of main) assert.equal(byId.get(id).guideSlugs.includes('bellevue'), true, id)
for (const id of japanese) {
  assert.equal(byId.get(id).guideSlugs.includes('japanese-food-in-bellevue'), true, id)
  assert.equal(byId.get(id).guideSlugs.includes('bellevue'), false, id)
}
assert.equal(byId.get('japonessa').guideSlugs.includes('eastside-asian'), true)
assert.equal(byId.get('fob-poke-bar-bellevue').name, 'FOB Poke Bar')
const drinks = eastside.guides.find((guide) => guide.slug === 'eastside-drinks')
assert.equal(drinks.entries.length, 12)
assert.equal(eastside.guides.find((guide) => guide.slug === 'eastside-brunch').entries.length, 5)
assert.equal(eastside.guides.find((guide) => guide.slug === 'best-of-bellevue').entries.length, 6)
assert.equal(eastside.guides.find((guide) => guide.slug === 'kirkland').entries.length, 12)
console.log('bellevue essentials ok')
