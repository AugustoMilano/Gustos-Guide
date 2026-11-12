import indexUrl from './slim-index.json?url'
import { expandCatalog, type SlimFile } from './expand-catalog.ts'
import { areasFor, asCityId, cityFromPath, REGIONS, type CityId, type RegionId } from '../lib/city.ts'
import type { Guide, GuideSummary, Place, SlimPlace } from '../types.ts'

const cityFiles: Record<string, () => Promise<string>> = {
  seattle: () => import('./slim-city-seattle.json?url').then((module) => module.default),
  eastside: () => import('./slim-city-eastside.json?url').then((module) => module.default),
  la: () => import('./slim-city-la.json?url').then((module) => module.default),
  sf: () => import('./slim-city-sf.json?url').then((module) => module.default),
  eastbay: () => import('./slim-city-eastbay.json?url').then((module) => module.default),
  peninsula: () => import('./slim-city-peninsula.json?url').then((module) => module.default),
  northbay: () => import('./slim-city-northbay.json?url').then((module) => module.default),
  sandiego: () => import('./slim-city-sandiego.json?url').then((module) => module.default),
  vancouver: () => import('./slim-city-vancouver.json?url').then((module) => module.default),
  portland: () => import('./slim-city-portland.json?url').then((module) => module.default),
  nyc: () => import('./slim-city-nyc.json?url').then((module) => module.default),
  pullman: () => import('./slim-city-pullman.json?url').then((module) => module.default),
  moscow: () => import('./slim-city-moscow.json?url').then((module) => module.default),
}

export type IndexFile = {
  updatedAt: string
  placeCount: number
  hiddenCount: number
  places: SlimPlace[]
  guides: GuideSummary[]
}

export const catalog: IndexFile = {
  updatedAt: '',
  placeCount: 0,
  hiddenCount: 0,
  places: [],
  guides: [],
}

const placeById = new Map<string, SlimPlace>()
let phase = 0
let generation = 0
const listeners = new Set<() => void>()

