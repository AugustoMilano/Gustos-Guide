import type { Detent } from './use-bottom-sheet.ts'

export type ExploreArea = { south: number; north: number; west: number; east: number }
export type ExploreCamera = { lat: number; lng: number; zoom: number }

export type ExploreMemory = {
  cuisine: string
  neighborhood: string
  price: string
  band: string
  visit: string
  detent: Detent
  pinnedId: string | null
  scroll: number
  area: ExploreArea | null
  camera: ExploreCamera | null
}

const DETENTS: Detent[] = ['peek', 'half', 'full']

function key(city: string) {
  return `gusto.explore.view.${city}`
}

function area(value: unknown): ExploreArea | null {
  if (!value || typeof value !== 'object') return null
  const box = value as ExploreArea
  if (![box.south, box.north, box.west, box.east].every((n) => typeof n === 'number' && Number.isFinite(n))) return null
  return { south: box.south, north: box.north, west: box.west, east: box.east }
}

function camera(value: unknown): ExploreCamera | null {
  if (!value || typeof value !== 'object') return null
  const view = value as ExploreCamera
  if (![view.lat, view.lng, view.zoom].every((n) => typeof n === 'number' && Number.isFinite(n))) return null
  return { lat: view.lat, lng: view.lng, zoom: view.zoom }
}

export function readExploreMemory(city: string): ExploreMemory | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(key(city)) ?? 'null') as Partial<ExploreMemory> | null
    if (!raw || typeof raw !== 'object') return null
    const detent = DETENTS.includes(raw.detent as Detent) ? (raw.detent as Detent) : 'peek'
    return {
      cuisine: typeof raw.cuisine === 'string' ? raw.cuisine : 'any',
      neighborhood: typeof raw.neighborhood === 'string' ? raw.neighborhood : 'any',
      price: typeof raw.price === 'string' ? raw.price : 'any',
      band: typeof raw.band === 'string' ? raw.band : 'any',
      visit: typeof raw.visit === 'string' ? raw.visit : 'any',
      detent,
      pinnedId: typeof raw.pinnedId === 'string' ? raw.pinnedId : null,
      scroll: typeof raw.scroll === 'number' && raw.scroll > 0 ? raw.scroll : 0,
      area: area(raw.area),
      camera: camera(raw.camera),
    }
  } catch {
    return null
  }
}

export function saveExploreMemory(city: string, memory: ExploreMemory) {
  try {
    sessionStorage.setItem(key(city), JSON.stringify(memory))
  } catch {
    // Private mode: this view still works until the page closes.
  }
}
