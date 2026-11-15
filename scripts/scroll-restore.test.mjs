import assert from 'node:assert/strict'
import {
  canHonorScroll,
  captureMark,
  captureScroll,
  maxScrollY,
  restoreScrollWhenReady,
  selectorFor,
} from '../src/lib/scroll-restore.ts'

assert.equal(maxScrollY(2000, 800), 1200)
assert.equal(maxScrollY(500, 800), 0)
assert.equal(canHonorScroll(0, 100, 800), true)
assert.equal(canHonorScroll(900, 1000, 800), false)
assert.equal(canHonorScroll(900, 1720, 800), true)
assert.equal(canHonorScroll(900, 1700, 800, 20), true)
assert.equal(captureScroll(0, 640), 640)
assert.equal(captureScroll(640, 12), 640)
assert.equal(captureScroll(0, 0), 0)
assert.deepEqual(captureMark({ y: 0 }, { y: 640, selector: '#entry-storyville-coffee-company', top: 120 }), {
  y: 640,
  selector: '#entry-storyville-coffee-company',
  top: 120,
})

{
  const writes = []
  let height = 400
  const handle = restoreScrollWhenReady({
    target: 0,
    read: () => ({ y: writes.at(-1) ?? 12, scrollHeight: height, clientHeight: 800 }),
    write: (y) => writes.push(y),
    stableMs: 0,
  })
  assert.deepEqual(writes, [0])
  assert.equal(handle.tryOnce(), true)
}

{
  const writes = []
  let height = 400
  let now = 0
  const listeners = new Set()
  const handle = restoreScrollWhenReady({
    target: 900,
    read: () => ({ y: writes.at(-1) ?? 0, scrollHeight: height, clientHeight: 800 }),
    write: (y) => writes.push(y),
    now: () => now,
    timeoutMs: 1000,
    stableMs: 0,
    subscribe: (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
  })
  // Too short to honor, so no write yet (min(900, 0) is 0).
  assert.deepEqual(writes, [])
  assert.equal(handle.tryOnce(), false)
  height = 1300
  for (const listener of listeners) listener()
  // 1300 - 800 = 500, still short; write the reachable offset and keep waiting.
  assert.deepEqual(writes, [500])
  assert.equal(handle.tryOnce(), false)
  height = 2000
  for (const listener of listeners) listener()
  assert.equal(writes.at(-1), 900)
  assert.equal(handle.tryOnce(), true)
  assert.equal(listeners.size, 0)
}

{
  const writes = []
  let height = 900
  let now = 0
  const listeners = new Set()
  restoreScrollWhenReady({
    target: 900,
    read: () => ({ y: writes.at(-1) ?? 0, scrollHeight: height, clientHeight: 800 }),
    write: (y) => writes.push(y),
    now: () => now,
    timeoutMs: 1000,
    stableMs: 0,
    subscribe: (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
  })
  assert.deepEqual(writes, [100])
  now = 1000
  for (const listener of listeners) listener()
  assert.equal(writes.at(-1), 100)
  assert.equal(listeners.size, 0)
}

{
  const writes = []
  let y = 0
  let top = 800
  let now = 0
  let height = 900
  const listeners = new Set()
  const handle = restoreScrollWhenReady({
    target: { y: 1200, selector: '#entry-storyville-coffee-company', top: 140 },
    read: () => ({ y, scrollHeight: height, clientHeight: 800 }),
    write: (next) => {
      top += next - y
      y = next
      writes.push(next)
    },
    locate: (selector) => (selector === '#entry-storyville-coffee-company' ? { top } : null),
    now: () => now,
    timeoutMs: 5000,
    stableMs: 0,
    subscribe: (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
  })
  // Page is still short, so the anchor row is brought to the saved viewport offset.
  assert.equal(writes.at(-1), 660)
  assert.equal(handle.tryOnce(), false)
  height = 2200
  for (const listener of listeners) listener()
  // Once the list is tall enough, the saved window offset wins.
  assert.equal(writes.at(-1), 1200)
  assert.equal(handle.tryOnce(), true)
  assert.equal(listeners.size, 0)
}

{
  const writes = []
  restoreScrollWhenReady({
    target: { y: 640, selector: '#entry-other', top: 40 },
    read: () => ({ y: 12, scrollHeight: 2000, clientHeight: 800 }),
    write: (y) => writes.push(y),
    locate: () => ({ top: 400 }),
    stableMs: 0,
  })
  assert.deepEqual(writes, [640])
}

assert.equal(selectorFor({ id: 'entry-storyville-coffee-company' }), '#entry-storyville-coffee-company')

console.log('scroll restore ok')
