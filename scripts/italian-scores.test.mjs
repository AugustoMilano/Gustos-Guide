import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HOUSE_SCORE_FALLBACK } from '../src/lib/house-score-fallback.ts'
import { rankByHouseScore } from '../src/lib/guide-rank.ts'

const places = JSON.parse(readFileSync(new URL('../src/content/places.json', import.meta.url), 'utf8'))
const index = JSON.parse(readFileSync(new URL('../src/content/index.json', import.meta.url), 'utf8'))
const guides = JSON.parse(readFileSync(new URL('../src/content/guides.json', import.meta.url), 'utf8'))
const italian = guides.find((guide) => guide.slug === 'italian')
const members = italian.entries.map((entry) => entry.placeId)

const scores = {
  'pasta-casalinga': 8.0,
  'il-bistro': 7.4,
  'that-s-amore-italian-cafe': 7.3,
  'barolo-ristorante': 7.1,
  'cortina': 7.0,
  'due-cucina-italiana': 6.9,
  'mamma-melina-ristorante-pizzeria': 6.7,
}
assert.deepEqual(HOUSE_SCORE_FALLBACK, { ...scores, 'mee-sum-pastry': 8.4 })
assert.equal(places['mee-sum-pastry'].name, 'Mee Sum Pastry')
assert.equal(places['mee-sum-pastry'].gustoScore, null)
assert.equal(index.places.find((place) => place.id === 'mee-sum-pastry').gustoScore, null)
const pike = guides.find((guide) => guide.slug === 'pike-place')
const pikeIds = pike.entries.map((entry) => entry.placeId)
assert.equal(pikeIds[pikeIds.indexOf('storyville-coffee-company') + 1], 'mee-sum-pastry')
assert.equal(pike.ranked, false)
assert.equal(pike.pinned, true)

const names = {
  'pasta-casalinga': 'Pasta Casalinga',
  'il-bistro': 'IL Bistro',
  'that-s-amore-italian-cafe': 'That’s Amore Italian Cafe',
  'barolo-ristorante': 'Barolo Ristorante',
  cortina: 'Cortina',
  'due-cucina-italiana': "Due' Cucina Italiana",
  'mamma-melina-ristorante-pizzeria': 'Mamma Melina Ristorante + Pizzeria',
}
for (const [id, score] of Object.entries(scores)) {
  assert.equal(places[id].name, names[id], id)
  assert.equal(places[id].gustoScore, null, id)
  assert.equal(index.places.find((place) => place.id === id).gustoScore, null, id)
  assert.equal(members.includes(id), true, id)
  assert.equal(score, HOUSE_SCORE_FALLBACK[id])
}

const removed = ['how-to-cook-a-wolf', 'mondello-italian-restaurant', 'cornelly', 'willmott-s-ghost']
for (const id of removed) assert.equal(members.includes(id), false, id)
assert.deepEqual(places['how-to-cook-a-wolf'].guideSlugs, ['queen-anne-incl-lower-queen-anne'])
assert.deepEqual(places['willmott-s-ghost'].guideSlugs, ['splurge', 'south-lake-union-incl-denny-triangle'])
assert.deepEqual(places['cornelly'].guideSlugs, ['date-night', 'capitol-hill'])
assert.deepEqual(places['mondello-italian-restaurant'].guideSlugs, [])
assert.equal(italian.entries.length, 27)
assert.equal(index.guides.find((guide) => guide.slug === 'italian').count, 27)
assert.deepEqual(members, [
  'il-terrazzo-carmine',
  'the-pink-door',
  'il-bistro',
  'carmine-s',
  'la-fontana-siciliana',
  'pasta-casalinga',
  'cantinetta',
  'that-s-amore-italian-cafe',
  'cortina',
  'barolo-ristorante',
  'darkalino-s',
  'mamma-melina-ristorante-pizzeria',
  'il-nido',
  'lioness',
  'artusi',
  'spinasse',
  'assaggio-ristorante',
  'san-fermo',
  'serafina',
  'vendemmia',
  'cotto-belltown',
  'cinque-terre-ristorante',
  'altura',
  'tulio',
  'due-cucina-italiana',
  'messina',
  'bar-del-corso',
])

const ranked = rankByHouseScore(
  italian.entries.map((entry) => ({ place: places[entry.placeId] })),
  (id) => (Object.hasOwn(scores, id) ? scores[id] : null),
)
assert.deepEqual(
  ranked.filter((row) => row.rank != null).map((row) => [row.rank, row.place.id, scores[row.place.id]]),
  [
    [1, 'pasta-casalinga', 8.0],
    [2, 'il-bistro', 7.4],
    [3, 'that-s-amore-italian-cafe', 7.3],
    [4, 'barolo-ristorante', 7.1],
    [5, 'cortina', 7.0],
    [6, 'due-cucina-italiana', 6.9],
    [7, 'mamma-melina-ristorante-pizzeria', 6.7],
  ],
)
const tied = rankByHouseScore(
  [
    { place: { id: 'b', name: 'Bistro' } },
    { place: { id: 'a', name: 'Alpha' } },
  ],
  () => 7,
)
assert.deepEqual(tied.map((row) => row.place.id), ['a', 'b'])

console.log('italian scores ok')
