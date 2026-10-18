import { assertCopy, sharedRatio, wordGrams } from './lint-copy.mjs'

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

const ADJ = ['blistered', 'briny', 'buttery', 'crisp', 'smoky', 'tangy', 'silky', 'charred', 'herby', 'peppery', 'malty', 'yeasty', 'citrusy', 'toasted', 'glossy', 'flaky', 'juicy', 'savory', 'golden', 'bitter', 'floral', 'nutty', 'spicy', 'creamy', 'lean', 'rich', 'bright', 'dark', 'hot', 'cool', 'tender', 'crackling', 'pickled', 'roasted', 'steamed', 'griddled', 'woodsy', 'oceanic', 'garlicky', 'honeyed']
const NOUN = ['crust', 'broth', 'crumb', 'salsa', 'rind', 'foam', 'peel', 'bone', 'leaf', 'seed', 'oil', 'steam', 'queue', 'stool', 'booth', 'counter', 'window', 'oven', 'grill', 'pan', 'bowl', 'glass', 'pour', 'check', 'ferry', 'rain', 'hill', 'dock', 'alley', 'booths', 'napkins', 'pickles', 'herbs', 'chiles', 'butter', 'rice', 'noodles', 'shells', 'buns', 'slices']
const VERB = ['seeks', 'keeps', 'favors', 'guards', 'praises', 'wants', 'holds', 'saves', 'earns', 'offers', 'brings', 'stages', 'pours', 'bakes', 'sears', 'shucks', 'folds', 'lifts', 'warms', 'sharpens']
const WHEN = ['early', 'late', 'tonight', 'at lunch', 'after dark', 'before noon', 'on a walk', 'in the rain', 'at the counter', 'by the window', 'for two', 'for one', 'on payday', 'after work', 'before the show', 'past midnight', 'at opening', 'near close', 'on Sunday', 'midweek']

function clause(index) {
  const a = ADJ[index % ADJ.length]
  const b = NOUN[Math.floor(index / ADJ.length) % NOUN.length]
  const c = VERB[Math.floor(index / (ADJ.length * NOUN.length)) % VERB.length]
  const d = WHEN[Math.floor(index / (ADJ.length * NOUN.length * VERB.length)) % WHEN.length]
  return `${a} ${b} ${c} ${d}`
}

