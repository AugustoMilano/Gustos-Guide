import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
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

function isLaunch(place) {
  return (
    place.resolved &&
    (place.kind === 'food' || place.kind === 'drinks') &&
    !place.excluded &&
    !place.closed &&
    !place.outside_seattle &&
    !place.duplicate_of
  )
}

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

function priceWord(price) {
  return ['a cheap', 'a mid-priced', 'a spendy', 'a special-occasion'][price - 1] ?? 'a'
}

function hook(place, angle, seed) {
  const cuisine = place.cuisine[0].toLowerCase()
  const hood = place.neighborhood
  if (angle === 'pizza') return `${place.name} is on the pizza list because the pie is the point in ${hood}, not a side dish with melted cheese.`
  if (angle === 'coffee') return `${place.name} is a coffee stop in ${hood} worth leaving the apartment for, which is a higher bar than it sounds.`
  if (angle === 'date') return `${place.name} makes the date-night cut in ${hood}: ${priceWord(place.price)} ${cuisine} room where you can hear the person across the table.`
  if (angle === 'neighborhood') return `${place.name} is one of the saved ${cuisine} rooms in ${hood}, which is why it is on this neighborhood list and not a citywide ranking.`
  if (angle === 'cheap') return `${place.name} is here because it is a ${cuisine} value in ${hood}, the kind of receipt you do not have to explain.`
  if (angle === 'late') return `${place.name} earns the late list by being a ${cuisine} option in ${hood} when the sensible kitchens have closed.`
  if (angle === 'drinks') return `${place.name} is a ${place.placeType} in ${hood}. Come for a drink first and let the food be a pleasant rumor until it arrives.`
  const banks = [
    `${place.name} is ${priceWord(place.price)} ${cuisine} address in ${hood}, saved because it does that job without a speech.`,
    `In ${hood}, ${place.name} is the ${cuisine} move when you already know what you want to eat.`,
    `${place.name} sits in ${hood} and cooks ${cuisine}. That is the assignment, and the room should be judged on it.`,
  ]
  return pick(banks, seed)
}

function roomLine(place, seed) {
  const size =
    place.price >= 3
      ? 'Dress like you meant to leave the house. This is not a counter with a stack of napkins.'
      : /counter|coffee|bakery|dessert/.test(place.placeType)
        ? 'It is a counter or a small room. Plan on eating soon after you order, not on holding a four-top.'
        : 'The room is built for a normal night out: a friend, a date, or you and a book if the lighting allows it.'
  const extras = [
    size,
    `${place.neighborhood} supplies the walk there. The meal still has to be worth the blocks.`,
    place.price === 1
      ? 'Spend the money you saved on a second thing, not on pretending this is a tasting menu.'
      : 'The price tier is a hint, not a promise. Look at the menu before you commit the table.',
  ]
  return pick(extras, seed + 'room')
}

