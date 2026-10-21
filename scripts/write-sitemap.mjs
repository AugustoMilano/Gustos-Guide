import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { markMarkup } from './logo-geometry.mjs'

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
  <g transform="translate(72 36) scale(0.92)">${markMarkup()}</g>
  <text x="140" y="78" fill="#EEE3D6" font-family="Georgia, serif" font-size="28" font-style="italic">Gusto's Guide</text>
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

const share = new Set([
  `${site}/`,
  `${site}/terms/`,
  `${site}/privacy/`,
])
for (const place of [...index.places, ...eastside.places, ...la.places]) {
  share.add(`${site}/share/place/${encodeURIComponent(place.id)}/`)
}
for (const guide of [...index.guides, ...eastside.guides, ...la.guides]) {
  share.add(`${site}/share/guide/${encodeURIComponent(guide.slug)}/`)
}
const urls = [...share]
const body = urls
  .map((loc) => `  <url><loc>${escapeXml(loc)}</loc></url>`)
  .join('\n')
writeFileSync(
  join(root, 'public/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
)
console.log(`sitemap ${urls.length} urls, ${index.guides.length + eastside.guides.length + la.guides.length} guide cards, site ${site}`)
