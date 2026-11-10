import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { HOUSE_SCORE_FALLBACK } from '../src/lib/house-score-fallback.ts'

const places = JSON.parse(readFileSync(new URL('../src/content/places.json', import.meta.url), 'utf8'))
const index = JSON.parse(readFileSync(new URL('../src/content/index.json', import.meta.url), 'utf8'))
const sizes = JSON.parse(readFileSync(new URL('../src/content/photo-sizes.json', import.meta.url), 'utf8'))
const indexPhoto = Object.fromEntries(index.places.map((place) => [place.id, place.photo]))

const expected = {
  'storyville-coffee-company': ['/photos/storyville-coffee-company-gusto-1.jpg'],
  'ludi-s-restaurant': ['/photos/ludi-s-restaurant-gusto-1.jpg'],
  'beecher-s-handmade-cheese': ['/photos/beecher-s-handmade-cheese-gusto-1.jpg'],
  'charlotte-restaurant-lounge': ['/photos/charlotte-restaurant-lounge-gusto-1.jpg'],
  'cookie-s-country-chicken': ['/photos/cookie-s-country-chicken-gusto-1.jpg'],
  'barolo-ristorante': ['/photos/barolo-ristorante-gusto-1.jpg'],
  'the-shop-by-porter': ['/photos/the-shop-by-porter-gusto-1.jpg', '/photos/the-shop-by-porter-gusto-2.jpg'],
  'the-george': ['/photos/the-george-gusto-1.jpg'],
  'the-fonte-bar': ['/photos/the-fonte-bar-gusto-1.jpg'],
  'tat-s-delicatessen': [
    '/photos/tat-s-delicatessen-gusto-1.jpg',
    '/photos/tat-s-delicatessen-gusto-2.jpg',
    '/photos/tat-s-delicatessen-gusto-3.jpg',
    '/photos/tat-s-delicatessen-gusto-4.jpg',
  ],
  'saigon-drip-cafe': ['/photos/saigon-drip-cafe-gusto-1.jpg'],
  'darkalino-s': ['/photos/darkalino-s-gusto-1.jpg'],
  'bottega-gabriele': ['/photos/bottega-gabriele-gusto-1.jpg', '/photos/bottega-gabriele-gusto-2.jpg'],
  salumi: ['/photos/salumi-gusto-1.jpg', '/photos/salumi-gusto-2.jpg'],
  firn: ['/photos/firn-gusto-1.jpg'],
  'serious-pie': ['/photos/serious-pie-gusto-1.jpg'],
  'palace-kitchen': [
    '/photos/palace-kitchen-gusto-1.jpg',
    '/photos/palace-kitchen-gusto-2.jpg',
    '/photos/palace-kitchen-gusto-3.jpg',
    '/photos/palace-kitchen-gusto-4.jpg',
    '/photos/palace-kitchen-gusto-5.jpg',
    '/photos/palace-kitchen-gusto-6.jpg',
  ],
  'top-pot-doughnuts': ['/photos/top-pot-doughnuts-gusto-1.jpg'],
  'deep-dive': ['/photos/deep-dive-gusto-1.jpg'],
}

let files = 0
for (const [id, urls] of Object.entries(expected)) {
  const gusto = places[id].photos.filter((photo) => photo.source === 'gusto')
  assert.deepEqual(gusto.map((photo) => photo.url), urls, id)
  for (const photo of gusto) {
    assert.equal(photo.credit, 'Photo by Gusto', id)
    assert.equal(photo.alt, `Photo of ${places[id].name} by Gusto`, id)
    const file = photo.url.slice('/photos/'.length)
    assert.equal(existsSync(new URL(`../public/photos/${file}`, import.meta.url)), true, file)
    const size = sizes[file]
    assert.ok(size, file)
    assert.equal(Math.max(...size.widths), size.w, file)
    assert.ok(Math.max(...size.webp) <= size.w, file)
    files += 1
  }
  assert.equal(indexPhoto[id].url, urls[0], id)
  assert.equal(indexPhoto[id].credit, 'Photo by Gusto', id)
  assert.equal(places[id].gustoScore, null, id)
}
assert.equal(files, 30)

const story = places['storyville-coffee-company'].photos
assert.deepEqual(story.map((photo) => photo.source), ['gusto', 'illustration'])
assert.equal(existsSync(new URL('../public/photos/storyville-coffee-company-upright.jpg', import.meta.url)), true)
assert.equal(places['beecher-s-handmade-cheese'].photos[1].source, 'wikimedia')
assert.equal(places['hellenika-cultured-creamery'].photos[0].url, '/photos/hellenika-cultured-creamery.jpg')
assert.equal(places['hellenika-cultured-creamery'].photos.some((photo) => photo.source === 'gusto'), false)
for (const id of ['pasta-casalinga', 'starbucks-coffee-company', 'piroshky-piroshky', 'the-nest', 'lonely-siren', 'zig-zag-cafe', 'von-s-1000spirits', 'mr-fish-chips-chowder']) {
  assert.equal(places[id].photos.some((photo) => photo.source === 'gusto'), false, id)
}
assert.equal(places['maruta'], undefined)
assert.equal(HOUSE_SCORE_FALLBACK['pasta-casalinga'], 8.0)
assert.equal(HOUSE_SCORE_FALLBACK['mamma-melina-ristorante-pizzeria'], 6.7)
assert.equal(sizes['beecher-s-handmade-cheese-gusto-1.jpg'].h > sizes['beecher-s-handmade-cheese-gusto-1.jpg'].w, true)
assert.equal(sizes['the-shop-by-porter-gusto-1.jpg'].h > sizes['the-shop-by-porter-gusto-1.jpg'].w, true)
assert.equal(sizes['storyville-coffee-company-gusto-1.jpg'].w > sizes['storyville-coffee-company-gusto-1.jpg'].h, true)

console.log('restaurant photos ok')
