import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const palouse = JSON.parse(readFileSync(new URL('../src/content/palouse.json', import.meta.url), 'utf8'))
const expected = [
  ['paradise-grill-and-cafe', 'Paradise Grill and Cafe'],
  ['the-silos-coffee-social', 'The Silos Coffee & Social'],
  ['one-world-cafe', 'One World Cafe'],
  ['panhandle-cone-coffee', 'Panhandle Cone & Coffee'],
  ['the-breakfast-club', 'The Breakfast Club'],
  ['mingles-bar-and-grill', 'Mingles Bar and Grill'],
  ['hunga-dunga', 'Hunga Dunga'],
  ['moscow-alehouse', 'Moscow Alehouse'],
  ['humble-burger', 'Humble Burger'],
  ['maialina-pizzeria-napoletana', 'Maialina Pizzeria Napoletana'],
  ['la-casa-lopez', 'La Casa Lopez'],
  ['tapped', 'Tapped'],
  ['nectar', 'Nectar'],
  ['lodgepole', 'Lodgepole'],
  ['moscow-bagel-and-deli', 'Moscow Bagel and Deli'],
]
const moscow = palouse.places.filter((place) => String(place.address).includes('Moscow, ID'))
assert.deepEqual(moscow.map((place) => [place.id, place.name]).sort(), expected.slice().sort())
assert.equal(new Set(moscow.map((place) => place.city)).size, 1)
assert.equal(moscow[0].city, 'moscow')

const guide = palouse.guides.find((item) => item.slug === 'best-of-moscow-id')
assert.ok(guide)
assert.equal(guide.title, 'Best of Moscow, ID')
assert.equal(guide.group, 'Best of')
assert.equal(guide.city, 'moscow')
assert.deepEqual(guide.entries.map((entry) => entry.placeId), expected.map(([id]) => id))
assert.equal(palouse.guides.some((item) => item.slug === 'mos-cafe'), false)
for (const place of moscow) assert.ok(place.guideSlugs.includes('best-of-moscow-id'))
for (const guide of palouse.guides.filter((item) => item.city === 'pullman')) {
  for (const entry of guide.entries) assert.equal(moscow.some((place) => place.id === entry.placeId), false)
}
const page = readFileSync(new URL('../src/pages/GuidePage.tsx', import.meta.url), 'utf8')
assert.match(page, /'mos-cafe': 'best-of-moscow-id'/)
const featured = readFileSync(new URL('../src/components/SmartResults.tsx', import.meta.url), 'utf8')
assert.match(featured, /moscow: \['best-of-moscow-id'\]/)
console.log('moscow guide ok')
