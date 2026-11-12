import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { portraitClass } from '../src/lib/portrait-frame.ts'

assert.equal(portraitClass(1600, 1200), '')
assert.equal(portraitClass(1200, 1600), ' is-portrait')
assert.equal(portraitClass(1536, 2048, '/photos/beecher-s-handmade-cheese-gusto-1.jpg'), ' is-portrait')
assert.equal(portraitClass(1536, 2048, '/photos/deru-market-gusto-3.jpg'), ' is-portrait')
assert.equal(portraitClass(1536, 2048, '/photos/piroshky-piroshky-gusto-1.jpg'), ' is-portrait is-portrait-lower')
assert.equal(portraitClass(1600, 1200, '/photos/piroshky-piroshky.jpg'), '')

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
assert.equal(/object-position:\s*center 18%/.test(css), false)
assert.equal(css.includes('object-position: center 68%'), true)
console.log('portrait frame ok')
