import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const app = readFileSync(new URL('../src/state/AppState.tsx', import.meta.url), 'utf8')

test('guide pages load published house scores from Supabase for every visitor', () => {
  assert.match(app, /import \{[^}]*loadHouseScores[^}]*\} from '\.\.\/social\/account\.ts'/)
  assert.match(app, /void loadHouseScores\(remote\)/)
  assert.match(app, /setPublished\(scores\)/)
  assert.match(app, /const \[houseReady, setHouseReady\] = useState\(!supabaseConfigured\)/)
  assert.doesNotMatch(app, /const \[houseReady\] = useState\(true\)/)
})

test('published scores are a public read; accounts still do not write house_scores', () => {
  assert.match(app, /Published Gusto's Scores are read from the public house_scores table/)
  assert.doesNotMatch(app, /remote\.from\('house_scores'\)\.upsert/)
  assert.match(app, /Accounts never write house scores/)
})

test("gustoScore prefers the owner's local draft, then the published table, then the shipped fallback", () => {
  assert.match(app, /const live = published\[placeId\]/)
  assert.match(app, /HOUSE_SCORE_FALLBACK\[placeId\]/)
  assert.match(app, /if \(ownerVerified\) \{\s*const draft = house\[placeId\]/)
})
