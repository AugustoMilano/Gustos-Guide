import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { HOUSE_SCORE_FALLBACK } from '../src/lib/house-score-fallback.ts'

const places = JSON.parse(readFileSync(new URL('../src/content/places.json', import.meta.url), 'utf8'))
const sizes = JSON.parse(readFileSync(new URL('../src/content/photo-sizes.json', import.meta.url), 'utf8'))

function gusto(record) {
  return record.photos.filter((photo) => photo.source === 'gusto').map((photo) => photo.url)
}

assert.deepEqual(gusto(places['la-loba']), Array.from({ length: 18 }, (_, index) => `/photos/la-loba-gusto-${index + 1}.jpg`))
assert.deepEqual(gusto(places['piroshky-piroshky']), ['/photos/piroshky-piroshky-gusto-1.jpg'])
assert.equal(places['piroshky-piroshky'].photos[1].url, '/photos/piroshky-piroshky.jpg')
assert.deepEqual(gusto(places.maiz), ['/photos/maiz-gusto-1.jpg'])
assert.equal(places.maiz.photos[1].url, '/photos/maiz-upright.jpg')
assert.deepEqual(gusto(places['mr-fish-chips-chowder']), [
  '/photos/mr-fish-chips-chowder-gusto-1.jpg',
  '/photos/mr-fish-chips-chowder-gusto-2.jpg',
])
for (const photo of places['la-loba'].photos) {
  if (photo.source !== 'gusto') continue
  assert.equal(photo.credit, 'Photo by Gusto')
  const file = photo.url.split('/').at(-1)
  assert.equal(existsSync(new URL(`../public/photos/${file}`, import.meta.url)), true)
  const size = sizes[file]
  assert.equal(Math.max(...size.widths), size.w)
}
assert.equal(sizes['mr-fish-chips-chowder-gusto-1.jpg'].w, 2048)
assert.equal(sizes['mr-fish-chips-chowder-gusto-2.jpg'].w, 2048)
assert.equal(places.cactus.photos[0].source, 'illustration')
assert.equal(places['hellenika-cultured-creamery'].photos[0].source, 'wikimedia')
assert.equal(HOUSE_SCORE_FALLBACK['pasta-casalinga'], 8.0)
assert.equal(HOUSE_SCORE_FALLBACK.cortina, 7.0)
assert.equal(HOUSE_SCORE_FALLBACK['mamma-melina-ristorante-pizzeria'], 6.7)
console.log('laloba photos ok')
