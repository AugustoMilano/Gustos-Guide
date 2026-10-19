export const SITE_ORIGIN = 'https://gustosguide.com'

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

export function authReturnUrl(): string {
  const url = new URL(window.location.href)
  for (const key of ['code', 'sb_flow_id', 'error', 'error_code', 'error_description']) url.searchParams.delete(key)
  return url.toString()
}
