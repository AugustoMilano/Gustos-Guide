import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { resultNote } from '../src/lib/result-note.ts'

const search = readFileSync(new URL('../src/lib/smart-search.ts', import.meta.url), 'utf8')

test('search stays in the open city; a leftover query must not pull another catalog', () => {
  assert.match(search, /Matches stay in the open city/)
  assert.match(search, /return searchIn\(current, query, current, places, guides, scoreOf\)/)
  assert.doesNotMatch(search, /function detectScope/)
  assert.doesNotMatch(search, /a place name from another area/)
  assert.doesNotMatch(search, /switches scope/)
})

test('result rows do not show the gray Place name match label', () => {
  assert.equal(resultNote({ title: 'Canlis', detail: 'Pacific Northwest · Queen Anne', why: 'Place name' }), '')
  assert.equal(resultNote({ title: "Baron's Sino Kitchen & Bar", detail: 'Chinese · Downtown Bellevue', why: 'Place name' }), '')
  assert.equal(resultNote({ title: 'Delancey', detail: 'Pizza · Ballard', why: 'Place name · Ballard' }), '')
  assert.equal(resultNote({ title: 'Best pizza', detail: 'Food', why: 'Guide title' }), '')
  assert.equal(resultNote({ title: 'Takai by Kashiba', detail: 'Japanese · Downtown Bellevue', why: 'Sushi' }), 'Sushi')
})

test('home, guides, and header keep a separate search draft per city', () => {
  const home = readFileSync(new URL('../src/pages/HomePage.tsx', import.meta.url), 'utf8')
  const header = readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8')
  const guidesPage = readFileSync(new URL('../src/pages/GuideIndexPage.tsx', import.meta.url), 'utf8')
  const searchPage = readFileSync(new URL('../src/pages/SearchPage.tsx', import.meta.url), 'utf8')
  const field = readFileSync(new URL('../src/components/SearchField.tsx', import.meta.url), 'utf8')
  const results = readFileSync(new URL('../src/components/SmartResults.tsx', import.meta.url), 'utf8')

  for (const src of [home, header, guidesPage]) {
    assert.match(src, /useState<Partial<Record<CityId, string>>>\(\{\}\)/)
  }
  assert.match(home, /const draft = drafts\[city\] \?\? ''/)
  assert.match(header, /const query = queries\[city\] \?\? ''/)
  assert.match(searchPage, /smartSearch\(query, city,/)
  assert.match(field, /if \(hit\.kind === 'place'\) return hit\.detail/)
  assert.match(results, /resultNote\(hit\)/)
  assert.doesNotMatch(results, /\{hit\.why\}/)
})
