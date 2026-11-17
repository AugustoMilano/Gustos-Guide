import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { OWNER_PRICED_CHEAP, cheapEatsFor, omitSeattleCheapEats, seattleCheapEatsBlocked } from '../src/lib/collections.ts'

// OWNER_PRICED_CHEAP must match the $ prices Augusto gave (source "Augusto") in the price ledgers.
const fromLedgers = new Set()
for (const file of ['price-sources-2026-11-11.json', 'price-sources-2026-11-15.json']) {
  const ledger = JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'))
  for (const row of ledger.places) if (row.source === 'Augusto' && row.price === 1) fromLedgers.add(row.id)
}
assert.deepEqual([...OWNER_PRICED_CHEAP].sort(), [...fromLedgers].sort())

// Real NYC catalog: 35 open $ places, Van Leeuwen unscored. It used to fall past the 25 cap.
const full = JSON.parse(readFileSync(new URL('../src/content/nyc.json', import.meta.url), 'utf8'))
const nyc = full.places
const score = (id) => {
  const place = nyc.find((row) => row.id === id)
  return typeof place?.gustoScore === 'number' ? place.gustoScore : null
}
const list = cheapEatsFor(nyc, 'nyc', score)
assert.ok(list.some((place) => place.id === 'van-leeuwen-ice-cream'), 'Van Leeuwen is on NYC Cheap eats')
assert.ok(list.length >= 25)
assert.equal(new Set(list.map((place) => place.id)).size, list.length, 'no duplicates')
for (const place of list) assert.equal(place.price, 1)

// Alibi Room is never in Cheap eats, in any city, even when priced $.
const fake = [
  { id: 'alibi-room', name: 'Alibi Room', cuisine: ['Pizza'], lat: 1, lng: 2, price: 1, city: 'nyc' },
  { id: 'alibi-room', name: 'Alibi Room', cuisine: ['Pizza'], lat: 1, lng: 2, price: 1, city: 'seattle' },
]
assert.equal(cheapEatsFor(fake, 'nyc').length, 0)
assert.equal(cheapEatsFor(fake, 'seattle').length, 0)
assert.equal(seattleCheapEatsBlocked('nyc', 'cheap-eats', 'alibi-room'), true)
assert.deepEqual(omitSeattleCheapEats('nyc', ['alibi-room', 'x']), ['x'])

console.log(`cheap eats ok (NYC ${list.length} places, Van Leeuwen at ${list.findIndex((place) => place.id === 'van-leeuwen-ice-cream') + 1})`)
