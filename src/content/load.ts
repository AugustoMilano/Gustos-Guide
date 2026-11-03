import catalogUrl from './slim-catalog.json?url'
import { expandCatalog, type SlimFile } from './expand-catalog.ts'
import type { Guide, GuideSummary, Place, SlimPlace } from '../types.ts'

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
const listeners = new Set<() => void>()

export function subscribeCatalog(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 0 while the catalog is in flight, 1 when it is ready, -1 when the fetch failed. */
export function catalogPhase(): number {
  return phase
}

function emit(next: number) {
  phase = next
  for (const listener of listeners) listener()
}

function publish(file: SlimFile) {
  const expanded = expandCatalog(file)
  catalog.updatedAt = expanded.updatedAt
  catalog.hiddenCount = expanded.hiddenCount
  catalog.places = expanded.places
  catalog.guides = expanded.guides
  catalog.placeCount = expanded.places.length
  placeById.clear()
  for (const place of expanded.places) placeById.set(place.id, place)
  emit(1)
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

export const catalogReady: Promise<void> = afterLoad().then(() => fetch(catalogUrl, { credentials: 'same-origin' }))
  .then((response) => {
    if (!response.ok) throw new Error('catalog')
    return response.json() as Promise<SlimFile>
  })
  .then(publish)
  .catch(() => {
    emit(-1)
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

let placesPromise: Promise<Record<string, Place>> | null = null
let guidesPromise: Promise<Guide[]> | null = null

function regions(): Promise<RegionFile[]> {
  return Promise.all([
    import('./eastside.json'),
    import('./la.json'),
    import('./sf.json'),
    import('./sd.json'),
    import('./vancouver.json'),
    import('./portland.json'),
    import('./nyc.json'),
    import('./palouse.json'),
  ]).then((modules) => modules.map((module) => module.default as RegionFile))
}

export function loadPlaces(): Promise<Record<string, Place>> {
  placesPromise ??= Promise.all([import('./places.json'), regions()]).then(([seattle, files]) => {
    const extra: Record<string, Place> = {}
    for (const file of files) for (const place of file.places) extra[place.id] = place
    return { ...(seattle.default as unknown as Record<string, Place>), ...extra }
  })
  return placesPromise
}

export function loadGuides(): Promise<Guide[]> {
  guidesPromise ??= Promise.all([import('./guides.json'), regions()]).then(([seattle, files]) => {
    return [...(seattle.default as Guide[]), ...files.flatMap((file) => file.guides)]
  })
  return guidesPromise
}

export async function loadPlace(id: string): Promise<Place | undefined> {
  if (boot && boot.id === id) {
    const own = await boot.data
    if (own && own.id === id) return own
  }
  const places = await loadPlaces()
  return places[id]
}

export async function loadGuide(slug: string): Promise<Guide | undefined> {
  const guides = await loadGuides()
  return guides.find((guide) => guide.slug === slug)
}
