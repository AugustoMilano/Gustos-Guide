import { json, ownerConfigured, sameOrigin, sessionCookie, signSession, verifyPassword, type OwnerEnv } from '../../_lib/owner-auth.ts'

// Best-effort brute-force brake per isolate. PBKDF2 (100k rounds) already makes
// each guess slow; a Cloudflare WAF rate-limit rule on /api/owner/login is the
// durable layer (see DEPLOY.md).
const WINDOW_MS = 15 * 60 * 1000
const IP_LIMIT = 8
const GLOBAL_LIMIT = 40
const buckets = new Map<string, { n: number; reset: number }>()
let globalBucket = { n: 0, reset: 0 }

function spend(key: string, now: number): boolean {
  if (globalBucket.reset <= now) globalBucket = { n: 0, reset: now + WINDOW_MS }
  if (globalBucket.n >= GLOBAL_LIMIT) return false
  const bucket = buckets.get(key)
  if (!bucket || bucket.reset <= now) {
    if (buckets.size > 5000) buckets.clear()
    buckets.set(key, { n: 1, reset: now + WINDOW_MS })
  } else {
    if (bucket.n >= IP_LIMIT) return false
    bucket.n += 1
  }
  globalBucket.n += 1
  return true
}

/** POST /api/owner/login { password } -> sets the HttpOnly owner cookie. */
export async function onRequestPost({ request, env }: { request: Request; env: OwnerEnv }): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403)
  if (!ownerConfigured(env)) return json({ error: 'Owner sign-in is not set up on this deploy.' }, 503)
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  if (!spend(ip, Date.now())) return json({ error: 'Too many tries. Wait 15 minutes.' }, 429, { 'Retry-After': '900' })
  let password = ''
  try {
    const body = (await request.json()) as { password?: unknown }
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return json({ error: 'bad request' }, 400)
  }
  if (!(await verifyPassword(password, env.OWNER_PASSWORD_HASH))) return json({ error: 'Wrong password.' }, 401)
  const token = await signSession(String(env.OWNER_SESSION_SECRET))
  return json({ owner: true }, 200, { 'Set-Cookie': sessionCookie(token) })
}
