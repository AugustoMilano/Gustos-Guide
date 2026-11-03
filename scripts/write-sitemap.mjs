import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { markMarkup } from './logo-geometry.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const index = JSON.parse(readFileSync(join(root, 'src/content/index.json'), 'utf8'))
const eastside = JSON.parse(readFileSync(join(root, 'src/content/eastside.json'), 'utf8'))
const la = JSON.parse(readFileSync(join(root, 'src/content/la.json'), 'utf8'))
const sf = JSON.parse(readFileSync(join(root, 'src/content/sf.json'), 'utf8'))
const sd = JSON.parse(readFileSync(join(root, 'src/content/sd.json'), 'utf8'))
const added = ['vancouver', 'portland', 'nyc', 'palouse'].map((name) => JSON.parse(readFileSync(join(root, `src/content/${name}.json`), 'utf8')))
const addedPlaces = added.flatMap((file) => file.places)
const addedGuides = added.flatMap((file) => file.guides)
const site = (process.env.SITE_URL || 'https://gustosguide.com').replace(/\/$/, '')

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function wrap(text, width) {
  const rows = []
  let row = ''
  for (const word of String(text).split(/\s+/)) {
    const next = row ? `${row} ${word}` : word
    if (next.length > width && row) {
      rows.push(row)
      row = word
    } else {
      row = next
    }
  }
  if (row) rows.push(row)
  return rows.slice(0, 3)
}

function card(title, dek) {
  const titleLines = wrap(title, 22)
  const dekLines = wrap(dek, 42)
  const titleText = titleLines
    .map((line, i) => `<text x="72" y="${180 + i * 78}" fill="#EEE3D6" font-family="Georgia, serif" font-size="68">${escapeXml(line)}</text>`)
    .join('')
  const dekText = dekLines
    .map((line, i) => `<text x="72" y="${430 + i * 36}" fill="#FF5330" font-family="Georgia, serif" font-size="28">${escapeXml(line)}</text>`)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#141F4D"/>
  <g transform="translate(72 36) scale(0.92)">${markMarkup()}</g>
  <text x="140" y="78" fill="#EEE3D6" font-family="Georgia, serif" font-size="28" font-style="italic">Gusto's Guide</text>
  ${titleText}
  ${dekText}
</svg>
`
}

const ogDir = join(root, 'public/og/guides')
mkdirSync(ogDir, { recursive: true })
writeFileSync(join(root, 'public/og/og.svg'), card("Gusto's Guide", 'Restaurants and places in the cities we cover.'))
writeFileSync(join(root, 'public/og/place.svg'), card('A place', 'From the house guide.'))
for (const guide of [...index.guides, ...eastside.guides, ...la.guides, ...sf.guides, ...sd.guides, ...addedGuides]) {
  writeFileSync(join(ogDir, `${guide.slug}.svg`), card(guide.title, guide.dek || 'A guide from Gusto.'))
}

// City and Top 25 share cards (C5). Mirrors the city picker in src/lib/city.ts.
export const CITY_CARDS = [
  { id: 'seattle', name: 'Seattle', detail: 'Seattle, Bellevue, Kirkland, and Redmond' },
  { id: 'la', name: 'Los Angeles', detail: 'Santa Monica, West Hollywood, Beverly Hills, and Venice' },
  { id: 'sf', name: 'San Francisco', detail: 'San Francisco, the East Bay, the Peninsula, and the North Bay' },
  { id: 'sandiego', name: 'San Diego', detail: 'San Diego, La Jolla, Coronado, and Oceanside' },
  { id: 'vancouver', name: 'Vancouver', detail: 'Downtown, Coal Harbour, Gastown, and Granville Island' },
  { id: 'portland', name: 'Portland', detail: 'Downtown, the Pearl District, Nob Hill, and Old Town' },
  { id: 'nyc', name: 'New York', detail: 'Manhattan and Brooklyn' },
  { id: 'pullman', name: 'Pullman, WA', detail: 'Pullman, WA and Moscow, ID' },
]
for (const dir of ['cities', 'top']) mkdirSync(join(root, 'public/og', dir), { recursive: true })
for (const city of CITY_CARDS) {
  writeFileSync(join(root, 'public/og/cities', `${city.id}.svg`), card(city.name, `Where Augusto eats in ${city.detail}.`))
  writeFileSync(join(root, 'public/og/top', `${city.id}.svg`), card(`Top 25 · ${city.name}`, `The Golden Fork list, ranked by Augusto's exact Gusto's Score.`))
}

const share = new Set([
  `${site}/`,
  `${site}/terms/`,
  `${site}/privacy/`,
])
for (const place of [...index.places, ...eastside.places, ...la.places, ...sf.places, ...sd.places, ...addedPlaces]) {
  share.add(`${site}/share/place/${encodeURIComponent(place.id)}/`)
}
for (const guide of [...index.guides, ...eastside.guides, ...la.guides, ...sf.guides, ...sd.guides, ...addedGuides]) {
  share.add(`${site}/share/guide/${encodeURIComponent(guide.slug)}/`)
}
for (const city of CITY_CARDS) {
  share.add(`${site}/share/city/${city.id}/`)
  share.add(`${site}/share/top/${city.id}/`)
}
const urls = [...share]
const body = urls
  .map((loc) => `  <url><loc>${escapeXml(loc)}</loc></url>`)
  .join('\n')
writeFileSync(
  join(root, 'public/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
)
console.log(`sitemap ${urls.length} urls, ${index.guides.length + eastside.guides.length + la.guides.length + sf.guides.length + sd.guides.length + addedGuides.length} guide cards, site ${site}`)
