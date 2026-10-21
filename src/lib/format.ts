import type { Price } from '../types.ts'
import { SITE_ORIGIN, canonicalUrl } from './site.ts'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'place'
}

export function uniqueSlug(value: string, taken: string[]): string {
  const base = slugify(value)
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

export function countPlaces(count: number): string {
  return `${count} ${count === 1 ? 'place' : 'places'}`
}

export function priceLabel(price: Price | undefined): string {
  if (!price) return ''
  return '$'.repeat(price)
}

export function formatRating(rating: number): string {
  return rating.toFixed(1)
}

/** Shown on the gray Yelp line. Lower ratings stay in the data and in ranking. */
export const YELP_LINE_MIN = 3.9

export function publicReference(place: {
  publicRating?: { value: number; count: number; source: string }
}): string | null {
  const rating = place.publicRating
  if (!rating || rating.source !== 'Yelp' || !Number.isFinite(rating.value) || rating.value < YELP_LINE_MIN) return null
  const stars = `${rating.value.toFixed(1)} ★`
  const count = rating.count > 0 ? ` · ${rating.count.toLocaleString('en-US')} reviews` : ''
  return `Yelp ${stars}${count}`
}

export function yelpBizUrl(slug: string): string {
  return `https://www.yelp.com/biz/${encodeURIComponent(slug)}`
}

export function spotLabel(count: number): string {
  return `${count} ${count === 1 ? 'spot' : 'spots'}`
}

export function formatMiles(miles: number): string {
  if (miles < 0.1) return '< 0.1 mi'
  if (miles < 10) return `${miles.toFixed(1)} mi`
  return `${Math.round(miles)} mi`
}

export function milesBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 3958.7613
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function shareUrl(slug: string): string {
  return pageShareUrl(`/place/${slug}`)
}

export function pageShareUrl(hashPath: string): string {
  const path = hashPath.replace(/^#/, '')
  const bare = path.startsWith('/') ? path : `/${path}`
  if (bare.startsWith('/place/') || bare.startsWith('/guide/')) return `${SITE_ORIGIN}/share${bare}`
  return canonicalUrl(`#${bare}`)
}

export function directionsUrl(place: { name: string; lat: number; lng: number }): string {
  return `https://maps.apple.com/?daddr=${place.lat},${place.lng}&q=${encodeURIComponent(place.name)}`
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}

export function safeHttpUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(withProtocol)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

export function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 0
  const clamped = Math.min(10, Math.max(0, value))
  return Math.round(clamped * 10) / 10
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= list.length || to >= list.length || from === to) {
    return list
  }
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
