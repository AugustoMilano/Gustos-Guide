import type { LivePhoto } from './gallery.ts'
import type { SlimPlace } from '../types.ts'

export type RankedGuide = {
  slug: string
  title: string
  ranked: boolean
  entries: { placeId: string }[]
}

export const RANKED_PHOTO_GUIDES = ['best-pizza', 'best-sushi', 'sandwiches', 'burgers'] as const

export const RIGHT_NOW_FALLBACK = ['delancey', 'spinasse', 'paseo', 'tacos-chukis', 'the-walrus-and-the-carpenter', 'canlis'] as const

export type PhotoNeed = {
  place: SlimPlace
  reason: string
}

export function homeHitList(places: SlimPlace[]): SlimPlace[] {
  const ranked = places
    .filter((place) => place.publicRating?.source === 'Yelp')
    .slice()
    .sort((a, b) => (b.publicRating?.value ?? 0) - (a.publicRating?.value ?? 0))
  const picked: SlimPlace[] = []
  const hoods = new Set<string>()
  for (const place of ranked) {
    if (hoods.has(place.neighborhood)) continue
    hoods.add(place.neighborhood)
    picked.push(place)
    if (picked.length === 12) break
  }
  return picked
}

function hasCatalogPhoto(place: SlimPlace): boolean {
  return (place.photo?.source === 'wikimedia' || place.photo?.source === 'flickr') && Boolean(place.photo.url)
}

export function photoQueue(places: SlimPlace[], guides: RankedGuide[], uploads: LivePhoto[]): PhotoNeed[] {
  const hits = homeHitList(places)
  const hitAt = new Map(hits.map((place, index) => [place.id, index]))
  const owned = new Set(uploads.filter((photo) => photo.owner && photo.url).map((photo) => photo.placeId))
  const rows: { place: SlimPlace; tier: number; order: number; guides: number; reason: string }[] = []

  for (const place of places) {
    if (hasCatalogPhoto(place) || owned.has(place.id)) continue
    let tier = 3
    let order = 0
    let reason = place.guideSlugs.length === 1 ? '1 guide' : `${place.guideSlugs.length} guides`
    let bestTop = 99
    let topReason = ''
    for (const slug of RANKED_PHOTO_GUIDES) {
      const guide = guides.find((item) => item.slug === slug && item.ranked)
      if (!guide) continue
      const index = guide.entries.findIndex((entry) => entry.placeId === place.id)
      if (index < 0 || index > 2 || index >= bestTop) continue
      bestTop = index
      topReason = `${guide.title} · ${index + 1}`
    }
    if (bestTop < 99) {
      tier = 0
      order = bestTop
      reason = topReason
    } else if (hitAt.has(place.id)) {
      tier = 1
      order = hitAt.get(place.id) ?? 0
      reason = 'Home list'
    } else {
      const fallback = RIGHT_NOW_FALLBACK.indexOf(place.id as (typeof RIGHT_NOW_FALLBACK)[number])
      if (fallback >= 0) {
        tier = 2
        order = fallback
        reason = 'Right now'
      }
    }
    rows.push({ place, tier, order, guides: place.guideSlugs.length, reason })
  }

  rows.sort((a, b) => a.tier - b.tier || a.order - b.order || b.guides - a.guides || a.place.name.localeCompare(b.place.name))
  return rows.map((row) => ({ place: row.place, reason: row.reason }))
}
