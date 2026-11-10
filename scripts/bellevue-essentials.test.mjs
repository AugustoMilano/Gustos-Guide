import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const eastside = JSON.parse(readFileSync(new URL('../src/content/eastside.json', import.meta.url), 'utf8'))
const main = [
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
const best = eastside.guides.find((guide) => guide.slug === 'best-of-bellevue')
assert.equal(best.title, 'Best of Bellevue')
assert.equal(best.entries.filter((entry) => entry.placeId === 'daniels-broiler').length, 1)
assert.equal(best.entries.filter((entry) => entry.placeId === 'ascend-prime-steak-and-sushi').length, 1)
assert.equal(best.entries.length, 7)
assert.equal(byId.get('daniels-broiler').guideSlugs.includes('bellevue'), false)
assert.equal(byId.get('daniels-broiler').guideSlugs.includes('best-of-bellevue'), true)
assert.equal(byId.get('ascend-prime-steak-and-sushi').guideSlugs.includes('bellevue'), false)
assert.equal(byId.get('ascend-prime-steak-and-sushi').guideSlugs.includes('best-of-bellevue'), true)
const dateNight = eastside.guides.find((guide) => guide.slug === 'eastside-date-night')
const dateIds = dateNight.entries.map((entry) => entry.placeId)
assert.deepEqual(dateIds.slice(0, 8), [
  'john-howie-steak',
  'seastar-restaurant-and-raw-bar',
  'como',
  'fogo-de-chao',
  'cafe-juanita',
  'bis-on-main',
  'takai-by-kashiba',
  'ristorante-paradiso',
])
assert.equal(dateIds.at(-1), 'ascend-prime-steak-and-sushi')
assert.equal(dateIds.filter((id) => id === 'ascend-prime-steak-and-sushi').length, 1)
assert.equal(byId.get('ascend-prime-steak-and-sushi').guideSlugs.includes('eastside-date-night'), true)
assert.deepEqual(byId.get('ascend-prime-steak-and-sushi').guideSlugs, ['best-of-bellevue', 'eastside-date-night'])
assert.equal(byId.get('ascend-prime-steak-and-sushi').gustoScore, null)
assert.equal(byId.get('woodblock').blurb.includes('The bartending staff are the best in the business—especially Blake and Cam.'), true)
assert.equal(byId.get('woodblock').blurb.includes('thousand bottles'), true)
assert.equal(byId.get('woodblock').oneLiner.includes('whiskey wall'), true)
assert.equal(eastside.guides.find((guide) => guide.slug === 'kirkland').entries.length, 12)
const asian = eastside.guides.find((guide) => guide.slug === 'eastside-asian')
assert.equal(asian.title, 'Eastside Asian food')
assert.equal(asian.slug, 'eastside-asian')
assert.equal(asian.entries.length, 20)
assert.equal(eastside.guides.find((guide) => guide.slug === 'japanese-food-in-bellevue').title, 'Japanese food in Bellevue')
console.log('bellevue essentials ok')
