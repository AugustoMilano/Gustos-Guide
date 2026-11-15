import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { HOUSE_SCORE_FALLBACK } from '../src/lib/house-score-fallback.ts'

const places = JSON.parse(readFileSync(new URL('../src/content/places.json', import.meta.url), 'utf8'))
const sizes = JSON.parse(readFileSync(new URL('../src/content/photo-sizes.json', import.meta.url), 'utf8'))

function gusto(record) {
  return record.photos.filter((photo) => photo.source === 'gusto').map((photo) => photo.url)
}

// Nov 15, 2026: Augusto's 15 full-quality originals (sRGB, upright, 2048 px) are the whole gallery.
// The three leftover low-resolution shots (dining room, gin and tonic, rooftop view) were removed.
const LA_LOBA = Array.from({ length: 15 }, (_, index) => `hq-${index + 1}`)
assert.deepEqual(gusto(places['la-loba']), LA_LOBA.map((name) => `/photos/la-loba-${name}.jpg`))
for (const name of LA_LOBA.filter((item) => item.startsWith('hq-'))) assert.equal(Math.max(sizes[`la-loba-${name}.jpg`].w, sizes[`la-loba-${name}.jpg`].h), 2048)
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
