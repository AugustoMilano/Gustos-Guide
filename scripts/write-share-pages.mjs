import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const site = (process.env.SITE_URL || 'https://gustosguide.com').replace(/\/$/, '')
const index = JSON.parse(readFileSync(join(root, 'src/content/index.json'), 'utf8'))
const guides = JSON.parse(readFileSync(join(root, 'src/content/guides.json'), 'utf8'))
const fullPlaces = JSON.parse(readFileSync(join(root, 'src/content/places.json'), 'utf8'))
const eastside = JSON.parse(readFileSync(join(root, 'src/content/eastside.json'), 'utf8'))
const la = JSON.parse(readFileSync(join(root, 'src/content/la.json'), 'utf8'))
const sf = JSON.parse(readFileSync(join(root, 'src/content/sf.json'), 'utf8'))
const sd = JSON.parse(readFileSync(join(root, 'src/content/sd.json'), 'utf8'))
const added = [
  ['vancouver', 'vancouver', 'A Vancouver guide.'],
  ['portland', 'portland', 'A Portland guide.'],
  ['nyc', 'nyc', 'A New York guide.'],
  ['palouse', 'pullman', 'A Pullman and Moscow guide.'],
].map(([name, city, fallback]) => ({ city, fallback, ...JSON.parse(readFileSync(join(root, `src/content/${name}.json`), 'utf8')) }))

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
  <meta http-equiv="refresh" content="0; url=${escapeHtml(openUrl)}" />
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
</body>
</html>
`
}

const shareRoot = join(root, 'public/share')
rmSync(shareRoot, { recursive: true, force: true })

const photos = await ownerPhotos()
const places = new Map(index.places.map((place) => [place.id, place]))
let withPhoto = 0

for (const place of eastside.places) fullPlaces[place.id] = place
for (const place of la.places) fullPlaces[place.id] = place
for (const place of sf.places) fullPlaces[place.id] = place
for (const place of sd.places) fullPlaces[place.id] = place
for (const file of added) for (const place of file.places) fullPlaces[place.id] = place

function catalogImage(place) {
  // A house photo leads. Commons is the fallback when no house shot was published.
  const gusto = place?.photos?.find((photo) => photo.source === 'gusto' && photo.url)
  if (gusto) return `${site}${gusto.url}`
  const lead = place?.photos?.find((photo) => (photo.source === 'wikimedia' || photo.source === 'flickr') && photo.url)
  return lead ? `${site}${lead.url}` : `${site}/og/place.png`
}

for (const place of index.places) {
  const image = photos.get(place.id) || catalogImage(fullPlaces[place.id])
  if (photos.has(place.id)) withPhoto += 1
  const dir = join(shareRoot, 'place', place.id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page({
    title: `${place.name} · Gusto's Guide`,
    description: place.oneLiner || `${place.name} in ${place.neighborhood}.`,
    image,
    imageAlt: photos.has(place.id) ? fullPlaces[place.id]?.orderThis?.[0]?.dish || `Photo of ${place.name}` : place.name,
    sharePath: `/share/place/${place.id}/`,
    hashPath: `/place/${place.id}`,
  }))
}

for (const guide of guides) {
  const first = guide.entries.map((entry) => photos.get(entry.placeId)).find(Boolean)
  const image = first || `${site}/og/guides/${guide.slug}.png`
  if (first) withPhoto += 1
  const dir = join(shareRoot, 'guide', guide.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page({
    title: `${guide.title} · Gusto's Guide`,
    description: guide.dek || 'A Seattle guide.',
    image,
    imageAlt: guide.title,
    sharePath: `/share/guide/${guide.slug}/`,
    hashPath: `/guide/${guide.slug}`,
  }))
}

