import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const content = join(root, 'src/content')
const SEP = '\u001f'

function read(name) {
  return JSON.parse(readFileSync(join(content, name), 'utf8'))
}

function joinList(values) {
  const list = values ?? []
  for (const value of list) {
    if (String(value).includes(SEP)) throw new Error(`separator in ${value}`)
  }
  return list.join(SEP)
}

function photoCode(photo) {
  if (!photo?.source) return ''
  const flag = { gusto: 'g', wikimedia: 'w', flickr: 'f', illustration: 'i', foursquare: 'q' }[photo.source]
  if (!flag) throw new Error(`photo source ${photo.source}`)
  const url = photo.url || ''
  if (url.includes(SEP)) throw new Error('separator in photo url')
  return url ? `${flag}${SEP}${url}` : flag
}

function periodCode(periods) {
  return (periods ?? []).map((period) => {
    let mask = 0
    for (const day of period.days ?? []) {
      if (day < 0 || day > 6) throw new Error(`day ${day}`)
      mask |= 1 << day
    }
    return [mask, period.start, period.end]
  })
}

function placeRow(place) {
  const rating = place.publicRating?.source === 'Yelp' ? [place.publicRating.value, place.publicRating.count || 0] : 0
  for (const field of [place.id, place.name, place.neighborhood, place.address, place.oneLiner, place.website, place.phone, place.yelpSlug]) {
    if (field && String(field).includes(SEP)) throw new Error(`separator in ${place.id}`)
  }
  return [
    place.id,
    place.name || '',
    place.neighborhood || '',
    place.city || '',
    joinList(place.cuisine),
    place.placeType || '',
    place.price || 0,
    place.oneLiner || '',
    joinList(place.perfectFor),
    periodCode(place.periods),
    place.lat,
    place.lng,
    place.closed ? 1 : 0,
    joinList(place.guideSlugs),
    photoCode(place.photo || place.photos?.[0]),
    place.address || '',
    place.website || '',
    place.phone || '',
    place.yelpSlug || '',
    rating,
  ]
}

function guideRow(guide) {
  return [
    guide.slug,
    guide.title,
    guide.dek || '',
    guide.group,
    guide.updatedAt,
    guide.ranked ? 1 : 0,
    guide.count ?? guide.entries.length,
    guide.city || '',
  ]
}

export function writeSlimCatalog() {
  const index = read('index.json')
  const eastside = read('eastside.json')
  const la = read('la.json')
  const sf = read('sf.json')
  const sd = read('sd.json')
  const added = ['vancouver.json', 'portland.json', 'nyc.json', 'palouse.json'].map(read)
  const places = index.places.map(placeRow)
  const guides = index.guides.map(guideRow)
  for (const file of [eastside, la, sf, sd, ...added]) {
    for (const place of file.places) places.push(placeRow(place))
    for (const guide of file.guides) guides.push(guideRow(guide))
  }
  const sourceIds = [
    ...index.places.map((place) => place.id),
    ...eastside.places.map((place) => place.id),
    ...la.places.map((place) => place.id),
    ...sf.places.map((place) => place.id),
    ...sd.places.map((place) => place.id),
    ...added.flatMap((file) => file.places.map((place) => place.id)),
  ]
  const sourceGuides = [
    ...index.guides.map((guide) => guide.slug),
    ...eastside.guides.map((guide) => guide.slug),
    ...la.guides.map((guide) => guide.slug),
    ...sf.guides.map((guide) => guide.slug),
    ...sd.guides.map((guide) => guide.slug),
    ...added.flatMap((file) => file.guides.map((guide) => guide.slug)),
  ]
  if (places.map((row) => row[0]).join('\n') !== sourceIds.join('\n')) throw new Error('place order changed')
  if (guides.map((row) => row[0]).join('\n') !== sourceGuides.join('\n')) throw new Error('guide order changed')
  const doc = { u: index.updatedAt, h: index.hiddenCount, g: guides, p: places }
  const out = join(content, 'slim-catalog.json')
  writeFileSync(out, JSON.stringify(doc))
  return out
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = writeSlimCatalog()
  console.log(`slim catalog ${out}`)
}
