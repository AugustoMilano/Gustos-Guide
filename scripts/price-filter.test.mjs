import assert from 'node:assert/strict'
import { hasUnknownPrice, matchesPrice, priceFilterActive } from '../src/lib/price-filter.ts'

const any = { prices: [], unknown: false }
assert.equal(priceFilterActive(any), false)
assert.equal(matchesPrice({ price: 1 }, any), true)
assert.equal(matchesPrice({}, any), true)
assert.equal(matchesPrice({ price: 2 }, { prices: [1], unknown: false }), false)
assert.equal(matchesPrice({ price: 1 }, { prices: [1, 3], unknown: false }), true)
assert.equal(matchesPrice({}, { prices: [1], unknown: false }), false)
assert.equal(matchesPrice({}, { prices: [], unknown: true }), true)
assert.equal(matchesPrice({ price: 4 }, { prices: [2], unknown: true }), false)
assert.equal(matchesPrice({}, { prices: [2], unknown: true }), true)
assert.equal(hasUnknownPrice([{ price: 1 }, {}]), true)
assert.equal(hasUnknownPrice([{ price: 2 }, { price: 4 }]), false)

console.log('price filter ok')