for (const place of eastside.places) {
  const image = photos.get(place.id) || catalogImage(place)
  if (photos.has(place.id)) withPhoto += 1
  const dir = join(shareRoot, 'place', place.id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page({
    title: `${place.name} · Gusto's Guide`,
    description: place.oneLiner || `${place.name} in ${place.neighborhood}.`,
    image,
    imageAlt: place.photos?.[0]?.alt || place.name,
    sharePath: `/share/place/${place.id}/`,
    hashPath: `/eastside/place/${place.id}`,
  }))
}

for (const guide of eastside.guides) {
  const first = guide.entries.map((entry) => photos.get(entry.placeId)).find(Boolean)
  const image = first || `${site}/og/guides/${guide.slug}.png`
  if (first) withPhoto += 1
  const dir = join(shareRoot, 'guide', guide.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page({
    title: `${guide.title} · Gusto's Guide`,
    description: guide.dek || 'An Eastside guide.',
    image,
    imageAlt: guide.title,
    sharePath: `/share/guide/${guide.slug}/`,
    hashPath: `/eastside/guide/${guide.slug}`,
  }))
}

for (const place of la.places) {
  const image = photos.get(place.id) || catalogImage(place)
  if (photos.has(place.id)) withPhoto += 1
  const dir = join(shareRoot, 'place', place.id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page({
    title: `${place.name} · Gusto's Guide`,
    description: place.oneLiner || `${place.name} in ${place.neighborhood}.`,
    image,
    imageAlt: place.photos?.[0]?.alt || place.name,
    sharePath: `/share/place/${place.id}/`,
    hashPath: `/la/place/${place.id}`,
  }))
}

for (const guide of la.guides) {
  const first = guide.entries.map((entry) => photos.get(entry.placeId)).find(Boolean)
  const image = first || `${site}/og/guides/${guide.slug}.png`
  if (first) withPhoto += 1
  const dir = join(shareRoot, 'guide', guide.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page({
    title: `${guide.title} · Gusto's Guide`,
    description: guide.dek || 'A Los Angeles guide.',
    image,
    imageAlt: guide.title,
    sharePath: `/share/guide/${guide.slug}/`,
    hashPath: `/la/guide/${guide.slug}`,
  }))
}

function bayArea(city) {
  if (city === 'eastbay' || city === 'peninsula' || city === 'northbay' || city === 'sf') return city
  return 'sf'
}

for (const place of sf.places) {
  const image = photos.get(place.id) || catalogImage(place)
  if (photos.has(place.id)) withPhoto += 1
  const dir = join(shareRoot, 'place', place.id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page({
    title: `${place.name} · Gusto's Guide`,
    description: place.oneLiner || `${place.name} in ${place.neighborhood}.`,
    image,
    imageAlt: place.photos?.[0]?.alt || place.name,
    sharePath: `/share/place/${place.id}/`,
    hashPath: `/${bayArea(place.city)}/place/${place.id}`,
  }))
}

for (const guide of sf.guides) {
  const first = guide.entries.map((entry) => photos.get(entry.placeId)).find(Boolean)
  const image = first || `${site}/og/guides/${guide.slug}.png`
  if (first) withPhoto += 1
  const dir = join(shareRoot, 'guide', guide.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page({
    title: `${guide.title} · Gusto's Guide`,
    description: guide.dek || 'A San Francisco guide.',
    image,
    imageAlt: guide.title,
    sharePath: `/share/guide/${guide.slug}/`,
    hashPath: `/${bayArea(guide.city)}/guide/${guide.slug}`,
  }))
}

for (const place of sd.places) {
  const image = photos.get(place.id) || catalogImage(place)
  if (photos.has(place.id)) withPhoto += 1
  const dir = join(shareRoot, 'place', place.id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page({
    title: `${place.name} · Gusto's Guide`,
    description: place.oneLiner || `${place.name} in ${place.neighborhood}.`,
    image,
    imageAlt: place.photos?.[0]?.alt || place.name,
    sharePath: `/share/place/${place.id}/`,
    hashPath: `/sandiego/place/${place.id}`,
  }))
}

