import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const ledger = JSON.parse(readFileSync(new URL('../data/price-sources.json', import.meta.url), 'utf8'))
const google = JSON.parse(readFileSync(new URL('../data/price-sources-2026-11-11.json', import.meta.url), 'utf8'))
const later = new Map(google.places.map((row) => [row.id, row]))
const nov14 = JSON.parse(readFileSync(new URL('../data/price-sources-2026-11-14.json', import.meta.url), 'utf8'))
const nov15 = JSON.parse(readFileSync(new URL('../data/price-sources-2026-11-15.json', import.meta.url), 'utf8'))
for (const row of nov14.places) later.set(row.id, row)
for (const row of nov15.places) later.set(row.id, row)
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
    if (later.has(row.id)) continue
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

// Nov 11, 2026 batch: Google Places priceLevel, owner-supplied tiers, and Google per-person lines.
const seattle = JSON.parse(readFileSync(new URL('../src/content/places.json', import.meta.url), 'utf8'))
for (const place of Object.values(seattle)) byId.set(place.id, { ...place, city: 'seattle' })
const laterAdded = {}
assert.equal(new Set(google.places.map((row) => row.id)).size, google.places.length)
for (const row of google.places) {
  const place = byId.get(row.id)
  assert.ok(place, row.id)
  assert.ok(!archived.has(row.id), row.id)
  assert.equal(place.name, row.name)
  assert.equal(place.city ?? 'seattle', row.city)
  assert.equal(place.price, row.price, row.id)
  assert.ok(!/alibi room/i.test(row.name), row.id)
  if (row.source === 'Google Places') {
    assert.match(row.evidence, /^Google Places API priceLevel PRICE_LEVEL_(INEXPENSIVE|MODERATE|EXPENSIVE|VERY_EXPENSIVE)(, price range .+)?$/)
    assert.match(row.url, /^https:\/\/www\.google\.com\/maps\/place\/\?q=place_id:[\w-]+$/)
    const level = { INEXPENSIVE: 1, MODERATE: 2, EXPENSIVE: 3, VERY_EXPENSIVE: 4 }[row.evidence.match(/PRICE_LEVEL_(\w+?)(,|$)/)[1]]
    assert.equal(row.price, level, row.id)
  } else if (row.source === 'Augusto') {
    assert.match(row.evidence, /^Owner-supplied price from Augusto Milano/)
  } else {
    assert.equal(row.source, 'Google per person')
    assert.match(row.evidence, /price per person \$100\+ \(\d+ reports\)$/)
    assert.equal(row.price, 4)
  }
  laterAdded[row.city] = (laterAdded[row.city] ?? 0) + 1
}
assert.equal(google.places.length, 341)

// Nov 14, 2026 batch: Google per-person ranges, official menus, and Yelp price levels, one cited source each.
assert.equal(nov14.places.length, 15)
for (const row of nov14.places) {
  const place = byId.get(row.id)
  assert.ok(place, row.id)
  assert.ok(!archived.has(row.id), row.id)
  assert.equal(place.name, row.name)
  assert.equal(place.city ?? 'seattle', row.city)
  assert.equal(place.price, row.price, row.id)
  assert.ok(!/alibi room/i.test(row.name), row.id)
  assert.ok(['Google per-person', 'restaurant menu', 'Yelp price level'].includes(row.source), row.id)
  assert.match(row.url, /^https:\/\//)
  assert.ok(row.evidence.length > 20, row.id)
}
assert.equal(byId.get('maruta-shoten').price, 1)
assert.equal(byId.get('joey-university-village').price, 3)

// Nov 15, 2026 batch: owner-supplied tiers from Augusto. No third-party lookup.
assert.equal(nov15.places.length, 16)
assert.equal(new Set(nov15.places.map((row) => row.id)).size, nov15.places.length)
for (const row of nov15.places) {
  const place = byId.get(row.id)
  assert.ok(place, row.id)
  assert.ok(!archived.has(row.id), row.id)
  assert.equal(place.name, row.name)
  assert.equal(place.city ?? 'seattle', row.city)
  assert.equal(place.price, row.price, row.id)
  assert.equal(row.source, 'Augusto')
  assert.equal(row.url, null)
  assert.match(row.evidence, /^Owner-supplied price from Augusto Milano, Nov 15, 2026/)
  assert.ok(!/alibi room/i.test(row.name), row.id)
}
assert.equal(byId.get('javiers').price, 4)
assert.match(nov15.places.find((row) => row.id === 'javiers').evidence, /\$100\+ per person/)
assert.equal(byId.get('freddo').price, 1)
assert.equal(byId.get('van-leeuwen-ice-cream').price, 1)
console.log('price sources ok')
