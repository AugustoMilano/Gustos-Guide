export type CityId = 'seattle' | 'eastside' | 'la'
export type RegionId = 'seattle' | 'la'

export type City = {
  id: CityId
  name: string
  ready: boolean
}

/** Areas inside the Seattle region. The coral pill toggles these two. */
export const CITIES: City[] = [
  { id: 'seattle', name: 'Seattle', ready: true },
  { id: 'eastside', name: 'Eastside', ready: true },
]

export type Region = {
  id: RegionId
  name: string
  detail: string
  areas: CityId[]
}

export const REGIONS: Region[] = [
  { id: 'seattle', name: 'Seattle', detail: 'Seattle + Eastside', areas: ['seattle', 'eastside'] },
  { id: 'la', name: 'Los Angeles', detail: 'Los Angeles', areas: ['la'] },
]

export const ACTIVE_CITY: CityId = 'seattle'

const MEMORY_KEY = 'gusto.region.v1'

export function regionOf(city: CityId): RegionId {
  return city === 'la' ? 'la' : 'seattle'
}

/** Name of the region, even when the open area is the Eastside. */
export function regionName(city: CityId): string {
  return city === 'la' ? 'Los Angeles' : 'Seattle'
}

export function areaTitle(city: CityId): string {
  if (city === 'eastside') return 'The Eastside'
  if (city === 'la') return 'Los Angeles'
  return 'Seattle'
}

/** Phrase that can follow "Search" or "in". */
export function areaPhrase(city: CityId): string {
  if (city === 'eastside') return 'the Eastside'
  if (city === 'la') return 'Los Angeles'
  return 'Seattle'
}

export function readRegionMemory(): { region: RegionId; area: CityId } {
  if (typeof localStorage === 'undefined') return { region: 'seattle', area: 'seattle' }
  try {
    const raw = JSON.parse(localStorage.getItem(MEMORY_KEY) || '') as { area?: string }
    if (raw.area === 'la' || raw.area === 'eastside' || raw.area === 'seattle') {
      return { region: raw.area === 'la' ? 'la' : 'seattle', area: raw.area }
    }
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
const PREFIXES = ['/seattle', '/eastside', '/la'] as const

export function isCityPicker(pathname: string): boolean {
  const path = (pathname.split('?')[0] || '/').replace(/\/$/, '') || '/'
  return path === '/cities'
}

export function cityFromPath(pathname: string): CityId {
  const path = (pathname.split('?')[0] || '/').replace(/\/$/, '') || '/'
  if (path === '/eastside' || path.startsWith('/eastside/')) return 'eastside'
  if (path === '/la' || path.startsWith('/la/')) return 'la'
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
  const prefix = city === 'la' ? '/la' : city === 'eastside' ? '/eastside' : '/seattle'
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
