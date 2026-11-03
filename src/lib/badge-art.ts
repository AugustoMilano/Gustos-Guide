/**
 * Achievement medals, drawn as SVG from one small design system:
 * a shape, a metal rim, an enamel face, a rim pattern, a glyph and the name on an arc.
 * Every input is picked from the badge key, so each guide gets its own medal.
 */

export type Glyph = keyof typeof GLYPHS
export type Shape = 'circle' | 'hex' | 'oct' | 'pent' | 'diamond' | 'rosette' | 'burst' | 'scallop' | 'squircle' | 'heptagon'

type Metal = { name: string; stops: [string, string, string, string] }
type Enamel = { name: string; inner: string; outer: string; ink: string }

const METALS: Metal[] = [
  { name: 'gold', stops: ['#fff1c2', '#e2b44f', '#8a5d14', '#f6d47e'] },
  { name: 'silver', stops: ['#ffffff', '#c9d1d9', '#5d6873', '#e9edf1'] },
  { name: 'bronze', stops: ['#ffe0c2', '#c98950', '#5e3315', '#e8b07c'] },
  { name: 'rose', stops: ['#ffe4e1', '#e7a49b', '#8b4a45', '#f4c7c0'] },
  { name: 'copper', stops: ['#ffd7c0', '#d9774a', '#6b2a12', '#f2a27a'] },
  { name: 'platinum', stops: ['#ffffff', '#dfe5ee', '#7a8698', '#f3f6fa'] },
]

const ENAMELS: Record<string, Enamel> = {
  coral: { name: 'coral', inner: '#ff8a63', outer: '#e2401e', ink: '#fffaf3' },
  navy: { name: 'navy', inner: '#3a4f9c', outer: '#141f4d', ink: '#ffe9b8' },
  leaf: { name: 'leaf', inner: '#5fd17f', outer: '#16793a', ink: '#fffaf3' },
  crimson: { name: 'crimson', inner: '#c22a44', outer: '#5c0f1d', ink: '#f2f2f3' },
  ruby: { name: 'ruby', inner: '#e9476a', outer: '#7d0f2c', ink: '#ffe9ef' },
  sapphire: { name: 'sapphire', inner: '#4fa3ff', outer: '#0d3f9c', ink: '#f2f8ff' },
  teal: { name: 'teal', inner: '#40d2c4', outer: '#0b6b6a', ink: '#f0fffd' },
  amethyst: { name: 'amethyst', inner: '#b27cff', outer: '#4e1f9a', ink: '#f7f0ff' },
  espresso: { name: 'espresso', inner: '#a8714b', outer: '#3d1f10', ink: '#ffe9cf' },
  sunrise: { name: 'sunrise', inner: '#ffd166', outer: '#f2771f', ink: '#4a2006' },
  blush: { name: 'blush', inner: '#ffc2d1', outer: '#e76f93', ink: '#5a1229' },
  mint: { name: 'mint', inner: '#b8f2d6', outer: '#2fae80', ink: '#0b3d2b' },
  midnight: { name: 'midnight', inner: '#3c3f73', outer: '#0d0f2b', ink: '#c9d4ff' },
  saffron: { name: 'saffron', inner: '#ffdf6e', outer: '#c98a00', ink: '#3a2600' },
  ocean: { name: 'ocean', inner: '#5ed0ff', outer: '#0a5e8c', ink: '#effaff' },
  plum: { name: 'plum', inner: '#d1608f', outer: '#5a1238', ink: '#ffeaf3' },
  jade: { name: 'jade', inner: '#7fe0a5', outer: '#0e5e4a', ink: '#f1fff6' },
  cream: { name: 'cream', inner: '#fffaf3', outer: '#efd9b8', ink: '#141f4d' },
  graphite: { name: 'graphite', inner: '#5b6270', outer: '#1b1f27', ink: '#ffd27a' },
}

