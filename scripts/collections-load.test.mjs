import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { CURATED_CHEAP_EATS_MIN, usableCheapMembers } from '../src/lib/collections.ts'

const app = readFileSync(new URL('../src/state/AppState.tsx', import.meta.url), 'utf8')

test('guide pages load published collections from Supabase for every visitor', () => {
  assert.match(app, /fetchCollections,/)
  assert.match(app, /void fetchCollections\(remote\)/)
  assert.match(app, /setCollectionsStatus\('ready'\)/)
  assert.match(app, /const \[collectionsStatus, setCollectionsStatus\] = useState<CollectionsStatus>\(supabaseConfigured \? 'loading' : 'offline'\)/)
  assert.doesNotMatch(app, /const \[collectionsStatus, setCollectionsStatus\] = useState<CollectionsStatus>\('offline'\)/)
})

test('published collections are a public read; accounts still do not write house collections', () => {
  assert.match(app, /Curated collections \(Cheap eats order\) are read from the public/)
  assert.match(app, /Accounts never write/)
  assert.match(app, /function houseRemote\(\): SupabaseClient \| null \{\s*return null\s*\}/)
  assert.match(app, /const houseClient = houseRemote\(\)/)
})

test('house scores still load publicly, and house marks stay unloaded for visitors', () => {
  assert.match(app, /void loadHouseScores\(remote\)/)
  assert.doesNotMatch(app, /loadHouseMarks/)
})

function place(id, extra = {}) {
  return { id, name: id, cuisine: ['Cafe'], lat: 47.6, lng: -122.3, price: 1, city: 'seattle', ...extra }
}

function row(placeIds, city = 'seattle') {
  return { id: 'c1', city, title: 'Cheap eats', slug: 'cheap-eats', blurb: null, position: 0, placeIds, published: true }
}

test('curated Cheap eats is used only when at least 5 catalog places remain', () => {
  assert.equal(CURATED_CHEAP_EATS_MIN, 5)

  const catalog = ['un-bien', 'tat-s', 'mee-sum', 'other-coast', 'bottega', 'maruta'].map((id) => place(id))
  const curated = usableCheapMembers(row(catalog.map((p) => p.id)), catalog)
  assert.deepEqual(curated.map((p) => p.id), ['un-bien', 'tat-s', 'mee-sum', 'other-coast', 'bottega', 'maruta'])

  // Five known members still use the stored order, even if one stored id is missing from the catalog.
  const withMissing = usableCheapMembers(row(['un-bien', 'tat-s', 'mee-sum', 'other-coast', 'bottega', 'gone']), catalog)
  assert.deepEqual(withMissing.map((p) => p.id), ['un-bien', 'tat-s', 'mee-sum', 'other-coast', 'bottega'])
})

test('short or empty curated Cheap eats lists fall back to the computed automatic list', () => {
  const catalog = ['un-bien', 'tat-s', 'mee-sum', 'other-coast', 'bottega'].map((id) => place(id))

  assert.equal(usableCheapMembers(null, catalog), null)
  assert.equal(usableCheapMembers(row([]), catalog), null)
  assert.equal(usableCheapMembers(row(['third-culture-coffee']), [place('third-culture-coffee', { city: 'eastside' })]), null)
  const four = ['a', 'b', 'c', 'd'].map((id) => place(id))
  assert.equal(usableCheapMembers(row(['a', 'b', 'c', 'd']), four), null)

  // Four known catalog members, even if the stored row lists more missing ids.
  const fourKnown = usableCheapMembers(row(['un-bien', 'tat-s', 'mee-sum', 'other-coast', 'gone', 'also-gone']), catalog)
  assert.equal(fourKnown, null)
})
