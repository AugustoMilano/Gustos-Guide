import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const N = 4
export const LINE_THRESHOLD = 0.34
export const BLURB_THRESHOLD = 0.28
export const GRAM_LIMIT = 2

const TEMPLATES = /worth the walk|exactly the point|done properly|the night gets simpler|come hungry\.\s*leave|hot, salty, and exactly/i

// "A Capitol Hill sushi bar …" / "A French dining room …". Real lines that start
// with a lowercase word after "A" ("A cheap …") are not this mold.
const FORMULAIC = /^A [A-Z].+ (spot|room|counter|bar) /

// Augusto's sandwich notes, copied verbatim. They are the description, so the
// 8–16 word pull-quote rule and the four-word sentence floor do not apply.
const OWNER_COPY = new Set([
  "The Caribbean roast. Best sandwich in Seattle. Garlic sauce, pork, and that bread. Don't order anything else.",
  'Philly cheesesteak or pastrami are both hits here, and it might be the best cheesesteak in the city.',
  'East-coast deli on Ballard Ave. Get the Electric Wizard or Rajun Cajun.',
  'Great constantly changing menu, I went for the Hot Honey Piccante.',
  'Come in with friends or solo, best turkey sandwich around.',
  'Different from the traditional bánh mì, but that side of beef bone marrow broth makes it uniquely amazing and a must.',
  'Honestly, everything is good here, but my favorite is the TBR (turkey, bacon, ranch). Pro tip: get the spuds on the side.',
  'As the name states, go for any of their salami sandwiches and you’ll be coming back.',
])

// "Try tofu, smoky broth." / "Then tofu, tangy broth." A real "Try the pork shoulder." does not match.
export const TRY_FILLER = /\b(?:try|then)\s+[a-z][\w'-]*,\s+[a-z][\w'-]*\s+[a-z][\w'-]*/i

const STREET_SUFFIX = /\b\d{1,5}\s+(?:ave|avenue|st|street|way|pl|place|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court)\b/i

export function wordGrams(text, n = N) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const grams = []
  for (let i = 0; i <= words.length - n; i += 1) grams.push(words.slice(i, i + n).join(' '))
  return grams
}

export function wordCount(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function sharedRatio(a, b) {
  const left = new Set(wordGrams(a))
  const right = new Set(wordGrams(b))
  if (!left.size || !right.size) return 0
  let shared = 0
  for (const gram of left) if (right.has(gram)) shared += 1
  return shared / Math.min(left.size, right.size)
}

export function worstPair(texts, threshold) {
  const sets = texts.map((text) => ({ text, grams: new Set(wordGrams(text)) }))
  let worst = { ratio: 0, a: '', b: '' }
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      const left = sets[i].grams
      const right = sets[j].grams
      if (!left.size || !right.size) continue
      let shared = 0
      const smaller = left.size < right.size ? left : right
      const larger = smaller === left ? right : left
      for (const gram of smaller) if (larger.has(gram)) shared += 1
      const ratio = shared / smaller.size
      if (ratio > worst.ratio) worst = { ratio, a: sets[i].text, b: sets[j].text }
      if (ratio > threshold) return worst
    }
  }
  return worst
}