function tip(place, angle, seed) {
  const early = place.periods.some((period) => period.start > 0 && period.start <= 9 * 60)
  const late = place.periods.some((period) => period.end >= 23 * 60 || period.end === 24 * 60)
  if (angle === 'breakfast' || early) return 'Come before the neighborhood is fully awake. Morning places get worse on your schedule, not theirs.'
  if (angle === 'late' || late) return 'Check the posted hours the day you go. A late kitchen in this file is a lead, not a guarantee after midnight.'
  if (angle === 'happy') return 'Do not treat this as a verified happy-hour ad. Confirm the specials. The bar itself is the reason it was saved.'
  if (place.orderThis.length) return `If you need a decision, start with ${place.orderThis[0].dish}. It is the known order, not a secret menu.`
  const tips = [
    'Walk in if the style is a counter. If it looks like a dining room, call or check the site before you bring four people.',
    'The website and the phone are on the card for a reason. Hours and reservations move faster than a guide.',
    'First visit: order the obvious thing. Second visit: wander. This draft will not invent a dish to sound specific.',
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
  const pad = 'Specifics stay general until a visit note replaces this draft.'
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
  const cuisine = place.cuisine[0]
  const options = [
    `${cuisine} in ${place.neighborhood}, no speech required.`,
    `A ${cuisine.toLowerCase()} stop when you are already in ${place.neighborhood}.`,
    `${place.name.split(' ')[0]} does ${cuisine.toLowerCase()} and then gets out of the way.`,
    `${'$'.repeat(place.price)} ${cuisine.toLowerCase()} for a ${place.neighborhood} plan.`,
  ].filter((line) => wordCount(line) <= 15)
  return options[hash(place.id) % options.length]
}

function pullQuote(place, angle) {
  const cuisine = place.cuisine[0].toLowerCase()
  const options = [
    oneLiner(place),
    angle === 'pizza' ? 'Come for the pie. Leave the novelty toppings.' : '',
    angle === 'coffee' ? 'A cup worth leaving the apartment for.' : '',
    angle === 'date' ? 'Loud enough to feel alive, quiet enough to talk.' : '',
    angle === 'cheap' ? 'The receipt should not require a speech.' : '',
    `Save this for a ${cuisine} night in ${place.neighborhood}.`,
  ].filter((line) => line && wordCount(line) <= 15)
  return options[hash(`${place.id}:${angle}:q`) % options.length]
}

function review(place) {
  const seed = `${place.id}:page`
  const cuisine = place.cuisine[0].toLowerCase()
  const order = place.orderThis[0]
  const first = fitText(
    [
      `${place.name} is ${priceWord(place.price)} ${place.placeType} in ${place.neighborhood}, filed under ${cuisine}.`,
      sensory(place, seed),
      order
        ? `The order people already repeat is ${order.dish}. ${order.note}`
        : 'No signature dish is named here on purpose. If the kitchen has one, it should come from a visit note, not a guess.',
    ],
    40,
    80,
  )
  const second = fitText(
    [
      roomLine(place, seed),
      place.perfectFor.length
        ? `The tags that fit without stretching are ${place.perfectFor.slice(0, 3).join(', ')}.`
        : 'Bring the person who already agreed to this cuisine.',
      place.price >= 3
        ? 'Spend the money when the occasion is real. This is not a Tuesday default unless you are celebrating a Tuesday.'
        : 'It belongs on a normal week, which is a better compliment than calling it a destination.',
    ],
    40,
    80,
  )
  const hourBit = place.periods.length
    ? 'The hours in the card come from the saved listing. Read them again the day you go.'
    : 'Hours were not in the source listing, so call or check the site.'
  const third = fitText(
    [
      hourBit,
      `Directions open in Apple Maps, and the phone is there if the website is vague.`,
      `Public ratings, when they exist, sit under the score as someone else's number. Gusto's score stays blank until Augusto ranks it.`,
    ],
    35,
    75,
  )
  return [first, second, third].join('\n\n')
}

function publicScore(place) {
  const apple = place.appleRating ? place.appleRating.percent / 10 : 0
  const user = place.publicRating ? place.publicRating.value * 2 : 0
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
  const ids = providerIds[place.muid] ?? {}
  const applePercent = typeof place.apple_rating === 'string' ? Number(place.apple_rating.replace('%', '')) : null
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
    appleRating: Number.isFinite(applePercent) ? { percent: applePercent, count: place.apple_rating_count ?? undefined } : undefined,
    publicRating:
      typeof place.user_rating === 'number'
        ? { value: place.user_rating, count: place.user_rating_count ?? 0, source: place.user_rating_source || 'Public' }
        : undefined,
    ids: {
      fsq: ids.fsq_ids?.[0],
      yelp: ids.yelp_ids?.[0],
    },
    copySource: 'draft',
    updatedAt: UPDATED,
    chain: place.chain_group || null,
    orderThis: orderFor(place.name),
    photos: [
      {
        source: 'illustration',
        isIllustration: true,
        alt: `Illustration suggesting ${cuisine[0] || 'a meal'} at ${place.name}`,
        credit: 'Illustration',
      },
    ],
  }
  next.perfectFor = perfectFor(next)
  next.oneLiner = oneLiner(next)
  next.review = review(next)
  return next
})

const byNorm = new Map()
for (const place of launch) {
  const key = normName(place.name)
  const list = byNorm.get(key) ?? []
  list.push(place)
  byNorm.set(key, list)
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
    pullQuote: pullQuote(place, guide.angle),
    blurb: blurb(place, guide.angle),
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

function intro(title, dek, count, extra) {
  return [
    `${title} is a cut of places Augusto saved in Seattle. ${dek} It is not a census, and it is not borrowed from another publication.`,
    extra,
    `There are ${count} entries in this draft. Nothing has a Gusto's score yet, so the order leans on public ratings and a few obvious classics. Every blurb is marked draft. Named dishes show up only when they are already the place's known order.`,
  ].join('\n\n')
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
  ['Special Occasion / Splurge', 'splurge', 'Occasion', false, 'The expensive saved rooms, for when the night needs a jacket.'],
  ['Cheap Eats', 'cheap-eats', 'Best of', false, 'The $ tier: counters and small rooms with a humane receipt.'],
  ['Best Brunch', 'brunch', 'Occasion', false, 'Late breakfast that is still worth the wait you chose.'],
  ['Happy Hour', 'happy-hour', 'Occasion', false, 'After-work bars and kitchens. Specials are not verified in this draft.'],
  ['Best Sandwiches', 'sandwiches', 'Cuisine', true, 'Bread, filling, and the ones you eat before they steam themselves.'],
  ['Best Burgers', 'burgers', 'Cuisine', true, 'Patties from drive-in to sit-down.'],
  ['Italian & Pasta', 'italian', 'Cuisine', false, 'Pasta shops and Italian dining rooms, not another pizza list.'],
  ['Seafood & Oysters', 'seafood', 'Cuisine', false, 'Fish, oysters, and chowder, because the city is made of water.'],
  ['Ramen, Pho & Noodles', 'noodles', 'Cuisine', false, 'Bowls for gray weather: ramen, phở, and the other noodles.'],
  ['Tacos & Mexican', 'tacos', 'Cuisine', false, 'Tacos and the wider Mexican rooms on the saved list.'],
  ['Steakhouses', 'steakhouses', 'Cuisine', false, 'Steaks, grills, and the rooms that smell like butter.'],
  ['Seattle Classics & Institutions', 'classics', 'Best of', false, 'The saved places that already belong to the city.'],
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
    intro: intro(theme.theme, dek, Math.min(places.length, 40), theme.description),
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
    dek: `Where to eat and drink in ${label}, from the places already saved.`,
    group: 'Neighborhoods',
    ranked: false,
    angle: 'neighborhood',
    places,
    intro: intro(label, `A neighborhood cut, capped so the list stays usable.`, places.length, 'Same cuisine does not get to fill the page. Public ratings break ties until real scores exist.'),
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
    intro: intro(title, dek, places.length, 'Derived from hours, price, cuisine, or place type on the saved list. Nothing extra was invented to fill the count.'),
  })
}

