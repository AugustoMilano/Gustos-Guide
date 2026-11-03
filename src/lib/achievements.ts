import { badgeSvg, guideBadge, type BadgeSpec } from './badge-art.ts'
import { isListed, placeCity } from './use-city.ts'
import { regionBoard } from './top25.ts'
import type { Guide, SlimPlace } from '../types.ts'

export type AchievementGroup = 'Ultimate' | 'Milestones' | 'Cities' | 'Guides'

export type Achievement = {
  id: string
  group: AchievementGroup
  title: string
  blurb: string
  have: number
  goal: number
  earned: boolean
  ring: 'coral' | 'leaf' | 'sky' | 'gold'
  spec: BadgeSpec
  guide?: { slug: string; city: NonNullable<Guide['city']> }
  /** Retired when the Eastside folded into Seattle. Shown only to people who already earned it. */
  legacy?: boolean
  /** Secret medal: not listed until it is earned. */
  hidden?: boolean
}

export type AchievementInput = {
  been: string[]
  rated: string[]
  guides: Guide[]
  placeOf: (id: string) => SlimPlace | undefined
  gustoScore: (id: string) => number | null
  /** Pullman Easter eggs found in this browser (own profile only). */
  eggs?: string[]
}

const BEEN_STEPS: [number, string, string][] = [
  [1, 'First Bite', 'Mark your first place Been.'],
  [10, 'Regular', 'Mark 10 places Been.'],
  [25, 'Table for 25', 'Mark 25 places Been.'],
  [50, 'Half Century', 'Mark 50 places Been.'],
  [100, 'Centurion', 'Mark 100 places Been.'],
  [250, 'Legend', 'Mark 250 places Been.'],
]
const RATED_STEPS: [number, string][] = [
  [1, 'First Verdict'], [10, 'Critic'], [25, 'Sharp Palate'], [50, 'Tastemaker'], [100, 'Head Judge'], [250, 'Hall of Taste'],
]
const BEEN_METAL = ['bronze', 'bronze', 'silver', 'silver', 'gold', 'platinum']

// Seattle covers the Eastside too. The old Eastside medals keep their ids as legacy rows so earned ones stay.
const AREAS: { id: string; title: string; cities: string[]; glyph: BadgeSpec['glyph']; enamel: BadgeSpec['enamel']; ink?: string; legacy?: boolean }[] = [
  { id: 'seattle', title: 'Seattle', cities: ['seattle', 'eastside'], glyph: 'needle', enamel: 'navy' },
  { id: 'eastside', title: 'the Eastside', cities: ['eastside'], glyph: 'mountain', enamel: 'jade', legacy: true },
  { id: 'la', title: 'Los Angeles', cities: ['la'], glyph: 'palm', enamel: 'sunrise' },
  { id: 'bay', title: 'SF Bay Area', cities: ['sf', 'eastbay', 'peninsula', 'northbay'], glyph: 'goldengate', enamel: 'midnight', ink: '#ff6a3d' },
  { id: 'sandiego', title: 'San Diego', cities: ['sandiego'], glyph: 'beach', enamel: 'ocean', ink: '#ffe9b8' },
  { id: 'vancouver', title: 'Vancouver', cities: ['vancouver'], glyph: 'mountain', enamel: 'teal' },
  { id: 'portland', title: 'Portland', cities: ['portland'], glyph: 'bridge', enamel: 'plum' },
  { id: 'nyc', title: 'New York', cities: ['nyc'], glyph: 'skyline', enamel: 'graphite', ink: '#ffd36b' },
  { id: 'pullman', title: 'Pullman and Moscow', cities: ['pullman', 'moscow'], glyph: 'tree', enamel: 'ruby' },
]

function step(have: number, goal: number) {
  return { have: Math.min(have, goal), goal, earned: have >= goal }
}

