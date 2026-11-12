import assert from 'node:assert/strict'
import { accumulate, nextConcealed } from '../src/lib/conceal-on-scroll.ts'

assert.equal(nextConcealed(false, 0, 40, true, false), false)
assert.equal(nextConcealed(false, 200, 4, true, true), false)
assert.equal(nextConcealed(false, 200, 20, false, false), false)
assert.equal(nextConcealed(false, 200, 20, true, true), true)
assert.equal(nextConcealed(false, 1600, 30, true, false), true)
assert.equal(nextConcealed(true, 400, 2, true, true), true)
assert.equal(nextConcealed(true, 300, -20, true, true), false)
assert.equal(nextConcealed(true, 4, -30, true, true), false)

// A phone reports a few pixels per frame. Three frames of 4px add up; one frame does not.
let travel = 0
let concealed = false
let y = 400
for (let step = 0; step < 3; step += 1) {
  y += 4
  travel = accumulate(travel, 4)
  const next = nextConcealed(concealed, y, travel, true, true)
  if (next !== concealed) travel = 0
  concealed = next
}
assert.equal(concealed, true)
assert.equal(accumulate(12, -3), -3)
assert.equal(accumulate(0, 0), 0)
console.log('conceal on scroll ok')