for (const guide of sd.guides) {
  const first = guide.entries.map((entry) => photos.get(entry.placeId)).find(Boolean)
  const image = first || `${site}/og/guides/${guide.slug}.png`
  if (first) withPhoto += 1
  const dir = join(shareRoot, 'guide', guide.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page({
    title: `${guide.title} · Gusto's Guide`,
    description: guide.dek || 'A San Diego guide.',
    image,
    imageAlt: guide.title,
    sharePath: `/share/guide/${guide.slug}/`,
    hashPath: `/sandiego/guide/${guide.slug}`,
  }))
}

for (const file of added) {
  for (const place of file.places) {
    const image = photos.get(place.id) || catalogImage(place)
    if (photos.has(place.id)) withPhoto += 1
    const dir = join(shareRoot, 'place', place.id)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'index.html'), page({
      title: `${place.name} · Gusto's Guide`,
      description: place.oneLiner || `${place.name} in ${place.neighborhood}.`,
      image,
      imageAlt: place.photos?.[0]?.alt || place.name,
      sharePath: `/share/place/${place.id}/`,
      hashPath: `/${place.city || file.city}/place/${place.id}`,
    }))
  }
  for (const guide of file.guides) {
    const first = guide.entries.map((entry) => photos.get(entry.placeId)).find(Boolean)
    const image = first || `${site}/og/guides/${guide.slug}.png`
    if (first) withPhoto += 1
    const dir = join(shareRoot, 'guide', guide.slug)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'index.html'), page({
      title: `${guide.title} · Gusto's Guide`,
      description: guide.dek || file.fallback,
      image,
      imageAlt: guide.title,
      sharePath: `/share/guide/${guide.slug}/`,
      hashPath: `/${guide.city || file.city}/guide/${guide.slug}`,
    }))
  }
}

// City and Top 25 share pages (C5). No place names on these cards, so nothing excluded can appear.
const CITY_SHARE = [
  ['seattle', 'Seattle', 'Seattle, Bellevue, Kirkland, and Redmond'],
  ['la', 'Los Angeles', 'Santa Monica, West Hollywood, Beverly Hills, and Venice'],
  ['sf', 'San Francisco', 'San Francisco, the East Bay, the Peninsula, and the North Bay'],
  ['sandiego', 'San Diego', 'San Diego, La Jolla, Coronado, and Oceanside'],
  ['vancouver', 'Vancouver', 'Downtown, Coal Harbour, Gastown, and Granville Island'],
  ['portland', 'Portland', 'Downtown, the Pearl District, Nob Hill, and Old Town'],
  ['nyc', 'New York', 'Manhattan and Brooklyn'],
  ['pullman', 'Pullman, WA', 'Pullman, WA and Moscow, ID'],
]
for (const [id, name, detail] of CITY_SHARE) {
  for (const kind of ['city', 'top']) {
    const dir = join(shareRoot, kind, id)
    mkdirSync(dir, { recursive: true })
    const top = kind === 'top'
    writeFileSync(join(dir, 'index.html'), page({
      title: top ? `Top 25 · ${name} · Gusto's Guide` : `${name} · Gusto's Guide`,
      description: top ? `The Golden Fork list for ${name}, ranked by Augusto's exact Gusto's Score.` : `Where Augusto eats in ${detail}.`,
      image: `${site}/og/${top ? 'top' : 'cities'}/${id}.png`,
      imageAlt: top ? `Top 25 · ${name}` : name,
      sharePath: `/share/${kind}/${id}/`,
      hashPath: top ? `/${id}/top` : `/${id}`,
    }))
  }
}

console.log(`share pages ${index.places.length + eastside.places.length + la.places.length + sf.places.length + sd.places.length + added.reduce((n, file) => n + file.places.length, 0)} places, ${guides.length + eastside.guides.length + la.guides.length + sf.guides.length + sd.guides.length + added.reduce((n, file) => n + file.guides.length, 0)} guides, ${withPhoto} using an owner photo, ${places.size} known`)