filterGuide('breakfast-before-9', 'Breakfast Before 9am', 'Saved places whose listed hours start at or before 9.', 'Best of', false, 'breakfast', (place) => place.periods.some((period) => period.start > 0 && period.start <= 9 * 60))
filterGuide('late-night', 'Late-Night Eats', 'Saved kitchens and bars whose listed hours run to 11pm or later.', 'Occasion', false, 'late', (place) => place.periods.some((period) => period.end >= 23 * 60 || period.end === 24 * 60))
filterGuide('dumplings', 'Dumplings & Dim Sum', 'Dumpling houses and dim sum on the saved list.', 'Cuisine', false, 'default', (place) => /dumpling|dim sum|gyoza|xiao/i.test(`${place.name} ${place.cuisine.join(' ')} ${place.placeType}`))
filterGuide('teriyaki', 'Teriyaki & Other Seattle Things', 'Teriyaki shops from the saved list, the local weeknight.', 'Cuisine', false, 'default', (place) => /teriyaki/i.test(`${place.name} ${place.cuisine.join(' ')}`))
filterGuide('big-group', 'Big Group Dinners That Don\'t Suck', 'Breweries, halls, and the louder saved rooms.', 'Occasion', false, 'default', (place) => /brew|pub|beer hall|sports bar|haus/.test(`${place.placeType} ${place.name}`.toLowerCase()))
filterGuide('walk-in', 'Walk-In Friendly', 'Counters, cafes, bakeries, and other places built for showing up.', 'Occasion', false, 'default', (place) => /counter|coffee|bakery|dessert|cafe/.test(place.placeType))
filterGuide('bring-the-parents', 'Bring The Parents', 'The spendier dining rooms, when the visit needs a tablecloth mood.', 'Occasion', false, 'date', (place) => place.price >= 3 && /restaurant|steak|sushi/.test(place.placeType))
filterGuide('the-bar-list', 'The Bar List', 'Cocktails, wine, and dives from the saved bars.', 'Drinks', false, 'drinks', (place) => place.placeType.includes('bar') || place.placeType === 'pub' || place.cuisine[0] === 'Cocktails' || place.cuisine[0] === 'Wine')

const gustoPool = diversify(
  sortDraft(launch.filter((place) => /restaurant|sushi|steak|seafood/.test(place.placeType) && place.price >= 2)),
  25,
  2,
)
addGuide({
  slug: 'gustos-25',
  title: "Gusto's 25",
  dek: 'A draft shelf of 25 saved dining rooms. Not a scored ranking.',
  group: 'Best of',
  ranked: false,
  angle: 'default',
  places: gustoPool,
  intro: intro("Gusto's 25", 'The flagship seats are reserved for Gusto\'s scores, which are empty.', gustoPool.length, 'This pass spreads cuisines and neighborhoods across dining rooms he already saved. When the pairwise ranks exist, this page should be rewritten from those scores and this intro should be deleted.'),
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
  appleRating: place.appleRating,
  publicRating: place.publicRating,
  gustoScore: null,
  photo: place.photos[0],
  website: place.website,
  phone: place.phone,
  appleMapsUrl: place.appleMapsUrl,
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
    { id: 'act-mina-spinasse', userId: 'demo-mina', type: 'rated', placeId: 'spinasse', text: 'Weeknight pasta, no speech.', score: 9.1, createdAt: '2026-10-16T02:00:00.000Z' },
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

const blurbs = guides.flatMap((guide) => guide.entries.map((entry) => wordCount(entry.blurb)))
const shortReviews = Object.values(full).filter((place) => place.review.split('\n\n').length < 2)
console.log(JSON.stringify({
  launch: slim.length,
  hidden: hidden.length,
  guides: guides.length,
  byGroup: guides.reduce((acc, guide) => ({ ...acc, [guide.group]: (acc[guide.group] ?? 0) + 1 }), {}),
  blurbMin: Math.min(...blurbs),
  blurbMax: Math.max(...blurbs),
  shortReviews: shortReviews.length,
  unmatched: [...new Set(unmatched)].length,
  under8: guides.filter((guide) => guide.entries.length < 8).map((guide) => [guide.slug, guide.entries.length]),
  over40: guides.filter((guide) => guide.entries.length > 40).map((guide) => guide.slug),
}, null, 2))
