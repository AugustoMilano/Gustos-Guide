export const SITE_ORIGIN = 'https://gustosguide.com'

export function originCanonical(path = '/'): string {
  const bare = path.startsWith('/') ? path : `/${path}`
  return `${SITE_ORIGIN}${bare.endsWith('/') ? bare : `${bare}/`}`
}

export function canonicalUrl(hash?: string): string {
  const raw = hash ?? (typeof window === 'undefined' ? '#/' : window.location.hash || '#/')
  const fragment = raw.startsWith('#') ? raw : `#${raw.startsWith('/') ? raw : `/${raw}`}`
  return `${SITE_ORIGIN}/${fragment}`
}

export function directLegalSlug(): 'terms' | 'privacy' | null {
  if (typeof window === 'undefined') return null
  const path = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '')
  if (path === '/terms' || path === '/privacy') return path.slice(1) as 'terms' | 'privacy'
  return null
}

