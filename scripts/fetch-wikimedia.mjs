import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { permanentlyExcluded } from './permanent-exclusions.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cachePath = join(root, 'data/wikimedia-cache.json')
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
const UA = 'GustosGuide/1.0 (Seattle restaurant guide; local editorial build)'
const STOP = new Set([
  'restaurant', 'seattle', 'kitchen', 'house', 'coffee', 'grill', 'pizza', 'market', 'cafe', 'bar',
  'the', 'and', 'company', 'shop', 'eatery', 'bistro', 'tavern', 'pub', 'diner',
])
const CITIES = [
  'seattle', 'bellevue', 'kirkland', 'redmond', 'issaquah', 'bothell', 'woodinville', 'sammamish',
  'mercer island', 'renton', 'tacoma', 'portland', 'spokane', 'olympia', 'bellingham', 'chicago',
  'brooklyn', 'manhattan', 'new york', 'san francisco', 'los angeles', 'boston', 'austin', 'denver',
  'miami', 'london', 'paris', 'tokyo', 'vancouver', 'toronto', 'phoenix', 'dallas', 'houston',
  'philadelphia', 'atlanta', 'sacramento', 'san diego', 'las vegas', 'montreal',
]

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&amp;/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, ' ').replace(/&#\d+;/g, ' ')
}

function significant(name) {
  return norm(name).split(' ').filter((word) => word.length >= 4 && !STOP.has(word))
}

function phrase(name) {
  return norm(name).replace(/^(the|a|an) /, '')
}

function nameInTitle(name, title) {
  if (/^\d+$/.test(norm(name))) return ''
  const titled = norm(title.replace(/^File:/, ''))
  const full = phrase(name)
  if (full.length >= 6 && titled.includes(full)) return 'phrase'
  const words = significant(name)
  if (words.length >= 2 && words.every((word) => titled.includes(word))) return 'tokens'
  if (words.length === 1 && words[0].length >= 6 && new RegExp(`\\b${words[0]}\\b`).test(titled)) return 'token'
  return ''
}

const OTHER_SUBJECT = /\b(steamship|steamer|railroad|locomotive|skating|rink|shipbuilding|enroute|passengers|docks|dock|bridge|mountain|cemetery|church|school|museum|library|stadium)\b/i
const ARCHIVE = /\b(1[0-8]\d{2}|19[0-7]\d|curtis \d|seattle \d{3,}|mohai|probably between)\b/i
const VENUE = /\b(restaurant|cafe|café|bar|kitchen|brewery|brewing|bakery|pizzeria|diner|tavern|grill|coffee|storefront|exterior|interior|sign|dining|menu|patio|pub|oyster|pizza|noodle|sushi|bbq|barbecue)\b/i

function extraBusiness(name, title) {
  const titled = norm(title)
  const full = phrase(name)
  if (!full) return ''
  for (const word of ['market', 'hotel', 'motel', 'apartments', 'pharmacy', 'theater', 'theatre']) {
    if (norm(name).includes(word)) continue
    if (titled.includes(`${full} ${word}`) || titled.includes(`${word} ${full}`)) return word
  }
  return ''
}

function licenseOk(name) {
  const value = String(name || '').toLowerCase()
  if (!value) return false
  if (/nc\b|non-?commercial|\bnd\b|no ?derivatives|fair use|all rights reserved|copyrighted|gfdl/.test(value)) return false
  return /public domain|cc0|cc[- ]by\b/.test(value)
}

function mentionedCities(text) {
  const value = ` ${norm(text)} `
  return CITIES.filter((city) => value.includes(` ${city} `) || (city.includes(' ') && value.includes(` ${city} `)))
}

function locationOk(text, city) {
  const value = ` ${norm(text)} `
  const want = norm(city)
  const found = mentionedCities(text)
  const foreign = found.filter((item) => item !== want && item !== 'seattle')
  if (want !== 'seattle' && foreign.includes('seattle') && !value.includes(` ${want} `)) return false
  if (foreign.length && !value.includes(` ${want} `) && !value.includes(' washington ')) return false
  return value.includes(` ${want} `) || value.includes(' washington ') || value.includes(' king county ')
}

