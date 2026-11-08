import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../public/status.js', import.meta.url), 'utf8')
const redirectAt = source.indexOf("location.hostname === 'www.gustosguide.com'")
const bootAt = source.indexOf('var startApp')
assert.ok(redirectAt > 0 && redirectAt < bootAt, 'www forwards to the apex before the app boots')
assert.match(source, /apex\.hostname = 'gustosguide\.com'/)
assert.match(source, /location\.replace\(apex\.toString\(\)\)/)
console.log('status host test passed')
