/** Yelp ratings for the Apple-imported regions, same source as LA round 2: only when Apple attributes the rating to Yelp. Never estimated. */
import { readFileSync, writeFileSync } from 'node:fs'
const UA = 'GustosGuide/1.0 (local restaurant catalog; photo licensing check)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
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
  let yelpPrice = null
  let fsqPrice = null
  let yelp = null
  let yelpId = ''
  const slugs = []
  const raw = JSON.stringify(card)
  for (const match of raw.matchAll(/https?:\/\/(?:www\.)?yelp\.com\/(?:biz|menu)\/([A-Za-z0-9_-]+)/g)) slugs.push(match[1])
  function walk(node, vendor) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) walk(item, vendor)
      return
    }
    const rating = node.ratingType ? node : null
    if (rating?.ratingType === 'PRICE_RANGE') {
      const score = Number(rating.score)
      if (score >= 1 && score <= 4) {
        if (vendor === 'yelp' && yelpPrice == null) yelpPrice = score
        if (vendor === 'fsq' && fsqPrice == null) fsqPrice = score
      }
    }
    if (vendor === 'yelp' && !yelp && rating?.ratingType === 'USER_RATING') {
      const score = Number(rating.score)
      const count = reviewCount(rating)
      if (score > 0 && score <= 5 && count > 0) yelp = { value: Math.round(score * 10) / 10, count, source: 'Yelp' }
    }
    for (const value of Object.values(node)) walk(value, vendor)
  }
  for (const component of card.component || []) {
    const attr = component.attribution || {}
    const yelpVendor = attr.vendorId === 'com.yelp' || attr.displayName === 'Yelp'
    const fsqVendor = attr.vendorId === 'com.foursquare' || attr.vendorId === 'com.foursquare_v2' || attr.displayName === 'Foursquare'
    const vendor = yelpVendor ? 'yelp' : fsqVendor ? 'fsq' : ''
    if (!vendor) continue
    if (yelpVendor && component.type === 'COMPONENT_TYPE_RATING' && !yelpId && /^[A-Za-z0-9_-]{8,}$/.test(attr.externalItemId || '')) {
      yelpId = attr.externalItemId
    }
    walk(component, vendor)
  }
  return { price: yelpPrice ?? fsqPrice, yelp, yelpId, slugs: [...new Set(slugs)] }
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
const out = {}
for (const name of process.argv.slice(2)) {
  const path = `src/content/${name}.json`
  const data = JSON.parse(readFileSync(path, 'utf8'))
  const r = (out[name] = { places: data.places.length, rated: 0, shown: 0, none: 0, failed: 0, ids: 0 })
  for (const place of data.places) {
    if (!place.muid || place.publicRating?.source === 'Yelp') continue
    try {
      const card = await appleCard(place.muid)
      const found = card ? harvest(card) : null
      if (found?.yelp) {
        place.publicRating = found.yelp
        r.rated += 1
        if (found.yelp.value >= 3.9) r.shown += 1
      } else r.none += 1
      if (found?.yelpId && !place.yelpSlug) {
        place.yelpSlug = found.yelpId
        place.ids = { ...(place.ids || {}), yelp: found.yelpId }
        r.ids += 1
      }
    } catch (e) {
      r.failed += 1
    }
    await sleep(120)
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
  console.log(name, JSON.stringify(r))
}
