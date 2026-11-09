import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const ledger = JSON.parse(readFileSync(new URL('../data/price-sources.json', import.meta.url), 'utf8'))
const files = {
  eastside: 'eastside.json',
  la: 'la.json',
  sf: 'sf.json',
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

const added = { vancouver: 0, portland: 0, nyc: 0, pullman: 0, moscow: 0, eastside: 0, la: 0, sf: 0 }
const tiers = { 1: 0, 2: 0, 3: 0, 4: 0 }
assert.equal(ledger.places.length, 631)

for (const row of ledger.places) {
  const place = byId.get(row.id)
  assert.ok(place, row.id)
  assert.equal(place.city, row.city)
  assert.equal(place.name, row.name)
  assert.equal(files[row.city] != null, true)
  if (row.price == null) {
    assert.equal(place.price ?? null, null, row.id)
    assert.match(row.evidence, /no price range|No Apple Maps place id/)
  } else {
    assert.equal(place.price, row.price, row.id)
    assert.match(row.evidence, /^Apple Maps PRICE_RANGE score [1-4] of 4$/)
    assert.match(row.url, /^https:\/\/maps\.apple\.com\/place\?auid=\d+$/)
    added[row.city] += 1
    tiers[row.price] += 1
  }
}

assert.deepEqual(added, { vancouver: 83, portland: 19, nyc: 72, pullman: 13, moscow: 11, eastside: 9, la: 1, sf: 29 })
assert.deepEqual(tiers, { 1: 18, 2: 74, 3: 78, 4: 67 })
console.log('price sources ok')