function conflictingHood(title, neighborhood, hoods) {
  const titled = norm(title)
  const mine = norm(neighborhood)
  if (mine && titled.includes(mine)) return ''
  if (mine !== 'south lake union' && /\bslu\b/.test(titled)) return 'South Lake Union'
  for (const hood of hoods) {
    const name = norm(hood)
    if (name.length < 5 || name === mine) continue
    if (mine.includes(name) || name.includes(mine)) continue
    if (titled.includes(name)) return hood
  }
  return ''
}

export function judge(place, page, hoods) {
  const info = page.imageinfo?.[0]
  if (!info) return null
  if (!/image\/(jpeg|png|webp)/.test(info.mime ?? '')) return null
  if ((info.thumbwidth || info.width || 0) < 480 && (info.width || 0) < 480) return null
  const title = page.title || ''
  if (/\b(logo|icon|map|diagram|svg|flag|coat of arms)\b/i.test(title)) return null
  if (OTHER_SUBJECT.test(title) || ARCHIVE.test(title)) return null
  if (/\b(hotell|hjo|sweden|sverige)\b/i.test(title)) return null
  if (/^facing\b/i.test(place.name) && !VENUE.test(title)) return null
  if (extraBusiness(place.name, title)) return null
  const meta = info.extmetadata ?? {}
  if (!licenseOk(meta.LicenseShortName?.value)) return null
  const why = nameInTitle(place.name, title)
  if (!why) return null
  const titled = title.replace(/^File:/, '')
  const venue = VENUE.test(titled) || /seattle\s*-\s*/i.test(titled)
  const distinctive = significant(place.name).length >= 2 && norm(place.cityName) && norm(titled).includes(norm(place.cityName))
  if (!venue && !distinctive) return null
  const blob = `${title} ${stripHtml(meta.ImageDescription?.value)} ${stripHtml(meta.ObjectName?.value)} ${(page.categories || []).map((item) => item.title).join(' ')}`
  if (!locationOk(blob, place.cityName)) return null
  const hood = conflictingHood(`${title} ${stripHtml(meta.ImageDescription?.value)}`, place.neighborhood, hoods)
  if (hood) return null
  if (/\bscene from\b|\bsubjects: plays\b/i.test(`${title} ${stripHtml(meta.ImageDescription?.value)}`)) return null
  const thumb = info.thumburl || info.url
  if (!thumb) return null
  const artist = stripHtml(meta.Artist?.value || 'Wikimedia Commons').replace(/\s+/g, ' ').trim()
  return {
    title,
    url: thumb,
    credit: (artist || 'Wikimedia Commons').slice(0, 180),
    creditUrl: info.descriptionurl,
    license: meta.LicenseShortName?.value ?? '',
    why,
  }
}

