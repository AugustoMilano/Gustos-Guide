import index from './index.json'
import type { Guide, GuideSummary, Place, SlimPlace } from '../types.ts'

type IndexFile = {
  updatedAt: string
  placeCount: number
  hiddenCount: number
  places: SlimPlace[]
  guides: GuideSummary[]
}

export const catalog = index as IndexFile

const placeById = new Map(catalog.places.map((place) => [place.id, place]))

export function slimById(id: string): SlimPlace | undefined {
  return placeById.get(id)
}

let placesPromise: Promise<Record<string, Place>> | null = null
let guidesPromise: Promise<Guide[]> | null = null

export function loadPlaces(): Promise<Record<string, Place>> {
  placesPromise ??= import('./places.json').then((module) => module.default as unknown as Record<string, Place>)
  return placesPromise
}

export function loadGuides(): Promise<Guide[]> {
  guidesPromise ??= import('./guides.json').then((module) => module.default as Guide[])
  return guidesPromise
}

export async function loadPlace(id: string): Promise<Place | undefined> {
  const places = await loadPlaces()
  return places[id]
}

export async function loadGuide(slug: string): Promise<Guide | undefined> {
  const guides = await loadGuides()
  return guides.find((guide) => guide.slug === slug)
}
