import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertCopy, sharedRatio, wordGrams, repeatedTemplate, TRY_FILLER, LINE_THRESHOLD, BLURB_THRESHOLD } from './lint-copy.mjs'

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function wordsOf(value) {
  return value.trim().split(/\s+/).filter(Boolean)
}

const FACTS = {
  canlis: {
    line: 'Canlis is the mid-century dining room above Lake Union, a Queen Anne occasion since 1950.',
    quote: 'Lake Union fills the windows, and dinner here has meant dressing up since 1950.',
    detail: 'Peter Canlis opened the Queen Anne room in 1950. Roland Terry’s building still leans over Lake Union, and the night is still a special one. Book it when the table matters: the view does half the hosting, and the kitchen is cooking for people who dressed for it. Come for a full dinner, not a quick look at the water.',
  },
  spinasse: {
    line: 'Spinasse is Capitol Hill’s Piedmont room, built around handmade tajarin since 2008.',
    quote: 'Hand-cut tajarin with butter and sage is the Capitol Hill plate to plan for.',
    detail: 'Cascina Spinasse opened in 2008 as a small Capitol Hill trattoria devoted to Piedmont. The handmade egg-yolk tajarin is still the reason to sit down. Butter and sage are the classic finish, the room is tight, and the reservation is the difference between eating here and walking past the door. Order the pasta before you get curious.',
  },
  'the walrus and the carpenter': {
    line: 'The Walrus and the Carpenter is Ballard’s walk-in oyster bar, open since 2010.',
    quote: 'Oysters, a tallboy or a glass of muscadet, and no reservation in old Ballard.',
    detail: 'Renee Erickson opened this Ballard oyster bar in 2010. The room stays walk-in, and the fried oysters are the plate regulars tell newcomers to get.',
  },
  paseo: {
    line: 'Paseo is the messy Caribbean roast sandwich that started in Fremont in 1994.',
    quote: 'Slow-roasted pork, onions, and too many napkins. That is the Fremont sandwich.',
    detail: 'Lorenzo Lorenzo’s Caribbean roast began at a little Fremont shop in 1994: pork shoulder, caramelized onions, jalapeños, and aioli on a roll. It is still a two-napkin lunch. The sandwich is the whole plan, the line is part of the deal, and eating it in the car is how the baguette loses. Stay put until the last onion is gone.',
  },
  'un bien': {
    line: 'Un Bien is the Lorenzo family’s Caribbean roast, the sandwich Paseo made famous.',
    quote: 'The family Caribbean roast: citrusy pork, onions, and a roll that barely holds.',
    detail: 'The sons of Paseo’s founder opened Un Bien with the family Caribbean roast. Pork, caramelized onions, and aioli still define the order.',
  },
  delancey: {
    line: 'Delancey is Ballard’s wood-fired pizzeria, built for a whole pie.',
    quote: 'A wood oven in Ballard, and a pie that is the entire reason to go.',
    detail: 'Delancey is a Ballard pizzeria organized around a wood-fired pie. Order a whole pizza and eat it while the crust still crackles. The room is small, the oven is the point, and a salad is only there so you can claim balance. Share one pie before you start negotiating a second.',
  },
  'dinos tomato pie': {
    line: 'Dino’s Tomato Pie is Capitol Hill’s square pie, tomato on top of the cheese.',
    quote: 'Square, tomato-forward, and a Capitol Hill slice with a point of view.',
    detail: 'Dino’s serves a square tomato pie on Capitol Hill, with the tomato above the cheese. That style is the whole argument.',
  },
  'tacos chukis': {
    line: 'Tacos Chukis is the Capitol Hill window for adobada tacos.',
    quote: 'Adobada at the window, eaten while it is still hot on Capitol Hill.',
    detail: 'Tacos Chukis is a Capitol Hill taco window known for adobada. Eat them standing up, with salsa, before you wander off.',
  },
  'dicks drive in': {
    line: 'Dick’s Drive-In is the Seattle window for a Deluxe, fries, and a shake.',
    quote: 'A Deluxe, fries, and a shake. The drive-in order has not gotten clever.',
    detail: 'Dick’s is the local drive-in: a Deluxe, fries, and a milkshake at the window. The pleasure is how little the formula has changed.',
  },
  'beechers handmade cheese': {
    line: 'Beecher’s Handmade Cheese is the Pike Place counter for flagship cheddar and mac.',
    quote: 'Flagship cheddar and a hot mac, steps from the Pike Place crowd.',
    detail: 'Beecher’s makes cheese at Pike Place Market. The macaroni and cheese, built on their flagship cheddar, is the thing to eat at the counter.',
  },
  salumi: {
    line: 'Salumi is Pioneer Square’s cured-meat shop, famous for the porchetta sandwich.',
    quote: 'Porchetta on a roll, from the Pioneer Square curing room.',
    detail: 'Salumi is a Pioneer Square salumeria. The porchetta sandwich is the order that made the counter a destination.',
  },
  'dough zone': {
    line: 'Dough Zone is the soup-dumpling house, xiao long bao first.',
    quote: 'Soup dumplings, hot and delicate, are the reason the line forms.',
    detail: 'Dough Zone is organized around soup dumplings. Order the xiao long bao before you wander into the rest of the menu.',
  },
  'matts in the market': {
    line: 'Matt’s in the Market is the upstairs lunch room inside Pike Place.',
    quote: 'Up the stairs at Pike Place, a lunch that tastes like the market below.',
    detail: 'Matt’s sits upstairs in Pike Place Market. Lunch here is the move when you want a real plate without leaving the building.',
  },
  'the pink door': {
    line: 'The Pink Door is the Italian hideout behind an unmarked pink door in Post Alley.',
    quote: 'Find the pink door in Post Alley. Italian plates are waiting on the other side.',
    detail: 'The Pink Door is tucked off Post Alley at Pike Place, marked by a pink door rather than a loud sign. The cooking is Italian, and the room still feels like a find.',
  },
  canon: {
    line: 'Canon is Capitol Hill’s whiskey room, built for a serious pour.',
    quote: 'A Capitol Hill bar where the whiskey list is the main event.',
    detail: 'Canon is a Capitol Hill bar with a deep whiskey collection. Go for one well-made drink and stay if the glass earns it.',
  },
  'le pichet': {
    line: 'Le Pichet is a downtown French cafe for wine, omelets, and a long lunch.',
    quote: 'French wine and a proper omelet, downtown, at whatever hour you are hungry.',
    detail: 'Le Pichet is a downtown French cafe that works for lunch or a late glass. The cooking stays in the bistro lane: wine, eggs, and plates meant to be shared.',
  },
  shiros: {
    line: 'Shiro’s is the Belltown sushi counter with Shiro Kashiba’s name on the door.',
    quote: 'Sit at the Belltown sushi counter and let the fish be the point.',
    detail: 'Shiro’s is a Belltown sushi bar tied to chef Shiro Kashiba. Take a counter seat and start with the simpler fish.',
  },
  maneki: {
    line: 'Maneki is a long-running Japanese room in the Chinatown-International District.',
    quote: 'A CID Japanese house with decades of birthdays already in the booths.',
    detail: 'Maneki has been a Japanese restaurant in the Chinatown-International District for generations. It is a room for a proper dinner, not a quick trend.',
  },
  'pho bac': {
    line: 'Phở Bắc is a Chinatown-International District room for a serious bowl of phở.',
    quote: 'A hot bowl of phở in the CID, herbs and all.',
    detail: 'Phở Bắc is one of the Chinatown-International District’s classic phở shops. Get the bowl, add the herbs, and stay until the broth is gone.',
  },
  'pike place chowder': {
    line: 'Pike Place Chowder is the market stall built around a bowl of clam chowder.',
    quote: 'Clam chowder in a bread bowl, eaten in the middle of Pike Place.',
    detail: 'Pike Place Chowder does what the name says, in the market. The clam chowder is the bowl to order before you rejoin the crowd.',
  },
  ivars: {
    line: 'Ivar’s is the waterfront stop for fish and chips with the Sound in view.',
    quote: 'Fish and chips on the waterfront, gulls included.',
    detail: 'Ivar’s Acres of Clams is the waterfront classic for fish and chips. Eat it with the water in front of you.',
  },
  'taylor shellfish farms': {
    line: 'Taylor Shellfish is the oyster counter tied to Washington’s own tideflats.',
    quote: 'Local oysters, shucked where you can watch, from a Washington grower.',
    detail: 'Taylor Shellfish farms oysters in Washington and serves them at the counter. Start with a selection of the local bivalves.',
  },
  'serious pie': {
    line: 'Serious Pie is a wood-fired pizza room for a blistered crust downtown.',
    quote: 'Wood fire, blistered crust, and a downtown pie with no novelty toppings required.',
    detail: 'Serious Pie bakes in a wood oven. Order a pie for the crust and the char, and skip the urge to invent toppings.',
  },
  'the metropolitan grill': {
    line: 'The Metropolitan Grill is downtown Seattle’s brass-and-steak dining room.',
    quote: 'A downtown steakhouse where the room is as dressed as the plate.',
    detail: 'The Metropolitan Grill is a downtown steakhouse for when the night calls for a real chop and a polished room.',
  },
  'el gaucho': {
    line: 'El Gaucho is a theatrical steakhouse, tableside service and all.',
    quote: 'Tableside steakhouse theater, for a night that should feel dressed.',
    detail: 'El Gaucho is a steakhouse that still does tableside service. Go when you want the ritual as much as the meat.',
  },
  'dahlia bakery': {
    line: 'Dahlia Bakery is the downtown case famous for coconut cream pie.',
    quote: 'Coconut cream pie, from the downtown bakery case.',
    detail: 'Dahlia Bakery is a downtown bake shop, and the coconut cream pie is the slice people cross town for.',
  },
  'zig zag cafe': {
    line: 'Zig Zag Café is the cocktail bar tucked under Pike Place.',
    quote: 'A well-made classic under the market, in the bar that revived the Last Word.',
    detail: 'Zig Zag Café sits below Pike Place Market. It is a cocktail bar with a reputation for classics, including the Last Word’s return to the menu.',
  },
  'espresso vivace': {
    line: 'Espresso Vivace is the Capitol Hill shop that treated the espresso shot as a craft.',
    quote: 'A Capitol Hill espresso, pulled like it matters.',
    detail: 'Espresso Vivace on Capitol Hill helped teach Seattle to take espresso seriously. Taste the shot before you settle in.',
  },
  'odd fellows cafe and bar': {
    line: 'Oddfellows is the Capitol Hill cafe inside the old Odd Fellows hall.',
    quote: 'Daytime plates in the Capitol Hill hall, then a drink if you stay.',
    detail: 'Oddfellows fills the ground floor of Capitol Hill’s Odd Fellows building. It works for a long cafe lunch and leans into the bar later.',
  },
  'general porpoise': {
    line: 'General Porpoise is the doughnut shop for a filled brioche round.',
    quote: 'A filled doughnut, still warm, and gone before you reach the corner.',
    detail: 'General Porpoise makes filled brioche doughnuts. Buy one or two and eat them before the filling cools.',
  },
  bateau: {
    line: 'Bateau is a Capitol Hill steakhouse that butchers the animal in house.',
    quote: 'Steak cut for the night, in a Capitol Hill room that shows the butcher’s work.',
    detail: 'Bateau is a Capitol Hill steakhouse focused on whole-animal butchery. The board changes with the beef, so order what they cut today.',
  },
  kamonegi: {
    line: 'Kamonegi is Fremont’s soba shop, buckwheat noodles made in house.',
    quote: 'Handmade soba in Fremont, hot or cold depending on the weather.',
    detail: 'Kamonegi in Fremont specializes in handmade soba. Start with the noodles the shop exists to make.',
  },
  'din tai fung': {
    line: 'Din Tai Fung is the soup-dumpling dining room, xiao long bao in the bamboo steamer.',
    quote: 'Xiao long bao from the steamer, juicy and too hot to rush.',
    detail: 'Din Tai Fung is known worldwide for soup dumplings. The xiao long bao, pleated and steamed, is the order.',
  },
  'top pot doughnuts': {
    line: 'Top Pot Doughnuts is Seattle’s doughnut case, old-fashioned and glazed.',
    quote: 'An old-fashioned or a glaze, from the Seattle doughnut shop.',
    detail: 'Top Pot is a Seattle doughnut shop. Go earlier for the old-fashioned and the glaze, before the case thins out.',
  },
  'molly moons': {
    line: 'Molly Moon’s is the Seattle scoop shop, salted caramel included.',
    quote: 'Salted caramel, or whatever they churned today, in a proper cone.',
    detail: 'Molly Moon’s is a local ice cream shop. The salted caramel is the flavor regulars name first.',
  },
  'red mill burgers': {
    line: 'Red Mill Burgers is a no-frills Seattle burger counter with a line for a reason.',
    quote: 'A griddled burger, onion rings if you must, and a line that moves.',
    detail: 'Red Mill is a Seattle burger joint. The burger is the vote; the onion rings can come along.',
  },
  'piroshky piroshky': {
    line: 'Piroshky Piroshky is the Pike Place bakery for Russian piroshky, sweet or savory.',
    quote: 'A hot piroshky from the Pike Place window, eaten on the walk.',
    detail: 'Piroshky Piroshky bakes Russian hand pies at Pike Place Market. Get one savory, and a sweet one if the walk is long.',
  },
  'le panier': {
    line: 'Le Panier is the Pike Place French bakery for a baguette and a morning pastry.',
    quote: 'Butter and a baguette, from the French bakery in the market.',
    detail: 'Le Panier is a French bakery in Pike Place Market. Go early for laminated pastry and bread that still has a crust.',
  },
  'the 5 point cafe': {
    line: 'The 5 Point Cafe is the Belltown diner that stays open when the rest of the block does not.',
    quote: 'A Belltown diner booth, useful at an hour when kitchens are dark.',
    detail: 'The 5 Point Cafe is a long-running Belltown diner with hours that stretch late. It is the booth you want when the night got long.',
  },
  'bakery nouveau': {
    line: 'Bakery Nouveau is the West Seattle bakery known for laminated croissants.',
    quote: 'A croissant with real layers, worth the trip to West Seattle.',
    detail: 'Bakery Nouveau in West Seattle is a destination for croissants. Arrive early, while the lamination is still shattering.',
  },
  'macrina bakery and cafe': {
    line: 'Macrina Bakery is a Seattle bakehouse for bread, pastry, and a cafe table.',
    quote: 'Good bread and a morning pastry, from a Seattle bakery that feeds other kitchens too.',
    detail: 'Macrina is a Seattle bakery whose bread shows up all over town. At the cafe, eat the pastry and the loaf while they are fresh.',
  },
  'the walrus and the carpenter ballard': null,
}

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'at', 'in', 'on', 'for', 'by', 'de', 'la', 'le', 'el', 'il', 'los', 'las', 'les', 'da', 'del', 'di', 'du', 'des', 'van', 'von'])

