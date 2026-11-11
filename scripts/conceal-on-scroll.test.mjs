import assert from 'node:assert/strict'
import { nextConcealed } from '../src/lib/conceal-on-scroll.ts'

assert.equal(nextConcealed(false, 0, 40, true, false), false)
assert.equal(nextConcealed(false, 200, 4, true, true), false)
assert.equal(nextConcealed(false, 200, 20, false, false), false)
assert.equal(nextConcealed(false, 200, 20, true, true), true)
assert.equal(nextConcealed(false, 1600, 30, true, false), true)
assert.equal(nextConcealed(true, 400, 2, true, true), true)
assert.equal(nextConcealed(true, 300, -20, true, true), false)
assert.equal(nextConcealed(true, 4, -30, true, true), false)
console.log('conceal on scroll ok')
