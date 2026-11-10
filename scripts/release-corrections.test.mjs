import { existsSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { formatHouseScore, stepHouseScore } from '../src/lib/house-score.ts'
import { portraitClass } from '../src/lib/portrait-frame.ts'
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

const taurus = places['taurus-ox']
assert.equal(taurus.photos[0].url, '/photos/taurus-ox-upright.jpg')
assert.equal(taurus.photos[0].credit, 'Another Believer')
assert.equal(taurus.photos[0].creditUrl, 'https://commons.wikimedia.org/wiki/File:Seattle_in_January_2023_-_080.jpg')
assert.equal(taurus.gustoScore, null)
assert.equal(index.places.find((place) => place.id === 'taurus-ox').photo.url, '/photos/taurus-ox-upright.jpg')
assert.equal(index.places.find((place) => place.id === 'taurus-ox').oneLiner, taurus.oneLiner)
const upright = jpegSize(readFileSync(new URL('../public/photos/taurus-ox-upright.jpg', import.meta.url)))
const sideways = jpegSize(readFileSync(new URL('../public/photos/taurus-ox.jpg', import.meta.url)))
assert.deepEqual(upright, { width: 1200, height: 1600 })
assert.deepEqual(sideways, { width: 1600, height: 1200 })
for (const name of ['taurus-ox-upright.480.jpg', 'taurus-ox-upright.960.jpg', 'taurus-ox-upright.200.webp', 'taurus-ox-upright.400.webp', 'taurus-ox-upright.720.webp', 'taurus-ox-upright.960.webp', 'taurus-ox-upright.200.avif', 'taurus-ox-upright.400.avif', 'taurus-ox-upright.720.avif', 'taurus-ox-upright.960.avif']) {
  assert.equal(readFileSync(new URL(`../public/photos/${name}`, import.meta.url)).length > 0, true, name)
}
const taurusSizes = JSON.parse(readFileSync(new URL('../src/content/photo-sizes.json', import.meta.url), 'utf8'))
assert.deepEqual(taurusSizes['taurus-ox-upright.jpg'], { w: 1200, h: 1600, widths: [480, 960, 1200], webp: [200, 400, 720, 960], avif: [200, 400, 720, 960] })
for (const stem of ['2120', 'honeyhole-sandwiches', 'seattle-fish-guys', 'matt-s-in-the-market', 'maiz', 'canon', 'sweet-alchemy', 'cinnamon-works', 'la-parisienne-french-bakery', 'd-la-santa']) {
  assert.equal(places[stem].photos[0].url, `/photos/${stem}-upright.jpg`, stem)
  assert.equal(index.places.find((place) => place.id === stem).photo.url, `/photos/${stem}-upright.jpg`, stem)
  assert.equal(places[stem].photos[0].credit, places[stem].photos[0].credit)
  assert.deepEqual(jpegSize(readFileSync(new URL(`../public/photos/${stem}-upright.jpg`, import.meta.url))), { width: 1200, height: 1600 })
  assert.deepEqual(jpegSize(readFileSync(new URL(`../public/photos/${stem}.jpg`, import.meta.url))), { width: 1600, height: 1200 })
  assert.deepEqual(taurusSizes[`${stem}-upright.jpg`], { w: 1200, h: 1600, widths: [480, 960, 1200], webp: [200, 400, 720, 960], avif: [200, 400, 720, 960] })
}
const uprightSizes = taurusSizes['taurus-ox-upright.jpg']
const sets = [
  '/photos/taurus-ox-upright.jpg',
  uprightSizes.widths.map((width) => (width === uprightSizes.w ? `/photos/taurus-ox-upright.jpg ${width}w` : `/photos/taurus-ox-upright.${width}.jpg ${width}w`)).join(', '),
  uprightSizes.webp.map((width) => `/photos/taurus-ox-upright.${width}.webp ${width}w`).join(', '),
  uprightSizes.avif.map((width) => `/photos/taurus-ox-upright.${width}.avif ${width}w`).join(', '),
]
for (const set of sets) {
  assert.equal(set.includes('/photos/taurus-ox.'), false, set)
  assert.equal(set.includes('taurus-ox-upright'), true, set)
}

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
assert.match(featuredSource, /seattle: \['pike-place', 'best-bakeries', 'best-pizza', 'late-night', 'cocktail-bars', 'classics'\]/)
assert.doesNotMatch(featuredSource, /seattle: \[[^\]]*'date-night'/)
assert.equal(guides.some((guide) => guide.slug === 'date-night'), true)
assert.equal(guides.some((guide) => guide.slug === 'best-bakeries'), true)

const classics = guides.find((guide) => guide.slug === 'classics')
assert.ok(classics.entries.length >= 12 && classics.entries.length <= 16, `classics has ${classics.entries.length}`)
assert.equal(index.guides.find((guide) => guide.slug === 'classics').count, classics.entries.length)
const memberNames = new Set(classics.entries.map((entry) => places[entry.placeId].name))
const named = classics.intro.match(/\. (.+) and (.+) are the ones to remember/)
assert.ok(named, classics.intro)
assert.equal(memberNames.has(named[1]), true)
assert.equal(memberNames.has(named[2]), true)
const parents = guides.find((guide) => guide.slug === 'bring-the-parents')
assert.ok(parents.entries.length > 0)
assert.deepEqual(classics.entries.map((entry) => entry.placeId), [
  'canlis',
  'metropolitan-grill',
  'dick-s-drive-in',
  'beecher-s-handmade-cheese',
  'the-pink-door',
  'paseo',
  'cafe-campagne',
  'dog-in-the-park',
  'taylor-shellfish-farms',
  'piroshky-piroshky',
  'shiro-s-sushi-restaurant',
  'maneki',
  'the-5-point-cafe',
  'starbucks-coffee-company',
  'il-terrazzo-carmine',
])
assert.equal(classics.entries.filter((entry) => entry.placeId === 'paseo').length, 1)
assert.equal(places['luna-park-cafe'].guideSlugs.includes('classics'), false)
assert.equal(places['luna-park-cafe'].guideSlugs.includes('west-seattle'), true)
assert.equal(places['dog-in-the-park'].guideSlugs.includes('classics'), true)
assert.equal(places['ivar-s'].guideSlugs.includes('classics'), false)
assert.equal(places['ivar-s'].guideSlugs.includes('seafood'), true)
assert.equal(portraitClass(1200, 1600), ' is-portrait')
assert.equal(portraitClass(1600, 1200), '')

const bay = JSON.parse(readFileSync(new URL('../src/content/sf.json', import.meta.url), 'utf8'))
for (const guide of eastside.guides) assert.ok(guide.entries.length >= 4, guide.slug)
for (const guide of bay.guides.filter((item) => item.city === 'sf')) assert.ok(guide.entries.length >= 4, guide.slug)
assert.equal(bay.guides.some((guide) => guide.slug === 'east-bay'), true)
assert.equal(bay.guides.find((guide) => guide.slug === 'east-bay').entries.length, 4)
assert.equal(bay.guides.find((guide) => guide.slug === 'peninsula').entries.length, 9)
assert.equal(bay.guides.find((guide) => guide.slug === 'north-bay').entries.length, 6)
assert.equal(eastside.guides.some((guide) => guide.slug === 'kirkland-waterfront'), false)

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

const shiro = places['shiro-s-sushi-restaurant']
assert.equal(shiro.name, "Shiro's Sushi Restaurant")
assert.equal(shiro.address, '2401 2nd Ave, Seattle, WA  98121')
assert.equal(shiro.oneLiner, 'Order both the salmon and tuna samplers, plus a baked crab hand roll.')
assert.deepEqual(shiro.guideSlugs, ['best-sushi', 'splurge', 'classics'])
assert.equal(shiro.photos.some((photo) => photo.url), false)
assert.equal(shiro.photos[0].source, 'illustration')
assert.equal(index.places.find((place) => place.id === 'shiro-s-sushi-restaurant').photo.source, 'illustration')
assert.equal(existsSync(new URL('../public/photos/shiro-s-sushi-restaurant.jpg', import.meta.url)), true)
assert.equal(starbucks.price, 1)
assert.deepEqual(starbucks.perfectFor, ['Walk-Ins', 'Coffee & Pastry', 'Breakfast'])
assert.equal(index.places.find((place) => place.id === 'starbucks-coffee-company').perfectFor.includes('Work From Café'), false)
assert.equal(index.places.find((place) => place.id === 'starbucks-coffee-company').perfectFor.includes('Cheap Eats'), false)
assert.equal(seattleCheapEatsBlocked('seattle', 'cheap-eats', 'starbucks-coffee-company'), true)
assert.equal(seattleCheapEatsBlocked('seattle', 'best-coffee', 'starbucks-coffee-company'), false)
assert.equal(cheap.entries.some((entry) => entry.placeId === 'starbucks-coffee-company'), false)
assert.equal(places['starbucks-coffee-company'].guideSlugs.includes('pike-place'), true)

console.log('release corrections ok')
