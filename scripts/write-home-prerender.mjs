// Build the static city-home first paint: inlined featured cards in index.html
// and a small HOME_FEATURED module the React home page reads without waiting
// for the city catalog, so phones do not flash a blank or skeleton screen.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')
const loadJson = (rel) => JSON.parse(read(rel))

const AREA_NAME = {
  seattle: 'Seattle',
  eastside: 'Eastside',
  la: 'Los Angeles',
  sf: 'San Francisco',
  eastbay: 'East Bay',
  peninsula: 'Peninsula',
  northbay: 'North Bay',
  sandiego: 'San Diego',
  vancouver: 'Vancouver',
  portland: 'Portland',
  nyc: 'New York',
  pullman: 'Pullman, WA',
  moscow: 'Moscow, ID',
}

const CATALOG_FILE = {
  seattle: 'src/content/index.json',
  eastside: 'src/content/eastside.json',
  la: 'src/content/la.json',
  sf: 'src/content/sf.json',
  eastbay: 'src/content/sf.json',
  peninsula: 'src/content/sf.json',
  northbay: 'src/content/sf.json',
  sandiego: 'src/content/sd.json',
  vancouver: 'src/content/vancouver.json',
  portland: 'src/content/portland.json',
  nyc: 'src/content/nyc.json',
  pullman: 'src/content/palouse.json',
  moscow: 'src/content/palouse.json',
}

function featuredSlugsFromSource(source) {
  const block = source.slice(source.indexOf('const lists: Record<CityId, string[]> = {'), source.indexOf('return lists[city]'))
  const lists = {}
  for (const match of block.matchAll(/^\s+([a-z]+): \[([^\]]*)\],?/gm)) {
    lists[match[1]] = [...match[2].matchAll(/'([^']+)'/g)].map((item) => item[1])
  }
  if (Object.keys(lists).length !== Object.keys(AREA_NAME).length) {
    throw new Error(`featured slug parse expected ${Object.keys(AREA_NAME).length} cities, got ${Object.keys(lists).join(', ')}`)
  }
  return lists
}

