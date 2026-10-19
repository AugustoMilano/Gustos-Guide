export type CityId = 'seattle'

export type City = {
  id: CityId
  name: string
  ready: boolean
}

/** A second city flips `ready` on. The switcher stays hidden until then. */
export const CITIES: City[] = [{ id: 'seattle', name: 'Seattle', ready: true }]

export const ACTIVE_CITY: CityId = 'seattle'

const PLAIN = new Set(['/terms', '/privacy'])

export function cityPath(path: string): string {
  const hashless = path.startsWith('#') ? path.slice(1) : path
  const [pathname = '/', search = ''] = hashless.split('?')
  const query = search ? `?${search}` : ''
  if (pathname.startsWith('/seattle') || pathname.startsWith('/auth') || PLAIN.has(pathname)) return `${pathname}${query}`
  if (pathname === '/' || pathname === '') return `/seattle${query}`
  return `/seattle${pathname.startsWith('/') ? pathname : `/${pathname}`}${query}`
}

export function barePath(pathname: string): string {
  if (pathname === '/seattle') return '/'
  if (pathname.startsWith('/seattle/')) return pathname.slice('/seattle'.length)
  return pathname
}
