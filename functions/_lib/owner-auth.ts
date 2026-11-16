/**
 * Owner authentication for Gusto's Guide (Cloudflare Pages Functions).
 *
 * Secrets, set on the Pages project, never in the repo or in a VITE_ variable:
 *   OWNER_PASSWORD_HASH  pbkdf2-sha256$<iterations>$<salt base64url>$<hash base64url>
 *                        Make it with: node scripts/owner-password-hash.mjs
 *   OWNER_SESSION_SECRET at least 32 random bytes (e.g. `openssl rand -base64 48`).
 *                        Rotating it signs every owner out.
 *
 * The browser gets an HttpOnly, Secure, SameSite=Strict cookie holding
 * "<version>.<expires>.<hmac>". Page JavaScript cannot read or forge it. Any
 * Function that changes owner data must call requireOwner() first.
 */

export type OwnerEnv = {
  OWNER_PASSWORD_HASH?: string
  OWNER_SESSION_SECRET?: string
}

export const OWNER_COOKIE = '__Host-gg_owner'
export const SESSION_SECONDS = 60 * 60 * 24 * 30
const COOKIE_VERSION = 'v1'
// Workers caps PBKDF2 at 100,000 iterations.
export const MAX_ITERATIONS = 100_000
const MIN_SECRET_LENGTH = 32

const enc = new TextEncoder()

export function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let text = ''
  for (const byte of view) text += String.fromCharCode(byte)
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function b64urlDecode(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4)
  try {
    const text = atob(padded)
    const out = new Uint8Array(text.length)
    for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

/** Constant-time compare for equal-purpose byte strings. */
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length
  const n = Math.max(a.length, b.length)
  for (let i = 0; i < n; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  return diff === 0
}

export function ownerConfigured(env: OwnerEnv): boolean {
  return Boolean(parseHash(env.OWNER_PASSWORD_HASH) && (env.OWNER_SESSION_SECRET ?? '').length >= MIN_SECRET_LENGTH)
}

type ParsedHash = { iterations: number; salt: Uint8Array; hash: Uint8Array }

export function parseHash(stored: string | undefined): ParsedHash | null {
  if (!stored) return null
  const parts = stored.trim().split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256') return null
  const iterations = Number(parts[1])
  if (!Number.isInteger(iterations) || iterations < 10_000 || iterations > MAX_ITERATIONS) return null
  const salt = b64urlDecode(parts[2])
  const hash = b64urlDecode(parts[3])
  if (!salt || salt.length < 16 || !hash || hash.length < 32) return null
  return { iterations, salt, hash }
}

export async function pbkdf2(password: string, salt: Uint8Array, iterations: number, length = 32): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, length * 8)
  return new Uint8Array(bits)
}

export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  const parsed = parseHash(stored)
  if (!parsed || typeof password !== 'string' || !password || password.length > 512) return false
  const derived = await pbkdf2(password, parsed.salt, parsed.iterations, parsed.hash.length)
  return sameBytes(derived, parsed.hash)
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)))
}

export async function signSession(secret: string, now = Date.now()): Promise<string> {
  const expires = Math.floor(now / 1000) + SESSION_SECONDS
  const body = `${COOKIE_VERSION}.${expires}`
  return `${body}.${b64urlEncode(await hmac(secret, body))}`
}

export async function verifySession(secret: string | undefined, token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!secret || secret.length < MIN_SECRET_LENGTH || !token) return false
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== COOKIE_VERSION) return false
  const expires = Number(parts[1])
  if (!Number.isInteger(expires) || expires * 1000 <= now) return false
  const given = b64urlDecode(parts[2])
  if (!given) return false
  const want = await hmac(secret, `${parts[0]}.${parts[1]}`)
  return sameBytes(given, want)
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('Cookie') ?? ''
  for (const part of header.split(';')) {
    const at = part.indexOf('=')
    if (at < 0) continue
    if (part.slice(0, at).trim() === name) return part.slice(at + 1).trim()
  }
  return undefined
}

export function sessionCookie(token: string): string {
  return `${OWNER_COOKIE}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`
}

export function clearCookie(): string {
  return `${OWNER_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`
}

export async function isOwnerRequest(request: Request, env: OwnerEnv): Promise<boolean> {
  if (!ownerConfigured(env)) return false
  return verifySession(env.OWNER_SESSION_SECRET, readCookie(request, OWNER_COOKIE))
}

/** Same-origin check for state-changing owner requests (SameSite=Strict is the second layer). */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin')
  if (!origin) return false
  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  })
}

/**
 * Gate for any owner-only Function. Returns a 401/403 Response to send back, or
 * null when the request carries a valid owner session.
 */
export async function requireOwner(request: Request, env: OwnerEnv): Promise<Response | null> {
  if (request.method !== 'GET' && request.method !== 'HEAD' && !sameOrigin(request)) return json({ error: 'forbidden' }, 403)
  if (!(await isOwnerRequest(request, env))) return json({ error: 'owner sign-in required' }, 401)
  return null
}
