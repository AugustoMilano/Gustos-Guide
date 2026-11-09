import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolvedCount } from './write-slim-catalog.mjs'

const bay = JSON.parse(readFileSync(new URL('../src/content/sf.json', import.meta.url), 'utf8'))
const ids = new Set(bay.places.map((place) => place.id))
const expectMembers = {
  'east-bay': ['yogurt-park', 'billy-roy-s-burger-co', 'elia', 'the-press-an-artisan-cafe'],
  peninsula: ['barbara-s-fishtrap', 'taco-bell-cantina', 'la-foret-restaurant', 'nobu-sf', 'ramen-nagi', 'taverna', 'mastro-s-steakhouse', 'restaurant-gish', 'salt-straw-sf'],
  'north-bay': ['rh-rooftop-restaurant-at-rh-marin', 'perry-s', 'malibu-farm', 'angelino-restaurant', 'barrel-house-tavern', 'the-spinnaker'],
}
const removed = [
  'eastbay-berkeley', 'eastbay-fremont', 'eastbay-pleasanton',
  'peninsula-half-moon-bay', 'peninsula-pacifica', 'peninsula-san-jose', 'peninsula-palo-alto', 'peninsula-santa-clara',
  'northbay-corte-madera', 'northbay-larkspur', 'northbay-tiburon', 'northbay-sausalito',
]
for (const slug of removed) assert.equal(bay.guides.some((guide) => guide.slug === slug), false)
for (const [slug, members] of Object.entries(expectMembers)) {
  const guide = bay.guides.find((item) => item.slug === slug)
  assert.ok(guide, slug)
  assert.equal(guide.group, 'Neighborhoods')
  assert.deepEqual(guide.entries.map((entry) => entry.placeId), members)
  assert.equal(resolvedCount(guide.entries, ids), members.length)
  for (const id of members) {
    const place = bay.places.find((item) => item.id === id)
    assert.ok(place.guideSlugs.includes(slug), id)
  }
}
assert.equal(bay.guides.find((guide) => guide.slug === 'east-bay').title, 'East Bay')
assert.equal(bay.guides.find((guide) => guide.slug === 'peninsula').title, 'Peninsula')
assert.equal(bay.guides.find((guide) => guide.slug === 'north-bay').title, 'North Bay')
const palouse = JSON.parse(readFileSync(new URL('../src/content/palouse.json', import.meta.url), 'utf8'))
const moscowGuides = palouse.guides.filter((guide) => guide.city === 'moscow')
assert.deepEqual(moscowGuides.map((guide) => guide.slug), ['mos-cafe'])
console.log('area guides ok')
