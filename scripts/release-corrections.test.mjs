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

function jpegSize(buf) {
  let offset = 2
  while (offset < buf.length) {
    if (buf[offset] !== 0xff) break
    const marker = buf[offset + 1]
    const length = buf.readUInt16BE(offset + 2)
    if (marker >= 0xc0 && marker <= 0xc2) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) }
    }
    offset += 2 + length
  }
  throw new Error('jpeg size missing')
}

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

const starbucks = places['starbucks-coffee-company']
const starbucksBlurb = "Tourists line up at the market's Starbucks Coffee Company for the vintage logo and bragging rights to the first Starbucks. The company opened in 1971 on Western Avenue and moved to this Pike Place shop in 1976. It opens early, so arrive before the crowds if you want the souvenir mug without the wait."
assert.equal(starbucks.address, '1912 Pike Pl, Seattle, WA  98101')
assert.equal(starbucks.oneLiner, 'Visit once for the history, then drink your daily coffee somewhere quieter.')
assert.equal(starbucks.blurb, starbucksBlurb)
assert.equal(starbucks.gustoScore, null)
assert.equal(starbucks.photos.some((photo) => photo.url), false)
assert.equal(index.places.find((place) => place.id === 'starbucks-coffee-company').oneLiner, starbucks.oneLiner)
for (const guide of guides) {
  for (const entry of guide.entries) {
    if (entry.placeId !== 'starbucks-coffee-company') continue
    assert.equal(entry.blurb, starbucksBlurb, guide.slug)
    assert.equal(entry.pullQuote, starbucks.oneLiner, guide.slug)
  }
}

const taurus = places['taurus-ox']
assert.equal(taurus.photos[0].url, '/photos/taurus-ox.jpg')
assert.equal(taurus.photos[0].credit, 'Another Believer')
assert.equal(taurus.gustoScore, null)
const taurusJpeg = jpegSize(readFileSync(new URL('../public/photos/taurus-ox.jpg', import.meta.url)))
assert.equal(taurusJpeg.width, 1200)
assert.equal(taurusJpeg.height, 1600)
const taurusSizes = JSON.parse(readFileSync(new URL('../src/content/photo-sizes.json', import.meta.url), 'utf8'))['taurus-ox.jpg']
assert.deepEqual(taurusSizes, { w: 1200, h: 1600, widths: [480, 960, 1200], webp: [200, 400, 720, 960], avif: [200, 400, 720, 960] })

const cheap = guides.find((guide) => guide.slug === 'cheap-eats')
assert.equal(cheap.entries.some((entry) => entry.placeId === 'alibi-room'), false)
for (const slug of ['pike-place', 'best-pizza', 'pike-place-market']) {
  assert.equal(guides.find((guide) => guide.slug === slug).entries.some((entry) => entry.placeId === 'alibi-room'), true, slug)
}

const breakfast = guides.find((guide) => guide.slug === 'breakfast-before-9')
assert.equal(breakfast.title, 'Best Breakfast')
assert.equal(breakfast.ranked, false)
assert.equal(breakfast.entries.at(-1).placeId, 'biscuit-bitch')
assert.equal(breakfast.entries.filter((entry) => entry.placeId === 'biscuit-bitch').length, 1)
assert.equal(index.guides.find((guide) => guide.slug === 'breakfast-before-9').count, breakfast.entries.length)
for (const slug of ['pike-place', 'brunch', 'pike-place-market', 'belltown']) {
  assert.equal(places['biscuit-bitch'].guideSlugs.includes(slug), true, slug)
  assert.equal(index.places.find((place) => place.id === 'biscuit-bitch').guideSlugs.includes(slug), true, slug)
}
assert.equal(places['biscuit-bitch'].guideSlugs.includes('breakfast-before-9'), true)
assert.equal(index.places.find((place) => place.id === 'biscuit-bitch').guideSlugs.includes('breakfast-before-9'), true)
assert.equal(places['matsu'].name, 'Matsu')
assert.equal(places['matsu'].gustoScore, null)
assert.equal(places['stampede-cocktail-club'].gustoScore, null)
assert.equal(places['the-doctor-s-office'].gustoScore, null)
const eastside = JSON.parse(readFileSync(new URL('../src/content/eastside.json', import.meta.url), 'utf8'))
const earls = eastside.places.find((place) => place.id === 'earls-kitchen-bar')
assert.equal(earls.name, 'Earls Kitchen + Bar')
assert.equal(earls.gustoScore ?? null, null)

const badgeCss = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
assert.match(badgeCss, /--score-good:\s*#b7e39a/)
assert.match(badgeCss, /--score-fine:\s*#e7b23c/)
assert.match(badgeCss, /\.score-badge\.tone-good\s*\{[^}]*background:\s*var\(--score-good\)/)
assert.match(badgeCss, /\.score-badge\.tone-fine\s*\{[^}]*background:\s*var\(--score-fine\)/)
assert.match(badgeCss, /\.score-badge\.tone-best\s*\{[^}]*background:\s*#0f6b28/)
assert.match(badgeCss, /\.score-badge\.tone-great\s*\{[^}]*background:\s*#38ba46/)
const bands = readFileSync(new URL('../src/components/ScoreBadge.tsx', import.meta.url), 'utf8')
assert.match(bands, /score >= 9[\s\S]*Best of the best/)
assert.match(bands, /score >= 8[\s\S]*Great/)
assert.match(bands, /score >= 7[\s\S]*Good/)
assert.match(bands, /score >= 6[\s\S]*It's fine/)

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
