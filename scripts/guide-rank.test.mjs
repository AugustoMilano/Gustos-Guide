import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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

const drinks = [
  ['woodblock', 8.4, 'Woodblock'],
  ['postdoc-brewing', 7.6, 'Postdoc Brewing'],
  ['bellevue-brewing', 7.4, 'Bellevue Brewing Company'],
  ['earls-kitchen-bar', 7.4, 'Earls Kitchen + Bar'],
  ['tavern-hall', 7.4, 'Tavern Hall'],
  ['moss-bay-hall', 6.7, 'Moss Bay Hall'],
  ['central-bar-restaurant', 6.5, 'Central Bar + Restaurant'],
  ['palmers-east', 6.4, "Palmer's East"],
  ['central-tavern', 6.4, 'Central Tavern'],
  ['the-goose-pub', 6.2, 'The Goose Pub & Eatery'],
  ['520-bar-and-grill', 6.0, '520 Bar and Grill'],
  ['civility-and-unrest', 5.9, 'Civility & Unrest'],
]
const drinkRows = drinks.map(([id, , name]) => ({ place: { id, name } }))
const drinkScores = Object.fromEntries(drinks.map(([id, score]) => [id, score]))
const eastside = JSON.parse(readFileSync(new URL('../src/content/eastside.json', import.meta.url), 'utf8'))
const published = eastside.guides.find((guide) => guide.slug === 'eastside-drinks').entries.map((entry) => entry.placeId)
assert.deepEqual(published, drinks.map(([id]) => id))
const drinkRank = rankByHouseScore(drinkRows, (id) => drinkScores[id] ?? null, 'guide')
assert.deepEqual(drinkRank.map((row) => row.place.id), drinks.map(([id]) => id))
assert.deepEqual(drinkRank.map((row) => row.rank), drinks.map((_, index) => index + 1))

const byName = rankByHouseScore(drinkRows, (id) => drinkScores[id] ?? null)
const nameOrder = byName.map((row) => row.place.id)
assert.ok(nameOrder.indexOf('central-tavern') < nameOrder.indexOf('palmers-east'))
assert.deepEqual(nameOrder.slice(2, 5), ['bellevue-brewing', 'earls-kitchen-bar', 'tavern-hall'])
console.log('guide rank ok')
