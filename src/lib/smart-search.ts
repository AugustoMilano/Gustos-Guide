import { areaName, cityPath, type CityId } from './city.ts'
import type { GuideGroup, GuideSummary, SlimPlace } from '../types.ts'

export type SmartHit = {
  kind: 'guide' | 'place'
  id: string
  title: string
  detail: string
  why: string
  href: string
  score: number
  group?: GuideGroup
}

export type SmartResult = {
  scope: CityId
  scopeLabel: string
  switched: boolean
  guides: SmartHit[]
  places: SmartHit[]
  suggestions: SmartHit[]
}

type Intent = {
  id: string
  why: string
  phrases: string[]
  guides: string[]
}

const INTENTS: Intent[] = [
  { id: 'date', why: 'Date night', phrases: ['date', 'date night', 'romantic', 'romance', 'anniversary'], guides: ['date-night', 'eastside-date-night', 'la-date-night', 'sf-date-night'] },
  { id: 'cheap', why: 'Cheap eats', phrases: ['cheap', 'budget', 'affordable', 'inexpensive', 'cheap eats'], guides: ['cheap-eats'] },
  { id: 'view', why: 'View or waterfront', phrases: ['view', 'views', 'waterfront', 'water', 'by the water', 'rooftop', 'rooftops', 'skyline'], guides: ['rooftops', 'restaurants-with-a-view', 'kirkland-waterfront'] },
  { id: 'brunch', why: 'Brunch', phrases: ['brunch', 'breakfast', 'weekend breakfast'], guides: ['brunch', 'breakfast-before-9', 'eastside-brunch'] },
  { id: 'drinks', why: 'Drinks', phrases: ['drinks', 'drink', 'cocktail', 'cocktails', 'bar', 'bars', 'happy hour', 'beer', 'wine'], guides: ['cocktail-bars', 'wine-bars', 'beer', 'the-bar-list', 'fun-dive-bars', 'happy-hour', 'eastside-breweries', 'rooftops'] },
  { id: 'parents', why: 'Bring the parents', phrases: ['parents', 'parent', 'mom', 'dad'], guides: ['bring-the-parents'] },
  { id: 'late', why: 'Late night', phrases: ['late', 'late night', 'after hours'], guides: ['late-night'] },
  { id: 'pizza', why: 'Pizza', phrases: ['pizza', 'pizzeria', 'slice'], guides: ['best-pizza', 'la-italian'] },
  { id: 'coffee', why: 'Coffee', phrases: ['coffee', 'espresso', 'cafe', 'café'], guides: ['best-coffee', 'eastside-coffee', 'la-coffee-bakeries'] },
  { id: 'seafood', why: 'Seafood', phrases: ['seafood', 'oyster', 'oysters', 'fish'], guides: ['seafood', 'sf-seafood', 'sd-seafood'] },
  { id: 'sushi', why: 'Sushi', phrases: ['sushi', 'omakase'], guides: ['best-sushi', 'la-sushi', 'sf-japanese', 'sd-japanese'] },
  { id: 'noodles', why: 'Noodles', phrases: ['ramen', 'pho', 'noodles', 'noodle'], guides: ['noodles'] },
  { id: 'tacos', why: 'Tacos', phrases: ['taco', 'tacos', 'mexican'], guides: ['tacos', 'la-mexican', 'sf-mexican', 'sd-mexican'] },
  { id: 'burger', why: 'Burgers', phrases: ['burger', 'burgers'], guides: ['burgers'] },
  { id: 'bakery', why: 'Bakery', phrases: ['bakery', 'pastry', 'pastries', 'dessert', 'ice cream'], guides: ['best-bakeries', 'ice-cream', 'donuts-bagels', 'la-coffee-bakeries', 'sf-bakery'] },
  { id: 'group', why: 'Big group', phrases: ['big group', 'group dinner', 'party'], guides: ['big-group'] },
  { id: 'walkin', why: 'Walk-in', phrases: ['walk in', 'walk-in', 'no reservation'], guides: ['walk-in'] },
  { id: 'splurge', why: 'Special occasion', phrases: ['splurge', 'special occasion', 'fancy', 'celebration'], guides: ['splurge'] },
  { id: 'italian', why: 'Italian', phrases: ['italian', 'pasta'], guides: ['italian', 'la-italian', 'sf-italian', 'sd-italian'] },
  { id: 'steak', why: 'Steak', phrases: ['steak', 'steakhouse'], guides: ['steakhouses', 'sf-steakhouse'] },
]

