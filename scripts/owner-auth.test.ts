// node --experimental-strip-types scripts/owner-auth.test.ts
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeHash } from './owner-password-hash.mjs'
import { OWNER_COOKIE, isOwnerRequest, parseHash, requireOwner, signSession, verifyPassword, verifySession } from '../functions/_lib/owner-auth.ts'
import { onRequestPost as login } from '../functions/api/owner/login.ts'
import { onRequestGet as session } from '../functions/api/owner/session.ts'
import { onRequestPost as logout } from '../functions/api/owner/logout.ts'

const PASSWORD = 'correct horse battery staple'
const env = { OWNER_PASSWORD_HASH: makeHash(PASSWORD), OWNER_SESSION_SECRET: 'x'.repeat(48) }
const ORIGIN = 'https://preview.gustos-guide.pages.dev'

assert.ok(parseHash(env.OWNER_PASSWORD_HASH))
assert.equal(parseHash('pbkdf2-sha256$1000000$aaaa$bbbb'), null)
assert.equal(await verifyPassword(PASSWORD, env.OWNER_PASSWORD_HASH), true)
assert.equal(await verifyPassword('Augusto', env.OWNER_PASSWORD_HASH), false)
assert.equal(await verifyPassword(PASSWORD, undefined), false)

const token = await signSession(env.OWNER_SESSION_SECRET)
assert.equal(await verifySession(env.OWNER_SESSION_SECRET, token), true)
assert.equal(await verifySession('y'.repeat(48), token), false, 'other secret')
assert.equal(await verifySession(env.OWNER_SESSION_SECRET, token.replace(/\.\d+\./, '.9999999999.')), false, 'edited expiry')
assert.equal(await verifySession(env.OWNER_SESSION_SECRET, token, Date.now() + 31 * 86400 * 1000), false, 'expired')

const post = (body: unknown, origin = ORIGIN) =>
  new Request(`${ORIGIN}/api/owner/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': String(Math.random()) }, body: JSON.stringify(body) })

// Typing his name is not a password.
let response = await login({ request: post({ password: 'Augusto' }), env })
assert.equal(response.status, 401)
assert.equal(response.headers.get('Set-Cookie'), null)

// Cross-site POST refused.
response = await login({ request: post({ password: PASSWORD }, 'https://evil.example'), env })
assert.equal(response.status, 403)

// Not configured: no login possible.
response = await login({ request: post({ password: PASSWORD }), env: {} })
assert.equal(response.status, 503)

response = await login({ request: post({ password: PASSWORD }), env })
assert.equal(response.status, 200)
const cookie = response.headers.get('Set-Cookie') ?? ''
assert.match(cookie, new RegExp(`^${OWNER_COOKIE}=v1\\.\\d+\\.[A-Za-z0-9_-]+; Path=/; Max-Age=\\d+; HttpOnly; Secure; SameSite=Strict$`))
const value = cookie.split(';')[0]

const get = (cookieHeader?: string) => new Request(`${ORIGIN}/api/owner/session`, { headers: cookieHeader ? { Cookie: cookieHeader } : {} })
assert.deepEqual(await (await session({ request: get(), env })).json(), { owner: false, configured: true })
assert.deepEqual(await (await session({ request: get(value), env })).json(), { owner: true, configured: true })
assert.deepEqual(await (await session({ request: get(`${OWNER_COOKIE}=v1.9999999999.forged`), env })).json(), { owner: false, configured: true })
assert.equal((await session({ request: get(value), env })).headers.get('Cache-Control'), 'no-store')
assert.equal(await isOwnerRequest(get(value), {}), false, 'no secrets, no owner')

// requireOwner gate for future owner-write Functions.
const write = (cookieHeader?: string, origin = ORIGIN) => new Request(`${ORIGIN}/api/owner/x`, { method: 'POST', headers: { Origin: origin, ...(cookieHeader ? { Cookie: cookieHeader } : {}) } })
assert.equal((await requireOwner(write(), env))?.status, 401)
assert.equal((await requireOwner(write(value, 'https://evil.example'), env))?.status, 403)
assert.equal(await requireOwner(write(value), env), null)

response = await logout({ request: new Request(`${ORIGIN}/api/owner/logout`, { method: 'POST', headers: { Origin: ORIGIN } }), env })
assert.match(response.headers.get('Set-Cookie') ?? '', /Max-Age=0; HttpOnly; Secure; SameSite=Strict/)

// The client never grants owner from a typed name.
const app = readFileSync(new URL('../src/state/AppState.tsx', import.meta.url), 'utf8')
assert.ok(!/ownerName\(/.test(app), 'name-based owner check is gone')
assert.match(app, /isOwner: false,\n    \}/)
const sheet = readFileSync(new URL('../src/components/SignInSheet.tsx', import.meta.url), 'utf8')
assert.ok(!/Sign in as Augusto/.test(sheet))
const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
assert.match(sw, /startsWith\('\/api\/'\)\) return/)

console.log('owner-auth: ok')
