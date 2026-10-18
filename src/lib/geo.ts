export interface GeocodeHit {
  lat: number
  lng: number
  label: string
}

interface NominatimRow {
  lat: string
  lon: string
  display_name: string
}

let lastRequest = 0

/**
 * Forward-geocode a free-text address with the public Nominatim service.
 * Calls are spaced to the public usage limit (about one a second). The
 * browser sends a Referer; manual lat/lng remains available if this fails.
 */
export async function geocodeAddress(query: string, signal?: AbortSignal): Promise<GeocodeHit[]> {
  const q = query.trim()
  if (q.length < 3) return []

  const wait = Math.max(0, 1100 - (Date.now() - lastRequest))
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait))
  }
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  lastRequest = Date.now()

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', '5')

  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error('Geocoder unavailable')
  }
  const rows = (await response.json()) as NominatimRow[]
  return rows
    .map((row) => ({
      lat: Number(row.lat),
      lng: Number(row.lon),
      label: row.display_name,
    }))
    .filter((hit) => Number.isFinite(hit.lat) && Number.isFinite(hit.lng))
}

export function readPosition(): Promise<{ lat: number; lng: number }> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('This browser does not share location.'))
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('Location is blocked. You can still sort by rating or name.'))
          return
        }
        reject(new Error("Couldn't get a location fix. Try again, or sort another way."))
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    )
  })
}
