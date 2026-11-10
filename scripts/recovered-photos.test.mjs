import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { HOUSE_SCORE_FALLBACK } from '../src/lib/house-score-fallback.ts'

const places = JSON.parse(readFileSync(new URL('../src/content/places.json', import.meta.url), 'utf8'))
const east = Object.fromEntries(JSON.parse(readFileSync(new URL('../src/content/eastside.json', import.meta.url), 'utf8')).places.map((place) => [place.id, place]))
const sizes = JSON.parse(readFileSync(new URL('../src/content/photo-sizes.json', import.meta.url), 'utf8'))

function gusto(record) {
  return record.photos.filter((photo) => photo.source === 'gusto').map((photo) => photo.url)
}
function sha(file) {
  return createHash('sha256').update(readFileSync(new URL(`../public/photos/${file}`, import.meta.url))).digest('hex')
}

assert.deepEqual(gusto(places['storyville-coffee-company']), [
  '/photos/storyville-coffee-company-gusto-1.jpg',
  '/photos/storyville-coffee-company-gusto-2.jpg',
  '/photos/storyville-coffee-company-gusto-3.jpg',
])
assert.deepEqual(gusto(places['von-s-1000spirits']), [
  '/photos/von-s-1000spirits-gusto-1.jpg',
  '/photos/von-s-1000spirits-gusto-2.jpg',
  '/photos/von-s-1000spirits-gusto-3.jpg',
])
assert.equal(places['hellenika-cultured-creamery'].photos[0].url, '/photos/hellenika-cultured-creamery.jpg')
assert.equal(places['hellenika-cultured-creamery'].photos[1].url, '/photos/hellenika-cultured-creamery-gusto-2.jpg')
assert.deepEqual(gusto(places['starbucks-coffee-company']), [
  '/photos/starbucks-coffee-company-gusto-1.jpg',
  '/photos/starbucks-coffee-company-gusto-2.jpg',
])
assert.equal(places['starbucks-coffee-company'].address, '1912 Pike Pl, Seattle, WA  98101')
assert.deepEqual(gusto(places['lonely-siren']), [
  '/photos/lonely-siren-gusto-1.jpg',
  '/photos/lonely-siren-gusto-2.jpg',
])
assert.deepEqual(gusto(east.minamoto), ['/photos/minamoto-gusto-1.jpg', '/photos/minamoto-gusto-2.jpg'])
assert.equal(gusto(east['spark-pizza']).length, 3)
assert.equal(gusto(places['momiji-slu']).length, 2)
assert.deepEqual(gusto(places['pasta-casalinga']), ['/photos/pasta-casalinga-gusto-1.jpg'])
assert.equal(sha('roquette-gusto-1.jpg'), 'd5fbe8c5d290fd2d905ca973ce3db149549f69a041bf4b1d7132458f0a478937')
assert.equal(sha('tall-grass-bakery-gusto-1.jpg'), 'ba39c124e919cc358591e84a0ef71aa744fd47bb9393c9255d3688b54db019a2')
assert.equal(sizes['storyville-coffee-company-gusto-3.jpg'].w, 2048)
assert.equal(Math.max(...sizes['roquette-gusto-1.jpg'].widths), sizes['roquette-gusto-1.jpg'].w)
assert.equal(HOUSE_SCORE_FALLBACK['pasta-casalinga'], 8.0)
assert.equal(HOUSE_SCORE_FALLBACK['il-bistro'], 7.4)
assert.equal(HOUSE_SCORE_FALLBACK['that-s-amore-italian-cafe'], 7.3)
assert.equal(HOUSE_SCORE_FALLBACK['barolo-ristorante'], 7.1)
assert.equal(HOUSE_SCORE_FALLBACK.cortina, 7.0)
assert.equal(HOUSE_SCORE_FALLBACK['due-cucina-italiana'], 6.9)
assert.equal(HOUSE_SCORE_FALLBACK['mamma-melina-ristorante-pizzeria'], 6.7)
assert.equal(places.cactus.photos.some((photo) => photo.source === 'gusto'), false)
assert.equal(east['din-tai-fung-bellevue'].photos.some((photo) => photo.source === 'gusto'), false)
console.log('recovered photos ok')