export function subscribeCatalog(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 0 while the first city is in flight, a rising count as cities arrive, -1 when the first fetch failed. */
export function catalogPhase(): number {
  return phase < 0 ? -1 : generation
}

function emit(next: number) {
  if (next < 0) phase = -1
  else {
    phase = 1
    generation += 1
  }
  for (const listener of listeners) listener()
}

const loadedCities = new Set<string>()
const cityJobs = new Map<string, Promise<void>>()

export function cityLoaded(city: string): boolean {
  return loadedCities.has(city)
}

/** True once every area in the region is in memory, so a regional rank is not missing a neighbor. */
export function regionReady(region: RegionId): boolean {
  const row = REGIONS.find((item) => item.id === region)
  return Boolean(row && row.areas.every((id) => loadedCities.has(id)))
}

function cityFileUrl(city: string): Promise<string> {
  const load = cityFiles[city]
  if (!load) return Promise.reject(new Error(`missing catalog for ${city}`))
  return load()
}

function addCity(file: SlimFile) {
  const expanded = expandCatalog(file)
  if (expanded.updatedAt) catalog.updatedAt = expanded.updatedAt
  if (typeof expanded.hiddenCount === 'number') catalog.hiddenCount = expanded.hiddenCount
  const seen = new Set(catalog.places.map((place) => place.id))
  const places = expanded.places.filter((place) => !seen.has(place.id))
  if (places.length) catalog.places = catalog.places.concat(places)
  const seenGuides = new Set(catalog.guides.map((guide) => guide.slug))
  const guides = expanded.guides.filter((guide) => !seenGuides.has(guide.slug))
  if (guides.length) catalog.guides = catalog.guides.concat(guides)
  catalog.placeCount = catalog.places.length
  for (const place of expanded.places) placeById.set(place.id, place)
}

/** Fetch one city's slim places and guides. Later cities are added; nothing already loaded is dropped. */
export function ensureCity(city: string): Promise<void> {
  const id = asCityId(city)
  if (loadedCities.has(id)) return Promise.resolve()
  const pending = cityJobs.get(id)
  if (pending) return pending
  const job = cityFileUrl(id).then((url) => fetch(url, { credentials: 'same-origin' }))
    .then((response) => {
      if (!response.ok) throw new Error(id)
      return response.json() as Promise<SlimFile>
    })
    .then((file) => {
      addCity(file)
      loadedCities.add(id)
      emit(1)
    })
    .finally(() => {
      cityJobs.delete(id)
    })
  cityJobs.set(id, job)
  return job
}

export function ensureRegion(city: string): Promise<void> {
  const ids = areasFor(asCityId(city)).map((area) => area.id)
  return Promise.all(ids.map((id) => ensureCity(id))).then(() => undefined)
}

export function ensureAllCities(): Promise<void> {
  return Promise.all(Object.keys(cityFiles).map((id) => ensureCity(id))).then(() => undefined)
}

function routeCity(): CityId {
  if (typeof window === 'undefined') return 'seattle'
  return cityFromPath(window.location.hash.replace(/^#/, '') || '/')
}

type PlaceBoot = { id: string; data: Promise<Place | null>; done: boolean; value: Place | null }
const boot = (globalThis as { __placeBoot?: PlaceBoot }).__placeBoot

// A place deep link renders from its own small file first; the 100 KB catalog waits until the page
// has loaded so it does not compete with the hero photo (C1). Every other route fetches it at once.
function afterLoad(): Promise<void> {
  if (!boot || typeof document === 'undefined') return Promise.resolve()
  return new Promise((resolve) => {
    const go = () => setTimeout(resolve, 0)
    if (document.readyState === 'complete') go()
    else window.addEventListener('load', go, { once: true })
  })
}

export const catalogReady: Promise<void> = afterLoad()
  .then(async () => {
    const response = await fetch(indexUrl, { credentials: 'same-origin' })
    if (!response.ok) throw new Error('catalog index')
    const index = await response.json() as { u?: string; h?: number }
    if (index.u) catalog.updatedAt = index.u
    if (typeof index.h === 'number') catalog.hiddenCount = index.h
    await ensureCity(routeCity())
  })
  .catch(() => {
    if (loadedCities.size === 0) emit(-1)
  })

/** The deep-linked place's own record when it has already arrived (C1). */
export function bootPlace(id: string): Place | undefined {
  return boot && boot.id === id && boot.done && boot.value?.id === id ? boot.value : undefined
}

/** True while the deep-linked place's own record is still in flight. */
export function bootPending(id: string): boolean {
  return Boolean(boot && boot.id === id && !boot.done)
}

/** Resolves when the deep-linked place's own record settles (immediately when there is none). */
export function bootSettled(): Promise<unknown> {
  return boot ? boot.data : Promise.resolve()
}

export function slimById(id: string): SlimPlace | undefined {
  return placeById.get(id)
}

type RegionFile = { places: Place[]; guides: Guide[] }

function placeRecord(places: Place[]): Record<string, Place> {
  const record: Record<string, Place> = {}
  for (const place of places) record[place.id] = place
  return record
}

const placeLoaders = {
  seattle: () => import('./places.json').then((module) => module.default as unknown as Record<string, Place>),
  eastside: () => import('./eastside.json').then((module) => placeRecord((module.default as RegionFile).places)),
  la: () => import('./la.json').then((module) => placeRecord((module.default as RegionFile).places)),
  sf: () => import('./sf.json').then((module) => placeRecord((module.default as RegionFile).places)),
  sandiego: () => import('./sd.json').then((module) => placeRecord((module.default as RegionFile).places)),
  vancouver: () => import('./vancouver.json').then((module) => placeRecord((module.default as RegionFile).places)),
  portland: () => import('./portland.json').then((module) => placeRecord((module.default as RegionFile).places)),
  nyc: () => import('./nyc.json').then((module) => placeRecord((module.default as RegionFile).places)),
  pullman: () => import('./palouse.json').then((module) => placeRecord((module.default as RegionFile).places)),
}

const guideLoaders = {
  seattle: () => import('./guides.json').then((module) => module.default as Guide[]),
  eastside: () => import('./eastside.json').then((module) => (module.default as RegionFile).guides),
  la: () => import('./la.json').then((module) => (module.default as RegionFile).guides),
  sf: () => import('./sf.json').then((module) => (module.default as RegionFile).guides),
  sandiego: () => import('./sd.json').then((module) => (module.default as RegionFile).guides),
  vancouver: () => import('./vancouver.json').then((module) => (module.default as RegionFile).guides),
  portland: () => import('./portland.json').then((module) => (module.default as RegionFile).guides),
  nyc: () => import('./nyc.json').then((module) => (module.default as RegionFile).guides),
  pullman: () => import('./palouse.json').then((module) => (module.default as RegionFile).guides),
}

type BundleKey = keyof typeof placeLoaders

const placeCache = new Map<BundleKey, Promise<Record<string, Place>>>()
const guideCache = new Map<BundleKey, Promise<Guide[]>>()
const fullPlaces = new Map<string, Place>()

function rememberPlace(place: Place | null | undefined) {
  if (place?.id) fullPlaces.set(place.id, place)
}

function rememberRecord(record: Record<string, Place>) {
  for (const place of Object.values(record)) rememberPlace(place)
}

/** Full place record already loaded for this id, including the deep-linked boot record. */
export function peekPlace(id: string): Place | undefined {
  return fullPlaces.get(id) ?? bootPlace(id)
}

function bundleKey(city: string): BundleKey {
  if (city === 'eastbay' || city === 'peninsula' || city === 'northbay') return 'sf'
  if (city === 'moscow') return 'pullman'
  if (city === 'sandiego') return 'sandiego'
  if (city in placeLoaders) return city as BundleKey
  return 'seattle'
}

function loadPlaceBundle(key: BundleKey): Promise<Record<string, Place>> {
  const cached = placeCache.get(key)
  if (cached) return cached
  const pending = placeLoaders[key]().then((record) => {
    rememberRecord(record)
    return record
  })
  placeCache.set(key, pending)
  return pending
}

function loadGuideBundle(key: BundleKey): Promise<Guide[]> {
  const cached = guideCache.get(key)
  if (cached) return cached
  const pending = guideLoaders[key]()
  guideCache.set(key, pending)
  return pending
}

let placesPromise: Promise<Record<string, Place>> | null = null
let guidesPromise: Promise<Guide[]> | null = null

export function loadPlaces(): Promise<Record<string, Place>> {
  placesPromise ??= Promise.all((Object.keys(placeLoaders) as BundleKey[]).map((key) => loadPlaceBundle(key))).then((files) => {
    const places: Record<string, Place> = {}
    for (const file of files) Object.assign(places, file)
    return places
  })
  return placesPromise
}

export function loadGuides(): Promise<Guide[]> {
  guidesPromise ??= Promise.all((Object.keys(guideLoaders) as BundleKey[]).map((key) => loadGuideBundle(key))).then((files) => files.flat())
  return guidesPromise
}

export async function loadPlace(id: string): Promise<Place | undefined> {
  if (boot && boot.id === id) {
    const own = await boot.data
    if (own && own.id === id) {
      rememberPlace(own)
      return own
    }
  }
  const slim = placeById.get(id)
  const first = bundleKey(slim?.city || routeCity())
  const record = await loadPlaceBundle(first)
  if (record[id] || slim) return record[id]
  for (const key of Object.keys(placeLoaders) as BundleKey[]) {
    if (key === first) continue
    const next = await loadPlaceBundle(key)
    if (next[id]) return next[id]
  }
  return undefined
}

export async function loadGuide(slug: string): Promise<Guide | undefined> {
  const summary = catalog.guides.find((guide) => guide.slug === slug)
  const guides = await loadGuideBundle(bundleKey(summary?.city || routeCity()))
  return guides.find((guide) => guide.slug === slug)
}
