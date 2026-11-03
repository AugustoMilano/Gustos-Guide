// Places opened on this device, newest first (C4). The service worker keeps their pages, records and
// photos, so this list is what still opens offline.
const KEY = 'gusto.recent-places'
const LIMIT = 20

export function readRecentPlaces(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(0, LIMIT) : []
  } catch {
    return []
  }
}

export function rememberPlace(id: string): void {
  try {
    const next = [id, ...readRecentPlaces().filter((item) => item !== id)].slice(0, LIMIT)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private mode or a full quota: the list is a convenience only.
  }
}
