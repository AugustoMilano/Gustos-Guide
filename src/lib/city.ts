export type CityId = 'seattle' | 'eastside'

export type City = {
  id: CityId
  name: string
  ready: boolean
}

export const CITIES: City[] = [
  { id: 'seattle', name: 'Seattle', ready: true },
  { id: 'eastside', name: 'Eastside', ready: true },
]

export const ACTIVE_CITY: CityId = 'seattle'

export function areaTitle(city: CityId): string {
  return city === 'eastside' ? 'The Eastside' : 'Seattle'
}

const PLAIN = new Set(['/terms', '/privacy'])
const PREFIXES = ['/seattle', '/eastside'] as const

export function cityFromPath(pathname: string): CityId {
  const path = (pathname.split('?')[0] || '/').replace(/\/$/, '') || '/'
  if (path === '/eastside' || path.startsWith('/eastside/')) return 'eastside'
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
  const prefix = city === 'eastside' ? '/eastside' : '/seattle'
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
