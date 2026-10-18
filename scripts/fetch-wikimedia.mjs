import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cachePath = join(root, 'data/wikimedia-cache.json')
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
const UA = 'GustosGuide/1.0 (Seattle restaurant guide; local editorial build)'
const STOP = new Set(['restaurant', 'seattle', 'kitchen', 'house', 'coffee', 'grill', 'pizza', 'market', 'cafe', 'bar', 'the', 'and', 'company'])
const BAD_CITY = /portland|tacoma|bellevue|kirkland|redmond|chicago|brooklyn|manhattan|london|paris|tokyo|vancouver|california|texas/i

function tokens(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 5 && !STOP.has(word))
}

function licenseOk(meta) {
  const name = meta?.LicenseShortName?.value ?? ''
  return /public domain|cc0|cc by/i.test(name)
}

async function search(name) {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('format', 'json')
  url.searchParams.set('generator', 'search')
  url.searchParams.set('gsrnamespace', '6')
  url.searchParams.set('gsrlimit', '6')
  url.searchParams.set('gsrsearch', `"${name}" Seattle`)
  url.searchParams.set('prop', 'imageinfo')
  url.searchParams.set('iiprop', 'url|extmetadata|mime|size')
  url.searchParams.set('iiurlwidth', '1200')
  const response = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!response.ok) throw new Error(`commons ${response.status}`)
  const data = await response.json()
  return Object.values(data.query?.pages ?? {})
}

function pickPage(name, pages) {
  const need = tokens(name)
  if (!need.length) return null
  for (const page of pages) {
    const info = page.imageinfo?.[0]
    if (!info) continue
    if (!/image\/(jpeg|png|webp)/.test(info.mime ?? '')) continue
    const meta = info.extmetadata ?? {}
    if (!licenseOk(meta)) continue
    const title = `${page.title} ${meta.ImageDescription?.value ?? ''}`
    if (BAD_CITY.test(title) && !/seattle/i.test(page.title)) continue
    if (!/seattle/i.test(title)) continue
    if (!need.some((token) => title.toLowerCase().includes(token))) continue
    const thumb = info.thumburl || info.url
    if (!thumb) continue
    const artist = String(meta.Artist?.value ?? 'Wikimedia Commons').replace(/<[^>]+>/g, '')
    return {
      title: page.title,
      url: thumb,
      credit: artist.slice(0, 180),
      creditUrl: info.descriptionurl,
      license: meta.LicenseShortName?.value ?? '',
    }
  }
  return null
}

const places = JSON.parse(readFileSync(join(root, 'src/content/places.json'), 'utf8'))
const index = JSON.parse(readFileSync(join(root, 'src/content/index.json'), 'utf8'))
const guides = JSON.parse(readFileSync(join(root, 'src/content/guides.json'), 'utf8'))
mkdirSync(join(root, 'public/photos'), { recursive: true })

const featured = []
const seen = new Set()
for (const guide of guides) {
  for (const entry of guide.entries) {
    if (!seen.has(entry.placeId)) {
      seen.add(entry.placeId)
      featured.push(entry.placeId)
    }
  }
}
for (const id of Object.keys(places)) if (!seen.has(id)) featured.push(id)

let saved = 0
const cap = 30
for (const id of featured) {
  if (saved >= cap) break
  const place = places[id]
  if (!place || place.photos?.some((photo) => photo.source === 'wikimedia')) continue
  if (cache[id]?.miss && !cache[id]?.error) continue
  if (cache[id]?.file) continue
  try {
    let pages
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        pages = await search(place.name)
        break
      } catch (error) {
        if (!String(error.message).includes('429') || attempt === 3) throw error
        await new Promise((resolve) => setTimeout(resolve, 15000 * (attempt + 1)))
      }
    }
    const hit = pickPage(place.name, pages ?? [])
    if (!hit) {
      cache[id] = { miss: true }
    } else {
      const response = await fetch(hit.url, { headers: { 'User-Agent': UA } })
      if (!response.ok) throw new Error(String(response.status))
      const bytes = Buffer.from(await response.arrayBuffer())
      const file = `/photos/${id}.jpg`
      writeFileSync(join(root, 'public', file.slice(1)), bytes)
      const photo = {
        source: 'wikimedia',
        url: file,
        alt: `${place.name} in Seattle`,
        credit: hit.credit,
        creditUrl: hit.creditUrl,
        license: hit.license,
      }
      place.photos = [photo, ...place.photos.filter((item) => item.source !== 'wikimedia')]
      const slim = index.places.find((item) => item.id === id)
      if (slim) slim.photo = photo
      cache[id] = { file, title: hit.title, license: hit.license }
      saved += 1
      console.log('saved', place.name)
    }
  } catch (error) {
    console.warn('fail', place.name, error.message)
    if (!String(error.message).includes('429')) cache[id] = { miss: true, error: error.message }
  }
  writeFileSync(cachePath, JSON.stringify(cache))
  writeFileSync(join(root, 'src/content/places.json'), JSON.stringify(places))
  writeFileSync(join(root, 'src/content/index.json'), JSON.stringify(index))
  await new Promise((resolve) => setTimeout(resolve, 1200))
}

writeFileSync(join(root, 'src/content/places.json'), JSON.stringify(places))
writeFileSync(join(root, 'src/content/index.json'), JSON.stringify(index))
console.log('wikimedia saved', saved)
