import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HOUSE_SCORE_FALLBACK } from '../src/lib/house-score-fallback.ts'

const places = JSON.parse(readFileSync(new URL('../src/content/places.json', import.meta.url), 'utf8'))
const east = Object.fromEntries(JSON.parse(readFileSync(new URL('../src/content/eastside.json', import.meta.url), 'utf8')).places.map((place) => [place.id, place]))
const sizes = JSON.parse(readFileSync(new URL('../src/content/photo-sizes.json', import.meta.url), 'utf8'))

function gusto(record) {
  return record.photos.filter((photo) => photo.source === 'gusto').map((photo) => photo.url)
}

assert.deepEqual(gusto(places['storyville-coffee-company']), [
  '/photos/storyville-coffee-company-gusto-1.jpg',
  '/photos/storyville-coffee-company-gusto-2.jpg',
  '/photos/storyville-coffee-company-gusto-3.jpg',
])
assert.equal(sizes['storyville-coffee-company-gusto-1.jpg'].w, 480)
assert.equal(sizes['storyville-coffee-company-gusto-3.jpg'].w, 2048)
assert.equal(sizes['the-shop-by-porter-gusto-1.jpg'].h > sizes['the-shop-by-porter-gusto-1.jpg'].w, true)
assert.equal(gusto(places['cafe-flora']).length, 6)
assert.equal(gusto(places['atoma']).length, 10)
assert.equal(gusto(places['saint-bread']).length, 5)
assert.deepEqual(gusto(east.sparrow), Array.from({ length: 5 }, (_, index) => `/photos/sparrow-gusto-${index + 1}.jpg`))
assert.equal(gusto(east['la-mar-bellevue']).length, 10)
assert.deepEqual(gusto(east['lexperience-paris']), ['/photos/lexperience-paris-gusto-1.jpg'])
assert.equal(east['lexperience-paris'].gustoScore, null)
assert.deepEqual(gusto(places.cortina), ['/photos/cortina-gusto-1.jpg'])
assert.equal(HOUSE_SCORE_FALLBACK.cortina, 7.0)
assert.deepEqual(gusto(east['central-bar-restaurant']), ['/photos/central-bar-restaurant-gusto-1.jpg'])
assert.equal(gusto(east['central-tavern']).length, 0)
assert.equal(gusto(places['duke-s-seafood-south-lake-union']).length, 1)
assert.equal(gusto(places['cafe-hagen']).length, 1)
assert.deepEqual(gusto(places['von-s-1000spirits']), [
  '/photos/von-s-1000spirits-gusto-1.jpg',
  '/photos/von-s-1000spirits-gusto-2.jpg',
  '/photos/von-s-1000spirits-gusto-3.jpg',
])
assert.equal(gusto(places['due-cucina-italiana']).length, 2)
assert.equal(gusto(east['tendon-kohaku'])[0], '/photos/tendon-kohaku-gusto-1.jpg')
assert.equal(east['tendon-kohaku'].photos[0].alt.includes('carbonara'), true)
assert.equal(gusto(east['tendon-kohaku'])[1], '/photos/tendon-kohaku-gusto-2.jpg')
for (const id of ['cactus', 'din-tai-fung']) assert.equal(gusto(places[id]).length, 0, id)
assert.deepEqual(gusto(east['cactus-kirkland']), ['/photos/cactus-kirkland-gusto-1.jpg'])
assert.deepEqual(gusto(east['din-tai-fung-bellevue']), ['/photos/din-tai-fung-bellevue-gusto-1.jpg'])
assert.deepEqual(gusto(east['kobuta-and-ookami-redmond']), ['/photos/kobuta-and-ookami-redmond-gusto-1.jpg'])
assert.deepEqual(gusto(east['beachhouse-bar-and-grill']), ['/photos/beachhouse-bar-and-grill-gusto-1.jpg'])
assert.equal(gusto(places['kobuta-and-ookami']).length, 0)
assert.equal(gusto(places['harry-s-beach-house']).length, 0)
assert.equal(places['hellenika-cultured-creamery'].photos[0].source, 'wikimedia')
assert.equal(HOUSE_SCORE_FALLBACK['pasta-casalinga'], 8.0)
assert.equal(HOUSE_SCORE_FALLBACK['mamma-melina-ristorante-pizzeria'], 6.7)
assert.equal(Object.keys(HOUSE_SCORE_FALLBACK).length, 7)
assert.equal(Math.max(...sizes['cortina-gusto-1.jpg'].widths), sizes['cortina-gusto-1.jpg'].w)

console.log('srgb photos ok')
