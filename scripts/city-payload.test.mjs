import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSlimParts, writeSlimCatalog } from './write-slim-catalog.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const content = join(root, 'src/content')
writeSlimCatalog()
const { combined, byCity, summary } = buildSlimParts()

const flatPlaces = summary.cities.flatMap((city) => byCity[city.id].p)
const flatGuides = summary.cities.flatMap((city) => byCity[city.id].g)
assert.deepEqual(flatPlaces.map((row) => row[0]).sort(), combined.p.map((row) => row[0]).sort())
assert.deepEqual(flatGuides.map((row) => row[0]).sort(), combined.g.map((row) => row[0]).sort())

for (const city of summary.cities) {
  const doc = JSON.parse(readFileSync(join(content, `slim-city-${city.id}.json`), 'utf8'))
  assert.deepEqual(doc.p, combined.p.filter((row) => (row[3] || 'seattle') === city.id))
  assert.deepEqual(doc.g, combined.g.filter((row) => (row[7] || 'seattle') === city.id))
  assert.equal(doc.p.length, city.places)
  assert.equal(doc.g.length, city.guides)
}

const index = JSON.parse(readFileSync(join(content, 'slim-index.json'), 'utf8'))
assert.deepEqual(index, summary)
assert.equal(index.cities.reduce((sum, city) => sum + city.places, 0), combined.p.length)
assert.equal(index.cities.reduce((sum, city) => sum + city.guides, 0), combined.g.length)

const combinedBytes = statSync(join(content, 'slim-catalog.json')).size
const indexBytes = statSync(join(content, 'slim-index.json')).size
console.log(`combined slim ${combinedBytes} index ${indexBytes}`)
for (const city of summary.cities) {
  const bytes = statSync(join(content, `slim-city-${city.id}.json`)).size
  console.log(`${city.id} ${bytes} places ${city.places} guides ${city.guides}`)
}
console.log('city payload ok')
