import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const index = JSON.parse(readFileSync(join(root, 'src/content/index.json'), 'utf8'))
const eastside = JSON.parse(readFileSync(join(root, 'src/content/eastside.json'), 'utf8'))
const la = JSON.parse(readFileSync(join(root, 'src/content/la.json'), 'utf8'))
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
  <text x="72" y="88" fill="#EEE3D6" font-family="Georgia, serif" font-size="28">Gusto's Guide</text>
  ${titleText}
  ${dekText}
</svg>
`
}

const ogDir = join(root, 'public/og/guides')
mkdirSync(ogDir, { recursive: true })
writeFileSync(join(root, 'public/og/og.svg'), card("Gusto's Guide", 'Eat your way through Seattle.'))
writeFileSync(join(root, 'public/og/place.svg'), card('A Seattle place', 'From the house guide.'))
for (const guide of [...index.guides, ...eastside.guides, ...la.guides]) {
  writeFileSync(join(ogDir, `${guide.slug}.svg`), card(guide.title, guide.dek || 'A guide from Gusto.'))
}

const urls = [
  `${site}/`,
  `${site}/terms`,
  `${site}/privacy`,
  `${site}/#/`,
  `${site}/#/explore`,
  `${site}/#/guides`,
  `${site}/#/top`,
  `${site}/#/seattle/top`,
  `${site}/#/eastside`,
  `${site}/#/eastside/explore`,
  `${site}/#/eastside/guides`,
  `${site}/#/eastside/top`,
  `${site}/#/la`,
  `${site}/#/la/explore`,
  `${site}/#/la/guides`,
  `${site}/#/la/top`,
  `${site}/#/cities`,
  ...index.guides.map((guide) => `${site}/#/guide/${encodeURIComponent(guide.slug)}`),
  ...index.places.map((place) => `${site}/#/place/${encodeURIComponent(place.id)}`),
  ...eastside.guides.map((guide) => `${site}/#/eastside/guide/${encodeURIComponent(guide.slug)}`),
  ...eastside.places.map((place) => `${site}/#/eastside/place/${encodeURIComponent(place.id)}`),
  ...la.guides.map((guide) => `${site}/#/la/guide/${encodeURIComponent(guide.slug)}`),
  ...la.places.map((place) => `${site}/#/la/place/${encodeURIComponent(place.id)}`),
]
const body = urls
  .map((loc) => `  <url><loc>${escapeXml(loc)}</loc></url>`)
  .join('\n')
writeFileSync(
  join(root, 'public/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
)
console.log(`sitemap ${urls.length} urls, ${index.guides.length + eastside.guides.length + la.guides.length} guide cards, site ${site}`)
