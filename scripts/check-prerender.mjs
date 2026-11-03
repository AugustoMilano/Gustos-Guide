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
// Top 25 intro copy (fix77): every sentence in TopPage must appear verbatim in the static shell.
const top = readFileSync('src/pages/TopPage.tsx', 'utf8')
const unesc = (s) => s.replace(/&#39;/g, "'")
const topHtml = unesc(html)
const topCopy = [...top.matchAll(/"([^"]*ranked by Augusto[^"]*)"/g)].map((m) => m[1])
topCopy.push('Restaurants only, one per brand. Owner scores only; a place with no score stays off the list.', 'Golden Fork · 2026')
if (topCopy.length !== 6) problems.push(`expected 4 Top intros, found ${topCopy.length - 2}`)
for (const text of topCopy) {
  if (!top.includes(text)) problems.push(`TopPage no longer says "${text}"`)
  if (!topHtml.includes(text)) problems.push(`index.html Top shell missing "${text}"`)
}
for (const name of ['Seattle', 'Los Angeles', 'San Francisco', 'San Diego']) if (!topHtml.includes(`Top 25 · ${name}</h1>`)) problems.push(`Top shell missing ${name}`)
const status = readFileSync('public/status.js', 'utf8')
for (const t of [...city.matchAll(/return '([^']+)'/g)].map((m) => m[1]).filter((t) => /^[A-Z]/.test(t))) {
  const js = t.replace('’', '\\u2019')
  if (!status.includes(`'${js}'`)) problems.push(`status.js missing area title ${t}`)
}
if (problems.length) {
  console.error('prerender drift:\n' + problems.join('\n'))
  process.exit(1)
}
console.log(`prerender ok (${regions.length} cities)`)
