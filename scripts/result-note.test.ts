import assert from 'node:assert/strict'
import { resultNote } from '../src/lib/result-note.ts'

// Match mechanics never show as the gray line under a search row.
assert.equal(resultNote({ title: 'Delancey', detail: 'Pizza · Ballard', why: 'Place name' }), '')
assert.equal(resultNote({ title: 'Italian & Pasta', detail: 'Cuisine', why: 'Match' }), '')
// A reason the title or detail already says is not repeated.
assert.equal(resultNote({ title: 'Best Pizza in Seattle', detail: 'Cuisine', why: 'Guide title · Pizza' }), '')
assert.equal(resultNote({ title: "Big Mario's Pizza", detail: 'Pizza · Capitol Hill', why: 'Pizza' }), '')
assert.equal(resultNote({ title: 'Ramen, Pho & Noodles', detail: 'Cuisine', why: 'Guide title · Ramen' }), '')
// A useful reason stays.
assert.equal(resultNote({ title: 'Cactus', detail: 'Mexican · Downtown Kirkland', why: 'Best of Kirkland' }), 'Best of Kirkland')
assert.equal(resultNote({ title: 'Kamonegi', detail: 'Japanese · Fremont', why: 'Ramen' }), 'Ramen')
console.log('result note ok')
