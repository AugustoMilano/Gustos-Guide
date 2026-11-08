import assert from 'node:assert/strict'
import { accountAccessibleName, accountGreeting } from '../src/lib/account-label.ts'

const cases = [
  [{ name: 'Augusto Milano' }, 'Augusto', 'Augusto Milano'],
  [{ name: '  Augusto   Milano  ' }, 'Augusto', 'Augusto Milano'],
  [{ name: 'Cher' }, 'Cher', 'Cher'],
  [{ name: '  Cher  ' }, 'Cher', 'Cher'],
  [{ givenName: 'Augusto', name: 'A. Milano' }, 'Augusto', 'A. Milano'],
  [{ givenName: '  Mary Ann ', name: 'Mary Ann Smith' }, 'Mary', 'Mary Ann Smith'],
  [{ givenName: ' ', name: 'Augusto Milano' }, 'Augusto', 'Augusto Milano'],
  [{ name: '' }, 'Account', 'Account'],
  [{ name: '   ' }, 'Account', 'Account'],
  [{}, 'Account', 'Account'],
  [{ name: 'augusto@example.com' }, 'Account', 'Account'],
  [{ givenName: 'person@example.com', name: 'Augusto Milano' }, 'Augusto', 'Augusto Milano'],
]

for (const [identity, greeting, accessible] of cases) {
  assert.equal(accountGreeting(identity), greeting, JSON.stringify(identity))
  assert.equal(accountAccessibleName(identity), accessible, JSON.stringify(identity))
}

console.log('account label tests passed')