const AREA_WORDS: { phrase: string; city: CityId }[] = [
  { phrase: 'mercer island', city: 'eastside' },
  { phrase: 'santa monica', city: 'la' },
  { phrase: 'west hollywood', city: 'la' },
  { phrase: 'beverly hills', city: 'la' },
  { phrase: 'beverly grove', city: 'la' },
  { phrase: 'los angeles', city: 'la' },
  { phrase: 'san francisco', city: 'sf' },
  { phrase: 'north beach', city: 'sf' },
  { phrase: 'mission district', city: 'sf' },
  { phrase: 'east bay', city: 'eastbay' },
  { phrase: 'half moon bay', city: 'peninsula' },
  { phrase: 'palo alto', city: 'peninsula' },
  { phrase: 'san jose', city: 'peninsula' },
  { phrase: 'santa clara', city: 'peninsula' },
  { phrase: 'north bay', city: 'northbay' },
  { phrase: 'corte madera', city: 'northbay' },
  { phrase: 'san diego', city: 'sandiego' },
  { phrase: 'la jolla', city: 'sandiego' },
  { phrase: 'little italy', city: 'sandiego' },
  { phrase: 'north park', city: 'sandiego' },
  { phrase: 'east village', city: 'sandiego' },
  { phrase: 'bellevue', city: 'eastside' },
  { phrase: 'kirkland', city: 'eastside' },
  { phrase: 'redmond', city: 'eastside' },
  { phrase: 'woodinville', city: 'eastside' },
  { phrase: 'issaquah', city: 'eastside' },
  { phrase: 'bothell', city: 'eastside' },
  { phrase: 'eastside', city: 'eastside' },
  { phrase: 'sammamish', city: 'eastside' },
  { phrase: 'seattle', city: 'seattle' },
  { phrase: 'capitol hill', city: 'seattle' },
  { phrase: 'ballard', city: 'seattle' },
  { phrase: 'berkeley', city: 'eastbay' },
  { phrase: 'pleasanton', city: 'eastbay' },
  { phrase: 'sausalito', city: 'northbay' },
  { phrase: 'tiburon', city: 'northbay' },
  { phrase: 'larkspur', city: 'northbay' },
  { phrase: 'coronado', city: 'sandiego' },
  { phrase: 'malibu', city: 'la' },
  { phrase: 'venice', city: 'la' },
  { phrase: 'hollywood', city: 'la' },
]

const STOP = new Set(['a', 'an', 'the', 'to', 'for', 'in', 'on', 'by', 'at', 'of', 'and', 'or', 'with', 'somewhere', 'something', 'spot', 'spots', 'eats', 'eat', 'food', 'place', 'places', 'good', 'best', 'take', 'taking', 'near', 'around'])

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokens(value: string): string[] {
  return norm(value).split(' ').filter((token) => token && !STOP.has(token))
}

function editDistance(left: string, right: string): number {
  if (Math.abs(left.length - right.length) > 2) return 3
  const row = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0]
    row[0] = i
    for (let j = 1; j <= right.length; j += 1) {
      const current = row[j]
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + cost)
      previous = current
    }
  }
  return row[right.length]
}

function sharedPrefix(left: string, right: string): number {
  let index = 0
  while (index < left.length && index < right.length && left[index] === right[index]) index += 1
  return index
}

function fuzzy(queryToken: string, word: string): boolean {
  if (queryToken === word) return true
  if (queryToken.length < 4 || word.length < 4) return false
  if (queryToken[0] !== word[0]) return false
  const limit = queryToken.length >= 8 ? 2 : 1
  if (editDistance(queryToken, word) > limit) return false
  return sharedPrefix(queryToken, word) >= Math.min(3, queryToken.length - 1)
}

function contentTokens(query: string): string[] {
  let text = norm(query)
  const phrases = INTENTS.flatMap((intent) => intent.phrases).filter((phrase) => phrase.includes(' '))
  for (const phrase of phrases.sort((a, b) => b.length - a.length)) {
    const needle = norm(phrase)
    if (needle && text.includes(needle)) text = text.replace(needle, ' ')
  }
  return tokens(text)
}

function matchedIntents(query: string): Intent[] {
  const text = norm(query)
  return INTENTS.filter((intent) => intent.phrases.some((phrase) => {
    const needle = norm(phrase)
    if (!needle) return false
    if (needle.includes(' ')) return ` ${text} `.includes(` ${needle} `)
    return tokens(text).some((token) => token === needle || fuzzy(token, needle))
  }))
}

function detectScope(query: string, current: CityId): CityId {
  const text = ` ${norm(query)} `
  const sorted = AREA_WORDS.slice().sort((a, b) => b.phrase.length - a.phrase.length)
  for (const area of sorted) {
    if (text.includes(` ${norm(area.phrase)} `)) return area.city
  }
  return current
}

function whyFrom(parts: string[]): string {
  return parts.filter(Boolean).slice(0, 2).join(' · ') || 'Match'
}

