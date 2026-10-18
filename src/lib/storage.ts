import type { City, Guide, LocalUser, Place, UserDocument, VisitStatus } from '../types.ts'

/**
 * The only module that touches localStorage.
 *
 * Session and per-user documents are split on purpose. A later account
 * system can replace `storage` with a remote adapter of the same shape:
 * look up a user, load their document, save their document. The UI should
 * not grow a second copy of these keys.
 */

const SESSION_KEY = 'gusto.session.v1'
const DIRECTORY_KEY = 'gusto.directory.v1'

export interface SessionUser extends LocalUser {}

function userKey(userId: string): string {
  return `gusto.user.v1.${userId}`
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function emptyDocument(): UserDocument {
  return { version: 1, cities: [], places: [], guides: [], statuses: {} }
}

function isPrice(value: unknown): value is Place['price'] {
  return value === 1 || value === 2 || value === 3 || value === 4
}

function isStatus(value: unknown): value is VisitStatus {
  return value === 'togo' || value === 'been'
}

function sanitizePlace(value: unknown): Place | null {
  if (!value || typeof value !== 'object') return null
  const place = value as Partial<Place>
  if (typeof place.id !== 'string' || typeof place.name !== 'string') return null
  if (typeof place.cityId !== 'string' || typeof place.slug !== 'string') return null
  if (!isPrice(place.price)) return null
  if (typeof place.lat !== 'number' || typeof place.lng !== 'number') return null
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null
  return {
    id: place.id,
    slug: place.slug,
    name: place.name,
    cityId: place.cityId,
    neighborhood: typeof place.neighborhood === 'string' ? place.neighborhood : '',
    cuisine: typeof place.cuisine === 'string' ? place.cuisine : '',
    price: place.price,
    rating: typeof place.rating === 'number' && Number.isFinite(place.rating) ? place.rating : 0,
    dish: typeof place.dish === 'string' ? place.dish : '',
    note: typeof place.note === 'string' ? place.note : '',
    address: typeof place.address === 'string' ? place.address : '',
    lat: place.lat,
    lng: place.lng,
    website: typeof place.website === 'string' ? place.website : undefined,
    hours: typeof place.hours === 'string' ? place.hours : undefined,
    photoUrl: typeof place.photoUrl === 'string' ? place.photoUrl : undefined,
    source: 'user',
  }
}

function sanitizeGuide(value: unknown): Guide | null {
  if (!value || typeof value !== 'object') return null
  const guide = value as Partial<Guide>
  if (typeof guide.id !== 'string' || typeof guide.title !== 'string') return null
  if (typeof guide.cityId !== 'string') return null
  const placeIds = Array.isArray(guide.placeIds)
    ? guide.placeIds.filter((id): id is string => typeof id === 'string')
    : []
  return {
    id: guide.id,
    slug: typeof guide.slug === 'string' ? guide.slug : guide.id,
    title: guide.title,
    cityId: guide.cityId,
    dek: typeof guide.dek === 'string' ? guide.dek : '',
    kind: 'user',
    placeIds,
  }
}

function sanitizeCity(value: unknown): City | null {
  if (!value || typeof value !== 'object') return null
  const city = value as Partial<City>
  if (typeof city.id !== 'string' || typeof city.name !== 'string' || typeof city.slug !== 'string') {
    return null
  }
  return {
    id: city.id,
    name: city.name,
    slug: city.slug,
    region: typeof city.region === 'string' ? city.region : '',
    blurb: typeof city.blurb === 'string' ? city.blurb : 'A city you added on this device.',
    comingSoon: false,
    center: null,
  }
}

function sanitizeDocument(value: unknown): UserDocument {
  if (!value || typeof value !== 'object') return emptyDocument()
  const doc = value as Partial<UserDocument>
  const statuses: Record<string, VisitStatus> = {}
  if (doc.statuses && typeof doc.statuses === 'object') {
    for (const [placeId, status] of Object.entries(doc.statuses)) {
      if (isStatus(status)) statuses[placeId] = status
    }
  }
  return {
    version: 1,
    cities: Array.isArray(doc.cities) ? doc.cities.map(sanitizeCity).filter((city): city is City => !!city) : [],
    places: Array.isArray(doc.places) ? doc.places.map(sanitizePlace).filter((place): place is Place => !!place) : [],
    guides: Array.isArray(doc.guides) ? doc.guides.map(sanitizeGuide).filter((guide): guide is Guide => !!guide) : [],
    statuses,
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

export const storage = {
  getSession(): LocalUser | null {
    const session = readJson<LocalUser>(SESSION_KEY)
    if (!session || typeof session.id !== 'string' || typeof session.name !== 'string') return null
    return { id: session.id, name: session.name }
  },

  /**
   * Name-only sign-in. The same name on this browser reopens that
   * person's document. Swap this method for a real identity provider later.
   */
  signIn(name: string): LocalUser {
    const display = name.trim()
    const key = normalizeName(display)
    const directory = readJson<Record<string, LocalUser>>(DIRECTORY_KEY) ?? {}
    const existing = directory[key]
    const user: LocalUser = existing
      ? { id: existing.id, name: display }
      : { id: crypto.randomUUID(), name: display }
    directory[key] = user
    writeJson(DIRECTORY_KEY, directory)
    writeJson(SESSION_KEY, user)
    if (!existing) writeJson(userKey(user.id), emptyDocument())
    return user
  },

  signOut(): void {
    localStorage.removeItem(SESSION_KEY)
  },

  loadUser(userId: string): UserDocument {
    return sanitizeDocument(readJson<unknown>(userKey(userId)))
  },

  saveUser(userId: string, document: UserDocument): void {
    writeJson(userKey(userId), { ...document, version: 1 })
  },
}
