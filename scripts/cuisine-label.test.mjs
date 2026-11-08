import assert from 'node:assert/strict'
import { cuisineLabel, cuisineMenuLabel } from '../src/lib/cuisine-label.ts'

const stored = [
  ['Chinese (Dumplings', 'Chinese (Dumplings)'],
  ['Chinese (Noodles', 'Chinese (Noodles)'],
  ['Chicken (Rotisserie', 'Chicken (Rotisserie)'],
  ['Congee)', 'Congee'],
  ['Dim Sum)', 'Dim Sum'],
  ['gluten-free)', 'gluten-free'],
  ['Italian (Sandwiches', 'Italian (Sandwiches)'],
  ['New American (Butcher', 'New American (Butcher)'],
  ['Salumi)', 'Salumi'],
  ['Bar)', 'Bar'],
  ['Chinese (Sichuan)', 'Chinese (Sichuan)'],
  ['Pizza', 'Pizza'],
  ['Bar', 'Bar'],
]

for (const [raw, label] of stored) assert.equal(cuisineLabel(raw), label, raw)

const menu = ['Bar', 'Bar)', 'Congee)', 'Chinese (Dumplings']
assert.equal(cuisineMenuLabel('Bar', menu), 'Bar')
assert.equal(cuisineMenuLabel('Bar)', menu), '(Bar)')
assert.equal(cuisineMenuLabel('Congee)', menu), 'Congee')
assert.equal(cuisineMenuLabel('Chinese (Dumplings', menu), 'Chinese (Dumplings)')
assert.equal(cuisineLabel('Chinese (Dumplings'), 'Chinese (Dumplings)')
assert.notEqual(cuisineLabel('Chinese (Dumplings'), 'Chinese (Dumplings')

console.log('cuisine label tests passed')
