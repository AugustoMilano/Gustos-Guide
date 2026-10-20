import index from './index.json'
import eastsideFile from './eastside.json'
import type { Guide, GuideSummary, Place, SlimPlace } from '../types.ts'

type IndexFile = {
  updatedAt: string
  placeCount: number
  hiddenCount: number
  places: SlimPlace[]
  guides: GuideSummary[]
}

type EastsideFile = {
  places: Place[]
  guides: Guide[]
}

const eastside = eastsideFile as EastsideFile

function slimFrom(place: Place): SlimPlace {
  return {
    id: place.id,
    city: place.city,
    name: place.name,
    neighborhood: place.neighborhood,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    cuisine: place.cuisine,
    placeType: place.placeType,
    ...(place.price ? { price: place.price } : {}),
    oneLiner: place.oneLiner,
    perfectFor: place.perfectFor,
    periods: place.periods,
    ...(place.appleRating ? { appleRating: place.appleRating } : {}),
    ...(place.publicRating ? { publicRating: place.publicRating } : {}),
    gustoScore: null,
    photo: place.photos[0],
    ...(place.website ? { website: place.website } : {}),
    ...(place.phone ? { phone: place.phone } : {}),
    appleMapsUrl: place.appleMapsUrl,
    ...(place.applePlaceUrl ? { applePlaceUrl: place.applePlaceUrl } : {}),
    ...(place.yelpSlug ? { yelpSlug: place.yelpSlug } : {}),
    guideSlugs: place.guideSlugs,
  }
}

const seattle = index as IndexFile
const eastGuides: GuideSummary[] = eastside.guides.map((guide) => ({
  slug: guide.slug,
  title: guide.title,
  dek: guide.dek,
  group: guide.group,
  updatedAt: guide.updatedAt,
  ranked: guide.ranked,
  count: guide.entries.length,
  city: 'eastside',
}))

export const catalog: IndexFile = {
  ...seattle,
  placeCount: seattle.places.length + eastside.places.length,
  places: [...seattle.places, ...eastside.places.map(slimFrom)],
  guides: [...seattle.guides, ...eastGuides],
}

const placeById = new Map(catalog.places.map((place) => [place.id, place]))

export function slimById(id: string): SlimPlace | undefined {
  return placeById.get(id)
}

let placesPromise: Promise<Record<string, Place>> | null = null
let guidesPromise: Promise<Guide[]> | null = null

export function loadPlaces(): Promise<Record<string, Place>> {
  placesPromise ??= import('./places.json').then((module) => {
    const seattlePlaces = module.default as unknown as Record<string, Place>
    const extra: Record<string, Place> = {}
    for (const place of eastside.places) extra[place.id] = place
    return { ...seattlePlaces, ...extra }
  })
  return placesPromise
}

export function loadGuides(): Promise<Guide[]> {
  guidesPromise ??= import('./guides.json').then((module) => {
    const seattleGuides = module.default as Guide[]
    return [...seattleGuides, ...eastside.guides]
  })
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
