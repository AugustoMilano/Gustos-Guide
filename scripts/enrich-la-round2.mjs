/**
 * Los Angeles round 2: Apple price bands, Yelp ratings only when Apple
 * attributes the rating to Yelp, and licensed Wikimedia / Flickr photos.
 * Never guesses a score. Does not write review copy.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const laPath = join(root, 'src/content/la.json')
const UA = 'GustosGuide/1.0 (local restaurant catalog; photo licensing check)'
const PRIORITY = ['delilah', 'granville', 'philippe-the-original', 'spago', 'dunsmoor']
let HOODS = []
const FOREIGN = [
  'seattle', 'portland', 'chicago', 'new york', 'nyc', 'brooklyn', 'manhattan', 'london', 'paris',
  'tokyo', 'san francisco', 'las vegas', 'miami', 'boston', 'austin', 'denver', 'philadelphia',
  'atlanta', 'san diego', 'vancouver', 'toronto', 'florence', 'firenze', 'rome', 'roma', 'milan',
  'italy', 'france', 'england', 'japan', 'spain', 'mexico city', 'tacoma', 'bellevue', 'amboy',
]
const LOCAL = [
  'los angeles', 'hollywood', 'beverly', 'santa monica', 'malibu', 'pasadena', 'culver',
  'west hollywood', 'weho', 'glassell', 'eagle rock', 'los feliz', 'silver lake',
  'echo park', 'downtown', 'fairfax', 'melrose', 'arts district', 'venice',
]
const OTHER_CITY = [
  'costa mesa', 'newport beach', 'corona del mar', 'irvine', 'anaheim', 'huntington beach',
  'laguna beach', 'laguna niguel', 'dana point', 'santa ana', 'fullerton', 'orange county',
  'san diego', 'san francisco', 'sacramento', 'oakland', 'san jose', 'fresno', 'palm springs',
  'palm desert', 'riverside', 'long beach', 'pasadena', 'burbank', 'glendale', 'torrance',
  'manhattan beach', 'redondo beach', 'el segundo', 'carson', 'compton', 'downey', 'whittier',
  'arcadia', 'monrovia', 'alhambra', 'monterey park', 'san gabriel', 'studio city',
  'sherman oaks', 'calabasas', 'tarzana', 'north hollywood', 'universal city', 'thousand oaks',
  'santa barbara', 'ventura', 'mission viejo', 'tustin', 'garden grove', 'buena park',
]
const JUNK = /\b(logo|icon|map|diagram|svg|flag|coat of arms|menu|bathroom|restroom|toilet|portrait|headshot|selfie|screenshot|mugshot|gown|costume|auction|actress|actor|peacock|painting|statue|poster|headstone|cemetery|tombstone|anatomy|muscle|vertebra|skeleton|shaded|parade|festival|nowruz|new year|celebration)\b/i
const ARCHIVE = /\b(1[0-8]\d{2}|19[0-7]\d)\b/
const VENUE = /\b(restaurant|cafe|café|coffee|bakery|pizzeria|diner|tavern|grill|storefront|exterior|interior|dining|patio|courtyard|deli|delicatessen|brasserie|bistro|steakhouse|taqueria|ramen|noodle|sushi|sandwich)\b/i

const report = {
  yelpAdded: [],
  priceAdded: [],
  slugAdded: [],
  photos: [],
  photoMiss: [],
  rateLimited: [],
  yelpPagesBlocked: false,
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/&amp;/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, ' ').replace(/\s+/g, ' ').trim()
}

function wordsOf(name) {
  return norm(name).split(' ').filter((word) => word.length >= 4 && !['restaurant', 'original', 'cafe', 'grill', 'house', 'kitchen', 'the', 'and'].includes(word))
}

function loosen(value) {
  return norm(value).replace(/\b(\w{5,})s\b/g, '$1')
}

function nameIn(name, text) {
  const titled = loosen(text)
  const phrase = loosen(norm(name).replace(/^(the|a|an) /, ''))
  if (phrase.length >= 6 && titled.includes(phrase)) return true
  const words = wordsOf(name)
  if (words.length >= 2 && words.every((word) => titled.includes(loosen(word)))) return true
  if (words.length === 1 && words[0].length >= 7 && titled.includes(words[0])) return true
  if (words.length === 1 && words[0].length >= 5 && new RegExp(`\\b${words[0]}\\b`).test(titled)) return true
  if (!words.length && phrase.length >= 4 && titled.includes(phrase)) return true
  return false
}

function mentions(text, list) {
  const value = ` ${norm(text)} `
  return list.filter((item) => value.includes(` ${item} `))
}

function localityOf(place) {
  return [place.neighborhood, place.address, 'los angeles', 'california'].filter(Boolean).join(' ')
}

function placeOk(place, text) {
  const blob = norm(text)
  const foreign = mentions(blob, FOREIGN)
  const localWords = [...LOCAL, norm(place.neighborhood)].filter(Boolean)
  const local = mentions(blob, localWords)
  const hasLa = blob.includes('los angeles') || blob.includes(norm(place.neighborhood))
  if (otherSpot(place, text, HOODS)) return false
  if (foreign.length && !hasLa && !local.length) return false
  if (/\b(italy|italia|venezia)\b/.test(blob) && !hasLa) return false
  if (JUNK.test(text)) return false
  return true
}

function fileOk(text) {
  const value = String(text || '')
  if (JUNK.test(value) || /who'?s who/i.test(value) || /\bm\.d\b/i.test(value)) return false
  if (ARCHIVE.test(value)) return false
  return true
}

const GENERIC_WORD = new Set(['hollywood', 'angeles', 'los', 'west', 'east', 'north', 'south', 'beverly', 'hills', 'venice', 'monica', 'santa', 'malibu', 'downtown', 'beach', 'park', 'city', 'restaurant', 'original', 'grill', 'cafe', 'kitchen', 'house', 'market', 'deli'])

function nameLoose(placeName, title) {
  if (nameIn(placeName, title)) return true
  const place = loosen(placeName)
  const words = wordsOf(title).filter((word) => word.length >= 5 && !GENERIC_WORD.has(word))
  const hits = words.filter((word) => place.includes(loosen(word)))
  return hits.some((word) => word.length >= 7)
}

function otherSpot(place, text, hoods) {
  const blob = ` ${norm(text)} `
  const mine = norm(place.neighborhood)
  const here = norm(`${place.name} ${place.address} ${place.neighborhood} los angeles`)
  if (blob.includes(' grand central ') && !here.includes('grand central')) return 'grand central'
  for (const city of OTHER_CITY) {
    if (here.includes(city)) continue
    if (blob.includes(` ${city} `)) return city
  }
  if (mine && blob.includes(` ${mine} `)) return ''
  for (const hood of hoods) {
    if (hood.length < 6 || hood === mine || mine.includes(hood) || hood.includes(mine)) continue
    if (blob.includes(` ${hood} `)) return hood
  }
  return ''
}

function coordOk(place, page) {
  const coord = page?.coordinates?.[0]
  if (!coord || !Number.isFinite(coord.lat) || !Number.isFinite(coord.lon)) return true
  return meters(place, { lat: coord.lat, lng: coord.lon }) <= 800
}

function weakName(name) {
  return wordsOf(name).length < 2
}

function licenseOk(name) {
  const value = String(name || '').toLowerCase()
  if (!value) return false
  if (/nc\b|non-?commercial|\bnd\b|no ?derivatives|fair use|all rights reserved|copyrighted|gfdl/.test(value)) return false
  return /public domain|cc0|cc[- ]by\b|pdm/.test(value)
}

function meters(a, b) {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

async function getJson(url) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (response.status === 429 || response.status === 503) {
      await sleep(8000 * (attempt + 1))
      continue
    }
    if (!response.ok) throw new Error(`${response.status} ${url.host || ''}`)
    await sleep(650)
    return response.json()
  }
  const error = new Error('429')
  error.rate = true
  throw error
}

function wikiUrl(params) {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.searchParams.set('format', 'json')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url
}

function enwikiUrl(params) {
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('format', 'json')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url
}

function fromImageinfo(page) {
  const info = page?.imageinfo?.[0]
  if (!info) return null
  const width = info.width || info.thumbwidth || 0
  if (width < 480) return null
  if (!/image\/(jpeg|png|webp)/.test(info.mime || '')) return null
  const meta = info.extmetadata || {}
  const license = stripHtml(meta.LicenseShortName?.value || '')
  if (!licenseOk(license)) return null
  const artist = stripHtml(meta.Artist?.value || 'Wikimedia Commons').slice(0, 160)
  const description = stripHtml(meta.ImageDescription?.value || '')
  const title = page.title || ''
  return {
    title,
    license,
    credit: artist || 'Wikimedia Commons',
    creditUrl: info.descriptionurl || '',
    description,
    width,
    source: 'wikimedia',
  }
}

function streetNumber(address) {
  const match = String(address || '').match(/\d{2,6}/)
  return match ? match[0] : ''
}

async function wikipediaLead(place) {
  const search = await getJson(enwikiUrl({
    action: 'query',
    list: 'search',
    srsearch: `${place.name} ${place.neighborhood} Los Angeles`,
    srlimit: '5',
  }))
  for (const hit of search.query?.search || []) {
    if (!nameLoose(place.name, hit.title)) continue
    if (/\((singer|band|album|film|mythology|biblical|song|novel|series|album)\)/i.test(hit.title)) continue
    const data = await getJson(enwikiUrl({
      action: 'query',
      titles: hit.title,
      prop: 'coordinates|pageimages|extracts',
      piprop: 'original|name',
      pithumbsize: '1600',
      exintro: '1',
      explaintext: '1',
    }))
    const page = Object.values(data.query?.pages || {})[0]
    if (!page || page.missing) continue
    const extract = page.extract || ''
    if (/may refer to/.test(extract)) continue
    const coord = page.coordinates?.[0]
    let near = false
    if (coord && Number.isFinite(coord.lat) && Number.isFinite(coord.lon)) {
      const distance = meters(place, { lat: coord.lat, lng: coord.lon })
      if (distance > 4828) continue
      near = distance <= 724
    }
    const number = streetNumber(place.address)
    const localText = `${extract} ${hit.title}`
    const addressed = number && localText.includes(number) && (mentions(localText, LOCAL).length > 0 || norm(localText).includes(norm(place.neighborhood)))
    if (!near && !addressed) continue
    if (!placeOk(place, `${hit.title} ${extract}`)) continue
    const file = page.pageimage
    if (!file) continue
    const info = await getJson(wikiUrl({
      action: 'query',
      titles: `File:${file}`,
      prop: 'imageinfo|coordinates',
      iiprop: 'url|size|mime|extmetadata',
      iiurlwidth: '1600',
    }))
    const filePage = Object.values(info.query?.pages || {})[0]
    const hitInfo = fromImageinfo(filePage)
    if (!hitInfo) continue
    const fileText = `${hitInfo.title} ${hitInfo.description} ${extract}`
    if (!fileOk(fileText) || !placeOk(place, fileText) || otherSpot(place, fileText, HOODS) || !coordOk(place, filePage)) continue
    return { ...hitInfo, why: near ? 'wikipedia-coords' : 'wikipedia-address' }
  }
  return null
}

async function commonsSearch(place) {
  const data = await getJson(wikiUrl({
    action: 'query',
    generator: 'search',
    gsrsearch: `intitle:"${place.name.replace(/"/g, '')}"`,
    gsrnamespace: '6',
    gsrlimit: '12',
    prop: 'imageinfo|coordinates',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '1600',
  }))
  const number = streetNumber(place.address)
  const pages = Object.values(data.query?.pages || {})
  for (const page of pages) {
    const info = fromImageinfo(page)
    if (!info) continue
    const blob = `${info.title} ${info.description}`
    const named = nameIn(place.name, info.title) || (nameLoose(place.name, info.title) && VENUE.test(blob))
    if (!named) continue
    if (!fileOk(blob) || !placeOk(place, blob) || otherSpot(place, blob, HOODS) || !coordOk(place, page)) continue
    const local = mentions(blob, [...LOCAL, norm(place.neighborhood)]).length > 0 || (number && blob.includes(number))
    if (!local) continue
    if (weakName(place.name) && !VENUE.test(info.title) && !norm(info.title).includes(norm(place.neighborhood))) continue
    return { ...info, why: 'commons-title' }
  }
  return null
}

async function commonsGeo(place) {
  const data = await getJson(wikiUrl({
    action: 'query',
    generator: 'geosearch',
    ggscoord: `${place.lat}|${place.lng}`,
    ggsradius: '180',
    ggslimit: '16',
    ggsnamespace: '6',
    prop: 'imageinfo|coordinates',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '1600',
  }))
  for (const page of Object.values(data.query?.pages || {})) {
    const info = fromImageinfo(page)
    if (!info) continue
    const blob = `${info.title} ${info.description}`
    if (!nameIn(place.name, info.title)) continue
    if (!fileOk(blob) || !placeOk(place, blob) || otherSpot(place, blob, HOODS) || !coordOk(place, page)) continue
    if (weakName(place.name) && !VENUE.test(info.title) && !norm(info.title).includes(norm(place.neighborhood))) continue
    return { ...info, why: 'commons-geo' }
  }
  return null
}

async function openverse(place) {
  const url = new URL('https://api.openverse.org/v1/images/')
  url.searchParams.set('q', `${place.name} ${place.neighborhood} Los Angeles`)
  url.searchParams.set('license', 'by,by-sa,cc0,pdm')
  url.searchParams.set('source', 'flickr,wikimedia')
  url.searchParams.set('page_size', '12')
  const data = await getJson(url)
  const number = streetNumber(place.address)
  for (const row of data.results || []) {
    const license = String(row.license || '').toLowerCase()
    if (!['by', 'by-sa', 'cc0', 'pdm'].includes(license)) continue
    const blob = `${row.title || ''} ${(row.tags || []).map((tag) => tag.name || tag).join(' ')}`
    const named = nameIn(place.name, row.title || '') || (nameLoose(place.name, row.title || '') && VENUE.test(blob))
    if (!named) continue
    if (!fileOk(blob) || !placeOk(place, blob) || otherSpot(place, blob, HOODS)) continue
    const local = mentions(blob, [...LOCAL, norm(place.neighborhood)]).length > 0 || (number && blob.includes(number))
    if (!local) continue
    if (weakName(place.name) && !VENUE.test(row.title || '') && !norm(row.title || '').includes(norm(place.neighborhood))) continue
    if ((row.width || 0) < 480) continue
    const mapped = license === 'by-sa' ? 'CC BY-SA' : license === 'by' ? 'CC BY' : license === 'cc0' ? 'CC0' : 'Public domain'
    const version = row.license_version ? ` ${row.license_version}` : ''
    return {
      title: row.title,
      license: `${mapped}${license === 'by' || license === 'by-sa' ? version : ''}`.trim(),
      credit: stripHtml(row.creator || row.attribution || 'Flickr').slice(0, 160),
      creditUrl: row.foreign_landing_url || row.url,
      description: blob,
      width: row.width,
      source: row.source === 'flickr' ? 'flickr' : 'wikimedia',
      fileUrl: row.url,
      why: 'openverse',
    }
  }
  return null
}

function toJpeg(src, dest) {
  const run = spawnSync('python3', ['-c', `
import sys
from PIL import Image
image = Image.open(sys.argv[1]).convert('RGB')
width, height = image.size
if width < 480 or height < 270:
    sys.exit(3)
image.save(sys.argv[2], 'JPEG', quality=82, optimize=True, progressive=True)
print(width, height)
`, src, dest], { encoding: 'utf8' })
  if (run.status !== 0) return null
  const [width, height] = run.stdout.trim().split(/\s+/).map(Number)
  return { width, height }
}

async function download(hit, id) {
  const fileName = hit.fileUrl ? null : String(hit.title || '').replace(/^File:/, '')
  const remote = hit.fileUrl || `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=1600`
  const response = await fetch(remote, { headers: { 'User-Agent': UA } })
  if (response.status === 429) {
    const error = new Error('429')
    error.rate = true
    throw error
  }
  if (!response.ok) throw new Error(`download ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length < 8000) throw new Error('tiny file')
  const tmp = `/tmp/la-photo-${id}`
  writeFileSync(tmp, bytes)
  const dest = join(root, 'public/photos', `${id}.jpg`)
  const size = toJpeg(tmp, dest)
  if (!size) throw new Error('not a usable photo')
  return { dest, ...size }
}

function reviewCount(rating) {
  const direct = Number(rating.numRatingsUsedForScore || 0)
  if (direct > 0) return Math.round(direct)
  const formatted = String(rating.ratingsFormatted || '')
  const match = formatted.match(/([\d.]+)\s*([kKmM])?/)
  if (!match) return 0
  const value = Number(match[1])
  if (!Number.isFinite(value)) return 0
  const unit = (match[2] || '').toLowerCase()
  return Math.round(value * (unit === 'm' ? 1_000_000 : unit === 'k' ? 1000 : 1))
}

function harvest(card) {
  let price = null
  let yelp = null
  let yelpId = ''
  const slugs = []
  const raw = JSON.stringify(card)
  for (const match of raw.matchAll(/https?:\/\/(?:www\.)?yelp\.com\/(?:biz|menu)\/([A-Za-z0-9_-]+)/g)) slugs.push(match[1])
  function walk(node, allowYelp) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) walk(item, allowYelp)
      return
    }
    const rating = node.ratingType ? node : null
    if (rating?.ratingType === 'PRICE_RANGE' && price == null) {
      const score = Number(rating.score)
      if (score >= 1 && score <= 4) price = score
    }
    if (allowYelp && !yelp && rating?.ratingType === 'USER_RATING') {
      const score = Number(rating.score)
      const count = reviewCount(rating)
      if (score > 0 && score <= 5 && count > 0) yelp = { value: Math.round(score * 10) / 10, count, source: 'Yelp' }
    }
    for (const value of Object.values(node)) walk(value, allowYelp)
  }
  for (const component of card.component || []) {
    const attr = component.attribution || {}
    const yelpVendor = attr.vendorId === 'com.yelp' || attr.displayName === 'Yelp'
    const aggregate = yelpVendor && component.type === 'COMPONENT_TYPE_RATING'
    if (aggregate && !yelpId && /^[A-Za-z0-9_-]{8,}$/.test(attr.externalItemId || '')) yelpId = attr.externalItemId
    walk(component, aggregate)
  }
  return { price, yelp, yelpId, slugs: [...new Set(slugs)] }
}

function slugOk(place, slug) {
  const text = norm(slug.replace(/-/g, ' '))
  const foreign = mentions(text, ['new york', 'nyc', 'seattle', 'chicago', 'london', 'paris', 'tokyo', 'san francisco', 'las vegas', 'miami', 'boston', 'portland', 'vancouver', 'brooklyn', 'florence', 'rome'])
  const local = mentions(text, ['los angeles', 'hollywood', 'beverly', 'santa monica', 'malibu', 'venice', 'weho', 'california', 'downtown', norm(place.neighborhood)])
  if (foreign.length && !local.length) return false
  return nameIn(place.name, text)
}

async function appleCard(muid) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch('https://maps.apple.com/data/place', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': UA, accept: 'application/json' },
      body: JSON.stringify({ places: [{ muid }], fetchAllComponents: true }),
    })
    const text = await response.text()
    if (response.ok && text.trim().startsWith('{')) {
      return JSON.parse(text).places?.[0]
    }
    await sleep(1500 * (attempt + 1))
  }
  throw new Error('apple blocked')
}

async function selfCheck() {
  const la = JSON.parse(readFileSync(laPath, 'utf8'))
  const granville = la.places.find((place) => place.id === 'granville')
  const delilah = la.places.find((place) => place.id === 'delilah')
  const g = harvest(await appleCard(granville.muid))
  const d = harvest(await appleCard(delilah.muid))
  if (!g.yelp || g.yelp.source !== 'Yelp' || g.yelp.count < 100) throw new Error(`self-check missed Granville Yelp ${JSON.stringify(g.yelp)}`)
  if (d.yelp) throw new Error('self-check treated a non-Yelp Delilah rating as Yelp')
  if (d.price !== 4) throw new Error(`self-check Delilah price ${d.price}`)
  console.log('self-check ok', 'granville', g.yelp.value, g.yelp.count, 'delilah price', d.price, 'slugs', d.slugs.join(','))
}

async function fillApple(la) {
  const pending = la.places.filter((place) => !place.price || place.publicRating?.source !== 'Yelp')
  console.log('apple cards', pending.length)
  let index = 0
  async function worker() {
    while (index < pending.length) {
      const place = pending[index]
      index += 1
      try {
        const card = await appleCard(place.muid)
        if (!card) continue
        const found = harvest(card)
        if (!place.price && found.price) {
          place.price = found.price
          report.priceAdded.push(place.id)
          console.log('price', place.name, found.price)
        }
        if (place.publicRating?.source !== 'Yelp' && found.yelp) {
          place.publicRating = found.yelp
          report.yelpAdded.push(`${place.id} ${found.yelp.value} ${found.yelp.count}`)
          console.log('yelp', place.name, found.yelp.value, found.yelp.count)
        }
        if (!place.yelpSlug) {
          const slug = found.slugs.find((item) => slugOk(place, item)) || found.yelpId
          if (slug) {
            place.yelpSlug = slug
            report.slugAdded.push(`${place.id} ${slug}`)
          }
        }
      } catch (error) {
        console.warn('apple fail', place.name, error.message)
      }
      await sleep(120)
    }
  }
  await worker()
  writeFileSync(laPath, `${JSON.stringify(la, null, 2)}\n`)
}

async function findPhoto(place) {
  const steps = [wikipediaLead, commonsGeo, commonsSearch, openverse]
  for (const step of steps) {
    try {
      const hit = await step(place)
      if (hit) return hit
    } catch (error) {
      if (error.rate || String(error.message).includes('429')) {
        report.rateLimited.push(`${place.id} ${step.name}`)
        console.warn('rate limit', place.name, step.name)
        await sleep(15000)
      } else {
        console.warn('photo step', place.name, step.name, error.message)
      }
    }
  }
  return null
}

async function fillPhotos(la) {
  mkdirSync(join(root, 'public/photos'), { recursive: true })
  const pending = la.places
    .filter((place) => place.photos?.[0]?.source === 'illustration')
    .sort((a, b) => PRIORITY.indexOf(a.id) - PRIORITY.indexOf(b.id) || a.name.localeCompare(b.name))
  const priorityRank = (place) => (PRIORITY.includes(place.id) ? PRIORITY.indexOf(place.id) : 99)
  pending.sort((a, b) => priorityRank(a) - priorityRank(b) || a.name.localeCompare(b.name))
  HOODS = [...new Set(la.places.map((place) => norm(place.neighborhood)).filter((hood) => hood.length >= 6))]
  console.log('photo search', pending.length)
  for (const place of pending) {
    const hit = await findPhoto(place)
    if (!hit) {
      report.photoMiss.push(place.id)
      console.log('miss', place.name)
      continue
    }
    try {
      const file = await download(hit, place.id)
      place.photos = [{
        source: hit.source === 'flickr' ? 'flickr' : 'wikimedia',
        url: `/photos/${place.id}.jpg`,
        alt: `${place.name} in ${place.neighborhood}`,
        credit: hit.credit,
        ...(hit.creditUrl ? { creditUrl: hit.creditUrl } : {}),
        license: hit.license,
      }]
      writeFileSync(laPath, `${JSON.stringify(la, null, 2)}\n`)
      report.photos.push(`${place.id} ${hit.why} ${hit.title} ${file.width}x${file.height} ${hit.license}`)
      console.log('saved', place.name, '←', hit.why, hit.title)
    } catch (error) {
      report.photoMiss.push(`${place.id} ${error.message}`)
      console.warn('save fail', place.name, error.message)
    }
  }
}

async function yelpProbe() {
  try {
    const response = await fetch('https://www.yelp.com/biz/delilah-west-hollywood', {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
    })
    report.yelpPagesBlocked = response.status === 403 || response.status === 401
    console.log('yelp.com', response.status)
  } catch (error) {
    report.yelpPagesBlocked = true
    console.log('yelp.com blocked', error.message)
  }
}

async function main() {
  await selfCheck()
  await yelpProbe()
  const la = JSON.parse(readFileSync(laPath, 'utf8'))
  if (!process.argv.includes('--photos-only')) await fillApple(la)
  if (!process.argv.includes('--apple-only')) await fillPhotos(la)
  const resize = spawnSync('python3', [join(root, 'scripts/resize-photos.py')], { encoding: 'utf8' })
  console.log(resize.stdout.trim())
  writeFileSync('/tmp/la-round2-report.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify({
    yelpAdded: report.yelpAdded.length,
    priceAdded: report.priceAdded.length,
    slugAdded: report.slugAdded.length,
    photos: report.photos.length,
    photoMiss: report.photoMiss.length,
    rateLimited: report.rateLimited.length,
    yelpPagesBlocked: report.yelpPagesBlocked,
  }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
