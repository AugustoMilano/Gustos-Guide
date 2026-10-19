import links from '../content/apple-links.json'

const placeLinks = links as Record<string, string>

export function applePlaceUrl(id: string): string | undefined {
  const url = placeLinks[id]
  return url && url.includes('auid=') ? url : undefined
}

export function appleDirectionsUrl(place: { name: string; lat: number; lng: number }): string {
  return `https://maps.apple.com/?daddr=${place.lat},${place.lng}&q=${encodeURIComponent(place.name)}`
}

export function googleMapsUrl(place: { name: string; address?: string }): string {
  const query = [place.name, place.address].filter(Boolean).join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function googleDirectionsUrl(place: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
}

export function prefersAppleMaps(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  const isiOS = /iPad|iPhone|iPod/.test(ua) || iPadOs
  const isMac = /Macintosh|Mac OS X/.test(ua) || iPadOs
  const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|EdgiOS|OPR|Android|Firefox/i.test(ua)
  if (isiOS && isSafari) return true
  return isMac && isSafari && !iPadOs
}
