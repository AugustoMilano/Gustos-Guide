import { areaName, cityPath, type CityId } from './city.ts'
import exclusions from '../../data/permanent-exclusions.json'
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

/** Gusto's Score lookup, used only to order results. Never shown here. */
export type ScoreOf = (placeId: string) => number | null

/**
 * A concept turns natural words (dishes, moods, drinks) into catalog fields.
 * cuisine/types/perfect are matched against normalized catalog values; text
 * words are direct mentions in a name or one-liner; guides are slugs.
 */
type Concept = {
  id: string
  why: string
  words: string[]
  cuisine?: string[]
  types?: string[]
  perfect?: string[]
  text?: string[]
  guides?: string[]
  price?: 'low' | 'high'
}

const PASTA = ['pasta', 'spaghetti', 'ravioli', 'lasagna', 'lasagne', 'gnocchi', 'tagliatelle', 'fettuccine', 'linguine', 'rigatoni', 'penne', 'carbonara', 'tajarin', 'agnolotti', 'pappardelle', 'tortellini', 'bucatini', 'cacio e pepe']
const ITALIAN = ['italian', 'sardinian', 'neapolitan']

const CONCEPTS: Concept[] = [
  { id: 'pasta', why: 'Pasta', words: PASTA, cuisine: ITALIAN, text: [...PASTA, 'noodle'], guides: ['italian', 'la-italian', 'sf-italian', 'sd-italian'] },
  { id: 'italian', why: 'Italian', words: ['italian', 'trattoria', 'osteria', 'risotto', 'salumi'], cuisine: [...ITALIAN, 'salumi'], text: ['italian', 'trattoria', 'osteria'], guides: ['italian', 'la-italian', 'sf-italian', 'sd-italian'] },
  { id: 'noodles', why: 'Noodles', words: ['noodle', 'noodles'], cuisine: ['ramen', 'vietnamese', 'noodles', 'thai', 'chinese', 'lao', 'taiwanese', ...ITALIAN], text: ['noodle', 'ramen', 'pho', 'udon', 'soba', 'pasta', 'lo mein', 'chow mein'], guides: ['noodles'] },
  { id: 'pizza', why: 'Pizza', words: ['pizza', 'pizzeria', 'slice', 'pie', 'margherita'], cuisine: ['pizza'], types: ['pizzeria'], text: ['pizza', 'pizzas', 'pies', 'slice'], guides: ['best-pizza'] },
  { id: 'mexican', why: 'Mexican', words: ['mexican', 'taco', 'tacos', 'burrito', 'quesadilla', 'enchilada', 'tamale', 'mole', 'carnitas', 'birria', 'al pastor', 'taqueria', 'nachos', 'margarita'], cuisine: ['mexican', 'tacos', 'tex mex'], text: ['taco', 'burrito', 'mexican', 'taqueria', 'birria', 'mole'], guides: ['tacos', 'la-mexican', 'sf-mexican', 'sd-mexican'] },
  { id: 'japanese', why: 'Japanese', words: ['japanese', 'izakaya', 'tonkatsu', 'teriyaki', 'katsu', 'yakitori', 'tempura'], cuisine: ['japanese', 'sushi', 'ramen', 'izakaya', 'tonkatsu', 'teriyaki'], text: ['japanese', 'izakaya', 'yakitori'], guides: ['sf-japanese', 'sd-japanese', 'eastside-asian'] },
  { id: 'sushi', why: 'Sushi', words: ['sushi', 'omakase', 'nigiri', 'sashimi', 'maki', 'hand roll'], cuisine: ['sushi'], text: ['sushi', 'omakase', 'nigiri'], guides: ['best-sushi', 'la-sushi', 'sf-japanese', 'sd-japanese'] },
  { id: 'ramen', why: 'Ramen', words: ['ramen', 'udon', 'soba', 'tonkotsu'], cuisine: ['ramen'], text: ['ramen', 'udon', 'soba', 'tonkotsu'], guides: ['noodles'] },
  { id: 'pho', why: 'Vietnamese', words: ['pho', 'vietnamese', 'banh mi', 'bun bo hue', 'vermicelli'], cuisine: ['vietnamese', 'banh mi'], text: ['pho', 'banh mi', 'vietnamese'], guides: ['noodles'] },
  { id: 'chinese', why: 'Chinese', words: ['chinese', 'dim sum', 'dumpling', 'dumplings', 'xiao long bao', 'soup dumpling', 'bao', 'sichuan', 'szechuan', 'cantonese', 'congee', 'hot pot', 'taiwanese'], cuisine: ['chinese', 'dim sum', 'dumpling', 'sichuan', 'cantonese', 'taiwanese', 'congee'], text: ['dumpling', 'dim sum', 'xiao long bao', 'bao', 'chinese', 'sichuan'], guides: ['eastside-asian', 'chinatown-international-district'] },
  { id: 'curry', why: 'Curry', words: ['curry', 'curries', 'tikka', 'masala', 'biryani', 'naan', 'indian'], cuisine: ['indian', 'thai'], text: ['curry', 'indian', 'masala'] },
  { id: 'thai', why: 'Thai', words: ['thai', 'pad thai', 'khao soi', 'larb'], cuisine: ['thai', 'lao'], text: ['thai'] },
  { id: 'korean', why: 'Korean', words: ['korean', 'kbbq', 'korean bbq', 'bibimbap', 'kimchi'], cuisine: ['korean'], text: ['korean'] },
  { id: 'asian', why: 'Asian', words: ['asian'], cuisine: ['asian', 'japanese', 'chinese', 'korean', 'thai', 'vietnamese', 'filipino', 'taiwanese', 'lao'], guides: ['eastside-asian'] },
  { id: 'mediterranean', why: 'Mediterranean', words: ['mediterranean', 'middle eastern', 'falafel', 'hummus', 'shawarma', 'kebab', 'gyro', 'gyros', 'souvlaki', 'greek', 'lebanese', 'turkish', 'persian'], cuisine: ['mediterranean', 'middle eastern', 'lebanese', 'turkish', 'persian', 'greek'], text: ['falafel', 'hummus', 'shawarma', 'kebab', 'gyro'] },
  { id: 'french', why: 'French', words: ['french', 'bistro', 'brasserie', 'croissant', 'crepe'], cuisine: ['french'], text: ['bistro', 'brasserie', 'french'], guides: ['sf-french'] },
  { id: 'spanish', why: 'Spanish', words: ['spanish', 'tapas', 'paella', 'pintxos'], cuisine: ['spanish', 'tapas'], text: ['tapas', 'paella'] },
  { id: 'latin', why: 'Latin American', words: ['latin', 'argentine', 'argentinian', 'empanada', 'asado', 'peruvian', 'ceviche', 'cuban', 'venezuelan', 'arepa', 'brazilian', 'caribbean', 'jerk'], cuisine: ['latin american', 'argentine', 'argentinian', 'empanadas', 'peruvian', 'cuban', 'venezuelan', 'brazilian', 'caribbean'], text: ['empanada', 'ceviche', 'arepa'] },
  { id: 'hawaiian', why: 'Hawaiian', words: ['hawaiian', 'poke', 'loco moco', 'spam musubi', 'chamorro'], cuisine: ['hawaiian', 'poke', 'chamorro'], text: ['poke'] },
  { id: 'filipino', why: 'Filipino', words: ['filipino', 'adobo', 'lumpia', 'sisig'], cuisine: ['filipino'], text: ['filipino', 'lumpia'] },
  { id: 'southern', why: 'Southern', words: ['southern', 'soul food', 'cajun', 'creole', 'gumbo', 'po boy', 'biscuits'], cuisine: ['southern', 'soul food', 'cajun', 'creole'], text: ['gumbo', 'biscuit'] },
  { id: 'bbq', why: 'BBQ', words: ['bbq', 'barbecue', 'barbeque', 'brisket', 'ribs', 'smoked', 'smokehouse'], cuisine: ['bbq', 'barbecue'], text: ['brisket', 'bbq', 'barbecue', 'smoked'] },
  { id: 'burgers', why: 'Burgers', words: ['burger', 'burgers', 'cheeseburger', 'smashburger', 'fries'], cuisine: ['burger'], text: ['burger', 'cheeseburger'], guides: ['burgers'] },
  { id: 'steak', why: 'Steak', words: ['steak', 'steakhouse', 'ribeye', 'filet', 'prime rib', 'wagyu', 'chophouse'], cuisine: ['steak'], types: ['steakhouse'], text: ['steak', 'ribeye', 'wagyu'], guides: ['steakhouses', 'sf-steakhouse'] },
  { id: 'seafood', why: 'Seafood', words: ['seafood', 'fish', 'crab', 'clam', 'clams', 'lobster', 'chowder', 'salmon', 'shellfish', 'fish and chips', 'mussels', 'shrimp'], cuisine: ['seafood', 'oyster', 'poke', 'fish'], text: ['seafood', 'fish', 'crab', 'chowder', 'salmon', 'oyster', 'clam'], guides: ['seafood', 'sf-seafood', 'sd-seafood'] },
  { id: 'oysters', why: 'Oysters', words: ['oyster', 'oysters', 'raw bar'], cuisine: ['oyster', 'seafood'], text: ['oyster', 'raw bar'], guides: ['seafood', 'sf-seafood', 'sd-seafood'] },
  { id: 'sandwich', why: 'Sandwiches', words: ['sandwich', 'sandwiches', 'sub', 'hoagie', 'deli', 'hero', 'panini', 'cheesesteak'], cuisine: ['sandwich', 'deli'], types: ['deli'], text: ['sandwich', 'sub', 'hoagie'], guides: ['sandwiches', 'sf-sandwich'] },
  { id: 'chicken', why: 'Chicken', words: ['chicken', 'fried chicken', 'wings', 'rotisserie', 'hot chicken'], cuisine: ['chicken', 'wings'], text: ['chicken', 'wings'] },
  { id: 'hotdog', why: 'Hot dogs', words: ['hot dog', 'hot dogs', 'hotdog', 'sausage'], cuisine: ['hot dog'], text: ['hot dog', 'sausage'] },
  { id: 'brunch', why: 'Brunch', words: ['brunch', 'breakfast', 'pancake', 'pancakes', 'waffle', 'waffles', 'eggs', 'benedict', 'french toast', 'bagel', 'bagels', 'diner', 'morning'], cuisine: ['brunch', 'breakfast', 'diner', 'bagel'], perfect: ['breakfast', 'brunch'], text: ['brunch', 'breakfast', 'pancake', 'waffle', 'benedict', 'bagel'], guides: ['brunch', 'breakfast-before-9', 'eastside-brunch', 'donuts-bagels'] },
  { id: 'coffee', why: 'Coffee', words: ['coffee', 'espresso', 'latte', 'cappuccino', 'cafe', 'pour over', 'cold brew', 'work from cafe'], cuisine: ['coffee', 'cafe'], types: ['coffee shop', 'cafe'], perfect: ['coffee and pastry', 'work from cafe'], text: ['coffee', 'espresso', 'latte'], guides: ['best-coffee', 'eastside-coffee', 'la-coffee-bakeries'] },
  { id: 'tea', why: 'Tea', words: ['tea', 'afternoon tea', 'boba', 'matcha'], cuisine: ['afternoon tea', 'tea'], types: ['tea room'], text: ['tea', 'boba', 'matcha'] },
  { id: 'juice', why: 'Juice', words: ['juice', 'smoothie', 'healthy', 'health food', 'salad'], cuisine: ['juice', 'health food'], text: ['juice', 'smoothie', 'salad'] },
  { id: 'cocktails', why: 'Cocktails', words: ['cocktail', 'cocktails', 'martini', 'drinks', 'drink', 'bar', 'bars', 'mixology', 'speakeasy', 'happy hour', 'tiki', 'nightcap', 'nightlife'], cuisine: ['cocktail', 'bar', 'tiki', 'nightlife'], types: ['bar', 'cocktail bar', 'rooftop bar', 'dive bar', 'listening bar', 'sports bar'], perfect: ['cocktails'], text: ['cocktail', 'martini', 'speakeasy'], guides: ['cocktail-bars', 'the-bar-list', 'happy-hour', 'fun-dive-bars', 'rooftops'] },
  { id: 'wine', why: 'Wine', words: ['wine', 'wines', 'vino', 'natural wine', 'winery', 'tasting room', 'sommelier'], cuisine: ['wine'], types: ['wine bar'], perfect: ['wine'], text: ['wine'], guides: ['wine-bars', 'woodinville'] },
  { id: 'beer', why: 'Beer', words: ['beer', 'beers', 'brewery', 'breweries', 'ipa', 'pub', 'taproom', 'brewpub', 'pint', 'gastropub', 'dive bar', 'dive'], cuisine: ['beer', 'gastropub', 'tavern', 'bar food'], types: ['brewery', 'pub', 'beer bar', 'dive bar', 'sports bar'], perfect: ['beer'], text: ['beer', 'brewery', 'taproom'], guides: ['beer', 'eastside-breweries', 'fun-dive-bars'] },
  { id: 'dessert', why: 'Dessert', words: ['dessert', 'desserts', 'sweet', 'sweets', 'ice cream', 'gelato', 'cake', 'cookie', 'cookies', 'donut', 'donuts', 'doughnut', 'chocolate', 'frozen yogurt', 'froyo', 'soft serve', 'pie'], cuisine: ['dessert', 'ice cream', 'gelato', 'bakery', 'donut', 'cookie', 'chocolate', 'frozen yogurt', 'pastry', 'patisserie'], types: ['dessert'], text: ['dessert', 'ice cream', 'gelato', 'cake', 'cookie', 'donut'], guides: ['ice-cream', 'donuts-bagels', 'best-bakeries'] },
  { id: 'bakery', why: 'Bakery', words: ['bakery', 'bakeries', 'bread', 'pastry', 'pastries', 'croissant', 'croissants', 'patisserie', 'kouign amann', 'crumpet', 'bagel'], cuisine: ['bakery', 'pastry', 'patisserie', 'bagel', 'crumpet'], types: ['bakery'], perfect: ['coffee and pastry'], text: ['pastry', 'croissant', 'bread', 'bakery'], guides: ['best-bakeries', 'la-coffee-bakeries', 'sf-bakery', 'donuts-bagels'] },
  { id: 'vegan', why: 'Vegetarian', words: ['vegan', 'vegetarian', 'veggie', 'plant based', 'meatless', 'gluten free'], cuisine: ['vegan', 'vegetarian', 'health food', 'gluten free'], text: ['vegan', 'vegetarian', 'plant based', 'veggie'] },
  { id: 'cheap', why: 'Cheap eats', words: ['cheap', 'cheap eats', 'budget', 'affordable', 'inexpensive', 'casual', 'quick', 'fast'], perfect: ['cheap eats'], price: 'low', guides: ['cheap-eats'] },
  { id: 'fancy', why: 'Special occasion', words: ['fancy', 'upscale', 'splurge', 'special occasion', 'fine dining', 'tasting menu', 'celebration', 'birthday', 'anniversary', 'elegant', 'expensive', 'luxury'], cuisine: ['fine dining'], perfect: ['special occasion'], price: 'high', guides: ['splurge'] },
  { id: 'date', why: 'Date night', words: ['date', 'date night', 'romantic', 'romance', 'anniversary', 'intimate'], perfect: ['date night'], guides: ['date-night', 'eastside-date-night', 'la-date-night', 'sf-date-night'] },
  { id: 'kids', why: 'Family friendly', words: ['kids', 'kid', 'family', 'families', 'children', 'child', 'kid friendly', 'family friendly', 'parents', 'parent', 'mom', 'dad'], text: ['kids', 'family', 'families', 'children'], guides: ['bring-the-parents', 'big-group'] },
  { id: 'group', why: 'Big group', words: ['big group', 'group', 'groups', 'group dinner', 'party', 'large party'], guides: ['big-group'] },
  { id: 'late', why: 'Late night', words: ['late', 'late night', 'after hours', 'midnight', 'open late'], perfect: ['late night'], guides: ['late-night'] },
  { id: 'view', why: 'View or patio', words: ['view', 'views', 'patio', 'outdoor', 'outside', 'deck', 'waterfront', 'water', 'by the water', 'rooftop', 'rooftops', 'skyline', 'sunset', 'terrace'], types: ['rooftop bar'], perfect: ['view', 'waterfront'], text: ['view', 'patio', 'rooftop', 'waterfront', 'deck', 'sound', 'lake'], guides: ['rooftops', 'restaurants-with-a-view', 'kirkland-waterfront'] },
  { id: 'walkin', why: 'Walk-in', words: ['walk in', 'walk ins', 'walkin', 'no reservation', 'no reservations'], perfect: ['walk ins'], guides: ['walk-in'] },
  { id: 'lunch', why: 'Lunch', words: ['lunch', 'midday'], perfect: ['lunch'] },
  { id: 'solo', why: 'Solo', words: ['solo', 'alone', 'counter', 'bar seat'], perfect: ['solo'] },
  { id: 'weeknight', why: 'Weeknight dinner', words: ['weeknight', 'dinner', 'tonight'], perfect: ['weeknight dinner'] },
  { id: 'visitors', why: 'Out-of-towners', words: ['tourist', 'tourists', 'visitor', 'visitors', 'out of towners', 'out of town', 'classic', 'classics', 'iconic'], perfect: ['out of towners'], guides: ['classics', 'pike-place'] },
  { id: 'american', why: 'American', words: ['american', 'new american', 'comfort food', 'pnw', 'pacific northwest', 'northwest', 'californian'], cuisine: ['american', 'pacific northwest', 'pnw', 'californian', 'diner'], guides: ['sf-american', 'sf-new-american', 'sd-new-american'] },
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
  { phrase: 'renton', city: 'eastside' },
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

/** Region names that only pick the scope; they are not neighborhoods to filter on. */
const SCOPE_ONLY = new Set(['seattle', 'eastside', 'los angeles', 'san francisco', 'east bay', 'north bay', 'san diego'])

const STOP = new Set(['a', 'an', 'the', 'to', 'for', 'in', 'on', 'by', 'at', 'of', 'and', 'or', 'with', 'somewhere', 'something', 'spot', 'spots', 'eats', 'eat', 'eating', 'food', 'place', 'places', 'good', 'best', 'great', 'take', 'taking', 'near', 'around', 'me', 'some', 'want', 'get', 'find', 'restaurant', 'restaurants', 'where', 'go', 'nice', 'top'])

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Light English stemmer: plurals and a few common endings. */
function stem(word: string): string {
  if (word.length <= 3) return word
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`
  if (word.endsWith('oes')) return word.slice(0, -2)
  if (/(ches|shes|sses|xes|zes)$/.test(word)) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1)
  return word
}

function stemText(value: string): string {
  return norm(value).split(' ').filter(Boolean).map(stem).join(' ')
}

/** Optimal string alignment distance: a swapped pair of letters ("tacso") counts as one edit. */
function editDistance(left: string, right: string): number {
  if (Math.abs(left.length - right.length) > 2) return 3
  const rows: number[][] = Array.from({ length: left.length + 1 }, (_, i) => Array.from({ length: right.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1
      let best = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) best = Math.min(best, rows[i - 2][j - 2] + 1)
      rows[i][j] = best
    }
  }
  return rows[left.length][right.length]
}

function sharedPrefix(left: string, right: string): number {
  let index = 0
  while (index < left.length && index < right.length && left[index] === right[index]) index += 1
  return index
}

/**
 * Typo tolerance (C3): one slip for 4 to 7 letters, two from 8. A swapped pair counts as one slip.
 * The first letter may be wrong ("kanlis") only on longer words with a single slip, and short words
 * must keep their first two letters so "bar" never turns into "bao".
 */
function fuzzy(queryToken: string, word: string): boolean {
  if (queryToken === word) return true
  if (queryToken.length < 4 || word.length < 4) return false
  const limit = queryToken.length >= 8 ? 2 : 1
  const distance = editDistance(queryToken, word)
  if (distance > limit) return false
  if (queryToken[0] !== word[0]) return queryToken.length >= 5 && distance === 1 && queryToken.slice(1) === word.slice(1)
  return sharedPrefix(queryToken, word) >= (queryToken.length >= 6 ? 1 : 2)
}

/** True when the stemmed phrase appears as whole words in the stemmed haystack. */
function hasPhrase(hay: string, phrase: string): boolean {
  return phrase !== '' && ` ${hay} `.includes(` ${phrase} `)
}

type Prepared = {
  place: SlimPlace
  name: string
  nameTokens: string[]
  hood: string
  cuisine: string
  cuisineTokens: string[]
  type: string
  perfect: string
  line: string
  lineTokens: string[]
  guides: Set<string>
}

type Index = { prepared: Prepared[]; excluded: Set<string> }

const indexCache = new WeakMap<SlimPlace[], Index>()

type Exclusion = { id: string; name: string; keepIds?: string[] }

function buildIndex(places: SlimPlace[]): Index {
  const cached = indexCache.get(places)
  if (cached) return cached
  const list = (exclusions as { places: Exclusion[] }).places
  const ids = new Set(list.map((item) => item.id))
  const names = new Map(list.map((item) => [norm(item.name), new Set(item.keepIds ?? [])]))
  const excluded = new Set<string>()
  const prepared: Prepared[] = []
  for (const place of places) {
    const name = stemText(place.name)
    const keep = names.get(norm(place.name))
    if (ids.has(place.id) || (keep && !keep.has(place.id))) {
      excluded.add(place.id)
      continue
    }
    const cuisine = stemText(place.cuisine.join(' | '))
    const line = stemText(place.oneLiner)
    prepared.push({
      place,
      name,
      nameTokens: name.split(' '),
      hood: stemText(place.neighborhood),
      cuisine,
      cuisineTokens: cuisine.split(' '),
      type: stemText(place.placeType),
      perfect: stemText((place.perfectFor ?? []).join(' | ')),
      line,
      lineTokens: line.split(' '),
      guides: new Set(place.guideSlugs ?? []),
    })
  }
  const index = { prepared, excluded }
  indexCache.set(places, index)
  return index
}

const STEMMED = CONCEPTS.map((concept) => ({
  concept,
  words: concept.words.map(stemText),
  cuisine: (concept.cuisine ?? []).map(stemText),
  types: (concept.types ?? []).map(stemText),
  perfect: (concept.perfect ?? []).map(stemText),
  text: (concept.text ?? []).map(stemText),
}))

type StemmedConcept = (typeof STEMMED)[number]

/** One unit of the query: a phrase or word, with the concepts and neighborhood it names. */
type Term = { raw: string; concepts: StemmedConcept[]; hood: string | null; scopeOnly: boolean; known?: boolean }

function parseTerms(query: string, neighborhoods: string[]): Term[] {
  let text = ` ${stemText(query)} `
  const terms: Term[] = []
  const hoods = neighborhoods.map((name) => ({ name, key: stemText(name) })).filter((item) => item.key.length > 2)
  // Multi-word phrases first, longest first: neighborhoods, areas, concept phrases.
  const phrases: { key: string; kind: 'hood' | 'area' | 'concept'; value: string }[] = []
  for (const item of hoods) if (item.key.includes(' ')) phrases.push({ key: item.key, kind: 'hood', value: item.name })
  for (const area of AREA_WORDS) phrases.push({ key: stemText(area.phrase), kind: 'area', value: area.phrase })
  for (const entry of STEMMED) for (const word of entry.words) if (word.includes(' ')) phrases.push({ key: word, kind: 'concept', value: word })
  phrases.sort((a, b) => b.key.length - a.key.length)
  for (const phrase of phrases) {
    if (!text.includes(` ${phrase.key} `)) continue
    text = text.replace(` ${phrase.key} `, ' ')
    if (phrase.kind === 'concept') {
      terms.push({ raw: phrase.key, concepts: STEMMED.filter((entry) => entry.words.includes(phrase.key)), hood: null, scopeOnly: false })
    } else {
      const hood = hoods.find((item) => item.key === phrase.key || item.key.includes(phrase.key))?.name ?? null
      const scopeOnly = phrase.kind === 'area' && (!hood || SCOPE_ONLY.has(norm(phrase.value)))
      terms.push({ raw: phrase.key, concepts: [], hood: scopeOnly ? null : hood ?? phrase.value, scopeOnly })
    }
  }
  for (const word of text.split(' ')) {
    if (!word || STOP.has(word)) continue
    const exact = STEMMED.filter((entry) => entry.words.includes(word))
    const concepts = exact.length ? exact : STEMMED.filter((entry) => entry.words.some((item) => !item.includes(' ') && fuzzy(word, item)))
    const hood = hoods.find((item) => item.key === word || fuzzy(word, item.key))?.name ?? null
    const area = AREA_WORDS.find((item) => stemText(item.phrase) === word)
    const scopeOnly = Boolean(area) && !hood && !concepts.length
    // A word the guide already knows ("thai") never also matches names by close spelling ("That's").
    terms.push({ raw: word, concepts, hood, scopeOnly, known: exact.length > 0 })
  }
  return terms.filter((term) => !term.scopeOnly)
}

// Tiers, best first. Only the order matters.
// Exact name, name prefix, guide name, then cuisine or dish, neighborhood, one-liner.
// A word inside a name (not its start) ranks just under the guides.
const T_EXACT = 9
const T_PREFIX = 8
const T_PREFIX_FUZZY = 7
const T_GUIDE_DISH = 5.5
const T_GUIDE = 5
const T_NAME = 4.6
const T_NAME_FUZZY = 4.5
const T_DISH = 4
const T_CUISINE = 3
const T_HOOD = 2
const T_LINE = 1

const EMPTY = new Map<string, string>()

type TermMatch = { tier: number; strength: number; why: string }

function matchTerm(term: Term, item: Prepared, guideHits: Map<string, string>): TermMatch | null {
  let best: TermMatch | null = null
  const take = (tier: number, strength: number, why: string) => {
    if (!best || tier > best.tier || (tier === best.tier && strength > best.strength)) best = { tier, strength, why }
  }
  const word = term.raw
  // Name: the start of the name is a prefix match; a later word ranks under the guides.
  if (item.name.startsWith(word) && (item.name.length === word.length || item.name[word.length] === ' ' || word.length >= 3)) take(T_PREFIX, 3, 'Place name')
  else if (hasPhrase(item.name, word)) take(T_NAME, 3, 'Place name')
  else if (word.length >= 3 && item.nameTokens.some((token) => token.startsWith(word))) take(T_NAME, 2, 'Place name')
  else if (!term.known && !word.includes(' ') && fuzzy(word, item.nameTokens[0])) take(T_PREFIX_FUZZY, 1, 'Close spelling')
  else if (!term.known && !word.includes(' ') && item.nameTokens.some((token) => fuzzy(word, token))) take(T_NAME_FUZZY, 1, 'Close spelling')
  // Guides this place is in whose title names this term.
  for (const slug of item.guides) {
    const title = guideHits.get(slug)
    if (title) take(T_GUIDE, 1, title)
  }
  for (const entry of term.concepts) {
    const c = entry.concept
    const dishes = entry.text.filter((phrase) => hasPhrase(item.line, phrase) || hasPhrase(item.name, phrase)).length
    const dish = dishes > 0
    // In a matching guide and naming the dish outright ranks above guide membership alone;
    // naming several of its dishes (pasta, tajarin) is the stronger match.
    if (c.guides?.some((slug) => item.guides.has(slug))) take(dish ? T_GUIDE_DISH + Math.min(dishes, 3) / 10 : T_GUIDE, 2 + dishes, c.why)
    const cuisine = entry.cuisine.some((phrase) => hasPhrase(item.cuisine, phrase))
      || entry.types.some((phrase) => hasPhrase(item.type, phrase))
      || entry.perfect.some((phrase) => hasPhrase(item.perfect, phrase))
      || (c.price === 'low' && item.place.price === 1)
      || (c.price === 'high' && (item.place.price ?? 0) >= 4)
    if (dish && cuisine) take(T_DISH, 3 + dishes, c.why)
    else if (cuisine) take(T_CUISINE, 2, item.place.cuisine[0] && entry.cuisine.length ? item.place.cuisine[0] : c.why)
    else if (dish) take(T_LINE, 3 + dishes, c.why)
  }
  // A cuisine word that is not in the concept list still reaches its own cuisine.
  if (hasPhrase(item.cuisine, word) || hasPhrase(item.type, word)) take(T_CUISINE, 2, item.place.cuisine[0] || item.place.placeType)
  else if (!word.includes(' ') && item.cuisineTokens.some((token) => fuzzy(word, token))) take(T_CUISINE, 1, item.place.cuisine[0] || 'Cuisine')
  if (term.hood && norm(item.place.neighborhood) === norm(term.hood)) take(T_HOOD, 2, item.place.neighborhood)
  else if (hasPhrase(item.hood, word)) take(T_HOOD, 1, item.place.neighborhood)
  if (hasPhrase(item.line, word)) take(T_LINE, 2, 'Description')
  return best
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
  return [...new Set(parts.filter(Boolean))].slice(0, 2).join(' · ') || 'Match'
}

export function smartSearch(query: string, current: CityId, places: SlimPlace[], guides: GuideSummary[], scoreOf?: ScoreOf): SmartResult {
  const result = searchIn(detectScope(query, current), query, current, places, guides, scoreOf)
  if (result.guides.length || result.places.length) return result
  // Nothing here: a place name from another area (e.g. a Seattle spot searched on the Eastside) switches scope.
  const whole = stemText(query)
  if (whole.length < 4) return result
  const { prepared } = buildIndex(places)
  const named = prepared.find((item) => item.place.closed !== true && (item.name.startsWith(whole) || item.nameTokens.some((token) => fuzzy(whole, token)) || fuzzy(whole, item.name)))
  const other = named ? ((named.place.city ?? 'seattle') as CityId) : null
  if (!other || other === result.scope) return result
  const moved = searchIn(other, query, current, places, guides, scoreOf)
  return moved.places.length || moved.guides.length ? moved : result
}

function searchIn(scope: CityId, query: string, current: CityId, places: SlimPlace[], guides: GuideSummary[], scoreOf?: ScoreOf): SmartResult {
  const { prepared } = buildIndex(places)
  const scopeGuides = guides.filter((guide) => (guide.city ?? 'seattle') === scope)
  const scopeItems = prepared.filter((item) => (item.place.city ?? 'seattle') === scope && item.place.closed !== true)
  const neighborhoods = [...new Set(scopeItems.map((item) => item.place.neighborhood).filter(Boolean))]
  const terms = parseTerms(query, neighborhoods)
  const whole = stemText(query)
  const concepts = [...new Set(terms.flatMap((term) => term.concepts))]

  // Guides.
  const guideHits: SmartHit[] = []
  const guideTitleHits = new Map<string, Map<string, string>>()
  for (const guide of scopeGuides) {
    const title = stemText(guide.title)
    const slug = norm(guide.slug.replace(/-/g, ' '))
    const dek = stemText(guide.dek)
    const group = stemText(guide.group)
    const reasons: string[] = []
    let score = 0
    if (whole && title === whole) {
      score += 200
      reasons.push('Guide title')
    } else if (whole && hasPhrase(title, whole)) {
      score += 100
      reasons.push('Guide title')
    }
    let matchedTerms = 0
    for (const term of terms) {
      let hit = false
      if (hasPhrase(title, term.raw)) {
        score += 36
        hit = true
        reasons.push('Guide title')
        if (!guideTitleHits.has(term.raw)) guideTitleHits.set(term.raw, new Map())
        guideTitleHits.get(term.raw)?.set(guide.slug, guide.title)
      } else if (!term.known && !term.raw.includes(' ') && title.split(' ').some((token) => fuzzy(term.raw, token))) {
        score += 22
        hit = true
        reasons.push('Close spelling')
      }
      if (hasPhrase(dek, term.raw)) {
        score += 12
        hit = true
      }
      if (hasPhrase(group, term.raw)) {
        score += 18
        hit = true
        reasons.push(guide.group)
      }
      for (const entry of term.concepts) {
        if (entry.concept.guides?.includes(guide.slug)) {
          score += 70
          hit = true
          reasons.push(entry.concept.why)
        } else if (hasPhrase(title, stemText(entry.concept.why))) {
          score += 24
          hit = true
          reasons.push(entry.concept.why)
        }
      }
      if (term.hood && (hasPhrase(title, stemText(term.hood)) || hasPhrase(dek, stemText(term.hood)) || hasPhrase(slug, norm(term.hood)))) {
        score += 48
        hit = true
        reasons.push(term.hood)
      }
      if (hit) matchedTerms += 1
    }
    if (!score) continue
    if (terms.length > 1) score += matchedTerms * 40
    guideHits.push({
      kind: 'guide',
      id: guide.slug,
      title: guide.title,
      detail: guide.group,
      why: whyFrom(reasons),
      href: cityPath(`/guide/${guide.slug}`, scope),
      score,
      group: guide.group,
    })
  }

  // Places.
  type Scored = { item: Prepared; tier: number; matched: number; strength: number; gusto: number; why: string[] }
  const scored: Scored[] = []
  for (const item of scopeItems) {
    let tier = 0
    let strength = 0
    let matched = 0
    const why: string[] = []
    if (whole && item.name === whole) {
      tier = T_EXACT
      why.push('Place name')
    } else if (whole.length >= 2 && item.name.startsWith(whole)) {
      tier = T_PREFIX
      why.push('Place name')
    }
    for (const term of terms) {
      const hit = matchTerm(term, item, guideTitleHits.get(term.raw) ?? EMPTY)
      if (!hit) continue
      matched += 1
      strength += hit.tier * 4 + hit.strength
      if (hit.tier > tier) tier = hit.tier
      why.push(hit.why)
    }
    if (!tier) continue
    scored.push({ item, tier, matched, strength, gusto: scoreOf?.(item.place.id) ?? -1, why })
  }
  // Every term narrows (AND) when that still leaves results; otherwise fall back to OR.
  const all = terms.length > 1 ? scored.filter((row) => row.matched === terms.length || row.tier >= T_PREFIX) : scored
  const pool = terms.length > 1 && all.length ? all : scored
  pool.sort((a, b) =>
    b.tier - a.tier
    || (terms.length > 1 ? b.matched - a.matched : 0)
    || b.gusto - a.gusto
    || b.strength - a.strength
    || a.item.place.name.localeCompare(b.item.place.name))
  const placeHits: SmartHit[] = pool.map((row, rank) => ({
    kind: 'place',
    id: row.item.place.id,
    title: row.item.place.name,
    detail: [row.item.place.cuisine[0], row.item.place.neighborhood].filter(Boolean).join(' · '),
    why: whyFrom(row.why),
    href: cityPath(`/place/${row.item.place.id}`, scope),
    score: pool.length - rank,
  }))

  guideHits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))

  let suggestions: SmartHit[] = []
  if (!guideHits.length && !placeHits.length) {
    const words = norm(query).split(' ').filter((word) => word && !STOP.has(word))
    suggestions = scopeGuides
      .map((guide) => {
        const titleTokens = norm(guide.title).split(' ')
        let score = 0
        for (const word of words) {
          if (titleTokens.some((token) => fuzzy(word, token) || (word.length >= 3 && token.startsWith(word.slice(0, 3))))) score += 10
        }
        for (const entry of concepts) {
          if (entry.concept.guides?.includes(guide.slug)) score += 8
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
