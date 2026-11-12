import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { groupEastsideCities } from '../src/lib/eastside-city.ts'

const eastside = JSON.parse(readFileSync(new URL('../src/content/eastside.json', import.meta.url), 'utf8'))
const grouped = groupEastsideCities(eastside.places)
const seen = new Set()

assert.deepEqual(grouped.unassigned.map((place) => place.id), [])
assert.deepEqual(grouped.cities.map((city) => [city.slug, city.places.length]), [
  ['bellevue', 50],
  ['kirkland', 13],
  ['redmond', 14],
  ['issaquah', 2],
  ['mercer-island', 3],
  ['renton', 1],
  ['sammamish', 1],
  ['woodinville', 1],
])

for (const city of grouped.cities) {
  for (const place of city.places) {
    assert.equal(seen.has(place.id), false, place.id)
    seen.add(place.id)
    assert.match(place.address, new RegExp(`, ${city.name}, WA \\d{5}`))
  }
}
assert.equal(seen.size, eastside.places.length)

const guideLength = Object.fromEntries(eastside.guides.map((guide) => [guide.slug, guide.entries.length]))
assert.equal(guideLength.bellevue, 15)
assert.equal(guideLength.kirkland, 12)
assert.equal(guideLength.redmond, 11)
assert.equal(eastside.guides.find((guide) => guide.slug === 'bellevue').title, 'Bellevue Essentials')
assert.equal(eastside.guides.find((guide) => guide.slug === 'kirkland').title, 'Best of Kirkland')

const byId = new Map(eastside.places.map((place) => [place.id, place]))
for (const slug of ['bellevue', 'kirkland', 'redmond']) {
  const guide = eastside.guides.find((item) => item.slug === slug)
  const city = grouped.cities.find((item) => item.slug === slug)
  const members = new Set(guide.entries.map((entry) => entry.placeId))
  assert.ok(members.size < city.places.length)
  for (const id of members) assert.equal(city.places.some((place) => place.id === id), true, id)
  assert.equal(byId.get([...members][0]).gustoScore ?? null, null)
}

console.log('eastside cities ok')