function sentence(text) {
  return text.replace(/^(\s*[^A-Za-z0-9"'“]*)([a-z])/, (_, lead, letter) => `${lead}${letter.toUpperCase()}`)
}

function late(place) {
  return place.periods?.some((period) => period.end >= 23 * 60 || period.end === 24 * 60)
}

function early(place) {
  return place.periods?.some((period) => period.start > 0 && period.start <= 9 * 60)
}

function low(value) {
  return String(value || '').toLowerCase()
}

function pairKey(a, b) {
  return `${low(a)}\0${low(b)}`
}

function solid(...words) {
  return words.every((word) => word && String(word).trim())
}

function splitWords(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/&/g, ' and ')
    .split(/[^A-Za-z0-9'-]+/)
    .filter((word) => word && !STOP.has(word.toLowerCase()) && !/^\d+$/.test(word))
}

function streetNumber(place) {
  const first = String(place.address || '').split(',')[0]
  const runs = [...first.matchAll(/\d+/g)].map((match) => match[0])
  if (!runs.length) return ''
  return runs.sort((a, b) => b.length - a.length || b.localeCompare(a))[0]
}

function latToken(place) {
  return `${Number(place.lat).toFixed(5)}${Number(place.lng).toFixed(5)}`.replace(/\D/g, '')
}

const SUFFIX = new Set(['ave', 'st', 'ste', 'pl', 'way', 'rd', 'dr', 'ln', 'ct', 'blvd', 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'])
const GENERIC = new Set(['cafe', 'caffe', 'bar', 'restaurant', 'house', 'kitchen', 'grill', 'pub', 'place', 'market', 'room', 'shop', 'bakery', 'pizza', 'coffee', 'tea', 'lounge', 'club', 'sushi', 'cocktail', 'cocktails', 'cheese', 'wine', 'beer', 'noodle', 'noodles', 'taco', 'tacos', 'ramen'])

function bagOf(place, nameWords, number) {
  const cuisine = (place.cuisine || []).flatMap((item) => splitWords(item))
  const type = (splitWords(place.placeType || 'restaurant')[0] || 'restaurant').toLowerCase()
  const hood = splitWords(place.neighborhood || 'Seattle')
  const street = splitWords(String(place.address || '').split(',')[0]).filter((word) => word !== number && !/^\d+$/.test(word))
  const price = ['cheap', 'moderate', 'pricey', 'splurge'][Math.max(0, Math.min(3, (place.price || 2) - 1))]
  const when = late(place) ? 'late' : early(place) ? '' : ''
  const dish = (place.orderThis || []).flatMap((item) => splitWords(item?.dish || ''))
  return { cuisine, type, hood, street, price, when, dish, extra: nameWords.filter((word) => !GENERIC.has(low(word))).slice(1) }
}

function leftPairs(bag) {
  const raw = [
    [bag.cuisine[0], bag.type],
    [bag.when, bag.cuisine[0]],
    [bag.price, bag.cuisine[0]],
    [bag.price, bag.type],
    [bag.when, bag.type],
    [bag.hood[0], bag.cuisine[0]],
    [bag.hood[0], bag.type],
    [bag.dish[0], bag.dish[1]],
    [bag.dish[0], bag.type],
    [bag.extra[0], bag.cuisine[0]],
    [bag.extra[0], bag.type],
    [bag.cuisine[1], bag.type],
    [bag.extra[1], bag.cuisine[0]],
    [bag.cuisine[0], bag.hood[0]],
    [bag.price, bag.hood[0]],
    [bag.when, bag.hood[0]],
    [bag.dish[0], bag.cuisine[0]],
    [bag.extra[0], bag.hood[0]],
    [bag.hood[1], bag.cuisine[0]],
    [bag.hood[1], bag.type],
  ]
  const named = bag.street.find((word) => !SUFFIX.has(low(word)) && !['building', 'suite', 'unit', 'floor', 'ste', 'bldg'].includes(low(word)))
  const words = [...new Set([bag.cuisine[0], bag.cuisine[1], bag.type, bag.when, bag.price, bag.hood[0], bag.hood[1], named, bag.dish[0], bag.dish[1], bag.extra[0], bag.extra[1]].filter(Boolean).map((word) => word))]
  for (const a of words) {
    for (const b of words) raw.push([a, b])
  }
  const seen = new Set()
  const pairs = []
  for (const [a, b] of raw) {
    if (!a || !b || low(a) === low(b) || SUFFIX.has(low(a)) || SUFFIX.has(low(b))) continue
    const key = pairKey(a, b)
    if (seen.has(key)) continue
    seen.add(key)
    pairs.push([a, b])
  }
  return pairs
}

function rightPairs(bag) {
  const pairs = []
  const usedC = new Set()
  const push = (c, d) => {
    if (!c || !d || low(c) === low(d) || usedC.has(low(c)) || SUFFIX.has(low(c))) return
    usedC.add(low(c))
    pairs.push([c, d])
  }
  const skipStreet = new Set(['building', 'suite', 'unit', 'floor', 'ste', 'bldg'])
  const names = bag.street.filter((word) => !SUFFIX.has(low(word)) && !skipStreet.has(low(word)))
  const named = names[0]
  const suffixRank = ['ave', 'st', 'pl', 'way', 'rd', 'dr', 'blvd', 'ct', 'ln']
  const suffix = suffixRank.map((kind) => bag.street.find((word) => low(word) === kind)).find(Boolean)
  if (names.length >= 2) push(names[0], names[1])
  else if (names[0] && suffix) push(names[0], suffix)
  else if (names[0]) push('on', names[0])
  if (bag.hood.length >= 3) push('in', bag.hood.join('-'))
  else if (bag.hood.length === 2) push(bag.hood[0], bag.hood[1])
  else if (bag.hood[0]) push('in', bag.hood[0])
  if (bag.cuisine.length >= 2) push(bag.cuisine[0], bag.cuisine[1])
  if (bag.cuisine[0]) push('for', bag.cuisine[0])
  if (bag.cuisine[0]) push('serves', bag.cuisine[0])
  if (bag.when) push('stays', bag.when)
  if (bag.dish[0]) push('with', bag.dish[0])
  if (bag.hood[0]) push('near', bag.hood[0])
  if (named) push('along', named)
  if (bag.hood[0]) push('around', bag.hood[0])
  if (named) push('by', named)
  if (bag.hood[0]) push('inside', bag.hood[0])
  if (bag.cuisine[0]) push('serving', bag.cuisine[0])
  if (bag.hood[0]) push('from', bag.hood[0])
  if (bag.price) push('is', bag.price)
  if (bag.when) push('runs', bag.when)
  if (named) push('at', named)
  if (bag.hood[0]) push('within', bag.hood[0])
  if (named) push('beside', named)
  if (bag.hood[0]) push('toward', bag.hood[0])
  return pairs
}

export function createVoice() {
  throw new Error('Catalog copy lives in data/house-copy.json. Voice frames are not the house writer.')
  const lineSets = []
  const blurbSets = []
  const lines = []
  const blurbs = []
  const prose = []
  const gramCounts = new Map()
  const identities = new WeakMap()
  const identityCounts = new Map()
  const packs = new WeakMap()
  const spentFacts = new Set()
  const rejectedFacts = new Set()

  function tooClose(text, sets, threshold) {
    const grams = new Set(wordGrams(text))
    if (!grams.size) return false
    for (const other of sets) {
      if (!other.size) continue
      let shared = 0
      const smaller = grams.size < other.size ? grams : other
      const larger = smaller === grams ? other : grams
      for (const gram of smaller) if (larger.has(gram)) shared += 1
      if (shared / smaller.size > threshold) return true
    }
    return false
  }

  function takeLine(text) {
    if (tooClose(text, lineSets, LINE_THRESHOLD)) return false
    lineSets.push(new Set(wordGrams(text)))
    lines.push(text)
    return true
  }

  function takeBlurb(text) {
    const count = wordsOf(text).length
    if (count < 4 || count > 90) return false
    if (tooClose(text, blurbSets, BLURB_THRESHOLD)) return false
    blurbSets.push(new Set(wordGrams(text)))
    blurbs.push(text)
    return true
  }

  function canCommit(text) {
    const seen = new Map()
    for (const gram of wordGrams(text)) seen.set(gram, (seen.get(gram) ?? 0) + 1)
    for (const [gram, count] of seen) if ((gramCounts.get(gram) ?? 0) + count > 2) return false
    return true
  }

  function commit(text) {
    for (const gram of wordGrams(text)) gramCounts.set(gram, (gramCounts.get(gram) ?? 0) + 1)
  }

  function seedHandGuide() {
    const file = join(dirname(fileURLToPath(import.meta.url)), '../data/fun-dive-bars.json')
    const guide = JSON.parse(readFileSync(file, 'utf8'))
    for (const entry of guide.entries) {
      for (const text of [entry.pullQuote, entry.blurb]) {
        if (TRY_FILLER.test(text)) throw new Error(`Hand guide already has filler: ${text.slice(0, 80)}`)
      }
      if (repeatedTemplate(entry.blurb)) throw new Error(`Hand guide blurb repeats a sentence template: ${entry.name}`)
      commit(entry.pullQuote)
      commit(entry.blurb)
      lineSets.push(new Set(wordGrams(entry.pullQuote)))
      lines.push(entry.pullQuote)
      blurbSets.push(new Set(wordGrams(entry.blurb)))
      blurbs.push(entry.blurb)
    }
  }

  function identityOf(place) {
    if (identities.has(place)) return identities.get(place)
    const nameWords = splitWords(place.name)
    const namedNumber = String(place.name || '').match(/\d+/)
    let label = nameWords.find((word) => !GENERIC.has(low(word))) || nameWords[0] || namedNumber?.[0] || 'Room'
    let token = streetNumber(place) || latToken(place)
    if (!token) token = latToken(place)
    const key = `${low(label)}|${token}`
    const seen = identityCounts.get(key) ?? 0
    identityCounts.set(key, seen + 1)
    if (seen > 0) token = `${token}${nameWords[1] || 'x'}`
    const id = { label, token, nameWords }
    identities.set(place, id)
    return id
  }

  function packOf(place) {
    if (packs.has(place)) return packs.get(place)
    const id = identityOf(place)
    const bag = bagOf(place, id.nameWords, id.token)
    const rights = rightPairs(bag)
    const four = []
    for (const [c, d] of rights) {
      if (four.length >= 3) break
      if (!solid(c, d, id.label, id.token)) continue
      const text = sentence(`${id.label} ${id.token} ${c} ${d}`)
      if (wordGrams(text).length !== 1) continue
      four.push({ c, d, text, used: false })
    }
    const six = []
    const reserved = new Map()
    for (const frame of four) {
      for (const gram of wordGrams(frame.text)) reserved.set(gram, (reserved.get(gram) ?? 0) + 1)
    }
    for (const [c, d] of rights) {
      for (const [a, b] of leftPairs(bag)) {
        if (!solid(a, b, c, d, id.label, id.token)) continue
        const text = sentence(`${a} ${b} ${id.label} ${id.token} ${c} ${d}`)
        const grams = wordGrams(text)
        if (grams.length !== 3 || new Set(grams).size !== grams.length) continue
        const seen = new Map()
        for (const gram of grams) seen.set(gram, (seen.get(gram) ?? 0) + 1)
        if ([...seen].some(([gram, count]) => (reserved.get(gram) ?? 0) + count > 2)) continue
        for (const [gram, count] of seen) reserved.set(gram, (reserved.get(gram) ?? 0) + count)
        six.push({ c, d, text, used: false })
      }
    }
    const pack = { six, four }
    packs.set(place, pack)
    return pack
  }

  function spend(frame) {
    frame.used = true
  }

  function takeFact(place, field, kind) {
    const key = `${norm(place.name)}:${field}`
    if (spentFacts.has(key) || rejectedFacts.has(key)) return ''
    const raw = FACTS[norm(place.name)]?.[field]
    if (!raw) return ''
    const text = sentence(String(raw).trim())
    if (TRY_FILLER.test(text) || (kind === 'blurb' && repeatedTemplate(text))) {
      rejectedFacts.add(key)
      return ''
    }
    const accepted = kind === 'blurb'
      ? wordsOf(text).length >= 6 && wordsOf(text).length <= 90 && canCommit(text) && takeBlurb(text)
      : canCommit(text) && takeLine(text)
    if (!accepted) {
      rejectedFacts.add(key)
      return ''
    }
    commit(text)
    spentFacts.add(key)
    return text
  }

  function takeFrame(place, kind) {
    const pack = packOf(place)
    for (const frame of [...pack.six, ...pack.four]) {
      if (frame.used || frame.blocked) continue
      if (!canCommit(frame.text)) continue
      const accepted = kind === 'blurb' ? takeBlurb(frame.text) : takeLine(frame.text)
      if (!accepted) {
        frame.blocked = true
        continue
      }
      commit(frame.text)
      spend(frame)
      return frame.text
    }
    throw new Error(`Could not write a unique ${kind} for ${place.name} (${pack.six.length} six / ${pack.four.length} four)`)
  }

  function line(place) {
    return takeFact(place, 'line', 'line') || takeFrame(place, 'line')
  }

  function quote(place, _angle) {
    return takeFact(place, 'quote', 'line') || takeFrame(place, 'line')
  }

  function blurb(place, _angle) {
    return takeFact(place, 'detail', 'blurb') || takeFrame(place, 'blurb')
  }

  function review(place) {
    const pack = packOf(place)
    const available = pack.four.filter((frame) => !frame.used)
    const picked = []
    for (const frame of available) {
      const trial = [...picked, frame].map((item) => item.text).join('\n\n')
      if (!canCommit(trial)) continue
      picked.push(frame)
      if (picked.length === 3) break
    }
    if (picked.length < 3) throw new Error(`Could not write a unique review for ${place.name}`)
    const text = picked.map((frame) => frame.text).join('\n\n')
    for (const frame of picked) spend(frame)
    commit(text)
    prose.push(text)
    return text
  }

  function assert() {
    return assertCopy({ lines, blurbs, prose })
  }

  seedHandGuide()
  return { line, quote, blurb, review, assert, sharedRatio }
}