function homeFeatured(lists) {
  const catalogs = {}
  const out = {}
  for (const [city, slugs] of Object.entries(lists)) {
    const file = CATALOG_FILE[city]
    const data = (catalogs[file] ??= loadJson(file))
    const guides = data.guides
    const picked = slugs
      .filter((slug) => slug === 'eastside-date-night' || !slug.includes('date-night'))
      .slice(0, 6)
    out[city] = picked.map((slug) => {
      const guide = guides.find((item) => item.slug === slug)
      if (!guide) throw new Error(`featured guide missing: ${city} ${slug}`)
      const count = Array.isArray(guide.entries) ? guide.entries.length : guide.count
      if (!Number.isInteger(count) || count < 0) throw new Error(`featured count missing: ${city} ${slug}`)
      return { slug, title: guide.title, count }
    })
  }
  return out
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function countPlaces(count) {
  return `${count} ${count === 1 ? 'place' : 'places'}`
}

const CHEVRON = `<svg class="home-shortcut-arrow" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" /></svg>`

function cityShell(city, name, featured) {
  const cards = featured
    .map(
      (guide) =>
        `<a href="#/${city}/guide/${escapeHtml(guide.slug)}" class="guide-card"><p class="text-xs font-bold uppercase tracking-[0.14em] tabular-nums">${escapeHtml(countPlaces(guide.count))}</p><h3 class="mt-2 font-serif text-3xl italic">${escapeHtml(guide.title)}</h3></a>`,
    )
    .join('')
  return `<div class="pre-home-city" data-city="${city}"><section class="hero on-navy relative overflow-hidden"><div class="hero-copy relative mx-auto max-w-6xl px-4 pt-28 pb-8 sm:pt-32"><h1 class="max-w-3xl font-serif text-5xl italic leading-[1.05] text-cream sm:text-6xl">${escapeHtml(name)}</h1><form class="mt-5" role="search" action="#/${city}"><label class="field home-search" for="pre-home-search-${city}"><span class="text-cream">Search guides and places</span><input id="pre-home-search-${city}" class="glass-input w-full" autocomplete="off" placeholder="Place or neighborhood" /></label></form></div></section><div class="mx-auto max-w-6xl px-4 pt-8 pb-16"><section aria-labelledby="pre-plan-${city}"><h2 id="pre-plan-${city}" class="font-serif text-4xl italic pre-plan-title">Plan my night</h2><p class="mt-2 max-w-xl text-sm">Say what you want, or the stops in order. Picks stay inside this guide.</p><div class="mt-4 max-w-xl"><form action="#/${city}/night"><label class="field" for="pre-home-night-${city}"><span>What sounds good?</span><textarea id="pre-home-night-${city}" class="pre-plan-input" rows="3" autocomplete="off" maxlength="400" placeholder="drinks, then dinner, then dessert"></textarea></label><button type="submit" class="btn btn-coral mt-3">Plan it</button></form></div></section><section class="mt-8" aria-labelledby="pre-featured-${city}"><h2 id="pre-featured-${city}" class="font-serif text-4xl italic">Featured guides</h2><div class="home-featured mt-4">${cards}</div></section><section class="home-shortcuts mt-6" aria-label="Tonight and Top 25"><a href="#/${city}/tonight" class="guide-card home-shortcut"><span class="home-shortcut-copy"><p class="text-xs font-bold uppercase tracking-[0.14em]">Open now</p><h2 class="mt-2 font-serif text-3xl italic">Tonight</h2></span>${CHEVRON}</a><a href="#/${city}/top" class="guide-card home-shortcut"><span class="home-shortcut-copy"><p class="text-xs font-bold uppercase tracking-[0.14em]">Ranked</p><h2 class="mt-2 font-serif text-3xl italic">Top 25</h2></span>${CHEVRON}</a></section><p class="mt-8"><a href="#/${city}/guides" class="btn btn-coral">Browse all guides</a></p></div></div>`
}

const CRITICAL_CSS = `/* City-home first paint: enough color and type to show the hero before the main stylesheet. */
@font-face{font-family:Instrument Serif;font-style:italic;font-weight:400;font-display:swap;src:url("./fonts/instrument-serif-italic.woff2") format("woff2")}
html[data-prerender]{--color-cream:#eee3d6;--color-navy:#141f4d;--color-ink:#181818;--color-coral:#ff5330;--color-card:#fffaf3;--gutter:12px;--card-pad:16px;--icon-md:24px;--hit:44px;--header-offset:4.75rem}
html[data-prerender] body{margin:0;background:var(--status-bar,#141f4d);color:var(--color-ink);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif}
main.pre-landing,main.pre-top,main.pre-place,main.pre-home,.pre-home-city,.pre-top-r{display:none}
html[data-prerender='1'] main.pre-landing{display:flex;flex-direction:column}
html[data-prerender='top'] main.pre-top{display:block}
html[data-prerender='place'] main.pre-place{display:block}
html[data-prerender='home'] main.pre-home{display:block}
html[data-prerender='home'][data-area='seattle'] .pre-home-city[data-city='seattle'],
html[data-prerender='home'][data-area='eastside'] .pre-home-city[data-city='eastside'],
html[data-prerender='home'][data-area='la'] .pre-home-city[data-city='la'],
html[data-prerender='home'][data-area='sf'] .pre-home-city[data-city='sf'],
html[data-prerender='home'][data-area='eastbay'] .pre-home-city[data-city='eastbay'],
html[data-prerender='home'][data-area='peninsula'] .pre-home-city[data-city='peninsula'],
html[data-prerender='home'][data-area='northbay'] .pre-home-city[data-city='northbay'],
html[data-prerender='home'][data-area='sandiego'] .pre-home-city[data-city='sandiego'],
html[data-prerender='home'][data-area='vancouver'] .pre-home-city[data-city='vancouver'],
html[data-prerender='home'][data-area='portland'] .pre-home-city[data-city='portland'],
html[data-prerender='home'][data-area='nyc'] .pre-home-city[data-city='nyc'],
html[data-prerender='home'][data-area='pullman'] .pre-home-city[data-city='pullman'],
html[data-prerender='home'][data-area='moscow'] .pre-home-city[data-city='moscow']{display:block}
html[data-prerender='home'] .hero{background:#141f4d;color:#fffaf3}
html[data-prerender='home'] .hero-copy{padding-top:calc(var(--header-offset) + 1.15rem)}
html[data-prerender='home'] .font-serif,html[data-prerender='home'] h1,html[data-prerender='home'] h2,html[data-prerender='home'] h3{font-family:"Instrument Serif",Georgia,"Palatino Linotype",Palatino,serif;font-style:italic;font-weight:400}
html[data-prerender='home'] .text-cream{color:#fffaf3}
html[data-prerender='home'] .text-5xl{font-size:3rem;line-height:1.05}
html[data-prerender='home'] .text-6xl{font-size:3.75rem}
html[data-prerender='home'] .text-4xl{font-size:2.25rem}
html[data-prerender='home'] .text-3xl{font-size:1.875rem}
html[data-prerender='home'] .text-xs{font-size:.75rem}
html[data-prerender='home'] .text-sm{font-size:.875rem}
html[data-prerender='home'] .font-bold{font-weight:700}
html[data-prerender='home'] .uppercase{text-transform:uppercase}
html[data-prerender='home'] .italic{font-style:italic}
html[data-prerender='home'] .tracking-\\[0\\.14em\\]{letter-spacing:.14em}
html[data-prerender='home'] .mx-auto{margin-left:auto;margin-right:auto}
html[data-prerender='home'] .max-w-6xl{max-width:72rem}
html[data-prerender='home'] .max-w-3xl{max-width:48rem}
html[data-prerender='home'] .max-w-xl{max-width:36rem}
html[data-prerender='home'] .px-4{padding-left:1rem;padding-right:1rem}
html[data-prerender='home'] .pt-8{padding-top:2rem}
html[data-prerender='home'] .pb-8{padding-bottom:2rem}
html[data-prerender='home'] .pb-16{padding-bottom:4rem}
html[data-prerender='home'] .mt-2{margin-top:.5rem}
html[data-prerender='home'] .mt-4{margin-top:1rem}
html[data-prerender='home'] .mt-5{margin-top:1.25rem}
html[data-prerender='home'] .mt-6{margin-top:1.5rem}
html[data-prerender='home'] .mt-8{margin-top:2rem}
html[data-prerender='home'] .guide-card{display:flex;flex-direction:column;align-items:stretch;min-width:0;min-height:3.25rem;border:1px solid rgb(24 24 24 / 8%);background:var(--color-card);padding:var(--card-pad);border-radius:20px;box-shadow:0 10px 28px rgb(20 31 77 / 8%);color:inherit;text-decoration:none}
html[data-prerender='home'] .home-featured,html[data-prerender='home'] .home-shortcuts{display:grid;align-items:stretch;gap:var(--gutter);grid-template-columns:minmax(0,1fr)}
html[data-prerender='home'] .home-featured .guide-card{height:100%;min-height:9.5rem}
html[data-prerender='home'] .home-shortcut{flex-direction:row;align-items:center;justify-content:space-between;gap:12px;height:100%;min-height:var(--hit)}
html[data-prerender='home'] .home-shortcut-arrow{flex:none;width:var(--icon-md);height:var(--icon-md);opacity:.7}
html[data-prerender='home'] .field{display:flex;flex-direction:column;gap:.35rem}
html[data-prerender='home'] .field span{font-size:.875rem}
html[data-prerender='home'] .glass-input,html[data-prerender='home'] textarea{width:100%;box-sizing:border-box;min-height:44px;border:1px solid rgb(24 24 24 / 8%);border-radius:20px;padding:.7rem 1rem;background:#fffaf3;color:#181818;font:inherit}
html[data-prerender='home'] .btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.55rem 1rem;border-radius:999px;border:2px solid #181818;background:#fffaf3;color:#181818;font-weight:700;text-decoration:none}
html[data-prerender='home'] .btn-coral{background:#ff5330}
@media (min-width:40rem){
  html[data-prerender='home'] .home-featured,html[data-prerender='home'] .home-shortcuts{grid-template-columns:repeat(2,minmax(0,1fr))}
  html[data-prerender='home'] .text-6xl,html[data-prerender='home'] .sm\\:text-6xl{font-size:3.75rem}
}
@media (min-width:64rem){
  html[data-prerender='home'] .home-featured{grid-template-columns:repeat(3,minmax(0,1fr))}
}
`

function replaceBlock(haystack, start, end, inner) {
  const a = haystack.indexOf(start)
  const b = haystack.indexOf(end)
  if (a < 0 || b < 0 || b < a) throw new Error(`missing markers ${start}`)
  return haystack.slice(0, a) + start + inner + end + haystack.slice(b + end.length)
}

function upsertHeadStyle(html) {
  const start = '<!--home-critical-css-start-->'
  const end = '<!--home-critical-css-end-->'
  const block = `${start}\n    <style id="pre-home-css">${CRITICAL_CSS}</style>\n    ${end}`
  if (html.includes(start) && html.includes(end)) return replaceBlock(html, start, end, `\n    <style id="pre-home-css">${CRITICAL_CSS}</style>\n    `)
  if (!html.includes('<script src="./status.js"></script>')) throw new Error('status.js tag missing')
  return html.replace('<script src="./status.js"></script>', `<script src="./status.js"></script>\n    ${block}`)
}

function upsertHomeShell(html, inner) {
  const start = '<!--home-prerender-start-->'
  const end = '<!--home-prerender-end-->'
  const block = `${start}${inner}${end}`
  if (html.includes(start) && html.includes(end)) return replaceBlock(html, start, end, inner)
  const needle = '</main></div>\n    <script type="module"'
  if (!html.includes(needle)) throw new Error('index.html root close not found')
  return html.replace(needle, `</main>${block}</div>\n    <script type="module"`)
}

const lists = featuredSlugsFromSource(read('src/components/SmartResults.tsx'))
const featured = homeFeatured(lists)
if ((featured.eastside ?? []).some((guide) => guide.slug === 'eastside-date-night')) {
  throw new Error('Eastside date night must stay off the home featured list')
}
const bellevue = featured.eastside.find((guide) => guide.slug === 'bellevue')
if (!bellevue || bellevue.count !== 17) throw new Error('Bellevue Essentials must be 17 places on the Eastside home')

const ts = `import type { CityId } from '../lib/city.ts'\n\nexport type HomeFeaturedGuide = {\n  slug: string\n  title: string\n  count: number\n}\n\nexport const HOME_FEATURED: Record<CityId, HomeFeaturedGuide[]> = ${JSON.stringify(featured, null, 2)}\n`
writeFileSync(join(root, 'src/content/home-featured.ts'), ts)

const shells = Object.entries(AREA_NAME)
  .map(([city, name]) => cityShell(city, name, featured[city]))
  .join('')
const homeMain = `<main class="home-main outline-none pre-home" aria-hidden="true">${shells}</main>`
let html = read('index.html')
html = upsertHeadStyle(html)
html = upsertHomeShell(html, homeMain)
writeFileSync(join(root, 'index.html'), html)

const fontSrc = join(root, 'node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2')
const fontDir = join(root, 'public/fonts')
mkdirSync(fontDir, { recursive: true })
writeFileSync(join(fontDir, 'instrument-serif-italic.woff2'), readFileSync(fontSrc))

console.log(`home prerender ok (${Object.keys(featured).length} cities)`)
