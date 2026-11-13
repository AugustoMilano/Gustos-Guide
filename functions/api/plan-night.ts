/**
 * Reads a Plan my night sentence into stop constraints.
 * Ranking stays in the browser, against the guide catalog.
 * Bind Workers AI as `AI` on the Pages project (wrangler.jsonc). Without it, the
 * page keeps the keyword planner.
 *
 * Model: @cf/meta/llama-3.1-8b-instruct-fp8-fast
 * About $0.045 / million input tokens and $0.384 / million output tokens.
 * One call, capped at 380 output tokens. Roughly a few hundredths of a cent.
 */

type AiBinding = {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>
}

type Env = {
  AI?: AiBinding
}

const MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8-fast'
const WINDOW_MS = 10 * 60 * 1000
const IP_LIMIT = 20
const GLOBAL_LIMIT = 60

const buckets = new Map<string, { n: number; reset: number }>()
let globalBucket = { n: 0, reset: 0 }

const SYSTEM = `Convert a dining request into JSON only. Do not name restaurants or invent places.
{"mode":"list"|"itinerary","vibe":["date"|"cozy"|"fancy"|"view"|"family"],"priceMax":1|2|3|4|null,"cheap":false,"openNow":false,"neighborhood":null,"stops":[{"role":"drinks"|"meal"|"dessert"|"coffee","label":"Drinks","kinds":["cocktail"|"wine"|"beer"|"ice-cream"|"dessert"|"bakery"|"donut"|"coffee"],"cuisines":[]}]}
itinerary means two or more stops in the order they should happen.
One stop per requested step. Do not add a second meal, dinner, or restaurant stop when a meal is already listed.
The phrases "the restaurant", "near the restaurant", and "the restaurant be near" refer to the meal already in the plan, not a new stop.
priceMax counts dollar signs. cheap is true only for cheap, budget, or inexpensive.
openNow is true only if they ask what is open now.
neighborhood is a neighborhood they named, or null.
kinds and cuisines must be words they used.`

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function allow(key: string, limit: number): boolean {
  const now = Date.now()
  const row = buckets.get(key)
  if (!row || now > row.reset) {
    if (buckets.size > 500) buckets.clear()
    buckets.set(key, { n: 1, reset: now + WINDOW_MS })
    return true
  }
  if (row.n >= limit) return false
  row.n += 1
  return true
}

function allowGlobal(): boolean {
  const now = Date.now()
  if (now > globalBucket.reset) {
    globalBucket = { n: 1, reset: now + WINDOW_MS }
    return true
  }
  if (globalBucket.n >= GLOBAL_LIMIT) return false
  globalBucket.n += 1
  return true
}

function textOf(result: unknown): string {
  if (!result || typeof result !== 'object') return ''
  const row = result as Record<string, unknown>
  if (typeof row.response === 'string') return row.response
  if (row.response && typeof row.response === 'object') return JSON.stringify(row.response)
  return ''
}

function parseModel(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as unknown
  } catch {
    return null
  }
}

const ROLES = new Set(['drinks', 'meal', 'dessert', 'coffee'])

/** One stop per requested step. A later meal or other duplicate role is dropped. */
export function sanitizePlanIntent(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const row = raw as Record<string, unknown>
  if (!Array.isArray(row.stops)) return raw
  const seen = new Set<string>()
  const stops: unknown[] = []
  for (const item of row.stops) {
    if (!item || typeof item !== 'object') continue
    const role = (item as Record<string, unknown>).role
    if (typeof role !== 'string' || !ROLES.has(role) || seen.has(role)) continue
    seen.add(role)
    stops.push(item)
  }
  if (!stops.length) return raw
  return {
    ...row,
    stops,
    mode: stops.length >= 2 ? 'itinerary' : (row.mode === 'itinerary' || row.mode === 'list' ? row.mode : 'list'),
  }
}

async function readSentence(ai: AiBinding, query: string): Promise<unknown> {
  const messages = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: query },
  ]
  try {
    const result = await ai.run(MODEL, {
      messages,
      max_tokens: 380,
      temperature: 0,
      response_format: { type: 'json_object' },
    })
    const parsed = parseModel(textOf(result))
    if (parsed) return parsed
  } catch (error) {
    console.log(JSON.stringify({ level: 'warn', event: 'plan-night-schema', message: error instanceof Error ? error.message : 'schema' }))
  }
  const result = await ai.run(MODEL, { messages, max_tokens: 380, temperature: 0 })
  return parseModel(textOf(result))
}

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const started = Date.now()
  if (context.request.method !== 'POST') return json({ ok: false, error: 'Use POST.' }, 405)
  const ip = context.request.headers.get('cf-connecting-ip') || 'local'
  if (!allow(ip, IP_LIMIT) || !allowGlobal()) {
    console.log(JSON.stringify({ level: 'info', event: 'plan-night', source: 'limited', ms: Date.now() - started }))
    return json({ ok: false, error: 'Too many plans. Try again in a few minutes.' }, 429)
  }
  let raw = ''
  try {
    raw = await context.request.text()
  } catch {
    return json({ ok: false, error: 'Could not read that.' }, 400)
  }
  if (raw.length > 2000) return json({ ok: false, error: 'That request is too long.' }, 413)
  let body: { query?: unknown; city?: unknown }
  try {
    body = JSON.parse(raw) as { query?: unknown; city?: unknown }
  } catch {
    return json({ ok: false, error: 'Send JSON.' }, 400)
  }
  const query = typeof body.query === 'string' ? body.query.trim().slice(0, 400) : ''
  const city = typeof body.city === 'string' ? body.city.slice(0, 20) : ''
  if (query.length < 2) return json({ ok: false, error: 'Say a little more.' }, 400)
  if (!context.env.AI) {
    console.log(JSON.stringify({ level: 'info', event: 'plan-night', source: 'fallback', city, ms: Date.now() - started }))
    return json({ ok: true, source: 'fallback' })
  }
  try {
    const intent = sanitizePlanIntent(await readSentence(context.env.AI, query))
    if (!intent || typeof intent !== 'object') {
      console.log(JSON.stringify({ level: 'info', event: 'plan-night', source: 'fallback', city, ms: Date.now() - started }))
      return json({ ok: true, source: 'fallback' })
    }
    console.log(JSON.stringify({ level: 'info', event: 'plan-night', source: 'workers-ai', city, ms: Date.now() - started }))
    return json({ ok: true, source: 'workers-ai', intent })
  } catch (error) {
    console.log(JSON.stringify({
      level: 'error',
      event: 'plan-night',
      source: 'fallback',
      city,
      ms: Date.now() - started,
      message: error instanceof Error ? error.message : 'ai',
    }))
    return json({ ok: true, source: 'fallback' })
  }
}