/** 24-unit stroke icons. */
export const GLYPHS = {
  pizza: 'M12 3 21 19Q12 22.5 3 19Z M9 12h.01 M14 14h.01 M11 17h.01 M5 16.5Q12 19 19 16.5',
  sushi: 'M4 10a8 3.5 0 0 0 16 0a8 3.5 0 0 0-16 0v5a8 3.5 0 0 0 16 0v-5 M8.5 10a3.5 1.5 0 0 0 7 0a3.5 1.5 0 0 0-7 0',
  coffee: 'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z M16 11h1.5a2.5 2.5 0 0 1 0 5H16 M9 3.5c-1 1.5 1 2.5 0 4 M12.5 3.5c-1 1.5 1 2.5 0 4 M4 21h14',
  croissant: 'M2.5 15c2.5-7.5 16.5-7.5 19 0c-2.5-1.8-4.5-1.5-5.5 1c-.8-3-5.2-3-6 0c-1-2.5-3-2.8-7.5-1z M9.5 10.5l.8 4 M14.5 10.5l-.8 4',
  donut: 'M12 4a8 8 0 1 0 .01 0z M12 9.5a2.5 2.5 0 1 0 .01 0z M7 8l1 1 M16 7l-1 1.2 M17 15l-1.2-.5 M8 16l1-1',
  icecream: 'M7.5 11l4.5 10 4.5-10 M6.5 11a5.5 5.5 0 0 1 11 0z M9 14l5 3 M10 17l3.5-4',
  cocktail: 'M4 4h16l-8 9z M12 13v7 M8 20h8 M15 3l3-1.5 M7 7h10',
  wine: 'M8 3h8v5a4 4 0 0 1-8 0z M12 12v8 M8 20h8 M8 7h8',
  beer: 'M6 8h10v12H6z M16 11h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2 M6 8a3 3 0 0 1 5-2.5A3 3 0 0 1 16 8 M9 11v6 M12.5 11v6',
  skyline: 'M3 20V11h4v9 M7 20V5h5v15 M12 20V9h4v11 M16 20v-6h5v6 M2 20h20 M9 8h1 M9 11h1 M9 14h1',
  heart: 'M12 20s-8-5-8-11a4 4 0 0 1 8-1.5A4 4 0 0 1 20 9c0 6-8 11-8 11z',
  gem: 'M6 4h12l4 5-10 12L2 9z M2 9h20 M9 4l3 17 3-17',
  coin: 'M12 4a8 8 0 1 0 .01 0z M12 7v10 M14.5 9.5c-.8-1.4-5-1.4-5 .6s5 1.4 5 3.6-4 2-5 .6',
  sun: 'M12 8a4 4 0 1 0 .01 0z M12 2v2.5 M12 19.5V22 M2 12h2.5 M19.5 12H22 M4.9 4.9l1.8 1.8 M17.3 17.3l1.8 1.8 M4.9 19.1l1.8-1.8 M17.3 6.7l1.8-1.8',
  clock: 'M12 4a8 8 0 1 0 .01 0z M12 7.5V12l3 2',
  sandwich: 'M3 10.5 12 4l9 6.5z M3 13.5c2 1 4-1 6 0s4-1 6 0 4 1 6 0 M4 16.5h16v3H4z',
  burger: 'M4 10.5a8 6 0 0 1 16 0z M3 13.5h18 M4 16.5h16a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z M9 7.5h.01 M13 6.5h.01',
  pasta: 'M8 3v5a4 4 0 0 0 8 0V3 M12 3v6 M12 12v9 M6 15c2-1.5 4 1.5 6 0s4 1.5 6 0',
  fish: 'M3 12c4-6 11-6 15 0-4 6-11 6-15 0z M18 12l3.5-3.5v7z M7.5 11h.01 M12 9c1 2 1 4 0 6',
  bowl: 'M3 11h18a9 9 0 0 1-18 0z M14 2.5l-3 8.5 M20 3.5l-7.5 7.5 M8 20h8',
  taco: 'M3 17a9 9 0 0 1 18 0z M6 14c1-1.2 2 1.2 3 0s2 1.2 3 0 2 1.2 3 0 2 1.2 3 0',
  steak: 'M4 13c-1-5 4-9 10-8.5 5 .5 7.5 4 6.5 8-1 4.5-5 6.5-10 6-4-.3-6-2.5-6.5-5.5z M8 12c2-1 4 1 6 0 M9 15.5c2-1 4 1 6 0 M10 8.5c1.5-.5 3 .5 4.5 0',
  crown: 'M3 18l2-10 5 5 2-8 2 8 5-5 2 10z M3 21h18',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.2 6.2 0 0 0 10.5 10.5z M16 4.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z',
  table: 'M3 10h18 M5 10v10 M19 10v10 M8 6a1.5 1.5 0 1 0 .01 0z M12 5a1.5 1.5 0 1 0 .01 0z M16 6a1.5 1.5 0 1 0 .01 0z',
  door: 'M6 21V4h12v17 M3 21h18 M14.5 12.5h.01 M9 4v17',
  home: 'M3 11l9-7 9 7 M5.5 9.5V20h13V9.5 M10 20v-5h4v5',
  market: 'M3 9l2-5h14l2 5 M3 9c0 2.4 3.6 2.4 3.6 0 0 2.4 3.6 2.4 3.6 0 0 2.4 3.6 2.4 3.6 0 0 2.4 3.6 2.4 3.6 0 0 2.4 3.6 2.4 3.6 0 M5 11.5V20h14v-8.5 M10 20v-5h4v5',
  laurel: 'M8 20C3 16 3 9 6 4 M16 20c5-4 5-11 2-16 M5 9l-2.5-1 M4.5 13 2 13 M6 16.5l-2 1.5 M19 9l2.5-1 M19.5 13H22 M18 16.5l2 1.5 M12 7l1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z',
  wave: 'M2 10c3-3 5 3 8 0s5 3 8 0 3-1 4 0 M2 14.5c3-3 5 3 8 0s5 3 8 0 3-1 4 0 M2 19c3-3 5 3 8 0s5 3 8 0 3-1 4 0',
  sail: 'M12 3v14 M12 4l7 12h-7 M11 6 5 16h6 M3 19c2 1.5 4 1.5 6 0s4 1.5 6 0 4 1.5 6 0',
  palm: 'M12 21c0-5 .5-9 2-12 M14 9c-2-3-6-3-8-1 M14 9c1-3 5-4 7-2 M14 9c-3 0-5 2-6 5 M14 9c3 0 5 2 5 5 M8 21h9',
  mountain: 'M2 20 9 7l4 6.5 3-4L22 20z M7.5 10l1.5 1 1-1.2',
  pin: 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z M12 6.5a2.5 2.5 0 1 0 .01 0z',
  compass: 'M12 3a9 9 0 1 0 .01 0z M15.5 8.5l-2 5-5 2 2-5z',
  bridge: 'M2 17h20 M4 17V9 M20 17V9 M4 9c4 5 12 5 16 0 M8 17v-4 M12 17v-3 M16 17v-4 M2 9h4 M18 9h4',
  tower: 'M12 2v4 M9 6h6l-1 4h-4z M10 10l-2 11h8l-2-11 M7 21h10 M11 14h2',
  anchor: 'M12 5a2 2 0 1 0 .01 0z M12 7v13 M8 10h8 M4 13c0 4 4 7 8 7s8-3 8-7 M4 13l-1.5 1.5 M20 13l1.5 1.5',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  // Original geometric paw print: one pad and four toes. Not any school's mark.
  paw: 'M8.4 16c0-2.3 1.6-3.8 3.6-3.8s3.6 1.5 3.6 3.8-1.6 3.9-3.6 3.9-3.6-1.6-3.6-3.9z M6.2 8.6a1.6 1.9 0 1 0 .01 0z M9.8 5.4a1.6 1.9 0 1 0 .01 0z M14.2 5.4a1.6 1.9 0 1 0 .01 0z M17.8 8.6a1.6 1.9 0 1 0 .01 0z',
  tree: 'M12 3 6 12h3l-4 6h14l-4-6h3z M12 18v3',
  baguette: 'M4 18 18 4a2.1 2.1 0 0 1 3 3L7 21a2.1 2.1 0 0 1-3-3z M9 11.5l2 2 M12 8.5l2 2 M15 5.5l2 2',
  flag: 'M5 21V4 M5 4h12l-2.5 4L17 12H5',
  globe: 'M12 3a9 9 0 1 0 .01 0z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  chili: 'M6 20c8 0 13-6 13-12 0-1.5-1-2.5-2.5-2.5S14 7 14 9c0 4-3 8-8 8-1.5 0-1.5 3 0 3z M17 5.5c0-1.5 1-3 2.5-3',
  bento: 'M3 6h18v12H3z M12 6v12 M12 12h9 M6.5 9.5h2 M6.5 13.5h2',
  dumpling: 'M3 15c0-5 4-8 9-8s9 3 9 8z M7 9.5l1 2 M10.5 8l.5 2.5 M14 8l-.5 2.5 M17.5 9.5l-1 2',
  rings: 'M8 8a5 5 0 1 0 .01 0z M16 8a5 5 0 1 0 .01 0z M12 14a5 5 0 1 0 .01 0z',
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14',
  needle: 'M12 1.5v3 M7 7.5h10 M8 7.5c.3-1.8 2-3 4-3s3.7 1.2 4 3 M7 7.5c.6 1.3 2.6 2 5 2s4.4-.7 5-2 M10.5 9.4 9 21 M13.5 9.4 15 21 M12 9.5v11.5 M9.6 15.5h4.8 M7 21h10 M9.3 18.5h5.4',
  goldengate: 'M5 16V2.5 M7 16V2.5 M4.5 2.5h3 M5 6.5h2 M5 10.5h2 M17 16V2.5 M19 16V2.5 M16.5 2.5h3 M17 6.5h2 M17 10.5h2 M.5 11Q3 6 6 3.5Q12 16 18 3.5Q21 6 23.5 11 M9.5 12.5V8.8 M12 12.5V9.8 M14.5 12.5V8.8 M.5 12.5h23 M1 19c2.2-1.3 4.3 1.3 6.5 0s4.3 1.3 6.5 0 4.3 1.3 6.5 0 2 .6 3 0',
  beach: 'M18 3.5a2.5 2.5 0 1 0 .01 0z M18 .5v.8 M21.8 6h-.8 M20.7 3.3l-.6.6 M14.2 6h.8 M2.5 12a6.5 6.5 0 0 1 13 0z M9 5.5v-1 M6 12c0-3.6 1.4-6.5 3-6.5s3 2.9 3 6.5 M9 12v8.5 M12.5 16c1.6-1.1 3.2 1.1 4.8 0s3.2 1.1 4.8 0 M14 18.6c1.3-.8 2.6.8 3.9 0s2.6.8 3.9 0 M1 21.5c4.5-2.7 17.5-2.7 22 0',
  washington: 'M2.5 5.5h4l.8 1.6 1.4-.4.3-2.2h12.5v13H2.5z M5 8.5c1 .5 1.5 1.8 1 3 M15 9.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z',
  california: 'M5 2.5h6.5v7.5l8.5 9.5-.8 2.5h-5.4l-.6-2.4-5.6-5.1-1.6-4.6.2-4.5z M9.5 6.5l.6 1.2 1.3.2-1 .9.3 1.3-1.2-.6-1.2.6.3-1.3-1-.9 1.3-.2z',
  spark: 'M12 2v6 M12 16v6 M2 12h6 M16 12h6 M5 5l3.5 3.5 M15.5 15.5 19 19 M5 19l3.5-3.5 M15.5 8.5 19 5',
} as const

