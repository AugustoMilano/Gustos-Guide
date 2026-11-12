import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const ledger = JSON.parse(readFileSync(new URL('../data/price-sources.json', import.meta.url), 'utf8'))
const files = {
  eastside: 'eastside.json',
  la: 'la.json',
  sf: 'sf.json',
  peninsula: 'sf.json',
  northbay: 'sf.json',
  eastbay: 'sf.json',
  sandiego: 'sd.json',
  vancouver: 'vancouver.json',
  portland: 'portland.json',
  nyc: 'nyc.json',
  pullman: 'palouse.json',
  moscow: 'palouse.json',
}
const catalogs = {}
for (const file of new Set(Object.values(files))) {
  catalogs[file] = JSON.parse(readFileSync(new URL(`../src/content/${file}`, import.meta.url), 'utf8'))
}

const byId = new Map()
for (const file of Object.values(catalogs)) {
  for (const place of file.places) {
    if (byId.has(place.id)) throw new Error(`duplicate id ${place.id}`)
    byId.set(place.id, place)
  }
}

const archived = new Set(
  JSON.parse(readFileSync(new URL('../data/closed-archive.json', import.meta.url), 'utf8')).places.map((row) => row.id),
)

const added = { vancouver: 0, portland: 0, nyc: 0, pullman: 0, moscow: 0, eastside: 0, la: 0, sf: 0, peninsula: 0, northbay: 0, eastbay: 0, sandiego: 0 }
const tiers = { 1: 0, 2: 0, 3: 0, 4: 0 }
assert.equal(ledger.places.length, 703)

for (const row of ledger.places) {
  const place = byId.get(row.id)
  if (!place && archived.has(row.id)) continue
  assert.ok(place, row.id)
  assert.equal(place.city, row.city)
  assert.equal(place.name, row.name)
  assert.equal(files[row.city] != null, true)
  if (row.price == null) {
    assert.equal(place.price ?? null, null, row.id)
    assert.match(row.evidence, /no price range|No Apple Maps place id/)
  } else {
    assert.equal(place.price, row.price, row.id)
    if (row.source === 'Apple Maps') {
      assert.match(row.evidence, /^Apple Maps PRICE_RANGE score [1-4] of 4$/)
      assert.match(row.url, /^https:\/\/maps\.apple\.com\/place\?auid=\d+$/)
    } else {
      assert.equal(row.source, 'Official site')
      assert.match(row.evidence, /^Official site schema\.org priceRange "\${1,4}"$/)
      assert.equal(row.url, place.website)
    }
    added[row.city] += 1
    tiers[row.price] += 1
  }
}

assert.deepEqual(added, { vancouver: 88, portland: 21, nyc: 91, pullman: 15, moscow: 11, eastside: 12, la: 14, sf: 36, peninsula: 5, northbay: 5, eastbay: 1, sandiego: 30 })
assert.deepEqual(tiers, { 1: 26, 2: 108, 3: 113, 4: 82 })
console.log('price sources ok')