export function smartSearch(query: string, current: CityId, places: SlimPlace[], guides: GuideSummary[]): SmartResult {
  const scope = detectScope(query, current)
  const scopeGuides = guides.filter((guide) => (guide.city ?? 'seattle') === scope)
  const scopePlaces = places.filter((place) => (place.city ?? 'seattle') === scope && place.closed !== true)
  const intents = matchedIntents(query)
  const words = contentTokens(query)
  const text = norm(query)
  const neighborhoods = [...new Set(scopePlaces.map((place) => place.neighborhood).filter(Boolean))]
  const hoodHits = neighborhoods.filter((name) => {
    const needle = norm(name)
    return needle.length > 2 && (text.includes(needle) || words.some((word) => fuzzy(word, needle)))
  })

  const guideHits: SmartHit[] = []
  for (const guide of scopeGuides) {
    const title = norm(guide.title)
    const dek = norm(guide.dek)
    const group = norm(guide.group)
    const reasons: string[] = []
    let score = 0
    if (text && title.includes(text)) {
      score += 100
      reasons.push('Guide title')
    }
    for (const word of words) {
      const titleTokens = title.split(' ')
      if (titleTokens.some((token) => token === word)) {
        score += 36
        reasons.push('Guide title')
      } else if (titleTokens.some((token) => fuzzy(word, token))) {
        score += 22
        reasons.push('Close spelling')
      }
      if (dek.includes(word)) score += 12
      if (group.includes(word)) {
        score += 18
        reasons.push(guide.group)
      }
    }
    for (const intent of intents) {
      if (intent.guides.includes(guide.slug) || norm(guide.title).includes(norm(intent.why)) || group.includes(intent.id)) {
        score += intent.guides.includes(guide.slug) ? 70 : 24
        reasons.push(intent.why)
      }
    }
    for (const hood of hoodHits) {
      if (title.includes(norm(hood)) || dek.includes(norm(hood))) {
        score += 48
        reasons.push(hood)
      }
    }
    if (!score) continue
    guideHits.push({
      kind: 'guide',
      id: guide.slug,
      title: guide.title,
      detail: guide.group,
      why: whyFrom([...new Set(reasons)]),
      href: cityPath(`/guide/${guide.slug}`, scope),
      score,
      group: guide.group,
    })
  }

  const placeHits: SmartHit[] = []
  for (const place of scopePlaces) {
    const name = norm(place.name)
    const hood = norm(place.neighborhood)
    const cuisine = place.cuisine.map(norm)
    const reasons: string[] = []
    let score = 0
    if (text && name.includes(text)) {
      score += 80
      reasons.push('Place name')
    }
    for (const word of words) {
      const nameTokens = name.split(' ')
      if (nameTokens.some((token) => token === word)) {
        score += 40
        reasons.push('Place name')
      } else if (nameTokens.some((token) => fuzzy(word, token))) {
        score += 24
        reasons.push('Close spelling')
      }
      if (cuisine.some((item) => item.includes(word) || fuzzy(word, item))) {
        score += 28
        reasons.push(place.cuisine[0] || 'Cuisine')
      }
    }
    if (hoodHits.some((item) => norm(item) === hood)) {
      score += 36
      reasons.push(place.neighborhood)
    }
    for (const intent of intents) {
      const blob = `${name} ${cuisine.join(' ')} ${place.oneLiner}`
      if (intent.phrases.some((phrase) => blob.includes(norm(phrase)))) {
        score += 16
        reasons.push(intent.why)
      }
    }
    if (!score) continue
    placeHits.push({
      kind: 'place',
      id: place.id,
      title: place.name,
      detail: [place.cuisine[0], place.neighborhood].filter(Boolean).join(' · '),
      why: whyFrom([...new Set(reasons)]),
      href: cityPath(`/place/${place.id}`, scope),
      score,
    })
  }

  guideHits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
  placeHits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))

  let suggestions: SmartHit[] = []
  if (!guideHits.length && !placeHits.length) {
    suggestions = scopeGuides
      .map((guide) => {
        const titleTokens = tokens(guide.title)
        let score = 0
        for (const word of words) {
          if (titleTokens.some((token) => fuzzy(word, token))) score += 10
        }
        for (const intent of intents) {
          if (intent.guides.includes(guide.slug)) score += 8
        }
        return { guide, score }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.guide.title.localeCompare(b.guide.title))
      .slice(0, 3)
      .map((item) => ({
        kind: 'guide' as const,
        id: item.guide.slug,
        title: item.guide.title,
        detail: item.guide.group,
        why: 'Closest guide',
        href: cityPath(`/guide/${item.guide.slug}`, scope),
        score: item.score,
        group: item.guide.group,
      }))
  }

  return {
    scope,
    scopeLabel: areaName(scope),
    switched: scope !== current,
    guides: guideHits.slice(0, 8),
    places: placeHits.slice(0, 8),
    suggestions,
  }
}
