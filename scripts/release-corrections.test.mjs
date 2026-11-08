import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { formatHouseScore, stepHouseScore } from '../src/lib/house-score.ts'
import { cheapEatsFor, omitSeattleCheapEats, seattleCheapEatsBlocked, usableCheapMembers } from '../src/lib/collections.ts'

const shown = (value) => (value == null ? null : formatHouseScore(value))

assert.equal(shown(stepHouseScore(null, 1)), '1.0')
assert.equal(stepHouseScore(null, -1), null)
assert.equal(shown(stepHouseScore(8, 1)), '8.1')
assert.equal(shown(stepHouseScore(8, -1)), '7.9')
assert.equal(shown(stepHouseScore(1, -1)), '1.0')
assert.equal(shown(stepHouseScore(10, 1)), '10.0')
assert.equal(shown(stepHouseScore(9.9, 1)), '10.0')
assert.equal(shown(stepHouseScore(1.1, -1)), '1.0')
assert.equal(shown(stepHouseScore(1.2000000000000002, 1)), '1.3')

const places = JSON.parse(readFileSync(new URL('../src/content/places.json', import.meta.url), 'utf8'))
const guides = JSON.parse(readFileSync(new URL('../src/content/guides.json', import.meta.url), 'utf8'))
const index = JSON.parse(readFileSync(new URL('../src/content/index.json', import.meta.url), 'utf8'))

const dropped = [
  'starbucks-coffee-company',
  'skalka',
  'the-usual',
  'japonessa-sushi-cocina',
  'le-pichet',
  'oxbow',
  'sabine',
  'donna-s',
  'the-dressing-room',
  'tivoli',
  'marmalade',
]
for (const id of dropped) {
  const urls = (places[id].photos || []).map((photo) => photo.url).filter(Boolean)
  assert.equal(urls.some((url) => url.includes(`/photos/${id}`)), false, id)
  const slim = index.places.find((place) => place.id === id)
  assert.equal(slim.photo.source, 'illustration')
  assert.equal(slim.photo.url, undefined)
}
assert.deepEqual(places['alibi-room'].photos.map((photo) => photo.url), [
  '/photos/alibi-room-gusto-1.jpg',
  '/photos/alibi-room-gusto-2.jpg',
])
assert.equal(places['il-bistro'].gustoScore, null)
assert.equal(index.places.find((place) => place.id === 'il-bistro').photo.url, '/photos/il-bistro.jpg')

const cheap = guides.find((guide) => guide.slug === 'cheap-eats')
assert.equal(cheap.entries.some((entry) => entry.placeId === 'alibi-room'), false)
for (const slug of ['pike-place', 'best-pizza', 'pike-place-market']) {
  assert.equal(guides.find((guide) => guide.slug === slug).entries.some((entry) => entry.placeId === 'alibi-room'), true, slug)
}

const slu = guides.find((guide) => guide.slug === 'south-lake-union-incl-denny-triangle')
assert.equal(slu.title, 'South Lake Union')
assert.equal(slu.dek.includes('incl. Denny'), false)
assert.equal(slu.intro.includes('incl. Denny'), false)
assert.equal(slu.entries.length, 24)
assert.equal(slu.entries.some((entry) => entry.placeId === '2120'), true)
assert.equal(index.guides.find((guide) => guide.slug === slu.slug).title, 'South Lake Union')
assert.equal(places['2120'].neighborhood, 'Denny Triangle')

const featuredSource = readFileSync(new URL('../src/components/SmartResults.tsx', import.meta.url), 'utf8')
assert.match(featuredSource, /seattle: \['pike-place', 'best-bakeries', 'best-pizza', 'late-night', 'cocktail-bars', 'bring-the-parents'\]/)
assert.doesNotMatch(featuredSource, /seattle: \[[^\]]*'date-night'/)
assert.equal(guides.some((guide) => guide.slug === 'date-night'), true)
assert.equal(guides.some((guide) => guide.slug === 'best-bakeries'), true)

const row = {
  id: 'c1',
  city: 'seattle',
  title: 'Cheap eats',
  slug: 'cheap-eats',
  blurb: null,
  position: 0,
  placeIds: ['alibi-room', 'paseo'],
  published: true,
}
const catalog = [
  { id: 'alibi-room', name: 'Alibi Room', cuisine: ['Pizza'], lat: 1, lng: 2, price: 2, city: 'seattle' },
  { id: 'paseo', name: 'Paseo', cuisine: ['Caribbean'], lat: 1, lng: 2, price: 1, city: 'seattle' },
]
assert.equal(seattleCheapEatsBlocked('seattle', 'cheap-eats', 'alibi-room'), true)
assert.equal(seattleCheapEatsBlocked('seattle', 'pike-place', 'alibi-room'), false)
assert.deepEqual(omitSeattleCheapEats('seattle', row.placeIds), ['paseo'])
const members = usableCheapMembers(row, catalog)
assert.deepEqual(members.map((place) => place.id), ['paseo'])
assert.equal(cheapEatsFor(catalog, 'seattle').some((place) => place.id === 'alibi-room'), false)
assert.equal(cheapEatsFor(catalog, 'seattle').some((place) => place.id === 'paseo'), true)

console.log('release corrections ok')
