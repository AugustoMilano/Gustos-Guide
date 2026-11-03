// index.html ships a static copy of the landing (city picker) so the heading paints before the app
// script. Fail the build if that copy drifts from REGIONS or the landing copy in CitiesPage.
import { readFileSync } from 'node:fs'
const html = readFileSync('index.html', 'utf8')
const city = readFileSync('src/lib/city.ts', 'utf8')
const page = readFileSync('src/pages/CitiesPage.tsx', 'utf8')
const block = city.slice(city.indexOf('REGIONS'), city.indexOf('export const ACTIVE_CITY'))
const regions = [...block.matchAll(/name: '([^']+)',\s*detail: '([^']+)'/g)].map((m) => [m[1], m[2]])
const problems = []
for (const [name, detail] of regions) {
  if (!html.includes(`>${name}</span>`)) problems.push(`missing city ${name}`)
  if (!html.includes(`>${detail}</span>`)) problems.push(`missing detail ${detail}`)
}
for (const text of ['Where are you eating?', 'Pick a city to open its guide.']) {
  if (!page.includes(text)) problems.push(`CitiesPage no longer says "${text}"`)
  if (!html.includes(text)) problems.push(`index.html no longer says "${text}"`)
}
if (regions.length !== (html.match(/class="city-card"/g) ?? []).length) problems.push('city count differs')
if (problems.length) {
  console.error('prerender drift:\n' + problems.join('\n'))
  process.exit(1)
}
console.log(`prerender ok (${regions.length} cities)`)
