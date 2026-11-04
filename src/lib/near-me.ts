// "Near me" for the map list (E1). Location is asked only when the reader taps the chip, and the
// choice (with the last fix) lives in sessionStorage, so it ends with the tab.
import type { RegionId } from './city.ts'

export type Spot = { lat: number; lng: number }
const KEY = 'gusto.near-me'

export function readNearMe(): Spot | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) ?? 'null')
    return raw && typeof raw.lat === 'number' && typeof raw.lng === 'number' ? { lat: raw.lat, lng: raw.lng } : null
  } catch {
    return null
  }
}

export function saveNearMe(spot: Spot | null): void {
  try {
    if (spot) sessionStorage.setItem(KEY, JSON.stringify(spot))
    else sessionStorage.removeItem(KEY)
  } catch {
    // Private mode: the sort still works for this page view.
  }
}

export type LocateResult = { spot: Spot } | { error: 'denied' | 'unavailable' }

export function locate(): Promise<LocateResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve({ error: 'unavailable' })
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ spot: { lat: position.coords.latitude, lng: position.coords.longitude } }),
      (error) => resolve({ error: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 10000 },
    )
  })
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: Spot, b: Spot): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Kilometres in Vancouver, miles in the US cities. */
export function formatDistance(km: number, region: RegionId): string {
  const metric = region === 'vancouver'
  const value = metric ? km : km / 1.609344
  const unit = metric ? 'km' : 'mi'
  if (value < 0.1) return `0.1 ${unit}`
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${unit}`
}
