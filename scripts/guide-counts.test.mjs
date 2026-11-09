import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolvedMembers } from '../src/lib/guide-members.ts'
import { resolvedCount } from './write-slim-catalog.mjs'

const read = (name) => JSON.parse(readFileSync(new URL(`../src/content/${name}`, import.meta.url), 'utf8'))
const index = read('index.json')
const seattleGuides = read('guides.json')
const regional = ['eastside.json', 'la.json', 'sf.json', 'sd.json', 'vancouver.json', 'portland.json', 'nyc.json', 'palouse.json'].map(read)
const placeIds = new Set([
  ...index.places.map((place) => place.id),
  ...regional.flatMap((file) => file.places.map((place) => place.id)),
])

function count(entries) {
  return resolvedMembers(entries, placeIds).length
}

const sample = [{ placeId: 'a' }, { placeId: 'a' }, { placeId: 'missing' }, { placeId: 'b' }]
const sampleIds = new Set(['a', 'b'])
assert.equal(resolvedMembers(sample, sampleIds).length, 2)
assert.equal(resolvedCount(sample, sampleIds), 2)

const bySlug = new Map(seattleGuides.map((guide) => [guide.slug, guide]))
for (const summary of index.guides) {
  const guide = bySlug.get(summary.slug)
  assert.ok(guide, summary.slug)
  const resolved = count(guide.entries)
  assert.equal(summary.count, resolved, `${summary.slug} index ${summary.count} page ${resolved}`)
  assert.equal(resolvedCount(guide.entries, placeIds), resolved)
}

for (const file of regional) {
  for (const guide of file.guides) {
    const resolved = count(guide.entries)
    assert.equal(guide.entries.length, resolved, `${guide.slug} lists a place that is not in the catalog`)
    assert.equal(resolvedCount(guide.entries, placeIds), resolved)
  }
}

const classics = index.guides.find((guide) => guide.slug === 'classics')
assert.equal(classics.count, count(bySlug.get('classics').entries))
console.log('guide counts ok')