function selfCheck() {
  const hoods = ['Capitol Hill', 'Ballard', 'Wallingford', 'Fremont']
  const seattle = { name: 'Canlis', neighborhood: 'Queen Anne', cityName: 'Seattle' }
  const ok = judge(seattle, {
    title: 'File:Canlis restaurant Seattle.jpg',
    imageinfo: [{
      mime: 'image/jpeg',
      width: 1600,
      thumburl: 'https://example.test/c.jpg',
      descriptionurl: 'https://commons.wikimedia.org/wiki/File:Canlis_restaurant_Seattle.jpg',
      extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: 'Ada' }, ImageDescription: { value: 'Canlis in Seattle' } },
    }],
  }, hoods)
  if (!ok) throw new Error('expected Canlis to match')
  const nc = judge(seattle, {
    title: 'File:Canlis restaurant Seattle.jpg',
    imageinfo: [{ mime: 'image/jpeg', width: 1600, thumburl: 'x', extmetadata: { LicenseShortName: { value: 'CC BY-NC-SA 4.0' } } }],
  }, hoods)
  if (nc) throw new Error('noncommercial must be rejected')
  const other = judge(seattle, {
    title: 'File:Canlis Portland.jpg',
    imageinfo: [{
      mime: 'image/jpeg', width: 1600, thumburl: 'x',
      extmetadata: { LicenseShortName: { value: 'CC BY 4.0' }, ImageDescription: { value: 'Portland' } },
    }],
  }, hoods)
  if (other) throw new Error('other city must be rejected')
  const nearby = judge({ name: 'The Pink Door', neighborhood: 'Pike Place', cityName: 'Seattle' }, {
    title: 'File:Dinner at The Pink Door, Pike Place Market, Seattle.jpg',
    imageinfo: [{
      mime: 'image/jpeg', width: 1200, thumburl: 'x', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Pink',
      extmetadata: { LicenseShortName: { value: 'CC BY 2.0' }, Artist: { value: 'Sam' }, ImageDescription: { value: 'Seattle' } },
    }],
  }, hoods)
  if (!nearby) throw new Error('short name with the full phrase should match')
  const wrongHood = judge({ name: "Dick's Drive-In", neighborhood: 'Capitol Hill', cityName: 'Seattle' }, {
    title: "File:Dick's Drive-In Wallingford Seattle.jpg",
    imageinfo: [{
      mime: 'image/jpeg', width: 1200, thumburl: 'x',
      extmetadata: { LicenseShortName: { value: 'Public domain' }, ImageDescription: { value: 'Seattle' } },
    }],
  }, hoods)
  if (wrongHood) throw new Error('a different neighborhood in the file title must be rejected')
  const archive = judge({ name: '2120', neighborhood: 'Belltown', cityName: 'Seattle' }, {
    title: 'File:Railroad Ave looking north from Madison St showing docks and railroad tracks, Seattle, probably between 1908 and 1920 (SEATTLE 2120).jpg',
    imageinfo: [{ mime: 'image/jpeg', width: 1600, thumburl: 'x', extmetadata: { LicenseShortName: { value: 'Public domain' }, ImageDescription: { value: 'Seattle' } } }],
  }, hoods)
  if (archive) throw new Error('archive photo must be rejected')
  const ship = judge({ name: 'Inside Passage', neighborhood: 'Downtown', cityName: 'Seattle' }, {
    title: 'File:Passengers on the deck of the steamer CITY OF SEATTLE enroute to Alaska in the Inside Passage (TRANSPORT 869).jpg',
    imageinfo: [{ mime: 'image/jpeg', width: 1600, thumburl: 'x', extmetadata: { LicenseShortName: { value: 'Public domain' }, ImageDescription: { value: 'Seattle' } } }],
  }, hoods)
  if (ship) throw new Error('steamship must be rejected')
  const market = judge({ name: 'Hamdi', neighborhood: 'Capitol Hill', cityName: 'Seattle' }, {
    title: 'File:Seattle - Hamdi Market 01.jpg',
    imageinfo: [{ mime: 'image/jpeg', width: 1600, thumburl: 'x', extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, ImageDescription: { value: 'Seattle' } } }],
  }, hoods)
  if (market) throw new Error('a different business type must be rejected')
}

async function commons(params) {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': UA } })
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 8000 * (attempt + 1)))
      continue
    }
    if (!response.ok) throw new Error(`commons ${response.status}`)
    return response.json()
  }
  throw new Error('commons 429')
}

async function search(name, city) {
  const data = await commons({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrnamespace: '6',
    gsrlimit: '8',
    gsrsearch: `"${name}" ${city}`,
    prop: 'imageinfo|categories',
    iiprop: 'url|extmetadata|mime|size',
    iiurlwidth: '1280',
    cllimit: '30',
  })
  return Object.values(data.query?.pages ?? {})
}

function cityOf(place) {
  if (place.city === 'eastside') {
    const match = String(place.address || '').match(/,\s*([^,]+),\s*WA\b/)
    return match?.[1]?.trim() || 'Bellevue'
  }
  return 'Seattle'
}

function targets() {
  const places = JSON.parse(readFileSync(join(root, 'src/content/places.json'), 'utf8'))
  const east = JSON.parse(readFileSync(join(root, 'src/content/eastside.json'), 'utf8'))
  const rows = []
  for (const place of Object.values(places)) {
    if (permanentlyExcluded(place)) continue
    if (place.photos?.some((photo) => photo.source === 'wikimedia' && photo.url)) continue
    rows.push({ ...place, cityName: 'Seattle', bucket: 'seattle' })
  }
  for (const place of east.places) {
    if (permanentlyExcluded(place)) continue
    if (place.photos?.some((photo) => photo.source === 'wikimedia' && photo.url)) continue
    rows.push({ ...place, cityName: cityOf(place), bucket: 'eastside' })
  }
  return rows
}