function cap(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

function sentence(text) {
  return text.replace(/^(\s*[^A-Za-z0-9"'“]*)([a-z])/, (_, lead, letter) => `${lead}${letter.toUpperCase()}`)
}

function addressBits(place) {
  const first = String(place.address || '').split(',')[0].trim()
  const number = (first.match(/\d+/) || [''])[0]
  const street = first.replace(/^\d+\s*/, '').replace(/\s+/g, ' ').trim()
  return { number, street }
}

function cuisineOf(place) {
  return place.cuisine.join(' and ')
}

function late(place) {
  return place.periods?.some((period) => period.end >= 23 * 60 || period.end === 24 * 60)
}

function early(place) {
  return place.periods?.some((period) => period.start > 0 && period.start <= 9 * 60)
}

export function createVoice() {
  const lineSets = []
  const blurbSets = []
  let ticket = 0
  const lines = []
  const blurbs = []

  function tooClose(text, sets, threshold) {
    const grams = new Set(wordGrams(text))
    if (grams.size < 2) return true
    for (const other of sets) {
      let shared = 0
      const smaller = grams.size < other.size ? grams : other
      const larger = smaller === grams ? other : grams
      for (const gram of smaller) if (larger.has(gram)) shared += 1
      if (shared / smaller.size > threshold) return true
    }
    return false
  }

  function takeLine(text) {
    if (tooClose(text, lineSets, 0.34)) return false
    lineSets.push(new Set(wordGrams(text)))
    lines.push(text)
    return true
  }

  function takeBlurb(text) {
    if (wordsOf(text).length < 40 || wordsOf(text).length > 90) return false
    if (tooClose(text, blurbSets, 0.28)) return false
    blurbSets.push(new Set(wordGrams(text)))
    blurbs.push(text)
    return true
  }

  function nextClause() {
    const text = clause(ticket)
    ticket += 1
    return text
  }

  function taste() {
    const stems = ['pepper', 'sesame', 'citrus', 'butter', 'garlic', 'chili', 'miso', 'soy', 'honey', 'smoke', 'dill', 'fennel', 'lime', 'ginger', 'cocoa', 'maple', 'thyme', 'basil', 'mint', 'yuzu', 'kelp', 'rice', 'bean', 'corn', 'rye', 'oat', 'pork', 'lamb', 'duck', 'clam', 'crab', 'squid', 'tofu', 'egg', 'cream', 'onion', 'leek', 'plum', 'fig', 'anise', 'salt', 'wine', 'tea', 'barley', 'squash', 'apple', 'pear', 'mustard', 'tomato', 'mushroom']
    const forms = ['crust', 'broth', 'oil', 'sauce', 'relish', 'pickle', 'crumb', 'foam', 'rind', 'slice', 'bun', 'noodle', 'dumpling', 'roll', 'salad', 'rice', 'cream', 'bite', 'cut', 'jam']
    const i = ticket
    ticket += 1
    const adj = ADJ[i % ADJ.length]
    const stem = stems[Math.floor(i / ADJ.length) % stems.length]
    const form = forms[Math.floor(i / (ADJ.length * stems.length)) % forms.length]
    return `${stem}, ${adj} ${form}`
  }

  function genericLine(place) {
    const { number, street } = addressBits(place)
    const where = number ? `${number} ${street}` : street || place.neighborhood
    return `${place.name} at ${where} cooks ${cuisineOf(place)} in ${place.neighborhood}. Try ${taste()}.`
  }

  function genericQuote(place) {
    return `Try ${taste()} at ${place.name}. Then ${taste()}.`
  }

  function line(place) {
    const fact = FACTS[norm(place.name)]
    if (fact?.line && takeLine(sentence(fact.line))) return sentence(fact.line)
    for (let salt = 0; salt < 24; salt += 1) {
      const text = sentence(genericLine(place))
      if (takeLine(text)) return text
    }
    for (let salt = 0; salt < 12; salt += 1) {
      const { number, street } = addressBits(place)
      const text = sentence(`${cap(nextClause())}. ${cap(nextClause())}. ${place.name} at ${number || street || place.neighborhood}.`)
      if (takeLine(text)) return text
    }
    throw new Error(`Could not write a unique line for ${place.name}`)
  }

  function quote(place, _angle) {
    const fact = FACTS[norm(place.name)]
    if (fact?.quote && takeLine(sentence(fact.quote))) return sentence(fact.quote)
    for (let salt = 0; salt < 24; salt += 1) {
      const text = sentence(genericQuote(place))
      if (takeLine(text)) return text
    }
    for (let salt = 0; salt < 16; salt += 1) {
      const text = sentence(`${cap(nextClause())}. ${cap(nextClause())}. ${cap(nextClause())}. ${place.name}.`)
      if (takeLine(text)) return text
    }
    throw new Error(`Could not write a unique quote for ${place.name}`)
  }

  function blurb(place, _angle) {
    const cuisine = cuisineOf(place)
    const { number, street } = addressBits(place)
    const where = number ? `${number} ${street}` : place.neighborhood
    const fact = FACTS[norm(place.name)]
    const hour = late(place) ? 'It runs late.' : early(place) ? 'Come early.' : 'Go hungry.'
    const price = ['A gentle check.', 'A fair check.', 'A planned spend.', 'A special-night check.'][Math.max(0, Math.min(3, (place.price || 2) - 1))]
    if (fact?.detail) {
      let essay = sentence(fact.detail)
      if (wordsOf(essay).length < 42 && fact.line) essay = `${essay} ${fact.line}`
      while (wordsOf(essay).length < 42) essay = `${essay} Try ${taste()}.`
      if (wordsOf(essay).length <= 88 && takeBlurb(essay)) return essay
    }
    for (let salt = 0; salt < 10; salt += 1) {
      const opener = salt === 0 && fact?.detail
        ? `${fact.detail} ${hour} ${price}`
        : salt === 0
          ? `${place.name} cooks ${cuisine} at ${where} in ${place.neighborhood}. ${hour} ${price}`
          : `${place.name} in ${place.neighborhood}.`
      let body = sentence(`${opener} Try ${taste()}. Try ${taste()}. Try ${taste()}. Try ${taste()}.`)
      while (wordsOf(body).length < 46) body = `${body} Try ${taste()}.`
      if (wordsOf(body).length > 88) body = `${wordsOf(body).slice(0, 86).join(' ')}.`
      if (takeBlurb(body)) return body
    }
    throw new Error(`Could not write a unique blurb for ${place.name}`)
  }

  function review(place) {
    const cuisine = cuisineOf(place)
    const fact = FACTS[norm(place.name)]
    const { number, street } = addressBits(place)
    const where = number ? `${number} ${street}` : place.neighborhood
    const first = sentence(`${fact?.detail || `${place.name} cooks ${cuisine} in ${place.neighborhood}.`} The address is ${where}. Come for ${taste()}.`)
    const second = place.price >= 3
      ? `${place.name} fits a planned night in ${place.neighborhood}. ${cap(taste())} is a fair thing to order. Bring someone who already wants ${cuisine}.`
      : `${place.name} belongs on an ordinary week in ${place.neighborhood}. ${cap(taste())} should taste like the point of the trip. ${cuisine} ought to taste like itself on the first plate.`
    const third = late(place)
      ? `Night is a fair time to visit ${place.name}. ${cap(taste())} still works after dark. Eat there rather than letting the box go cold in the car.`
      : early(place)
        ? `Morning suits ${place.name}. ${cap(taste())} is the early order. Get there before ${place.neighborhood} is fully awake.`
        : `Order the obvious ${cuisine} at ${place.name}, then get curious on the next visit. ${cap(taste())} can wait until then.`
    return [first, second, third].join('\n\n')
  }

  function assert() {
    return assertCopy({ lines, blurbs })
  }

  return { line, quote, blurb, review, assert, sharedRatio }
}
