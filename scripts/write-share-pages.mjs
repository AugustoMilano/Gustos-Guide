import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const site = (process.env.SITE_URL || 'https://gustosguide.com').replace(/\/$/, '')
const index = JSON.parse(readFileSync(join(root, 'src/content/index.json'), 'utf8'))
const guides = JSON.parse(readFileSync(join(root, 'src/content/guides.json'), 'utf8'))
const fullPlaces = JSON.parse(readFileSync(join(root, 'src/content/places.json'), 'utf8'))

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function ownerPhotoUrl(base, path) {
  const encoded = String(path).split('/').map((part) => encodeURIComponent(part)).join('/')
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/owner-photos/${encoded}`
}

async function ownerPhotos() {
  const supabase = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabase || !key) {
    console.log('share pages: no supabase env, using the house card')
    return new Map()
  }
  const endpoint = `${supabase.replace(/\/$/, '')}/rest/v1/place_photos?is_owner=eq.true&select=place_id,storage_path,created_at&order=created_at.desc`
  try {
    const response = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (!response.ok) {
      console.warn(`share pages: owner photos ${response.status}`)
      return new Map()
    }
    const rows = await response.json()
    const byPlace = new Map()
    for (const row of rows) {
      if (!row.place_id || !row.storage_path || byPlace.has(row.place_id)) continue
      byPlace.set(row.place_id, ownerPhotoUrl(supabase, row.storage_path))
    }
    console.log(`share pages: ${byPlace.size} owner photos`)
    return byPlace
  } catch (error) {
    console.warn('share pages: owner photos skipped', error instanceof Error ? error.message : error)
    return new Map()
  }
}

function page({ title, description, image, imageAlt, sharePath, hashPath }) {
  const shareUrl = `${site}${sharePath}`
  const openUrl = `${site}/#${hashPath}`
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${shareUrl}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <link rel="icon" href="${site}/favicon.svg" type="image/svg+xml" />
</head>
<body>
  <p><a href="${openUrl}">${escapeHtml(title)}</a></p>
  <script>location.replace(${JSON.stringify(openUrl)})</script>
</body>
</html>
`
}

const shareRoot = join(root, 'public/share')
rmSync(shareRoot, { recursive: true, force: true })

const photos = await ownerPhotos()
const places = new Map(index.places.map((place) => [place.id, place]))
let withPhoto = 0

for (const place of index.places) {
  const image = photos.get(place.id) || `${site}/og/place.svg`
  if (photos.has(place.id)) withPhoto += 1
  const dir = join(shareRoot, 'place', place.id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page({
    title: `${place.name} · Gusto's Guide`,
    description: place.oneLiner || 'A Seattle restaurant.',
    image,
    imageAlt: photos.has(place.id) ? fullPlaces[place.id]?.orderThis?.[0]?.dish || `Photo of ${place.name}` : place.name,
    sharePath: `/share/place/${place.id}`,
    hashPath: `/place/${place.id}`,
  }))
}

for (const guide of guides) {
  const first = guide.entries.map((entry) => photos.get(entry.placeId)).find(Boolean)
  const image = first || `${site}/og/guides/${guide.slug}.svg`
  if (first) withPhoto += 1
  const dir = join(shareRoot, 'guide', guide.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page({
    title: `${guide.title} · Gusto's Guide`,
    description: guide.dek || 'A Seattle guide.',
    image,
    imageAlt: guide.title,
    sharePath: `/share/guide/${guide.slug}`,
    hashPath: `/guide/${guide.slug}`,
  }))
}

console.log(`share pages ${index.places.length} places, ${guides.length} guides, ${withPhoto} using an owner photo, ${places.size} known`)
