import assert from 'node:assert/strict'
import { portraitClass } from '../src/lib/portrait-frame.ts'

assert.equal(portraitClass(1600, 1200), '')
assert.equal(portraitClass(1200, 1600), ' is-portrait')
assert.equal(portraitClass(1536, 2048, '/photos/beecher-s-handmade-cheese-gusto-1.jpg'), ' is-portrait')
assert.equal(portraitClass(1536, 2048, '/photos/piroshky-piroshky-gusto-1.jpg'), ' is-portrait is-portrait-lower')
assert.equal(portraitClass(1600, 1200, '/photos/piroshky-piroshky.jpg'), '')
console.log('portrait frame ok')
