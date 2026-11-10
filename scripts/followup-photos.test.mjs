import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { HOUSE_SCORE_FALLBACK } from '../src/lib/house-score-fallback.ts'

const places = JSON.parse(readFileSync(new URL('../src/content/places.json', import.meta.url), 'utf8'))
const index = JSON.parse(readFileSync(new URL('../src/content/index.json', import.meta.url), 'utf8'))
const east = JSON.parse(readFileSync(new URL('../src/content/eastside.json', import.meta.url), 'utf8'))
const sizes = JSON.parse(readFileSync(new URL('../src/content/photo-sizes.json', import.meta.url), 'utf8'))
const indexPhoto = Object.fromEntries(index.places.map((place) => [place.id, place.photo]))
const eastById = Object.fromEntries(east.places.map((place) => [place.id, place]))

function gustoUrls(record) {
  return record.photos.filter((photo) => photo.source === 'gusto').map((photo) => photo.url)
}

const expected = {
  sunfish: 2,
  'big-max-burger-co': 3,
  'cafe-flora': 6,
  'taurus-ox': 3,
  'volunteer-park-cafe-pantry': 2,
  'joe-z-bayside-market-cafe': 1,
  'hushy-s-sandwiches': 1,
  'pacific-inn-pub': 1,
  'sea-wolf': 2,
  'stampede-cocktail-club': 2,
  'uneeda-burger': 1,
  atoma: 10,
  layers: 2,
  'un-bien': 1,
  'the-other-coast-cafe': 2,
  'kangaroo-kiwi': 1,
  'hey-bagel': 1,
  'saint-bread': 5,
}
let files = 0
for (const [id, count] of Object.entries(expected)) {
  const urls = gustoUrls(places[id])
  assert.equal(urls.length, count, id)
  assert.deepEqual(urls, Array.from({ length: count }, (_, index) => `/photos/${id}-gusto-${index + 1}.jpg`), id)
  assert.equal(indexPhoto[id].url, urls[0], id)
  assert.equal(indexPhoto[id].credit, 'Photo by Gusto', id)
  for (const photo of places[id].photos.filter((item) => item.source === 'gusto')) {
    assert.equal(photo.credit, 'Photo by Gusto')
    const file = photo.url.slice('/photos/'.length)
    assert.equal(existsSync(new URL(`../public/photos/${file}`, import.meta.url)), true, file)
    const size = sizes[file]
    assert.equal(Math.max(...size.widths, ...size.webp, ...size.avif), size.w, file)
    files += 1
  }
}
const shawn = gustoUrls(eastById['shawns-cafe-and-bakery'])
assert.deepEqual(shawn, [
  '/photos/shawns-cafe-and-bakery-gusto-1.jpg',
  '/photos/shawns-cafe-and-bakery-gusto-2.jpg',
])
files += 2
assert.equal(files, 48)
assert.equal(eastById['shawns-cafe-and-bakery'].name, "Shawn's Cafe and Bakery")
assert.equal(eastById['shawns-cafe-and-bakery'].address, '7420 SE 24th St, Unit 3, Mercer Island, WA 98040')
assert.equal(places['hushy-s-sandwiches'].name, "Hushy's Sandwiches")
assert.equal(places['hushy-s-sandwiches'].address.includes('3400 Stone Way'), true)
assert.equal(places['taurus-ox'].photos.at(-1).source, 'illustration')
assert.equal(places['taurus-ox'].photos.some((photo) => photo.url === '/photos/taurus-ox-upright.jpg'), true)
assert.equal(places['saint-bread'].photos.some((photo) => photo.url === '/photos/saint-bread.jpg'), true)
assert.equal(places['volunteer-park-cafe-pantry'].photos.some((photo) => photo.source === 'wikimedia'), true)
assert.equal(sizes['cafe-flora-gusto-1.jpg'].h > sizes['cafe-flora-gusto-1.jpg'].w, true)
assert.equal(sizes['saint-bread-gusto-3.jpg'].h > sizes['saint-bread-gusto-3.jpg'].w, true)
assert.equal(sizes['the-other-coast-cafe-gusto-1.jpg'].h > sizes['the-other-coast-cafe-gusto-1.jpg'].w, true)
assert.equal(sizes['the-other-coast-cafe-gusto-2.jpg'].w > sizes['the-other-coast-cafe-gusto-2.jpg'].h, true)
assert.equal(HOUSE_SCORE_FALLBACK['pasta-casalinga'], 8.0)
assert.equal(HOUSE_SCORE_FALLBACK['il-bistro'], 7.4)
assert.equal(HOUSE_SCORE_FALLBACK['that-s-amore-italian-cafe'], 7.3)
assert.equal(HOUSE_SCORE_FALLBACK.cortina, 7.0)
assert.equal(HOUSE_SCORE_FALLBACK['barolo-ristorante'], 7.1)
assert.equal(HOUSE_SCORE_FALLBACK['due-cucina-italiana'], 6.9)
assert.equal(HOUSE_SCORE_FALLBACK['mamma-melina-ristorante-pizzeria'], 6.7)
assert.equal(Object.keys(HOUSE_SCORE_FALLBACK).length, 7)

console.log('followup photos ok')