async function download(url) {
  const response = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!response.ok) throw new Error(`download ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length < 8000) throw new Error('tiny file')
  const mime = response.headers.get('content-type') || ''
  let ext = '.jpg'
  if (mime.includes('png') || bytes.subarray(0, 4).toString('hex') === '89504e47') ext = '.png'
  else if (mime.includes('webp') || bytes.subarray(0, 4).toString() === 'RIFF') ext = '.webp'
  else if (!(bytes[0] === 0xff && bytes[1] === 0xd8) && !mime.includes('jpeg')) throw new Error(`not a photo ${mime}`)
  return { bytes, ext }
}

let writeLock = Promise.resolve()
function remember(id, photo, hit) {
  writeLock = writeLock.then(() => {
  if (permanentlyExcluded({ id })) throw new Error(`${id} is permanently excluded`)
  const places = JSON.parse(readFileSync(join(root, 'src/content/places.json'), 'utf8'))
  const index = JSON.parse(readFileSync(join(root, 'src/content/index.json'), 'utf8'))
  const east = JSON.parse(readFileSync(join(root, 'src/content/eastside.json'), 'utf8'))
  if (places[id]) {
    places[id].photos = [photo]
    const slim = index.places.find((item) => item.id === id)
    if (slim) slim.photo = photo
    writeFileSync(join(root, 'src/content/places.json'), JSON.stringify(places))
    writeFileSync(join(root, 'src/content/index.json'), JSON.stringify(index))
  } else {
    const row = east.places.find((item) => item.id === id)
    if (!row) throw new Error(`missing ${id}`)
    row.photos = [photo]
    writeFileSync(join(root, 'src/content/eastside.json'), `${JSON.stringify(east, null, 2)}\n`)
  }
    cache[id] = { file: photo.url, title: hit.title, license: hit.license, why: hit.why }
    writeFileSync(cachePath, JSON.stringify(cache))
  })
  return writeLock
}

async function main() {
  selfCheck()
  if (process.argv.includes('--check')) {
    console.log('matcher ok')
    return
  }
  const hoods = [...new Set(targets().map((place) => place.neighborhood))]
  const pending = targets().filter((place) => !cache[place.id]?.file && !cache[place.id]?.rejected)
  mkdirSync(join(root, 'public/photos'), { recursive: true })
  console.log('to search', pending.length)
  let saved = 0
  let index = 0
  async function worker() {
    while (index < pending.length) {
      const place = pending[index]
      index += 1
      try {
        const pages = await search(place.name, place.cityName)
        const hit = pages.map((page) => judge(place, page, hoods)).find(Boolean)
        if (!hit) {
          cache[place.id] = { miss: true, at: '2026-10-20' }
        } else {
          const file = await download(hit.url)
          const url = `/photos/${place.id}${file.ext}`
          writeFileSync(join(root, 'public', url.slice(1)), file.bytes)
          const photo = {
            source: 'wikimedia',
            url,
            alt: `${place.name} in ${place.neighborhood}`,
            credit: hit.credit,
            creditUrl: hit.creditUrl,
            license: hit.license,
          }
          await remember(place.id, photo, hit)
          saved += 1
          console.log('saved', place.name, '←', hit.title)
        }
      } catch (error) {
        console.warn('fail', place.name, error.message)
        if (!String(error.message).includes('429')) cache[place.id] = { miss: true, error: String(error.message), at: '2026-10-20' }
      }
      if (index % 20 === 0) {
        writeFileSync(cachePath, JSON.stringify(cache))
        console.log('progress', index, '/', pending.length, 'saved', saved)
      }
      await new Promise((resolve) => setTimeout(resolve, 350))
    }
  }
  await Promise.all([worker(), worker(), worker()])
  writeFileSync(cachePath, JSON.stringify(cache))
  console.log('wikimedia saved', saved)
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (invoked) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
