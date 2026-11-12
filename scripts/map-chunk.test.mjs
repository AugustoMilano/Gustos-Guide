import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const explore = readFileSync(new URL('../src/pages/ExplorePage.tsx', import.meta.url), 'utf8')
const guideMap = readFileSync(new URL('../src/components/GuideMap.tsx', import.meta.url), 'utf8')
const loader = readFileSync(new URL('../src/lib/load-maplibre.ts', import.meta.url), 'utf8')

assert.doesNotMatch(explore, /maplibre/)
assert.doesNotMatch(guideMap, /maplibre-gl\.css/)
assert.match(guideMap, /loadMapLibraries\(/)
assert.match(loader, /import\('\.\/setup-maplibre\.ts'\)/)
assert.match(loader, /import\('\.\/maplibre-canvas\.css'\)/)
assert.doesNotMatch(loader, /maplibre-gl\.css/)
console.log('map chunk ok')
