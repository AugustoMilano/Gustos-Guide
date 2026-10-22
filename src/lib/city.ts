export type CityId = 'seattle' | 'eastside' | 'la' | 'sf' | 'peninsula'
export type RegionId = 'seattle' | 'la' | 'sf'

export type City = {
  id: CityId
  name: string
  ready: boolean
}

/** Areas inside a region. The coral pill lists these when a region has more than one. */
const AREAS: Record<CityId, City> = {
  seattle: { id: 'seattle', name: 'Seattle', ready: true },
  eastside: { id: 'eastside', name: 'Eastside', ready: true },
  la: { id: 'la', name: 'Los Angeles', ready: true },
  sf: { id: 'sf', name: 'San Francisco', ready: true },
  peninsula: { id: 'peninsula', name: 'Peninsula', ready: true },
}

export type Region = {
  id: RegionId
  name: string
  detail: string
  areas: CityId[]
}

export const REGIONS: Region[] = [
  { id: 'seattle', name: 'Seattle', detail: 'Seattle + Eastside', areas: ['seattle', 'eastside'] },
  { id: 'la', name: 'Los Angeles', detail: 'Los Angeles', areas: ['la'] },
  { id: 'sf', name: 'San Francisco', detail: 'San Francisco + Peninsula', areas: ['sf', 'peninsula'] },
]

export const ACTIVE_CITY: CityId = 'seattle'

const CITY_IDS = new Set<string>(Object.keys(AREAS))

const MEMORY_KEY = 'gusto.region.v1'

export function asCityId(value: string | undefined | null): CityId {
  if (value && CITY_IDS.has(value)) return value as CityId
  return 'seattle'
}

export function regionOf(city: CityId): RegionId {
  if (city === 'la') return 'la'
  if (city === 'sf' || city === 'peninsula') return 'sf'
  return 'seattle'
}

export function areasFor(city: CityId): City[] {
  const region = REGIONS.find((item) => item.areas.includes(city))
  return (region?.areas ?? ['seattle']).map((id) => AREAS[id])
}

/** Name of the region, even when the open area is the Eastside or the Peninsula. */
export function regionName(city: CityId): string {
  if (city === 'la') return 'Los Angeles'
  if (city === 'sf' || city === 'peninsula') return 'San Francisco'
  return 'Seattle'
}

export function areaTitle(city: CityId): string {
  if (city === 'eastside') return 'The Eastside'
  if (city === 'la') return 'Los Angeles'
  if (city === 'sf') return 'San Francisco'
  if (city === 'peninsula') return 'The Peninsula'
  return 'Seattle'
}

/** Phrase that can follow "Search" or "in". */
export function areaPhrase(city: CityId): string {
  if (city === 'eastside') return 'the Eastside'
  if (city === 'la') return 'Los Angeles'
  if (city === 'sf') return 'San Francisco'
  if (city === 'peninsula') return 'the Peninsula'
  return 'Seattle'
}

export function readRegionMemory(): { region: RegionId; area: CityId } {
  if (typeof localStorage === 'undefined') return { region: 'seattle', area: 'seattle' }
  try {
    const raw = JSON.parse(localStorage.getItem(MEMORY_KEY) || '') as { area?: string }
    const area = asCityId(raw.area)
    if (raw.area && CITY_IDS.has(raw.area)) return { region: regionOf(area), area }
  } catch {
    /* empty or private mode */
  }
  return { region: 'seattle', area: 'seattle' }
}

export function writeRegionMemory(area: CityId) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(MEMORY_KEY, JSON.stringify({ region: regionOf(area), area }))
}

const PLAIN = new Set(['/terms', '/privacy', '/cities'])
const PREFIXES = (Object.keys(AREAS) as CityId[]).map((id) => `/${id}`)

export function isCityPicker(pathname: string): boolean {
  const path = (pathname.split('?')[0] || '/').replace(/\/$/, '') || '/'
  return path === '/cities'
}

export function cityFromPath(pathname: string): CityId {
  const path = (pathname.split('?')[0] || '/').replace(/\/$/, '') || '/'
  for (const id of Object.keys(AREAS) as CityId[]) {
    const prefix = `/${id}`
    if (path === prefix || path.startsWith(`${prefix}/`)) return id
  }
  return 'seattle'
}

function currentCity(): CityId {
  if (typeof window === 'undefined') return 'seattle'
  const hash = window.location.hash.replace(/^#/, '') || '/'
  return cityFromPath(hash)
}

export function cityPath(path: string, city: CityId = currentCity()): string {
  const hashless = path.startsWith('#') ? path.slice(1) : path
  const [pathname = '/', search = ''] = hashless.split('?')
  const query = search ? `?${search}` : ''
  if (pathname.startsWith('/auth') || PLAIN.has(pathname)) return `${pathname}${query}`
  if (PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return `${pathname}${query}`
  const prefix = `/${city}`
  if (pathname === '/' || pathname === '') return `${prefix}${query}`
  return `${prefix}${pathname.startsWith('/') ? pathname : `/${pathname}`}${query}`
}

export function barePath(pathname: string): string {
  for (const prefix of PREFIXES) {
    if (pathname === prefix) return '/'
    if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length)
  }
  return pathname
}