export type BadgeSpec = {
  key: string
  /** Short name set on the rim arc. */
  label: string
  glyph: Glyph
  shape?: Shape
  enamel?: keyof typeof ENAMELS
  metal?: Metal['name']
  /** Big centre numeral for milestone medals, e.g. "25". */
  numeral?: string
  /** Glyph colour when it should differ from the enamel's ink, e.g. Golden Gate orange. */
  ink?: string
  /** Ultimate tier: iridescent rim and a ray crown behind the medal. */
  ultimate?: boolean
}

export function hashOf(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const IRIDESCENT: Metal = { name: 'iridescent', stops: ['#fffaf0', '#b9e8ff', '#c79bff', '#ffd2ec'] }

function rays(id: string): string {
  const n = 32
  const pts: string[] = []
  for (let i = 0; i < n * 2; i += 1) {
    const t = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? 59.5 : 50
    pts.push(`${(60 + r * Math.cos(t)).toFixed(2)} ${(60 + r * Math.sin(t)).toFixed(2)}`)
  }
  return `<path d="M${pts.join('L')}Z" fill="url(#${id}g)"/>`
}

const SHAPES: Shape[] = ['circle', 'hex', 'oct', 'pent', 'diamond', 'rosette', 'burst', 'scallop', 'squircle', 'heptagon']

function radiusAt(shape: Shape, t: number, lobes: number): number {
  const poly = (n: number, rot: number) => {
    const seg = (2 * Math.PI) / n
    const a = ((((t - rot) % seg) + seg) % seg) - seg / 2
    const flat = Math.cos(Math.PI / n) / Math.cos(a)
    return flat * 0.86 + 0.14 * Math.cos(Math.PI / n) // soft corners
  }
  switch (shape) {
    case 'circle': return 1
    case 'hex': return poly(6, Math.PI / 6) * 1.04
    case 'oct': return poly(8, Math.PI / 8) * 1.02
    case 'pent': return poly(5, -Math.PI / 2) * 1.08
    case 'heptagon': return poly(7, -Math.PI / 2) * 1.05
    case 'diamond': return poly(4, 0) * 1.12
    case 'rosette': return 0.93 + 0.07 * Math.cos(lobes * t)
    case 'burst': return 0.9 + 0.1 * (Math.abs(Math.cos((lobes * t) / 2)) ** 0.5)
    case 'scallop': return 1 - 0.05 * Math.abs(Math.sin((lobes * t) / 2))
    case 'squircle': {
      const c = Math.abs(Math.cos(t)) ** 4 + Math.abs(Math.sin(t)) ** 4
      return 0.97 / c ** 0.25
    }
  }
}

function shapePath(shape: Shape, r: number, lobes: number): string {
  const n = 180
  const pts: string[] = []
  for (let i = 0; i < n; i += 1) {
    const t = (i / n) * Math.PI * 2 - Math.PI / 2
    const rr = r * Math.min(1.12, radiusAt(shape, t, lobes))
    pts.push(`${(60 + rr * Math.cos(t)).toFixed(2)} ${(60 + rr * Math.sin(t)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
}

function minRadius(shape: Shape, lobes: number): number {
  let m = 9
  for (let i = 0; i < 360; i += 1) m = Math.min(m, Math.min(1.12, radiusAt(shape, (i / 180) * Math.PI, lobes)))
  return m
}

const cache = new Map<string, string>()

export function badgeSvg(spec: BadgeSpec): string {
  const cacheKey = JSON.stringify(spec)
  const hit = cache.get(cacheKey)
  if (hit) return hit
  const h = hashOf(spec.key)
  const shape = spec.shape ?? SHAPES[h % SHAPES.length]
  const lobes = [10, 12, 14, 16, 18, 20][(h >>> 4) % 6]
  const metal = spec.ultimate ? IRIDESCENT : METALS.find((m) => m.name === spec.metal) ?? METALS[(h >>> 8) % METALS.length]
  const enamelKeys = Object.keys(ENAMELS)
  const enamel = ENAMELS[spec.enamel ?? enamelKeys[(h >>> 12) % enamelKeys.length]]
  const pattern = (h >>> 16) % 4
  const angle = ((h >>> 20) % 50) - 25
  const id = `b${h.toString(36)}`
  const R = 54
  const face = R * 0.82
  const inner = face * minRadius(shape, lobes)
  const textR = Math.max(24, inner - 8)
  const [m0, m1, m2, m3] = metal.stops
  const ringPath = shapePath(shape, R * 0.91, lobes)
  const deco = [
    `<path d="${ringPath}" fill="none" stroke="${m2}" stroke-opacity=".55" stroke-width="1.6" stroke-dasharray="0.1 4.2" stroke-linecap="round"/>`,
    `<path d="${ringPath}" fill="none" stroke="${m2}" stroke-opacity=".45" stroke-width="2.4" stroke-dasharray="1 2.4"/>`,
    `<path d="${shapePath(shape, R * 0.94, lobes)}" fill="none" stroke="${m0}" stroke-opacity=".8" stroke-width=".8"/><path d="${shapePath(shape, R * 0.88, lobes)}" fill="none" stroke="${m2}" stroke-opacity=".5" stroke-width=".8"/>`,
    `<path d="${ringPath}" fill="none" stroke="${m0}" stroke-opacity=".7" stroke-width="1.2" stroke-dasharray="6 3"/>`,
  ][pattern]
  const label = spec.label.toUpperCase()
  // Fit the name to the arc: about 80% of the half circle, ~0.78em per capital with tracking.
  const size = Math.max(4.6, Math.min(7.2, (Math.PI * textR * 0.8) / (label.length * 0.78)))
  const glyphScale = spec.numeral ? 0.78 : 1.45
  const gy = spec.numeral ? 22 : 37
  const gx = 60 - 12 * glyphScale
  const numeral = spec.numeral
    ? `<text x="60" y="${spec.numeral.length > 3 ? 72 : 75}" text-anchor="middle" font-family="'Instrument Serif','Times New Roman',serif" font-style="italic" font-size="${spec.numeral.length > 3 ? 26 : spec.numeral.length > 2 ? 32 : 38}" fill="${enamel.ink}" filter="url(#${id}e)">${spec.numeral}</text>`
    : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" aria-hidden="true">
<defs>
<linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle} .5 .5)"><stop offset="0" stop-color="${m0}"/><stop offset=".35" stop-color="${m1}"/><stop offset=".62" stop-color="${m2}"/><stop offset=".82" stop-color="${m1}"/><stop offset="1" stop-color="${m3}"/></linearGradient>
<linearGradient id="${id}r" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${m0}"/><stop offset=".5" stop-color="${m2}"/><stop offset="1" stop-color="${m0}"/></linearGradient>
<radialGradient id="${id}f" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="${enamel.inner}"/><stop offset="1" stop-color="${enamel.outer}"/></radialGradient>
<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="${id}c"><path d="${shapePath(shape, face, lobes)}"/></clipPath>
<filter id="${id}e" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation=".6" flood-color="#000" flood-opacity=".35"/></filter>
<path id="${id}t" d="M ${60 - textR} 60 A ${textR} ${textR} 0 0 0 ${60 + textR} 60"/>
</defs>
${spec.ultimate ? `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".3" stop-color="#ffc8e8"/><stop offset=".55" stop-color="#b7e3ff"/><stop offset=".8" stop-color="#d8c2ff"/><stop offset="1" stop-color="#ffe7a3"/></linearGradient>${rays(id)}` : ''}
<path d="${shapePath(shape, R, lobes)}" fill="url(#${id}m)"/>
<path d="${shapePath(shape, R - 1, lobes)}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1"/>
${deco}
<path d="${shapePath(shape, face + 1.6, lobes)}" fill="url(#${id}r)"/>
<path d="${shapePath(shape, face, lobes)}" fill="url(#${id}f)"/>
<g clip-path="url(#${id}c)"><ellipse cx="46" cy="30" rx="56" ry="30" fill="url(#${id}s)" transform="rotate(-18 46 30)"/></g>
<g transform="translate(${gx} ${gy}) scale(${glyphScale})" filter="url(#${id}e)"><path d="${GLYPHS[spec.glyph]}" fill="none" stroke="${spec.ink ?? enamel.ink}" stroke-width="${(1.7 / glyphScale) * 1.25}" stroke-linecap="round" stroke-linejoin="round"/></g>
${numeral}
<text font-family="Inter,system-ui,sans-serif" font-weight="800" font-size="${size}" letter-spacing="${size > 7 ? 1.1 : 0.6}" fill="${enamel.ink}" fill-opacity=".92" text-anchor="middle"><textPath href="#${id}t" startOffset="50%">${escapeXml(label)}</textPath></text>
</svg>`
  cache.set(cacheKey, svg)
  return svg
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Theme for a guide: glyph and enamel from its slug and title; shape, metal and rim from its hash. */
const THEMES: [RegExp, Glyph, keyof typeof ENAMELS][] = [
  [/pizza/, 'pizza', 'coral'],
  [/sushi|japanese/, 'sushi', 'ruby'],
  [/coffee/, 'coffee', 'espresso'],
  [/bakery|bakeries/, 'croissant', 'saffron'],
  [/donut|bagel/, 'donut', 'blush'],
  [/ice-cream/, 'icecream', 'mint'],
  [/cocktail|bar-list|happy/, 'cocktail', 'amethyst'],
  [/dive/, 'bolt', 'graphite'],
  [/rooftop|view/, 'skyline', 'ocean'],
  [/wine/, 'wine', 'plum'],
  [/beer|brewer/, 'beer', 'saffron'],
  [/date-night/, 'heart', 'ruby'],
  [/splurge/, 'gem', 'midnight'],
  [/cheap/, 'coin', 'leaf'],
  [/brunch|breakfast/, 'sun', 'sunrise'],
  [/sandwich/, 'sandwich', 'saffron'],
  [/burger/, 'burger', 'coral'],
  [/italian/, 'pasta', 'leaf'],
  [/seafood/, 'fish', 'ocean'],
  [/noodle|asian/, 'bowl', 'ruby'],
  [/mexican/, 'chili', 'coral'],
  [/taco/, 'taco', 'sunrise'],
  [/steak/, 'steak', 'graphite'],
  [/classics/, 'crown', 'navy'],
  [/late-night/, 'moon', 'midnight'],
  [/big-group/, 'table', 'teal'],
  [/walk-in/, 'door', 'jade'],
  [/parents/, 'home', 'cream'],
  [/pike-place/, 'market', 'coral'],
  [/gustos-25|best-of/, 'laurel', 'navy'],
  [/french/, 'baguette', 'sapphire'],
  [/new-american|american/, 'star', 'navy'],
  [/chinatown|international/, 'dumpling', 'ruby'],
  [/waterfront|santa-monica|malibu|venice|coronado|la-jolla|pacifica|half-moon|embarcadero|west-seattle/, 'wave', 'ocean'],
  [/sausalito|tiburon|ballard|kirkland|larkspur/, 'sail', 'sapphire'],
  [/issaquah|mercer|corte-madera/, 'mountain', 'jade'],
  [/downtown|financial|soma|south-lake|belltown|bellevue/, 'skyline', 'midnight'],
  [/fremont|wallingford|phinney|queen-anne|russian-hill|beacon/, 'bridge', 'teal'],
  [/hollywood|beverly|west-hollywood/, 'palm', 'sunrise'],
  [/little-italy|north-beach/, 'pasta', 'leaf'],
  [/capitol-hill|u-district|east-village|north-park|mission/, 'spark', 'amethyst'],
  [/pioneer|georgetown|jackson-square|columbia/, 'tower', 'espresso'],
  [/marina|cow-hollow/, 'anchor', 'navy'],
  [/palo-alto|san-jose|santa-clara|fremont|pleasanton|berkeley/, 'tree', 'leaf'],
]

const NEIGHBOURS: Partial<Record<keyof typeof ENAMELS, (keyof typeof ENAMELS)[]>> = {
  ocean: ['teal', 'sapphire', 'navy'],
  sapphire: ['ocean', 'navy'],
  midnight: ['navy', 'graphite'],
  teal: ['jade', 'ocean'],
  sunrise: ['saffron', 'coral'],
  amethyst: ['plum', 'midnight'],
  leaf: ['jade', 'mint'],
  jade: ['leaf', 'teal'],
  espresso: ['graphite'],
}

export function guideBadge(slug: string, title: string): BadgeSpec {
  const theme = THEMES.find(([re]) => re.test(slug))
  const h = hashOf(slug)
  const glyphs: Glyph[] = ['pin', 'compass', 'map', 'star', 'tree', 'bridge']
  const enamels = Object.keys(ENAMELS) as (keyof typeof ENAMELS)[]
  // Same theme in two cities still differs: the enamel shifts with the hash when it is not the first city.
  // Same theme in another city keeps its family colour but shifts to a neighbour, so two coast guides differ.
  const family = theme ? [theme[2], ...(NEIGHBOURS[theme[2]] ?? [])] : enamels
  const enamel = family[(h >>> 3) % family.length]
  return { key: `guide:${slug}`, label: shortLabel(title), glyph: theme ? theme[1] : glyphs[h % glyphs.length], enamel }
}

function shortLabel(title: string): string {
  return title
    .replace(/\(.*?\)/g, '')
    .replace(/^(The |Best of |Best )/i, '')
    .replace(/ Essentials$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 26)
}

/** The medal's reverse: same silhouette and rim, all metal, ready for engraving. */
export function badgeBackSvg(spec: BadgeSpec, metalName: string): string {
  const h = hashOf(spec.key)
  const shape = spec.shape ?? SHAPES[h % SHAPES.length]
  const lobes = [10, 12, 14, 16, 18, 20][(h >>> 4) % 6]
  const metal = spec.ultimate ? IRIDESCENT : METALS.find((m) => m.name === metalName) ?? METALS[(h >>> 8) % METALS.length]
  const [m0, m1, m2, m3] = metal.stops
  const id = `k${h.toString(36)}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" aria-hidden="true"><defs>
<linearGradient id="${id}a" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m0}"/><stop offset=".4" stop-color="${m1}"/><stop offset=".7" stop-color="${m3}"/><stop offset="1" stop-color="${m2}"/></linearGradient>
<radialGradient id="${id}b" cx=".6" cy=".35" r=".9"><stop offset="0" stop-color="${m0}"/><stop offset=".6" stop-color="${m3}"/><stop offset="1" stop-color="${m1}"/></radialGradient>
</defs>
<path d="${shapePath(shape, 54, lobes)}" fill="url(#${id}a)"/>
<path d="${shapePath(shape, 46, lobes)}" fill="url(#${id}b)" stroke="${m2}" stroke-opacity=".5" stroke-width="1"/>
<path d="${shapePath(shape, 45, lobes)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".8"/>
</svg>`
}

/** Edge colour for the medal's thickness. */
export function badgeEdge(spec: BadgeSpec): { svg: string } {
  const h = hashOf(spec.key)
  const shape = spec.shape ?? SHAPES[h % SHAPES.length]
  const lobes = [10, 12, 14, 16, 18, 20][(h >>> 4) % 6]
  const metal = METALS.find((m) => m.name === spec.metal) ?? METALS[(h >>> 8) % METALS.length]
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" aria-hidden="true"><path d="${shapePath(shape, 54, lobes)}" fill="${metal.stops[2]}"/></svg>` }
}

export function badgeMetal(spec: BadgeSpec): string {
  if (spec.ultimate) return 'platinum'
  const h = hashOf(spec.key)
  return (METALS.find((m) => m.name === spec.metal) ?? METALS[(h >>> 8) % METALS.length]).name
}
