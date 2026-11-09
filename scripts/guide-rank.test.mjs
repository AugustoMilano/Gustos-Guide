import assert from 'node:assert/strict'
import { rankByHouseScore } from '../src/lib/guide-rank.ts'

const rows = [
  { place: { id: 'carmine', name: 'Il Terrazzo Carmine' } },
  { place: { id: 'pink', name: 'The Pink Door' } },
  { place: { id: 'quiet', name: 'Unscored Room' } },
  { place: { id: 'tie-b', name: 'Bistro' } },
  { place: { id: 'tie-a', name: 'Atrium' } },
]
const scores = { carmine: 8.9, pink: 9.5, 'tie-b': 8, 'tie-a': 8 }
const ranked = rankByHouseScore(rows, (id) => scores[id] ?? null)

assert.deepEqual(ranked.map((row) => [row.place.id, row.rank]), [
  ['pink', 1],
  ['carmine', 2],
  ['tie-a', 3],
  ['tie-b', 4],
  ['quiet', null],
])
assert.equal(ranked.at(-1).place.name, 'Unscored Room')
console.log('guide rank ok')