export function computeAchievements(input: AchievementInput): Achievement[] {
  const beenSet = new Set(input.been)
  const places = input.been.map(input.placeOf).filter((p): p is SlimPlace => p != null)
  const out: Achievement[] = []

  BEEN_STEPS.forEach(([n, title, blurb], i) => out.push({
    id: `been-${n}`, group: 'Milestones', title, blurb, ring: 'leaf', ...step(places.length, n),
    spec: { key: `been-${n}`, label: 'Places Been', glyph: 'flag', numeral: String(n), shape: (['circle', 'oct', 'hex', 'rosette', 'burst', 'scallop'] as const)[i], metal: BEEN_METAL[i], enamel: 'leaf' },
  }))
  RATED_STEPS.forEach(([n, title], i) => out.push({
    id: `rated-${n}`, group: 'Milestones', title, blurb: `Rank ${n === 1 ? 'your first place' : `${n} places`} with your own score.`, ring: 'leaf', ...step(input.rated.length, n),
    spec: { key: `rated-${n}`, label: 'Places Ranked', glyph: 'star', numeral: String(n), shape: (['pent', 'heptagon', 'diamond', 'squircle', 'rosette', 'burst'] as const)[i], metal: BEEN_METAL[i], enamel: 'amethyst' },
  }))

  const hoods = new Set(places.map((p) => `${placeCity(p)}:${p.neighborhood}`))
  ;([[5, 'Wanderer', 'bronze'], [15, 'Explorer', 'silver'], [30, 'Cartographer', 'gold']] as const).forEach(([n, title, metal]) => out.push({
    id: `hoods-${n}`, group: 'Milestones', title, blurb: `Eat in ${n} different neighborhoods.`, ring: 'leaf', ...step(hoods.size, n),
    spec: { key: `hoods-${n}`, label: 'Neighborhoods', glyph: 'compass', numeral: String(n), shape: 'oct', metal, enamel: 'teal' },
  }))
  const cuisines = new Set(places.flatMap((p) => p.cuisine))
  ;([[5, 'Curious Fork', 'bronze'], [10, 'Globetrotter', 'silver'], [20, 'World Plate', 'gold']] as const).forEach(([n, title, metal]) => out.push({
    id: `cuisines-${n}`, group: 'Milestones', title, blurb: `Try ${n} different cuisines.`, ring: 'leaf', ...step(cuisines.size, n),
    spec: { key: `cuisines-${n}`, label: 'Cuisines', glyph: 'globe', numeral: String(n), shape: 'scallop', metal, enamel: 'sapphire' },
  }))

  // Gusto's Score boards. Users' Been marks never change these; they only read them.
  const boards = (['seattle', 'la', 'sf', 'sandiego', 'vancouver', 'portland', 'nyc', 'pullman'] as const).map((region) => regionBoard(region, input.gustoScore).shown)
  const numberOne = boards.some((board) => board[0] && beenSet.has(board[0].place.id))
  out.push({ id: 'number-one', group: 'Milestones', title: 'Number One', blurb: 'Eat at a city’s #1 on Gusto’s Top 25.', ring: 'leaf', ...step(numberOne ? 1 : 0, 1),
    spec: { key: 'number-one', label: 'Number One', glyph: 'crown', shape: 'burst', metal: 'gold', enamel: 'coral' } })
  const podium = Math.max(0, ...boards.map((board) => board.slice(0, 3).filter((row) => beenSet.has(row.place.id)).length))
  out.push({ id: 'podium', group: 'Milestones', title: 'Podium', blurb: 'Eat at a city’s #1, #2 and #3 on Gusto’s Top 25.', ring: 'leaf', ...step(podium, 3),
    spec: { key: 'podium', label: 'Podium', glyph: 'laurel', shape: 'rosette', metal: 'gold', enamel: 'navy' } })
  const sweep = Math.max(0, ...boards.map((board) => board.slice(0, 10).filter((row) => beenSet.has(row.place.id)).length))
  out.push({ id: 'top10-sweep', group: 'Milestones', title: 'Top 10 Sweep', blurb: 'Eat at all of a city’s Top 10 on Gusto’s Top 25.', ring: 'leaf', ...step(sweep, 10),
    spec: { key: 'top10-sweep', label: 'Top 10 Sweep', glyph: 'bolt', numeral: '10', shape: 'hex', metal: 'platinum', enamel: 'coral' } })
  const scout = places.some((p) => input.gustoScore(p.id) == null)
  out.push({ id: 'scout', group: 'Milestones', title: 'Scout', blurb: 'Go somewhere Gusto has not scored yet, from a Yet to visit list.', ring: 'leaf', ...step(scout ? 1 : 0, 1),
    spec: { key: 'scout', label: 'Yet to Visit', glyph: 'compass', shape: 'diamond', metal: 'copper', enamel: 'mint' } })
  const inGuides = (re: RegExp) => new Set(input.guides.filter((g) => re.test(g.slug)).flatMap((g) => g.entries.map((e) => e.placeId)))
  const late = inGuides(/late-night/)
  out.push({ id: 'night-owl', group: 'Milestones', title: 'Night Owl', blurb: 'Eat at 3 places on a Late Night guide.', ring: 'leaf', ...step(input.been.filter((id) => late.has(id)).length, 3),
    spec: { key: 'night-owl', label: 'Night Owl', glyph: 'moon', shape: 'circle', metal: 'silver', enamel: 'midnight' } })
  const brunch = inGuides(/brunch|breakfast/)
  out.push({ id: 'brunch-club', group: 'Milestones', title: 'Brunch Club', blurb: 'Eat at 3 places on a Brunch or Breakfast guide.', ring: 'leaf', ...step(input.been.filter((id) => brunch.has(id)).length, 3),
    spec: { key: 'brunch-club', label: 'Brunch Club', glyph: 'sun', shape: 'burst', metal: 'gold', enamel: 'sunrise' } })

  let areasDone = 0
  for (const area of AREAS) {
    const have = places.filter((p) => area.cities.includes(placeCity(p))).length
    if (have > 0 && !area.legacy) areasDone += 1
    out.push({ id: `city-${area.id}`, legacy: area.legacy, group: 'Cities', title: area.legacy ? 'Eastside' : area.title, blurb: `Mark a place Been in ${area.title}.`, ring: 'sky', ...step(have, 1),
      spec: { key: `city-${area.id}`, label: area.title, glyph: area.glyph, shape: 'circle', metal: 'silver', enamel: area.enamel, ink: area.ink } })
  }
  // Any four of the guide's cities count; the badge name and goal stay the same (earned ones stay earned).
  out.push({ id: 'city-all', group: 'Cities', title: 'Four-City Tour', blurb: 'Eat in four of the guide’s cities.', ring: 'sky', ...step(areasDone, 4),
    spec: { key: 'city-all', label: 'Four-City Tour', glyph: 'map', numeral: '4', shape: 'rosette', metal: 'gold', enamel: 'navy' } })

  // Pullman, WA: Coug game days. Crimson and gray paw medals.
  const gameDay = inGuides(/^pul-game-day$/)
  out.push({ id: 'game-day-regular', group: 'Cities', title: 'Game Day Regular', blurb: 'Eat at 5 places on Game day in Pullman.', ring: 'sky', ...step(input.been.filter((id) => gameDay.has(id)).length, 5),
    spec: { key: 'game-day-regular', label: 'Game Day', glyph: 'football', numeral: '5', shape: 'hex', metal: 'silver', enamel: 'crimson' } })
  const palouse = ['pullman', 'moscow'].filter((c) => places.some((p) => placeCity(p) === c)).length
  out.push({ id: 'palouse-explorer', group: 'Cities', title: 'Palouse Explorer', blurb: 'Mark a place Been in both Pullman, WA and Moscow, ID.', ring: 'sky', ...step(palouse, 2),
    spec: { key: 'palouse-explorer', label: 'Palouse', glyph: 'paw', shape: 'oct', metal: 'silver', enamel: 'crimson', ink: '#d9dadb' } })
  const eggs = new Set(input.eggs ?? []).size
  out.push({ id: 'wave-the-flag', hidden: true, group: 'Cities', title: "Ol' Crimson", blurb: 'Find three of the Pullman Easter eggs.', ring: 'gold', ...step(eggs, 3),
    spec: { key: 'wave-the-flag', label: "Ol' Crimson", glyph: 'flag', shape: 'burst', metal: 'gold', enamel: 'crimson' } })

  for (const guide of input.guides) {
    const ids = guide.entries.map((e) => e.placeId).filter((id) => { const p = input.placeOf(id); return p != null && isListed(p) })
    if (!ids.length) continue
    out.push({ id: `guide-${guide.slug}`, group: 'Guides', title: guide.title, blurb: `Mark every place in ${guide.title} Been.`, ring: 'coral', ...step(ids.filter((id) => beenSet.has(id)).length, ids.length),
      spec: guideBadge(guide.slug, guide.title), guide: { slug: guide.slug, city: guide.city ?? 'seattle' } })
  }
  // Ultimate tier, from guide completion: every guide in a city, in a state, then every medal.
  const guideRows = out.filter((a) => a.group === 'Guides')
  const ultimate: Achievement[] = []
  const done = (rows: Achievement[]) => rows.filter((a) => a.earned).length
  for (const area of AREAS) {
    const rows = guideRows.filter((a) => area.cities.includes(a.guide?.city ?? 'seattle'))
    if (!rows.length) continue
    ultimate.push({ id: `ultimate-${area.id}`, legacy: area.legacy, group: 'Ultimate', title: `All of ${area.title}`, blurb: `Complete every ${area.title} guide.`, ring: 'gold', ...step(done(rows), rows.length),
      spec: { key: `ultimate-${area.id}`, label: `All of ${area.title}`, glyph: area.glyph, shape: 'rosette', enamel: area.enamel, ink: area.ink, ultimate: true } })
  }
  const STATES = [
    { id: 'wa', title: 'Washington', areas: ['seattle', 'eastside'], glyph: 'washington' as const, enamel: 'jade' as const },
    { id: 'ca', title: 'California', areas: ['la', 'bay', 'sandiego'], glyph: 'california' as const, enamel: 'sunrise' as const },
  ]
  for (const state of STATES) {
    const cities = AREAS.filter((a) => state.areas.includes(a.id)).flatMap((a) => a.cities)
    const rows = guideRows.filter((a) => cities.includes(a.guide?.city ?? 'seattle'))
    if (!rows.length) continue
    ultimate.push({ id: `ultimate-${state.id}`, group: 'Ultimate', title: `All of ${state.title}`, blurb: `Complete every guide in ${state.title}.`, ring: 'gold', ...step(done(rows), rows.length),
      spec: { key: `ultimate-${state.id}`, label: state.title, glyph: state.glyph, shape: 'burst', enamel: state.enamel, ultimate: true } })
  }
  const everything = [...out, ...ultimate].filter((a) => !a.legacy)
  ultimate.push({ id: 'ultimate-all', group: 'Ultimate', title: 'Completionist', blurb: 'Earn every other medal on Gusto’s Guide.', ring: 'gold', ...step(done(everything), everything.length),
    spec: { key: 'ultimate-all', label: 'Completionist', glyph: 'crown', shape: 'scallop', enamel: 'midnight', ink: '#ffd87a', ultimate: true } })
  return [...ultimate, ...out]
}

export function achievementArt(a: Pick<Achievement, 'spec'>): string {
  return badgeSvg(a.spec)
}
