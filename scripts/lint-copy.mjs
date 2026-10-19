import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const N = 4
export const LINE_THRESHOLD = 0.34
export const BLURB_THRESHOLD = 0.28
export const GRAM_LIMIT = 2

const TEMPLATES = /worth the walk|exactly the point|done properly|the night gets simpler|come hungry\.\s*leave|hot, salty, and exactly/i

// "Try tofu, smoky broth." / "Then tofu, tangy broth." A real "Try the pork shoulder." does not match.
export const TRY_FILLER = /\b(?:try|then)\s+[a-z][\w'-]*,\s+[a-z][\w'-]*\s+[a-z][\w'-]*/i

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

function fail(label, detail) {
  throw new Error(`${label}\n${detail}`)
}

function fillerHit(text) {
  TRY_FILLER.lastIndex = 0
  return TRY_FILLER.test(text)
}

export function assertCopy({ lines, blurbs, prose = [] }) {
  const seen = new Map()
  for (const line of lines) {
    const key = line.trim().toLowerCase()
    if (!key) fail('Empty line', line)
    if (!/^[A-Z0-9"“]/.test(line.trim())) fail('Line does not start with a capital', line)
    if (TEMPLATES.test(line)) fail('Template phrase', line)
    if (fillerHit(line)) fail('Try-filler line', line)
    if (seen.has(key)) fail('Duplicate line', `${line}\n---\n${seen.get(key)}`)
    seen.set(key, line)
  }
  for (const blurb of blurbs) {
    if (TEMPLATES.test(blurb)) fail('Template phrase in blurb', blurb.slice(0, 180))
    if (!/^[A-Z0-9"“]/.test(blurb.trim())) fail('Blurb does not start with a capital', blurb.slice(0, 180))
    if (fillerHit(blurb)) fail('Try-filler blurb', blurb.slice(0, 180))
    const loop = repeatedTemplate(blurb)
    if (loop) fail('Repeated sentence template in blurb', `${loop.a}\n---\n${loop.b}`)
  }
  for (const extra of prose) {
    if (fillerHit(extra)) fail('Try-filler prose', extra.slice(0, 180))
  }
  const lineWorst = worstPair(lines, LINE_THRESHOLD)
  if (lineWorst.ratio > LINE_THRESHOLD) {
    fail(`Near-duplicate lines (${lineWorst.ratio.toFixed(2)} > ${LINE_THRESHOLD})`, `${lineWorst.a}\n---\n${lineWorst.b}`)
  }
  const blurbWorst = worstPair(blurbs, BLURB_THRESHOLD)
  if (blurbWorst.ratio > BLURB_THRESHOLD) {
    fail(`Near-duplicate blurbs (${blurbWorst.ratio.toFixed(2)} > ${BLURB_THRESHOLD})`, `${blurbWorst.a.slice(0, 240)}\n---\n${blurbWorst.b.slice(0, 240)}`)
  }
  const grams = repeatedGrams([...lines, ...blurbs, ...prose], N, GRAM_LIMIT)
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
    lines: lines.length,
    blurbs: blurbs.length,
    prose: prose.length,
    gramLimit: GRAM_LIMIT,
  }
}

function fromFiles() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const places = JSON.parse(readFileSync(join(root, 'src/content/places.json'), 'utf8'))
  const guides = JSON.parse(readFileSync(join(root, 'src/content/guides.json'), 'utf8'))
  const lines = [
    ...Object.values(places).map((place) => place.oneLiner),
    ...guides.flatMap((guide) => guide.entries.map((entry) => entry.pullQuote)),
  ]
  const blurbs = guides.flatMap((guide) => guide.entries.map((entry) => entry.blurb))
  const prose = Object.values(places).map((place) => place.review)
  const result = assertCopy({ lines, blurbs, prose })
  console.log(JSON.stringify(result))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) fromFiles()
