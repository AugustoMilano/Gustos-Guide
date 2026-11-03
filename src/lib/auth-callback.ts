const RETURN_KEY = 'gusto.auth.return'
const ERROR_KEY = 'gusto.auth.error'
const PENDING_KEY = 'gusto.auth.pending'

const AUTH_KEYS = [
  'code',
  'sb_flow_id',
  'error',
  'error_code',
  'error_description',
  'access_token',
  'refresh_token',
  'expires_in',
  'expires_at',
  'token_type',
  'provider_token',
  'provider_refresh_token',
  'type',
] as const

let holdRouter = false

export function authCallbackUrl(): string {
  return `${window.location.origin}/auth/callback`
}

/** Saved in this tab and in localStorage, so a magic link opened in a new tab still comes back here. */
export function rememberAuthReturn(): void {
  const hash = window.location.hash
  const route = safeRoute(hash.startsWith('#/') ? hash : '#/')
  write(RETURN_KEY, route)
  try {
    localStorage.setItem(RETURN_KEY, JSON.stringify({ route, at: Date.now() }))
  } catch {
    /* private mode */
  }
}

/** The city picker is a front door, not a place to come back to. */
function isPicker(hash: string): boolean {
  const path = hash.replace(/^#/, '').split('?')[0].replace(/\/$/, '') || '/'
  return path === '/' || path === '/cities'
}

/** Last city home (from the picker's memory), else Seattle. */
function cityHome(): string {
  try {
    const raw = JSON.parse(localStorage.getItem('gusto.region.v1') || '{}') as { area?: string }
    if (raw.area && /^[a-z]+$/.test(raw.area)) return `#/${raw.area}`
  } catch {
    /* empty */
  }
  return '#/seattle'
}

export function authRouterHeld(): boolean {
  return holdRouter
}

export function peekAuthError(): string | null {
  return read(ERROR_KEY)
}

export function clearStashedAuthError(): void {
  write(ERROR_KEY, null)
}

/**
 * Run before the hash router mounts.
 * `#error=` and `#access_token=` are not pages. HashRouter would show the
 * 404 ("That page is not on the menu") and the session exchange would never
 * finish. Codes and tokens are moved into the query string, which supabase-js
 * reads, and the hash is put back to the page the person left.
 */
export function settleAuthUrl(): void {
  holdRouter = false
  const url = new URL(window.location.href)
  const hashRaw = url.hash.startsWith('#') ? url.hash.slice(1) : ''
  const hashIsRoute = hashRaw === '' || hashRaw.startsWith('/') || hashRaw.startsWith('!')
  const hashParams = !hashIsRoute && hashRaw.includes('=') ? new URLSearchParams(hashRaw) : null

  if (hashParams) {
    for (const key of AUTH_KEYS) {
      const value = hashParams.get(key)
      if (value && !url.searchParams.has(key)) url.searchParams.set(key, value)
    }
  }

  const hasCode = url.searchParams.has('code')
  const hasToken = url.searchParams.has('access_token') || url.searchParams.has('refresh_token')
  const error = authErrorText(url.searchParams)

  if (!hasCode && !hasToken && !error) return

  if (error && !hasCode && !hasToken) {
    write(ERROR_KEY, error)
    for (const key of AUTH_KEYS) url.searchParams.delete(key)
    url.pathname = '/'
    url.hash = destination(url)
    replace(url)
    write(RETURN_KEY, null)
    return
  }

  if (error && !hasCode) write(ERROR_KEY, error)
  write(PENDING_KEY, '1')
  holdRouter = true
  url.pathname = rootPath(url.pathname)
  url.hash = destination(url)
  replace(url)
}

/** If a later hash change is an auth fragment, rewrite it before the router treats it as a page. */
export function watchAuthHash(): void {
  window.addEventListener('hashchange', () => {
    const raw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    if (!raw || raw.startsWith('/') || raw.startsWith('!')) return
    const previous = peekAuthError()
    settleAuthUrl()
    if (authRouterHeld()) releaseAuthCallback()
    const next = peekAuthError()
    if (next && next !== previous) window.dispatchEvent(new CustomEvent('gusto-auth-error', { detail: next }))
  })
}

/** After detectSessionInUrl / exchangeCodeForSession, drop the auth params and open the saved page. */
export function releaseAuthCallback(): void {
  holdRouter = false
  const url = new URL(window.location.href)
  const hashRaw = url.hash.startsWith('#') ? url.hash.slice(1) : ''
  const hashIsRoute = hashRaw.startsWith('/') || hashRaw.startsWith('!')
  if (!hashIsRoute || isPicker(url.hash)) url.hash = readReturn()
  for (const key of AUTH_KEYS) url.searchParams.delete(key)
  url.pathname = rootPath(url.pathname)
  replace(url)
  write(RETURN_KEY, null)
  try {
    localStorage.removeItem(RETURN_KEY)
  } catch {
    /* private mode */
  }
  write(PENDING_KEY, null)
}

export function takeAuthPending(): boolean {
  const pending = read(PENDING_KEY) === '1'
  write(PENDING_KEY, null)
  return pending
}

function authErrorText(params: URLSearchParams): string | null {
  const description = params.get('error_description')
  const code = params.get('error')
  if (description) return description.replace(/\+/g, ' ').trim()
  if (code) return code.replace(/\+/g, ' ').trim()
  return null
}

function readReturn(): string {
  let saved = read(RETURN_KEY)
  if (!saved) {
    try {
      const stored = JSON.parse(localStorage.getItem(RETURN_KEY) || 'null') as { route?: string; at?: number } | null
      if (stored?.route && stored.at && Date.now() - stored.at < 60 * 60 * 1000) saved = stored.route
    } catch {
      /* empty */
    }
  }
  const route = safeRoute(saved || '#/')
  return isPicker(route) ? cityHome() : route
}

function destination(url: URL): string {
  const raw = url.hash.startsWith('#') ? url.hash.slice(1) : ''
  if ((raw.startsWith('/') || raw.startsWith('!')) && !isPicker(url.hash)) return safeRoute(url.hash)
  return readReturn()
}

function safeRoute(hash: string): string {
  if (!hash.startsWith('#/')) return '#/'
  if (hash.includes('://') || hash.includes('\\') || hash.length > 300) return '#/'
  return hash
}

function rootPath(pathname: string): string {
  if (pathname === '/auth/callback' || pathname.startsWith('/auth/callback/')) return '/'
  return pathname || '/'
}

function replace(url: URL): void {
  const next = `${url.pathname}${url.search}${url.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next !== current) window.history.replaceState(window.history.state, '', next)
}

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value == null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch {
    /* private mode */
  }
}
