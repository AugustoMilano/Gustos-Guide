export type CityId = 'seattle' | 'eastside' | 'la' | 'sf' | 'eastbay' | 'peninsula' | 'northbay' | 'sandiego' | 'vancouver' | 'portland' | 'nyc' | 'pullman' | 'moscow'
export type RegionId = 'seattle' | 'la' | 'sf' | 'sandiego' | 'vancouver' | 'portland' | 'nyc' | 'pullman'

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
  eastbay: { id: 'eastbay', name: 'East Bay', ready: true },
  peninsula: { id: 'peninsula', name: 'Peninsula', ready: true },
  northbay: { id: 'northbay', name: 'North Bay', ready: true },
  sandiego: { id: 'sandiego', name: 'San Diego', ready: true },
  vancouver: { id: 'vancouver', name: 'Vancouver', ready: true },
  portland: { id: 'portland', name: 'Portland', ready: true },
  nyc: { id: 'nyc', name: 'New York', ready: true },
  pullman: { id: 'pullman', name: 'Pullman, WA', ready: true },
  moscow: { id: 'moscow', name: 'Moscow, ID', ready: true },
}

export type Region = {
  id: RegionId
  name: string
  detail: string
  areas: CityId[]
}

export const REGIONS: Region[] = [
  { id: 'seattle', name: 'Seattle', detail: 'Seattle, Bellevue, Kirkland, Redmond', areas: ['seattle', 'eastside'] },
  { id: 'la', name: 'Los Angeles', detail: 'Santa Monica, West Hollywood, Beverly Hills, Venice', areas: ['la'] },
  {
    id: 'sf',
    name: 'San Francisco',
    detail: 'San Francisco, Palo Alto, Santa Clara, Sausalito',
    areas: ['sf', 'eastbay', 'peninsula', 'northbay'],
  },
  { id: 'sandiego', name: 'San Diego', detail: 'San Diego, La Jolla, Coronado, Oceanside', areas: ['sandiego'] },
  { id: 'vancouver', name: 'Vancouver', detail: 'Downtown, Coal Harbour, Gastown, Granville Island', areas: ['vancouver'] },
  { id: 'portland', name: 'Portland', detail: 'Downtown, Pearl District, Nob Hill, Old Town', areas: ['portland'] },
  { id: 'nyc', name: 'New York', detail: 'Manhattan and Brooklyn', areas: ['nyc'] },
  { id: 'pullman', name: 'Pullman, WA', detail: 'Pullman, WA and Moscow, ID', areas: ['pullman', 'moscow'] },
]

export const ACTIVE_CITY: CityId = 'seattle'

const CITY_IDS = new Set<string>(Object.keys(AREAS))

/** Longest prefix first so `/eastside` is not read as a shorter id. */
export const CITY_PREFIXES = (Object.keys(AREAS) as CityId[])
  .map((id) => `/${id}`)
  .sort((a, b) => b.length - a.length)

const MEMORY_KEY = 'gusto.region.v1'

const BAY = new Set<CityId>(['sf', 'eastbay', 'peninsula', 'northbay'])

export function asCityId(value: string | undefined | null): CityId {
  if (value && CITY_IDS.has(value)) return value as CityId
  return 'seattle'
}

export function regionOf(city: CityId): RegionId {
  if (city === 'la') return 'la'
  if (city === 'sandiego') return 'sandiego'
  if (city === 'vancouver') return 'vancouver'
  if (city === 'portland') return 'portland'
  if (city === 'nyc') return 'nyc'
  if (city === 'pullman' || city === 'moscow') return 'pullman'
  if (BAY.has(city)) return 'sf'
  return 'seattle'
}

export function areasFor(city: CityId): City[] {
  const region = REGIONS.find((item) => item.areas.includes(city))
  return (region?.areas ?? ['seattle']).map((id) => AREAS[id])
}

export function areaName(city: CityId): string {
  return AREAS[city].name
}

/** Name of the region, even when the open area is the Eastside or the East Bay. */
export function regionName(city: CityId): string {
  if (city === 'la') return 'Los Angeles'
  if (city === 'sandiego') return 'San Diego'
  if (city === 'vancouver') return 'Vancouver'
  if (city === 'portland') return 'Portland'
  if (city === 'nyc') return 'New York'
  if (city === 'pullman' || city === 'moscow') return 'Pullman, WA'
  if (BAY.has(city)) return 'San Francisco'
  return 'Seattle'
}

export function areaTitle(city: CityId): string {
  if (city === 'eastside') return 'Seattle’s Eastside'
  if (city === 'la') return 'Los Angeles'
  if (city === 'sf') return 'San Francisco'
  if (city === 'eastbay') return 'The East Bay'
  if (city === 'peninsula') return 'The Peninsula'
  if (city === 'northbay') return 'The North Bay'
  if (city === 'sandiego') return 'San Diego'
  if (city === 'vancouver') return 'Vancouver'
  if (city === 'portland') return 'Portland'
  if (city === 'nyc') return 'New York'
  if (city === 'pullman') return 'Pullman, WA'
  if (city === 'moscow') return 'Moscow, ID'
  return 'Seattle'
}

/** Phrase that can follow "Search" or "in". */
export function areaPhrase(city: CityId): string {
  if (city === 'eastside') return 'Seattle’s Eastside'
  if (city === 'la') return 'Los Angeles'
  if (city === 'sf') return 'San Francisco'
  if (city === 'eastbay') return 'the East Bay'
  if (city === 'peninsula') return 'the Peninsula'
  if (city === 'northbay') return 'the North Bay'
  if (city === 'sandiego') return 'San Diego'
  if (city === 'vancouver') return 'Vancouver'
  if (city === 'portland') return 'Portland'
  if (city === 'nyc') return 'New York'
  if (city === 'pullman') return 'Pullman, WA'
  if (city === 'moscow') return 'Moscow, ID'
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

export function isCityPicker(pathname: string): boolean {
  const path = (pathname.split('?')[0] || '/').replace(/\/$/, '') || '/'
  // The bare root opens on the city picker; each city's home lives under its prefix.
  return path === '/cities' || path === '/'
}

export function cityFromPath(pathname: string): CityId {
  const path = (pathname.split('?')[0] || '/').replace(/\/$/, '') || '/'
  for (const prefix of CITY_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return prefix.slice(1) as CityId
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
  if (CITY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return `${pathname}${query}`
  const prefix = `/${city}`
  if (pathname === '/' || pathname === '') return `${prefix}${query}`
  return `${prefix}${pathname.startsWith('/') ? pathname : `/${pathname}`}${query}`
}

export function barePath(pathname: string): string {
  for (const prefix of CITY_PREFIXES) {
    if (pathname === prefix) return '/'
    if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length)
  }
  return pathname
}
