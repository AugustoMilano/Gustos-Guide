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
const unesc = (s) => s.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const topHtml = unesc(html)
const topCopy = [...top.matchAll(/"([^"]*ranked by Augusto[^"]*)"/g)].map((m) => m[1])
topCopy.push('Restaurants only, one per brand. Owner scores only; a place with no score stays off the list.', 'Golden Fork · 2026')
if (topCopy.length !== regions.length + 2) problems.push(`expected ${regions.length} Top intros, found ${topCopy.length - 2}`)
for (const text of topCopy) {
  if (!top.includes(text)) problems.push(`TopPage no longer says "${text}"`)
  if (!topHtml.includes(text)) problems.push(`index.html Top shell missing "${text}"`)
}
for (const [name] of regions) if (!topHtml.includes(`Top 25 · ${name}</h1>`)) problems.push(`Top shell missing ${name}`)
const status = readFileSync('public/status.js', 'utf8')
for (const t of [...city.matchAll(/return '([^']+)'/g)].map((m) => m[1]).filter((t) => /^[A-Z]/.test(t))) {
  const js = t.replace('’', '\\u2019')
  if (!status.includes(`'${js}'`)) problems.push(`status.js missing area title ${t}`)
}
const home = readFileSync('src/pages/HomePage.tsx', 'utf8')
if (!home.includes('HOME_FEATURED')) problems.push('HomePage no longer reads HOME_FEATURED')
if (!status.includes("dataset.prerender = 'home'")) problems.push("status.js missing home prerender")
if (!html.includes('class="home-main outline-none pre-home"') && !html.includes("class='home-main outline-none pre-home'")) {
  if (!html.includes('pre-home')) problems.push('index.html missing pre-home shell')
}
if (!html.includes('id="pre-home-css"')) problems.push('index.html missing critical home CSS')
const featuredSource = readFileSync('src/content/home-featured.ts', 'utf8')
const featuredJson = featuredSource.slice(featuredSource.indexOf('{', featuredSource.indexOf('HOME_FEATURED')))
const featured = JSON.parse(featuredJson)

const eastside = featured.eastside
if (!eastside) problems.push('HOME_FEATURED missing eastside')
else {
  if (eastside.some((guide) => guide.slug === 'eastside-date-night')) problems.push('Eastside featured still includes date night')
  const bellevue = eastside.find((guide) => guide.slug === 'bellevue')
  if (!bellevue) problems.push('Eastside featured missing Bellevue Essentials')
  else if (bellevue.count !== 17) problems.push(`Bellevue Essentials featured count is ${bellevue.count}, expected 17`)
  if (eastside.length !== 5) problems.push(`Eastside featured has ${eastside.length}, expected 5`)
}
for (const [city, name] of Object.entries({ seattle: 'Seattle', eastside: 'Eastside', la: 'Los Angeles', sf: 'San Francisco', eastbay: 'East Bay', peninsula: 'Peninsula', northbay: 'North Bay', sandiego: 'San Diego', vancouver: 'Vancouver', portland: 'Portland', nyc: 'New York', pullman: 'Pullman, WA', moscow: 'Moscow, ID' })) {
  if (!html.includes(`data-city="${city}"`)) problems.push(`home shell missing ${city}`)
  if (!topHtml.includes(`>${name}</h1>`)) problems.push(`home shell missing heading ${name}`)
  for (const guide of featured[city] ?? []) {
    if (!topHtml.includes(`>${guide.title}</h3>`)) problems.push(`home shell missing ${city} ${guide.title}`)
    if (!html.includes(`${guide.count} ${guide.count === 1 ? 'place' : 'places'}`)) problems.push(`home shell missing count for ${guide.slug}`)
  }
}
if (problems.length) {
  console.error('prerender drift:\n' + problems.join('\n'))
  process.exit(1)
}
console.log(`prerender ok (${regions.length} cities)`)
