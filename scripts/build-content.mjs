import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertCopy, truncatedNameHit } from './lint-copy.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function previousWikimedia() {
  const map = new Map()
  try {
    const prev = JSON.parse(readFileSync(join(root, 'src/content/places.json'), 'utf8'))
    for (const place of Object.values(prev)) {
      const photos = (place.photos ?? []).filter((photo) => photo.source === 'wikimedia' && photo.url)
      if (photos.length) map.set(place.muid ? `muid:${place.muid}` : place.id, photos)
    }
  } catch {
    // First build has no catalog yet.
  }
  return map
}

const wikiById = previousWikimedia()
const rawPlaces = JSON.parse(readFileSync(join(root, 'data/places_categorized.json'), 'utf8'))
const themes = JSON.parse(readFileSync(join(root, 'data/guide_themes.json'), 'utf8'))
const providerIds = JSON.parse(readFileSync(join(root, 'data/apple_page_provider_ids.json'), 'utf8'))

const UPDATED = '2026-10-18'
const DAY = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 }

function hash(value) {
  let h = 2166136261
  for (const char of value) {
    h ^= char.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick(list, seed) {
  return list[hash(seed) % list.length]
}

function words(value) {
  return value.trim().split(/\s+/).filter(Boolean)
}

function wordCount(value) {
  return words(value).length
}

function normName(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function slugify(value) {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'place'
}

function uniqueSlug(value, taken) {
  const base = slugify(value)
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

function httpUrl(value) {
  if (!value) return undefined
  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
    const url = new URL(withProtocol)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

function toMinutes(value) {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

function parseHours(value) {
  if (!value || /closure/i.test(value)) return []
  const periods = []
  for (const part of value.split(';')) {
    const match = part.trim().match(/^([A-Z, ]+?)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/)
    if (!match) continue
    const days = match[1]
      .split(',')
      .map((day) => DAY[day.trim()])
      .filter((day) => day !== undefined)
    if (!days.length) continue
    const start = toMinutes(match[2])
    const end = match[3] === '24:00' ? 24 * 60 : toMinutes(match[3])
    periods.push({ days, start, end })
  }
  return periods
}

function priceTier(value) {
  const count = String(value ?? '$$').replace(/[^$]/g, '').length
  if (count <= 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  return 4
}

function isShuttered(place) {
  return Boolean(place?.closed) || place?.hours_type === 'PERMANENT_CLOSURE'
}

const shutteredNames = new Set(
  rawPlaces.filter((place) => place?.name && isShuttered(place)).map((place) => normName(place.name)),
)

function isLaunch(place) {
  return (
    place.resolved &&
    (place.kind === 'food' || place.kind === 'drinks') &&
    !place.excluded &&
    !isShuttered(place) &&
    !place.outside_seattle &&
    !place.duplicate_of &&
    Boolean(place.name) &&
    !place.hidden_reason &&
    !shutteredNames.has(normName(place.name))
  )
}

// One location per brand. A place saved at several locations keeps the location with the most
// ratings (ties go to the earliest save); the others carry hidden_reason "other location of …"
// in data/places_categorized.json and stay out of the catalog, guides, map, and search.
const BRAND_SUFFIXES = ['drive in', 'company', 'co', 'kitchen', 'and chowder', 'slu', 'waterfront', 'south lake union', 'coffee', 'espresso', 'seafood', 'donut', 'bakery and cafe', 'pub']
function brandKey(name) {
  let key = normName(name).replace(/^the /, '')
  let changed = true
  while (changed) {
    changed = false
    for (const suffix of BRAND_SUFFIXES) {
      if (key.endsWith(` ${suffix}`) && key.length > suffix.length + 1) {
        key = key.slice(0, -(suffix.length + 1)).trim()
        changed = true
      }
    }
  }
  return key
}

// data/location_overrides.json maps a brand name to the muid the owner wants kept.
// Keys go through brandKey, so "Aroom" covers "Aroom Coffee Waterfront". Other locations
// of that brand are hidden as "other location of {kept name} ({neighborhood})".
function loadLocationOverrides() {
  const chosen = new Map()
  const raw = JSON.parse(readFileSync(join(root, 'data/location_overrides.json'), 'utf8'))
  for (const [label, muid] of Object.entries(raw)) {
    const key = brandKey(label)
    if (!key) throw new Error(`location override ${label} has an empty brand`)
    if (chosen.has(key)) throw new Error(`location override ${label} repeats brand ${key}`)
    chosen.set(key, { label, muid: String(muid) })
  }
  return chosen
}

function applyLocationOverrides(places, chosen) {
  const groups = new Map()
  for (const place of places) {
    if (!place?.name) continue
    const key = brandKey(place.name)
    if (!chosen.has(key)) continue
    const list = groups.get(key) ?? []
    list.push(place)
    groups.set(key, list)
  }
  for (const [key, { label, muid }] of chosen) {
    const list = groups.get(key) ?? []
    const kept = list.find((place) => String(place.muid) === muid)
    if (!kept) throw new Error(`location override for ${label} keeps muid ${muid}, which is not a ${key} location`)
    if (typeof kept.hidden_reason === 'string' && kept.hidden_reason.startsWith('other location of ')) {
      delete kept.hidden_reason
      delete kept.hidden_kept_muid
    }
    if (kept.hidden_reason) throw new Error(`location override ${label} keeps ${kept.name}, which is hidden: ${kept.hidden_reason}`)
    const reason = `other location of ${kept.name} (${kept.neighborhood})`
    for (const place of list) {
      if (place === kept) continue
      const alreadyOther = typeof place.hidden_reason === 'string' && place.hidden_reason.startsWith('other location of ')
      if (place.hidden_reason && !alreadyOther) continue
      if (!alreadyOther && !isLaunch({ ...place, hidden_reason: undefined })) continue
      place.hidden_reason = reason
      place.hidden_kept_muid = String(kept.muid)
    }
  }
}

applyLocationOverrides(rawPlaces, loadLocationOverrides())

function isHidden(place) {
  return (
    place.resolved &&
    (place.kind === 'food' || place.kind === 'drinks') &&
    !place.excluded &&
    !place.closed &&
    place.outside_seattle &&
    !place.duplicate_of
  )
}

const ORDER = [
  ['market grill', [{ dish: 'Blackened salmon sandwich', note: 'The counter order this stall is known for.' }, { dish: 'Clam chowder', note: 'The cup that belongs next to the sandwich.' }]],
  ['paseo', [{ dish: 'Caribbean Roast', note: 'The pork sandwich the shop is built around.' }]],
  ['un bien', [{ dish: 'Caribbean Roast', note: 'The same family of sandwich as Paseo.' }]],
  ["dick's drive-in", [{ dish: 'Deluxe', note: 'The standard burger.' }, { dish: 'Fries and a shake', note: 'The rest of the tray.' }]],
  ["dick's", [{ dish: 'Deluxe', note: 'The standard burger.' }, { dish: 'Fries and a shake', note: 'The rest of the tray.' }]],
  ["beecher's handmade cheese", [{ dish: 'Mac and cheese', note: 'Made with their flagship cheddar.' }]],
  ['pike place chowder', [{ dish: 'Clam chowder', note: 'The bowl the stall is named for.' }]],
  ['salumi', [{ dish: 'Porchetta sandwich', note: 'The cured-meat counter classic.' }]],
  ['dough zone', [{ dish: 'Soup dumplings', note: 'Xiao long bao is the reason for the line.' }]],
  ['seattle dumpling house', [{ dish: 'Soup dumplings', note: 'Order the dumplings the name promises.' }]],
  ['tacos chukis', [{ dish: 'Adobada tacos', note: 'The taco this window is known for.' }]],
  ['delancey', [{ dish: 'Wood-fired pie', note: 'A whole pie, not a novelty topping.' }]],
  ["dino's tomato pie", [{ dish: 'Tomato pie', note: 'Square, and the point of the name.' }]],
  ['ivar s acres of clams', [{ dish: 'Fish and chips', note: 'The waterfront order.' }]],
]

function orderFor(name) {
  const key = normName(name)
  const hit = ORDER.find(([label]) => key === label || key.startsWith(`${label} `))
  return hit ? hit[1] : []
}

const CUISINE_SENSORY = {
  Pizza: [
    'Judge it by the underside: blister, salt, and whether the center survives the walk to the table.',
    'The oven does the talking. You are here for a pie, not a salad with ambition.',
    'A good slice here should taste like the style on the sign, not like a compromise between three cities.',
  ],
  Sushi: [
    'The fish has to be the point and the rice has to keep up. Sit at the counter if they will let you.',
    'Skip the novelty rolls until you have tasted the simpler fish. That is the whole test.',
    'Omakase and a neighborhood sushi bar are different sports. Take this one on its own terms.',
  ],
  Coffee: [
    'Taste the coffee before you colonize a table. Some of these rooms are for laptops and some are not.',
    'The useful question is the cup in your hand, not the playlist.',
    'Order at the bar, then decide if this is a stay-awhile cafe or a take-the-cup-outside cafe.',
  ],
  Bakery: [
    'Go early. Butter, salt, and a short line beat a pretty case at 2pm.',
    'Pick one laminated thing and one that is not. That is enough research for a morning.',
    'If the case looks tired, come back at opening instead of negotiating with yesterday.',
  ],
  Seafood: [
    'This is a water city, so the bar is simple: the fish should taste like it had a recent relationship with water.',
    'Order the straightforward seafood before the composed plate. You will learn the kitchen faster.',
    'Chowder, oysters, or a piece of fish. Pick the one the room is actually set up to do.',
  ],
  Italian: [
    'Look for a short menu and a pasta that tastes like the sauce was introduced to the noodle in the pan.',
    'Bread, a pasta, and something bitter on the side will tell you if the kitchen means it.',
    'If they mill or stuff the pasta in house, start there. Leave the chicken for a lesser night.',
  ],
  Sandwiches: [
    'A sandwich lives or dies on the bread and the amount of filling that stays inside it.',
    'Eat it soon. The best version is the one that has not been wrapped for a commute.',
    'One sandwich is the test. Do not build a tasting menu out of a counter.',
  ],
  Burgers: [
    'The patty, the bun, and the temperature of the cheese. Everything else is scenery.',
    'Eat it on site. A burger that travels is a different, sadder food.',
    'Fries can come along, but the burger is the vote.',
  ],
  Mexican: [
    'Tortilla first, salsa second, then whatever is folded inside. That order keeps you honest.',
    'If there is a salsa bar, use it. If there is not, the kitchen already made the decision.',
    'Tacos, not a platter the size of a hubcap, will tell you whether to come back.',
  ],
  Ramen: [
    'The broth is the review. Noodles should still have a bite when they hit the bowl.',
    'Eat it while it is violent and hot. Ramen does not wait politely.',
    'Start with the house bowl before you customize it into oblivion.',
  ],
  Cocktails: [
    'Order one drink made the way the bar wants, then decide if you are staying.',
    'The room matters as much as the glass. If you cannot hear your friend, that is the review.',
    'A well-made classic beats a menu pun. Start there.',
  ],
  Wine: [
    'Ask for a glass in the style you already like, then let them move you one step over.',
    'The list should be usable without a lecture. If it is not, sit at the bar where questions are cheaper.',
    'Food can be small. The pour is why you came.',
  ],
  Beer: [
    'Taste the house beer before the guest taps. That is the brewery, the rest is a fridge.',
    'A pint and a simple plate. Save the flight for when you are not hungry.',
    'If the room is a hangar, pick a seat where you can still talk.',
  ],
  'Ice Cream': [
    'Two scoops is plenty of data. Get the flavor they are known for, not the one that sounds clever.',
    'Eat it before it becomes a glove. Seattle weather will not help you.',
    'Cone or cup is a structural choice. Commit.',
  ],
  Donuts: [
    'Buy what came out of the fryer recently. Sugar on a cold donut is just costume.',
    'One glazed, one with a point of view. Leave the dozen for a group that asked.',
    'Morning is the whole strategy.',
  ],
  Bagels: [
    'The chew is the review. Schmear is a supporting actor.',
    'Toast only if you must. A fresh bagel does not need to be punished.',
    'Get it in the morning. A bagel at 4pm is a different object.',
  ],
  default: [
    'Order the thing the place is obviously set up to make. Save the experiments for the second visit.',
    'The first plate should taste like the cuisine on the sign, not like a mood board.',
    'If you cannot tell what they want to be known for, ask the person at the pass and follow that.',
  ],
}

function sensory(place, seed) {
  const cuisine = place.cuisine[0]
  const bank = CUISINE_SENSORY[cuisine] ?? CUISINE_SENSORY.default
  return pick(bank, seed)
}

function perfectFor(place) {
  const tags = new Set()
  const type = place.placeType.toLowerCase()
  const cuisine = place.cuisine.join(' ').toLowerCase()
  const late = place.periods.some((period) => period.end >= 23 * 60 || (period.end <= 120 && period.start >= 16 * 60))
  const early = place.periods.some((period) => period.start <= 9 * 60 && period.start > 0)
  if (place.price === 1) tags.add('Cheap Eats')
  if (place.price >= 3) tags.add('Special Occasion')
  if (place.price >= 3 && /restaurant/.test(type)) tags.add('Date Night')
  if (place.price === 2 && /restaurant/.test(type)) tags.add('Weeknight Dinner')
  if (/counter|coffee|bakery|cafe|dessert/.test(type)) tags.add('Walk-Ins')
  if (/coffee|bakery|cafe/.test(type) || /coffee|bakery/.test(cuisine)) tags.add('Coffee & Pastry')
  if (/coffee|cafe/.test(type)) tags.add('Work From Café')
  if (/brunch|breakfast/.test(cuisine) || early) tags.add(early && !/brunch/.test(cuisine) ? 'Breakfast' : 'Brunch')
  if (/cocktail|rooftop|wine|bar/.test(type) || cuisine === 'cocktails' || cuisine === 'wine') tags.add(/wine/.test(type) || cuisine === 'wine' ? 'Wine' : 'Cocktails')
  if (/brew|beer|pub/.test(type) || cuisine === 'beer') tags.add('Beer')
  if (/rooftop|view/.test(type)) tags.add('View')
  if (late) tags.add('Late Night')
  if (/counter|sandwich|burger/.test(type) || /sandwich|burger/.test(cuisine)) tags.add('Lunch')
  if (/restaurant/.test(type) && place.price <= 2) tags.add('Solo')
  if (place.neighborhood === 'Pike Place Market') tags.add('Out-Of-Towners')
  if (/seafood|oyster/.test(cuisine)) tags.add('Out-Of-Towners')
  const list = [...tags]
  if (list.length < 2) {
    list.push(place.price <= 2 ? 'Weeknight Dinner' : 'Date Night')
    if (!list.includes('Walk-Ins') && place.price <= 2) list.push('Walk-Ins')
  }
  return list.slice(0, 5)
}

function mood(place) {
  if (place.price >= 4) return 'a jacket-and-a-plan room'
  if (place.price === 3) return 'a nice-night room'
  if (place.price === 1) return 'a counter you can hit without a group chat'
  if (/counter|coffee|bakery|dessert/.test(place.placeType)) return 'a small room built for eating now'
  return 'a regular-night table'
}

function hook(place, angle, seed) {
  const cuisine = place.cuisine[0].toLowerCase()
  const hood = place.neighborhood
  const banks = {
    pizza: [
      `${place.name} is the ${hood} answer when the craving is a pie, not a salad with melted cheese on it.`,
      `At ${place.name}, the crust is the whole conversation. ${hood} just happens to be where the oven lives.`,
      `${place.name} does pizza the way ${hood} actually eats it: hot, salty, and worth the walk.`,
    ],
    coffee: [
      `${place.name} is the cup that gets you out of the apartment and into ${hood}.`,
      `Order at ${place.name} before you claim a seat. The coffee is the point; the playlist is scenery.`,
      `${hood} has plenty of places to stare at a laptop. ${place.name} is for the cup.`,
    ],
    date: [
      `${place.name} is where you take someone when ${hood} should feel like a night, not an errand.`,
      `Two chairs, low light, and ${cuisine} at ${place.name}. That is a date in ${hood}.`,
      `${place.name} has the volume right: alive enough to feel out, quiet enough to hear the person across the table.`,
    ],
    neighborhood: [
      `${place.name} is the ${cuisine} move when you are already in ${hood} and hungry for real.`,
      `Stay in ${hood}. ${place.name} cooks ${cuisine} and does not make you cross the ship canal for it.`,
      `${hood} evenings get better if ${place.name} is on the walk home.`,
    ],
    cheap: [
      `${place.name} feeds you ${cuisine} in ${hood} and still leaves enough for a second thing.`,
      `The pleasure at ${place.name} is the food and the receipt, in that order.`,
      `${place.name} is the ${hood} lunch that does not require a strategy.`,
    ],
    late: [
      `${place.name} is still cooking ${cuisine} when ${hood} has mostly gone home.`,
      `After midnight, standards drop. ${place.name} is the exception in ${hood}.`,
      `Come to ${place.name} when the sensible kitchens are dark and you still want ${cuisine}.`,
    ],
    drinks: [
      `${place.name} is a ${place.placeType} in ${hood}. Start with one drink made the way they like it.`,
      `The glass comes first at ${place.name}. Food can arrive as a rumor that turns out to be true.`,
      `${hood} at night needs a room. ${place.name} is that room, with ${cuisine} if you stay.`,
    ],
    breakfast: [
      `${place.name} understands morning in ${hood}: go early, eat something warm, leave before the day gets cute.`,
      `Breakfast at ${place.name} is a reason to be in ${hood} before the rest of the street wakes up.`,
    ],
    happy: [
      `${place.name} is the after-work landing in ${hood}. One round, then decide if you are staying for dinner.`,
    ],
    default: [
      `${place.name} cooks ${cuisine} in ${hood}, and that is exactly the meal to show up for.`,
      `When ${hood} is the plan, ${place.name} is the ${cuisine} that makes the plan worth it.`,
      `${place.name} is ${mood(place)} with ${cuisine} on the plate.`,
    ],
  }
  const bank = banks[angle] ?? banks.default
  return pick(bank, seed)
}

function roomLine(place, seed) {
  const lines = [
    place.price >= 3
      ? `Dress like you meant to leave the house. ${place.name} is not a counter with a stack of napkins.`
      : /counter|coffee|bakery|dessert/.test(place.placeType)
        ? `It is a counter and a short wait. Eat it while it is still itself.`
        : `The room fits a friend, a date, or you and the corner if the light is kind.`,
    `${place.neighborhood} does the walk. ${place.name} has to earn the blocks.`,
    place.price === 1
      ? `Spend what you did not spend on a second order. This is not a tasting menu, and that is the compliment.`
      : `Look at the menu before you fall in love with the table. The prices should match the night you planned.`,
  ]
  return pick(lines, seed + 'room')
}

function tip(place, angle, seed) {
  const early = place.periods.some((period) => period.start > 0 && period.start <= 9 * 60)
  const late = place.periods.some((period) => period.end >= 23 * 60 || period.end === 24 * 60)
  if (angle === 'breakfast' || (early && angle !== 'late')) return `Come before ${place.neighborhood} is fully awake. Morning food gets worse on your schedule, not theirs.`
  if (angle === 'late' || late) return `Night is the assignment. Go when you are actually hungry, not when you are touring.`
  if (angle === 'happy') return `Stay for one drink and see if the room talks you into dinner.`
  if (place.orderThis.length) return `If the menu stares back, start with the ${place.orderThis[0].dish.toLowerCase()}. ${place.orderThis[0].note}`
  const tips = [
    `Order the thing the place is built to make, then wander on the second visit.`,
    `A full table is a good sign. A quiet one can be, too. Taste the food before you decide which.`,
    `Eat it here. ${place.cuisine[0]} rarely improves in a box on the passenger seat.`,
  ]
  return pick(tips, seed + 'tip')
}

function fitText(parts, min, max) {
  const chosen = []
  for (const part of parts) {
    const next = [...chosen, part].join(' ')
    if (wordCount(next) > max && chosen.length) break
    chosen.push(part)
  }
  let text = chosen.join(' ')
  const pad = 'Go hungry. The pleasure is the plate in front of you.'
  if (wordCount(text) < min) text = `${text} ${pad}`
  if (wordCount(text) > max) {
    const trimmed = words(text).slice(0, max)
    text = trimmed.join(' ')
    if (!/[.!?]$/.test(text)) text += '.'
  }
  return text
}

function blurb(place, angle) {
  const seed = `${place.id}:${angle}`
  return fitText([hook(place, angle, seed), sensory(place, seed), roomLine(place, seed), tip(place, angle, seed)], 40, 90)
}

function oneLiner(place) {
  const cuisine = place.cuisine[0].toLowerCase()
  const options = [
    `${cuisine} worth the walk in ${place.neighborhood}.`,
    `Hot, salty, and exactly the point.`,
    `Come hungry. Leave ${place.neighborhood} happier.`,
    `${place.neighborhood} ${cuisine}, done properly.`,
    `The night gets simpler once you are seated.`,
  ].filter((line) => wordCount(line) <= 15)
  return options[hash(place.id) % options.length]
}

function pullQuote(place, angle) {
  const cuisine = place.cuisine[0].toLowerCase()
  const options = [
    oneLiner(place),
    angle === 'pizza' ? 'Come for the pie. Stay for the crust.' : '',
    angle === 'coffee' ? 'A cup worth leaving the house for.' : '',
    angle === 'date' ? 'Loud enough to feel alive, quiet enough to talk.' : '',
    angle === 'cheap' ? 'A full meal and a humane receipt.' : '',
    angle === 'drinks' ? 'One great drink, then see what happens.' : '',
    `The ${cuisine} you want when you are in ${place.neighborhood}.`,
  ].filter((line) => line && wordCount(line) <= 16)
  return options[hash(`${place.id}:${angle}:q`) % options.length]
}

function review(place) {
  const seed = `${place.id}:page`
  const cuisine = place.cuisine[0].toLowerCase()
  const order = place.orderThis[0]
  const first = fitText(
    [
      `${place.name} is ${mood(place)} in ${place.neighborhood}, and the meal is ${cuisine}.`,
      sensory(place, seed),
      order
        ? `Start with the ${order.dish.toLowerCase()}. ${order.note}`
        : `Order what the room is obviously set up to cook. The first plate should taste like ${cuisine}, not like a mood board.`,
    ],
    45,
    85,
  )
  const second = fitText(
    [
      roomLine(place, seed),
      place.perfectFor.includes('Date Night')
        ? `Bring someone you want to talk to. The lighting is doing you a favor.`
        : `Bring whoever already agreed to ${cuisine}. This is not the night to negotiate the cuisine.`,
      place.price >= 3
        ? `Spend it when the night is actually a night. A random Tuesday can qualify if you treat it like one.`
        : `It belongs on a normal week, which is better than calling it a destination.`,
    ],
    40,
    85,
  )
  const third = fitText(
    [
      tip(place, 'page', seed),
      `${place.neighborhood} is half the pleasure: the walk in, the door, the first bite.`,
      place.periods.length
        ? `Go when you are hungry and the lights are on. A good table still loses to bad timing.`
        : `Call ahead if you are bringing people. A full room is part of the charm until it is your problem.`,
    ],
    40,
    80,
  )
  return [first, second, third].join('\n\n')
}

const sortApple = new Map()
const sortPublic = new Map()

function publicScore(place) {
  const apple = sortApple.get(place.id) ?? 0
  const user = sortPublic.get(place.id) ?? 0
  return Math.max(apple, user)
}

const taken = new Set()
const launch = rawPlaces.filter(isLaunch).map((place) => {
  const id = uniqueSlug(place.name, taken)
  taken.add(id)
  const cuisine = String(place.cuisine || 'Restaurant')
    .split(/[,/]/)
    .map((part) => part.replace(/\(.*\)/, '').trim())
    .filter(Boolean)
    .slice(0, 2)
  const ids = providerIds[String(place.muid)] ?? providerIds[place.muid] ?? {}
  const applePercent = typeof place.apple_rating === 'string' ? Number(place.apple_rating.replace('%', '')) : null
  const yelpSlug = typeof ids.yelp_ids?.[0] === 'string' ? ids.yelp_ids[0].trim() : ''
  const ratingSource = place.user_rating_source
  const next = {
    id,
    muid: String(place.muid),
    name: place.name,
    neighborhood: place.neighborhood || 'Seattle',
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    cuisine: cuisine.length ? cuisine : ['Restaurant'],
    placeType: place.type || 'restaurant',
    price: priceTier(place.price_tier),
    gustoScore: null,
    periods: parseHours(place.hours),
    hoursLabel: place.hours || '',
    phone: place.phone || undefined,
    website: httpUrl(place.website),
    appleMapsUrl: `https://maps.apple.com/?daddr=${place.lat},${place.lng}&q=${encodeURIComponent(place.name)}`,
    applePlaceUrl:
      typeof place.apple_url === 'string' && place.apple_url.includes('auid=')
        ? place.apple_url
        : `https://maps.apple.com/place?auid=${place.muid}`,
    publicRating:
      ratingSource === 'Yelp' && typeof place.user_rating === 'number'
        ? { value: place.user_rating, count: place.user_rating_count ?? 0, source: 'Yelp' }
        : undefined,
    yelpSlug: yelpSlug || undefined,
    ids: {
      fsq: ids.fsq_ids?.[0],
      yelp: yelpSlug || undefined,
    },
    copySource: 'draft',
    updatedAt: UPDATED,
    chain: place.chain_group || null,
    orderThis: orderFor(place.name),
    perfectFor: [],
    oneLiner: '',
    blurb: '',
    photos: [
      ...(wikiById.get(`muid:${place.muid}`) ?? []),
      {
        source: 'illustration',
        isIllustration: true,
        alt: `Illustration suggesting ${cuisine[0] || 'a meal'} at ${place.name}`,
        credit: 'Illustration',
      },
    ],
  }
  next.perfectFor = perfectFor(next)
  if (Number.isFinite(applePercent)) sortApple.set(id, applePercent / 10)
  if (typeof place.user_rating === 'number' && (ratingSource === 'Yelp' || ratingSource === 'OpenTable')) {
    sortPublic.set(id, place.user_rating * 2)
  }
  return next
})

for (const { label, muid } of loadLocationOverrides().values()) {
  const kept = launch.find((place) => place.muid === muid)
  if (!kept) throw new Error(`location override ${label} kept ${muid}, but that place is not live`)
}

function titleName(title) {
  return normName(String(title || '').replace(/\s+in\s+.+$/i, ''))
}

const slugsByName = new Map()
for (const record of Object.values(providerIds)) {
  if (!/seattle/i.test(record?.title || '')) continue
  const slug = typeof record.yelp_ids?.[0] === 'string' ? record.yelp_ids[0].trim() : ''
  const key = titleName(record.title)
  if (!slug || !key) continue
  const set = slugsByName.get(key) ?? new Set()
  set.add(slug)
  slugsByName.set(key, set)
}

const usedYelp = new Set(launch.map((place) => place.yelpSlug).filter(Boolean))
let yelpNameMatches = 0
for (const place of launch) {
  if (place.yelpSlug) continue
  const slugs = slugsByName.get(normName(place.name))
  if (!slugs || slugs.size !== 1) continue
  const slug = [...slugs][0]
  if (usedYelp.has(slug)) continue
  place.yelpSlug = slug
  place.ids.yelp = slug
  usedYelp.add(slug)
  yelpNameMatches += 1
}

const houseCopy = JSON.parse(readFileSync(join(root, 'data/house-copy.json'), 'utf8'))
const funDiveSource = JSON.parse(readFileSync(join(root, 'data/fun-dive-bars.json'), 'utf8'))
const handDiveByName = new Map(funDiveSource.entries.map((item) => [normName(item.name), item]))
const guideQuotes = new Map()

for (const place of launch) {
  const hand = handDiveByName.get(normName(place.name))
  if (hand) {
    place.oneLiner = hand.pullQuote
    place.blurb = hand.blurb
    continue
  }
  const copy = houseCopy[place.id]
  if (!copy?.blurb) throw new Error(`Missing house copy for ${place.name} (${place.id})`)
  place.oneLiner = String(copy.pullQuote || '').trim()
  place.blurb = String(copy.blurb).trim()
  guideQuotes.set(place.id, copy.guideQuotes && typeof copy.guideQuotes === 'object' ? copy.guideQuotes : {})
}

const byNorm = new Map()
for (const place of launch) {
  const key = normName(place.name)
  const list = byNorm.get(key) ?? []
  list.push(place)
  byNorm.set(key, list)
}

const launchByMuid = new Map(launch.map((place) => [place.muid, place]))
for (const source of rawPlaces) {
  if (!source?.hidden_reason || !source.name) continue
  const kept = launchByMuid.get(String(source.hidden_kept_muid))
  if (!kept) throw new Error(`${source.name} (${source.neighborhood}) is hidden as another location, but its kept location ${source.hidden_kept_muid} is not live`)
  const key = normName(source.name)
  if (!byNorm.has(key)) byNorm.set(key, [kept])
}

const unmatched = []
function resolveMembers(names) {
  const found = []
  const seen = new Set()
  for (const name of names ?? []) {
    const hits = byNorm.get(normName(name))
    if (!hits?.length) {
      unmatched.push(name)
      continue
    }
    for (const place of hits) {
      if (seen.has(place.id)) continue
      seen.add(place.id)
      found.push(place)
    }
  }
  return found
}

function sortDraft(list, priority = []) {
  const rank = new Map(priority.map((name, index) => [normName(name), index]))
  return list.slice().sort((a, b) => {
    const ar = rank.has(normName(a.name)) ? rank.get(normName(a.name)) : 100
    const br = rank.has(normName(b.name)) ? rank.get(normName(b.name)) : 100
    if (ar !== br) return ar - br
    return publicScore(b) - publicScore(a) || a.name.localeCompare(b.name)
  })
}

function diversify(list, cap, maxPerCuisine = 4) {
  const picked = []
  const counts = new Map()
  const rest = []
  for (const place of list) {
    const key = place.cuisine[0]
    const used = counts.get(key) ?? 0
    if (used < maxPerCuisine && picked.length < cap) {
      picked.push(place)
      counts.set(key, used + 1)
    } else rest.push(place)
  }
  for (const place of rest) {
    if (picked.length >= cap) break
    picked.push(place)
  }
  return picked.slice(0, cap)
}

function angleFor(group, slug) {
  if (slug.includes('pizza')) return 'pizza'
  if (slug.includes('coffee')) return 'coffee'
  if (slug.includes('date') || slug.includes('parent') || slug.includes('occasion')) return 'date'
  if (slug.includes('cheap') || slug.includes('under')) return 'cheap'
  if (slug.includes('late')) return 'late'
  if (slug.includes('breakfast') || slug.includes('brunch')) return 'breakfast'
  if (slug.includes('happy')) return 'happy'
  if (group === 'Neighborhoods') return 'neighborhood'
  if (group === 'Drinks') return 'drinks'
  return 'default'
}

const guides = []
function addGuide(guide) {
  const entries = guide.places.map((place) => ({
    placeId: place.id,
    pullQuote: guideQuotes.get(place.id)?.[guide.slug] || place.oneLiner,
    blurb: place.blurb,
    copySource: 'draft',
  }))
  if (entries.length < 8 || entries.length > 40) {
    console.warn(`guide size ${entries.length}: ${guide.slug}`)
  }
  guides.push({
    slug: guide.slug,
    title: guide.title,
    dek: guide.dek,
    group: guide.group,
    intro: guide.intro,
    updatedAt: UPDATED,
    ranked: guide.ranked,
    entries,
  })
}

function intro(title, dek, places, angle) {
  const names = places.slice(0, 3).map((place) => place.name)
  const hoods = [...new Set(places.map((place) => place.neighborhood))].slice(0, 3)
  const cast = names.length >= 2 ? `${names[0]} and ${names[1]}` : names[0] ?? title
  const where = hoods.length ? hoods.join(', ') : 'Seattle'
  const openers = {
    pizza: `${dek} ${cast} are the argument. Everyone else is what you eat when the oven you wanted is slammed or you are on the wrong side of the water.`,
    coffee: `${dek} ${cast} are worth putting on a coat for. The rest of ${where} can keep the mugs that taste like a waiting room.`,
    neighborhood: `${title} eats well if you let it. ${cast} cover the cravings, and the walks between them are short enough to stay hungry.`,
    drinks: `${dek} Start at ${names[0] ?? 'the bar'}. If the room is right, you will not need a second plan.`,
    date: `${dek} ${cast} are where the night should feel like you left the house for a reason.`,
    cheap: `${dek} ${cast} prove a good meal does not need a reservation or a second mortgage.`,
    late: `${dek} ${cast} are still going when the rest of ${where} has turned into porch lights.`,
    breakfast: `${dek} ${cast} taste better before the day gets ambitious.`,
    default: `${dek} ${cast} are the ones to remember. The rest of the list is how you eat through ${where} without repeating yourself.`,
  }
  const second = {
    pizza: `Judge a pie by the underside: blister, salt, and whether the middle survives the trip to the table. Styles sit next to each other because that is how the city actually eats, from a wood oven to a square slice on a paper plate.`,
    coffee: `Taste it before you colonize a table. Some of these rooms want you to stay. Some want you back on the sidewalk with a hot cup and somewhere to be.`,
    neighborhood: `Same craving does not get to take over the page. A neighborhood should feel like a week of dinners, not one cuisine copied down the block.`,
    drinks: `Order one drink the way the bar wants it, then decide if you are staying. A well-made classic beats a menu pun. Food is welcome. It is not the cover charge.`,
    date: `The test is simple: can you hear each other, and is the food good enough that the check feels like part of the night instead of the ending.`,
    cheap: `Counters, small rooms, and the kind of receipt you can explain to yourself later. Eat it there. A lot of this food gets worse in a car.`,
    late: `Hunger after dark is a different animal. These are the kitchens and bars that still take it seriously.`,
    breakfast: `Go early. Butter, salt, and a short line beat a pretty case in the afternoon.`,
    default: `Come hungry and order the obvious thing. ${where} will still be there when you want to get weird on the second visit.`,
  }
  const key = openers[angle] ? angle : 'default'
  return [openers[key], second[key]].join('\n\n')
}

const themeGuides = [
  ['Pike Place Market Essentials', 'pike-place', 'Best of', false, 'The counters, bars, and bakeries inside the market, stall by stall.'],
  ['Best Pizza in Seattle', 'best-pizza', 'Cuisine', true, 'Neapolitan, New York, Detroit, tavern, and the squares.', 'Delancey', "Dino's Tomato Pie", 'Lupo', 'Serious Pie', 'Moto Pizza', 'Windy City Pie', 'Post Alley Pizza'],
  ['Best Sushi & Omakase', 'best-sushi', 'Cuisine', true, 'Counters and dining rooms, from a weeknight roll to an omakase seat.'],
  ['Best Coffee Shops', 'best-coffee', 'Drinks', false, 'Cafes and roasters worth leaving the apartment for.'],
  ['Best Bakeries & Pastry', 'best-bakeries', 'Cuisine', false, 'Laminated dough, cakes, and the case you hit before noon.'],
  ['Donuts & Bagels', 'donuts-bagels', 'Cuisine', false, 'Fried dough and boiled bread, morning division.'],
  ['Ice Cream & Dessert', 'ice-cream', 'Cuisine', false, 'Scoops, soft serve when the sign says so, and the sweet stop.'],
  ['Best Cocktail Bars', 'cocktail-bars', 'Drinks', false, 'Rooms built for a drink, not a dinner that happens to have a bar.'],
  ['Rooftop Bars & Restaurants With A View', 'rooftops', 'Drinks', false, 'High floors and sightlines. A patio is not claimed unless the place is already a view bar.'],
  ['Wine Bars', 'wine-bars', 'Drinks', false, 'Lists you can use, and seats where a glass is the plan.'],
  ['Breweries & Beer Bars', 'beer', 'Drinks', false, 'House beer, pubs, and the louder pint.'],
  ['Date Night', 'date-night', 'Occasion', false, 'Rooms where a table for two is the point.'],
  ['Special Occasion / Splurge', 'splurge', 'Occasion', false, 'The expensive rooms, for when the night needs a jacket.'],
  ['Cheap Eats', 'cheap-eats', 'Best of', false, 'The $ tier: counters and small rooms with a humane receipt.'],
  ['Best Brunch', 'brunch', 'Occasion', false, 'Late breakfast that is still worth the wait you chose.'],
  ['Happy Hour', 'happy-hour', 'Occasion', false, 'After-work bars and kitchens, when one round should turn into dinner.'],
  ['Best Sandwiches', 'sandwiches', 'Cuisine', true, 'Bread, filling, and the ones you eat before they steam themselves.'],
  ['Best Burgers', 'burgers', 'Cuisine', true, 'Patties from drive-in to sit-down.'],
  ['Italian & Pasta', 'italian', 'Cuisine', false, 'Pasta shops and Italian dining rooms, not another pizza list.'],
  ['Seafood & Oysters', 'seafood', 'Cuisine', false, 'Fish, oysters, and chowder, because the city is made of water.'],
  ['Ramen, Pho & Noodles', 'noodles', 'Cuisine', false, 'Bowls for gray weather: ramen, phở, and the other noodles.'],
  ['Tacos & Mexican', 'tacos', 'Cuisine', false, 'Tacos first, then the wider Mexican rooms.'],
  ['Steakhouses', 'steakhouses', 'Cuisine', false, 'Steaks, grills, and the rooms that smell like butter.'],
  ['Seattle Classics & Institutions', 'classics', 'Best of', false, 'The places that already belong to the city.'],
]

for (const theme of themes) {
  if (theme.sub_guides) continue
  const spec = themeGuides.find((item) => item[0] === theme.theme)
  if (!spec) {
    console.warn('unmapped theme', theme.theme)
    continue
  }
  const [, slug, group, ranked, dek, ...priority] = spec
  let places = sortDraft(resolveMembers(theme.members), priority)
  if (slug === 'burgers' && places.length < 8) {
    const extra = launch.filter((place) => /burger/i.test(`${place.name} ${place.cuisine.join(' ')} ${place.placeType}`))
    places = sortDraft([...new Map([...places, ...extra].map((place) => [place.id, place])).values()], priority)
  }
  places = diversify(places, 40, slug === 'pike-place' ? 8 : 6)
  const angle = angleFor(group, slug)
  addGuide({
    slug,
    title: theme.theme,
    dek,
    group,
    ranked,
    angle,
    places,
    intro: intro(theme.theme, dek, places, angle),
  })
}

for (const sub of themes.find((theme) => theme.sub_guides).sub_guides) {
  let label = sub.neighborhood
  let members = sub.members
  if (label === 'Georgetown') {
    label = 'Georgetown & SoDo'
    const sodo = launch.filter((place) => place.neighborhood === 'SoDo').map((place) => place.name)
    members = [...members, ...sodo]
  }
  const slug = slugify(label)
  let places = diversify(sortDraft(resolveMembers(members)), 40, 3)
  addGuide({
    slug,
    title: label,
    dek: `Where to eat and drink in ${label}, from a weeknight to a night you bothered to dress for.`,
    group: 'Neighborhoods',
    ranked: false,
    angle: 'neighborhood',
    places,
    intro: intro(label, `Where to eat and drink in ${label}, from a weeknight to a night you bothered to dress for.`, places, 'neighborhood'),
  })
}

function filterGuide(slug, title, dek, group, ranked, angle, predicate, cap = 24) {
  const places = diversify(sortDraft(launch.filter(predicate)), cap, 4)
  if (places.length < 8) {
    console.warn('skip short derived', slug, places.length)
    return
  }
  addGuide({
    slug,
    title,
    dek,
    group,
    ranked,
    angle,
    places,
    intro: intro(title, dek, places, angle),
  })
}

filterGuide('breakfast-before-9', 'Breakfast Before 9am', 'Open by 9, which is when breakfast still tastes like breakfast.', 'Best of', false, 'breakfast', (place) => place.periods.some((period) => period.start > 0 && period.start <= 9 * 60))
filterGuide('late-night', 'Late-Night Eats', 'Kitchens and bars still going at 11pm or later.', 'Occasion', false, 'late', (place) => place.periods.some((period) => period.end >= 23 * 60 || period.end === 24 * 60))
filterGuide('dumplings', 'Dumplings & Dim Sum', 'Dumpling houses and dim sum, soup first.', 'Cuisine', false, 'default', (place) => /dumpling|dim sum|gyoza|xiao/i.test(`${place.name} ${place.cuisine.join(' ')} ${place.placeType}`))
filterGuide('teriyaki', 'Teriyaki & Other Seattle Things', 'Teriyaki, the local weeknight.', 'Cuisine', false, 'default', (place) => /teriyaki/i.test(`${place.name} ${place.cuisine.join(' ')}`))
filterGuide('big-group', 'Big Group Dinners That Don\'t Suck', 'Breweries, halls, and the louder rooms.', 'Occasion', false, 'default', (place) => /brew|pub|beer hall|sports bar|haus/.test(`${place.placeType} ${place.name}`.toLowerCase()))
filterGuide('walk-in', 'Walk-In Friendly', 'Counters, cafes, bakeries, and other places built for showing up.', 'Occasion', false, 'default', (place) => /counter|coffee|bakery|dessert|cafe/.test(place.placeType))
filterGuide('bring-the-parents', 'Bring The Parents', 'The spendier dining rooms, when the visit needs a tablecloth mood.', 'Occasion', false, 'date', (place) => place.price >= 3 && /restaurant|steak|sushi/.test(place.placeType))
filterGuide('the-bar-list', 'The Bar List', 'Cocktails, wine, and the dives worth standing in.', 'Drinks', false, 'drinks', (place) => place.placeType.includes('bar') || place.placeType === 'pub' || place.cuisine[0] === 'Cocktails' || place.cuisine[0] === 'Wine')

const funDive = JSON.parse(readFileSync(join(root, 'data/fun-dive-bars.json'), 'utf8'))
const funDiveEntries = []
for (const item of funDive.entries) {
  const hits = byNorm.get(normName(item.name)) ?? []
  if (hits.length !== 1) throw new Error(`Fun & dive bars expected one live place for ${item.name}, found ${hits.length}`)
  funDiveEntries.push({
    placeId: hits[0].id,
    pullQuote: item.pullQuote,
    blurb: item.blurb,
    vibe: item.vibe,
    copySource: 'draft',
  })
}
guides.push({
  slug: funDive.slug,
  title: funDive.title,
  dek: funDive.dek,
  group: funDive.group,
  intro: funDive.intro,
  updatedAt: UPDATED,
  ranked: false,
  entries: funDiveEntries,
})

const gustoPool = diversify(
  sortDraft(launch.filter((place) => /restaurant|sushi|steak|seafood/.test(place.placeType) && place.price >= 2)),
  25,
  2,
)
addGuide({
  slug: 'gustos-25',
  title: "Gusto's 25",
  dek: 'Twenty-five dining rooms for when dinner should feel like an event.',
  group: 'Best of',
  ranked: false,
  angle: 'default',
  places: gustoPool,
  intro: intro("Gusto's 25", 'Twenty-five rooms for when dinner should feel like an event, spread across the city so you do not eat the same night twice.', gustoPool, 'default'),
})

const guideSlugsByPlace = new Map(launch.map((place) => [place.id, []]))
for (const guide of guides) {
  for (const entry of guide.entries) guideSlugsByPlace.get(entry.placeId)?.push(guide.slug)
}

const slim = launch.map((place) => ({
  id: place.id,
  name: place.name,
  neighborhood: place.neighborhood,
  address: place.address,
  lat: place.lat,
  lng: place.lng,
  cuisine: place.cuisine,
  placeType: place.placeType,
  price: place.price,
  oneLiner: place.oneLiner,
  perfectFor: place.perfectFor,
  periods: place.periods,
  ...(place.publicRating?.source === 'Yelp' ? { publicRating: place.publicRating } : {}),
  gustoScore: null,
  photo: place.photos[0],
  website: place.website,
  phone: place.phone,
  appleMapsUrl: place.appleMapsUrl,
  applePlaceUrl: place.applePlaceUrl,
  yelpSlug: place.yelpSlug,
  guideSlugs: guideSlugsByPlace.get(place.id) ?? [],
}))

const full = Object.fromEntries(
  launch.map((place) => [
    place.id,
    {
      ...place,
      guideSlugs: guideSlugsByPlace.get(place.id) ?? [],
      chain: undefined,
    },
  ]),
)

const hidden = rawPlaces.filter(isHidden).map((place) => ({
  id: slugify(place.name),
  name: place.name,
  city: place.city,
  neighborhood: place.neighborhood,
  lat: place.lat,
  lng: place.lng,
  reason: 'outside_seattle',
}))

const demoPlaces = ['canlis', 'spinasse', 'delancey', 'dinos-tomato-pie', 'paseo', 'market-grill', 'tacos-chukis', 'the-pink-door', 'canon', 'dough-zone', 'salumi', 'beechers-handmade-cheese'].filter((id) => full[id])
function scores(ids, values) {
  const out = {}
  ids.forEach((id, index) => {
    if (full[id]) out[id] = values[index]
  })
  return out
}
const minaScores = scores(demoPlaces, [9.4, 9.1, 8.8, 8.4, 9.2, 8.6, 8.2, 8.7, 8.9, 8.0, 8.5, 7.8])
const leoScores = scores(demoPlaces, [8.2, 8.6, 9.2, 9.0, 8.4, 8.8, 8.9, 7.6, 8.1, 8.7, 8.0, 8.3])
const samScores = scores(demoPlaces, [9.6, 9.0, 7.9, 8.1, 8.8, 8.2, 7.7, 9.1, 9.3, 7.4, 8.7, 8.0])

const demo = {
  users: [
    { id: 'demo-mina', name: 'Mina Cho', handle: 'mina', demo: true, neighborhood: 'Capitol Hill', streak: 6, scores: minaScores, been: Object.keys(minaScores) },
    { id: 'demo-leo', name: 'Leo Park', handle: 'leo', demo: true, neighborhood: 'Ballard', streak: 3, scores: leoScores, been: Object.keys(leoScores) },
    { id: 'demo-sam', name: 'Sam Ortega', handle: 'sam', demo: true, neighborhood: 'Columbia City', streak: 4, scores: samScores, been: Object.keys(samScores) },
  ],
  activities: [
    { id: 'act-mina-spinasse', userId: 'demo-mina', type: 'rated', placeId: 'spinasse', text: 'Weeknight pasta. The tajarin was the whole point.', score: 9.1, createdAt: '2026-10-16T02:00:00.000Z' },
    { id: 'act-leo-delancey', userId: 'demo-leo', type: 'been', placeId: 'delancey', text: 'Pie, Ballard, done.', createdAt: '2026-10-15T03:00:00.000Z' },
    { id: 'act-sam-canlis', userId: 'demo-sam', type: 'rated', placeId: 'canlis', text: 'Parents survived. We will be invited back.', score: 9.6, createdAt: '2026-10-14T04:00:00.000Z' },
    { id: 'act-mina-list', userId: 'demo-mina', type: 'list', listId: 'list-weeknight', listTitle: 'Weeknight, no reservations', text: 'Started a shared list.', createdAt: '2026-10-13T18:00:00.000Z' },
    { id: 'act-leo-chukis', userId: 'demo-leo', type: 'saved', placeId: 'tacos-chukis', text: 'Saved for a rainy walk.', createdAt: '2026-10-12T20:00:00.000Z' },
  ].filter((item) => !item.placeId || full[item.placeId]),
  lists: [
    {
      id: 'list-weeknight',
      title: 'Weeknight, no reservations',
      ownerId: 'demo-mina',
      collaboratorIds: ['demo-leo'],
      shared: true,
      demo: true,
      placeIds: ['tacos-chukis', 'dinos-tomato-pie', 'dough-zone'].filter((id) => full[id]),
    },
  ],
  plans: [
    {
      id: 'plan-friday',
      title: 'Friday, somewhere with a real table',
      hostId: 'demo-sam',
      demo: true,
      placeIds: ['the-pink-door', 'canon', 'spinasse'].filter((id) => full[id]),
      dates: ['2026-10-24', '2026-10-25'],
      votes: { 'demo-sam': { placeId: 'spinasse', date: '2026-10-24' }, 'demo-mina': { placeId: 'the-pink-door', date: '2026-10-24' } },
      rsvps: { 'demo-sam': 'yes', 'demo-mina': 'yes', 'demo-leo': 'maybe' },
      inviteIds: ['demo-mina', 'demo-leo'],
    },
  ],
}

const handDiveBlurbs = new Set(funDiveSource.entries.map((item) => item.blurb))
const copyCheck = assertCopy({
  lines: [
    ...launch.map((place) => ({ text: place.oneLiner, placeId: place.id })),
    ...guides.flatMap((guide) => guide.entries.map((entry) => ({ text: entry.pullQuote, placeId: entry.placeId }))),
  ],
  blurbs: [
    ...launch.map((place) => ({ text: place.blurb, placeId: place.id, name: place.name, exempt: handDiveBlurbs.has(place.blurb) })),
    ...guides.flatMap((guide) =>
      guide.entries.map((entry) => ({
        text: entry.blurb,
        placeId: entry.placeId,
        name: launch.find((place) => place.id === entry.placeId)?.name,
        exempt: guide.slug === 'fun-dive-bars' || handDiveBlurbs.has(entry.blurb),
      })),
    ),
  ],
})
for (const place of launch) {
  for (const text of [place.oneLiner, place.blurb]) {
    if (truncatedNameHit(place.name, place.address, text)) {
      throw new Error(`Truncated name merged with address in copy for ${place.name}: ${text.slice(0, 160)}`)
    }
  }
}
for (const guide of guides) {
  for (const entry of guide.entries) {
    const place = launch.find((item) => item.id === entry.placeId)
    if (!place) continue
    for (const text of [entry.pullQuote, entry.blurb]) {
      if (truncatedNameHit(place.name, place.address, text)) {
        throw new Error(`Truncated name merged with address in ${guide.slug} copy for ${place.name}`)
      }
    }
  }
}

mkdirSync(join(root, 'src/content'), { recursive: true })
const index = {
  updatedAt: UPDATED,
  placeCount: slim.length,
  hiddenCount: hidden.length,
  places: slim,
  guides: guides.map((guide) => ({
    slug: guide.slug,
    title: guide.title,
    dek: guide.dek,
    group: guide.group,
    updatedAt: guide.updatedAt,
    ranked: guide.ranked,
    count: guide.entries.length,
  })),
}
writeFileSync(join(root, 'src/content/index.json'), JSON.stringify(index))
writeFileSync(join(root, 'src/content/places.json'), JSON.stringify(full))
writeFileSync(join(root, 'src/content/guides.json'), JSON.stringify(guides))
writeFileSync(join(root, 'src/content/hidden.json'), JSON.stringify(hidden))
writeFileSync(join(root, 'src/content/demo.json'), JSON.stringify(demo))
writeFileSync(
  join(root, 'src/content/apple-links.json'),
  JSON.stringify(Object.fromEntries(launch.map((place) => [place.id, place.applePlaceUrl]))),
)

const sourceByMuid = new Map(rawPlaces.filter((place) => place?.muid).map((place) => [String(place.muid), place]))
const leaks = []
for (const place of Object.values(full)) {
  const source = sourceByMuid.get(place.muid)
  if (!source || source.closed || source.excluded || source.outside_seattle || source.duplicate_of || source.hidden_reason || source.hours_type === 'PERMANENT_CLOSURE' || shutteredNames.has(normName(place.name))) {
    leaks.push(place.name)
  }
}
for (const guide of guides) {
  for (const entry of guide.entries) {
    if (!full[entry.placeId]) leaks.push(`${guide.slug}:${entry.placeId}`)
  }
}
if (leaks.length) {
  throw new Error(`Closed, excluded, outside-Seattle, duplicate, or other-location places leaked: ${leaks.slice(0, 12).join(', ')}`)
}
const byBrand = new Map()
for (const place of Object.values(full)) {
  const key = brandKey(place.name)
  byBrand.set(key, [...(byBrand.get(key) ?? []), place])
}
const sharedBrands = [...byBrand.values()].filter((list) => list.length > 1)
if (sharedBrands.length) {
  throw new Error(
    `Live places share a brand; keep one location and mark the others with hidden_reason: ${sharedBrands
      .slice(0, 12)
      .map((list) => list.map((place) => `${place.name} (${place.neighborhood})`).join(' / '))
      .join('; ')}`,
  )
}
for (const guide of guides) {
  const ids = guide.entries.map((entry) => entry.placeId)
  if (new Set(ids).size !== ids.length) throw new Error(`Guide ${guide.slug} lists a place twice`)
  if (guide.slug === 'fun-dive-bars') continue
  for (const entry of guide.entries) {
    const place = full[entry.placeId]
    if (entry.blurb !== place.blurb) throw new Error(`${guide.slug} does not reuse the blurb for ${place.name}`)
    const override = guideQuotes.get(place.id)?.[guide.slug]
    const expected = override || place.oneLiner
    if (entry.pullQuote !== expected) throw new Error(`${guide.slug} pull quote for ${place.name} is not the place copy or a guide-specific quote`)
  }
}
const funGuide = guides.find((guide) => guide.slug === 'fun-dive-bars')
if (!funGuide || funGuide.entries.length !== funDiveSource.entries.length) {
  throw new Error('Best Fun & Dive Bars was not preserved entry for entry')
}
for (const item of funDiveSource.entries) {
  const place = Object.values(full).find((candidate) => normName(candidate.name) === normName(item.name))
  if (!place) throw new Error(`Fun & dive bars place ${item.name} is not live`)
  const entry = funGuide.entries.find((candidate) => candidate.placeId === place.id)
  if (!entry || entry.pullQuote !== item.pullQuote || entry.blurb !== item.blurb || entry.vibe !== item.vibe) {
    throw new Error(`Fun & dive bars copy changed for ${item.name}`)
  }
  if (place.oneLiner !== item.pullQuote || place.blurb !== item.blurb) {
    throw new Error(`Place page copy for ${item.name} drifted from the Fun & Dive Bars guide`)
  }
}
for (const [placeId, quotes] of guideQuotes) {
  for (const [slug, quote] of Object.entries(quotes)) {
    const quoteText = String(quote).trim()
    const placeLine = full[placeId].oneLiner.trim()
    if (quoteText && placeLine && quoteText === placeLine) {
      throw new Error(`Guide-specific pull quote for ${full[placeId].name} on ${slug} repeats the place quote`)
    }
  }
}
const badRatings = Object.values(full).filter((place) => place.publicRating && place.publicRating.source !== 'Yelp')
if (badRatings.length) {
  throw new Error(`Only Yelp may ship as an outside rating: ${badRatings.slice(0, 8).map((place) => `${place.name} (${place.publicRating.source})`).join(', ')}`)
}
if (JSON.stringify(full).includes('appleRating') || JSON.stringify(slim).includes('appleRating')) {
  throw new Error('appleRating leaked into the catalog')
}
const banned = /draft|augusto|census|borrowed from|gusto's score|not yet rated|this file|entries in this|saved list|saved places|no speech/i
const spoken = [
  ...Object.values(full).flatMap((place) => [place.oneLiner, place.blurb]),
  ...guides.flatMap((guide) => [guide.intro, guide.dek, ...guide.entries.flatMap((entry) => [entry.blurb, entry.pullQuote])]),
]
const voiceHits = spoken.filter((line) => banned.test(line))
if (voiceHits.length) {
  throw new Error(`Meta copy leaked:\n${voiceHits.slice(0, 6).join('\n---\n')}`)
}
const blurbs = guides.flatMap((guide) => guide.entries.map((entry) => wordCount(entry.blurb)))
console.log(JSON.stringify({
  launch: slim.length,
  hidden: hidden.length,
  otherLocations: rawPlaces.filter((place) => place?.hidden_reason).length,
  guides: guides.length,
  byGroup: guides.reduce((acc, guide) => ({ ...acc, [guide.group]: (acc[guide.group] ?? 0) + 1 }), {}),
  blurbMin: Math.min(...blurbs),
  blurbMax: Math.max(...blurbs),
  unmatched: [...new Set(unmatched)].length,
  under8: guides.filter((guide) => guide.entries.length < 8).map((guide) => [guide.slug, guide.entries.length]),
  over40: guides.filter((guide) => guide.entries.length > 40).map((guide) => guide.slug),
  uniqueOneLiners: new Set(Object.values(full).map((place) => place.oneLiner)).size,
  yelpRatings: Object.values(full).filter((place) => place.publicRating?.source === 'Yelp').length,
  openTableRatings: Object.values(full).filter((place) => place.publicRating?.source === 'OpenTable').length,
  yelpLinks: Object.values(full).filter((place) => place.yelpSlug).length,
  yelpNameMatches,
  copyCheck,
  photos: Object.values(full).reduce((acc, place) => {
    for (const photo of place.photos) acc[photo.source] = (acc[photo.source] ?? 0) + 1
    return acc
  }, {}),
}, null, 2))