function tokens(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function repeatedTemplate(text) {
  const sentences = String(text)
    .split(/[.!?]+/)
    .map((part) => tokens(part))
    .filter((words) => words.length >= 4)
  for (let i = 0; i < sentences.length; i += 1) {
    for (let j = i + 1; j < sentences.length; j += 1) {
      const a = sentences[i]
      const b = sentences[j]
      if (a.length !== b.length) continue
      let differ = 0
      for (let k = 0; k < a.length; k += 1) if (a[k] !== b[k]) differ += 1
      if (differ <= 2) return { a: a.join(' '), b: b.join(' ') }
    }
  }
  return null
}

export function repeatedGrams(texts, n = N, limit = GRAM_LIMIT) {
  const counts = new Map()
  for (const text of texts) {
    if (!text) continue
    for (const gram of wordGrams(text, n)) counts.set(gram, (counts.get(gram) ?? 0) + 1)
  }
  return [...counts.entries()]
    .filter(([, count]) => count > limit)
    .map(([gram, count]) => ({ gram, count }))
    .sort((a, b) => b.count - a.count || a.gram.localeCompare(b.gram))
}

export function sentencesOf(text) {
  const masked = String(text).replace(/\b([A-Za-z])\./g, '$1\u0000')
  return masked
    .split(/[.!?]+/)
    .map((part) => part.replace(/\u0000/g, '.').trim())
    .filter(Boolean)
}

export function shortSentence(text) {
  for (const sentence of sentencesOf(text)) {
    const count = sentence.split(/\s+/).filter(Boolean).length
    if (count > 0 && count < 4) return sentence
  }
  return null
}

export function streetNumberHit(text, name = '') {
  let sample = String(text)
  const numericName = String(name || '').trim()
  if (/^\d{3,5}$/.test(numericName)) {
    const suffix = 'ave|avenue|st|street|way|pl|place|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court'
    sample = sample.replace(
      new RegExp(`\\b${numericName}\\b(?!\\s+\\d)(?!\\s+(?:\\d+(?:st|nd|rd|th)|${suffix})\\b)`, 'gi'),
      ' ',
    )
  }
  const suffixed = sample.match(STREET_SUFFIX)
  if (suffixed) return suffixed[0]
  const stripped = sample.replace(/\b(?:19|20)\d{2}\b/g, ' ')
  const long = stripped.match(/\b\d{3,5}\b/)
  return long ? long[0] : null
}

export function slashListHit(text) {
  return /\s*\/\s*/.test(String(text))
}

// "Umi 2230" from "Umi Sake House" at "2230 1st Ave" is a truncated name merged with the address.
export function truncatedNameHit(name, address, text) {
  const number = String(address || '').match(/\d{2,5}/)
  if (!number) return false
  const first = String(name || '')
    .split(/\s+/)
    .find((word) => word && !/^(the|a|an)$/i.test(word))
  if (!first) return false
  const escaped = first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\s+${number[0]}\\b`, 'i').test(String(text || ''))
}

function fail(label, detail) {
  throw new Error(`${label}\n${detail}`)
}

function fillerHit(text) {
  TRY_FILLER.lastIndex = 0
  return TRY_FILLER.test(text)
}

function asItem(value, index) {
  if (typeof value === 'string') return { text: value, placeId: `anon-${index}`, exempt: false, name: '' }
  return {
    text: String(value?.text ?? ''),
    placeId: value?.placeId ? String(value.placeId) : `anon-${index}`,
    exempt: Boolean(value?.exempt),
    allowEmpty: Boolean(value?.allowEmpty),
    name: value?.name ? String(value.name) : '',
  }
}

function uniqueTexts(items, label) {
  const byKey = new Map()
  for (const item of items) {
    const key = item.text.trim().toLowerCase()
    if (!key) {
      if (label === 'line' || item.allowEmpty) continue
      fail(`Empty ${label}`, item.placeId)
    }
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, { text: item.text.trim(), placeIds: new Set([item.placeId]), exempt: item.exempt, name: item.name })
      continue
    }
    if (!existing.placeIds.has(item.placeId)) {
      fail(`Duplicate ${label}`, `${item.text.slice(0, 180)}\n---\n${existing.text.slice(0, 180)}`)
    }
    existing.exempt = existing.exempt || item.exempt
  }
  return [...byKey.values()]
}

export function assertCopy({ lines, blurbs, prose = [] }) {
  const lineItems = uniqueTexts(lines.map(asItem), 'line')
  const blurbItems = uniqueTexts(blurbs.map(asItem), 'blurb')
  const proseItems = uniqueTexts(
    prose.map((value, index) => (typeof value === 'string' ? value : value)).map(asItem),
    'prose',
  )

  for (const item of lineItems) {
    const line = item.text
    if (!/^[A-Z0-9"“]/.test(line)) fail('Line does not start with a capital', line)
    if (TEMPLATES.test(line) || FORMULAIC.test(line)) fail('Template phrase', line)
    if (fillerHit(line)) fail('Try-filler line', line)
    if (!OWNER_COPY.has(line)) {
      const count = wordCount(line)
      if (count < 8 || count > 16) fail(`Pull quote must be 8–16 words (got ${count})`, line)
    }
  }
  for (const item of blurbItems) {
    const blurb = item.text
    if (TEMPLATES.test(blurb)) fail('Template phrase in blurb', blurb.slice(0, 180))
    if (!/^[A-Z0-9"“]/.test(blurb)) fail('Blurb does not start with a capital', blurb.slice(0, 180))
    if (fillerHit(blurb)) fail('Try-filler blurb', blurb.slice(0, 180))
    const loop = repeatedTemplate(blurb)
    if (loop) fail('Repeated sentence template in blurb', `${loop.a}\n---\n${loop.b}`)
    if (item.exempt || OWNER_COPY.has(blurb)) continue
    const count = sentencesOf(blurb).length
    if (count < 1 || count > 4) fail(`Blurb must be 1–4 sentences (got ${count})`, blurb.slice(0, 180))
    const brief = shortSentence(blurb)
    if (brief) fail('Blurb sentence under 4 words', brief)
    const street = streetNumberHit(blurb, item.name)
    if (street) fail('Street number in blurb', `${street}\n${blurb.slice(0, 180)}`)
    if (slashListHit(blurb)) fail('Slash-separated list in blurb', blurb.slice(0, 180))
  }
  for (const item of proseItems) {
    if (fillerHit(item.text)) fail('Try-filler prose', item.text.slice(0, 180))
  }

  const lineTexts = lineItems.map((item) => item.text)
  const blurbTexts = blurbItems.map((item) => item.text)
  const proseTexts = proseItems.map((item) => item.text)
  const seenOwner = new Set()
  const gramSource = [...lineTexts, ...blurbTexts, ...proseTexts].filter((text) => {
    if (!OWNER_COPY.has(text)) return true
    if (seenOwner.has(text)) return false
    seenOwner.add(text)
    return true
  })
  const lineWorst = worstPair(lineTexts, LINE_THRESHOLD)
  if (lineWorst.ratio > LINE_THRESHOLD) {
    fail(`Near-duplicate lines (${lineWorst.ratio.toFixed(2)} > ${LINE_THRESHOLD})`, `${lineWorst.a}\n---\n${lineWorst.b}`)
  }
  const blurbWorst = worstPair(blurbTexts, BLURB_THRESHOLD)
  if (blurbWorst.ratio > BLURB_THRESHOLD) {
    fail(`Near-duplicate blurbs (${blurbWorst.ratio.toFixed(2)} > ${BLURB_THRESHOLD})`, `${blurbWorst.a.slice(0, 240)}\n---\n${blurbWorst.b.slice(0, 240)}`)
  }
  const grams = repeatedGrams(gramSource, N, GRAM_LIMIT)
  if (grams.length) {
    fail(
      `Repeated ${N}-word phrase (more than ${GRAM_LIMIT} times)`,
      grams
        .slice(0, 12)
        .map((hit) => `${hit.count}× ${hit.gram}`)
        .join('\n'),
    )
  }
  return {
    lineWorst: lineWorst.ratio,
    blurbWorst: blurbWorst.ratio,
    lines: lineTexts.length,
    blurbs: blurbTexts.length,
    prose: proseTexts.length,
    gramLimit: GRAM_LIMIT,
  }
}

function fromFiles() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const places = JSON.parse(readFileSync(join(root, 'src/content/places.json'), 'utf8'))
  const guides = JSON.parse(readFileSync(join(root, 'src/content/guides.json'), 'utf8'))
  const eastside = JSON.parse(readFileSync(join(root, 'src/content/eastside.json'), 'utf8'))
  const la = JSON.parse(readFileSync(join(root, 'src/content/la.json'), 'utf8'))
  const sf = JSON.parse(readFileSync(join(root, 'src/content/sf.json'), 'utf8'))
  const dive = new Set(
    guides.find((guide) => guide.slug === 'fun-dive-bars')?.entries.map((entry) => entry.blurb) ?? [],
  )
  const lines = [
    ...Object.values(places).map((place) => ({ text: place.oneLiner, placeId: place.id })),
    ...guides.flatMap((guide) => guide.entries.map((entry) => ({ text: entry.pullQuote, placeId: entry.placeId }))),
  ]
  const blurbs = [
    ...Object.values(places).map((place) => ({ text: place.blurb, placeId: place.id, name: place.name, exempt: dive.has(place.blurb) })),
    ...guides.flatMap((guide) =>
      guide.entries.map((entry) => ({
        text: entry.blurb,
        placeId: entry.placeId,
        name: places[entry.placeId]?.name,
        exempt: guide.slug === 'fun-dive-bars' || dive.has(entry.blurb),
      })),
    ),
  ]
  const regional = [...eastside.places, ...la.places, ...sf.places]
  const regionalTexts = [
    ...regional.map((place) => place.oneLiner),
    ...eastside.guides.flatMap((guide) => guide.entries.map((entry) => entry.pullQuote)),
    ...la.guides.flatMap((guide) => guide.entries.map((entry) => entry.pullQuote)),
    ...sf.guides.flatMap((guide) => guide.entries.map((entry) => entry.pullQuote)),
  ]
  const regionalBlurbs = [
    ...regional.map((place) => place.blurb),
    ...eastside.guides.flatMap((guide) => guide.entries.map((entry) => entry.blurb)),
    ...la.guides.flatMap((guide) => guide.entries.map((entry) => entry.blurb)),
    ...sf.guides.flatMap((guide) => guide.entries.map((entry) => entry.blurb)),
  ]
  for (const text of regionalTexts) {
    const line = String(text || '').trim()
    if (!line) continue
    if (TEMPLATES.test(line) || FORMULAIC.test(line)) fail('Template phrase', line.slice(0, 180))
    if (fillerHit(line)) fail('Try-filler line', line.slice(0, 180))
  }
  for (const text of regionalBlurbs) {
    const line = String(text || '').trim()
    if (!line) continue
    if (TEMPLATES.test(line)) fail('Template phrase in blurb', line.slice(0, 180))
    if (fillerHit(line)) fail('Try-filler blurb', line.slice(0, 180))
  }
  const result = assertCopy({ lines, blurbs })
  console.log(JSON.stringify({ ...result, regional: regionalTexts.filter((text) => String(text || '').trim()).length }))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) fromFiles()
