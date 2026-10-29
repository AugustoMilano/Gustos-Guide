import type { CatalogPhoto, GuideGroup, GuideSummary, Period, Price, SlimPlace } from '../types.ts'

const SEP = '\u001f'

type RatingCell = 0 | [number, number]
type PlaceRow = [
  string, string, string, string, string, string, number, string, string,
  [number, number, number][], number, number, number, string, string, string, string, string, string,
  RatingCell,
]
type GuideRow = [string, string, string, string, string, number, number, string]

export type SlimFile = {
  u: string
  h: number
  g: GuideRow[]
  p: PlaceRow[]
}

function splitList(value: string): string[] {
  return value ? value.split(SEP) : []
}

function periodsFrom(rows: [number, number, number][]): Period[] {
  return rows.map(([mask, start, end]) => {
    const days: number[] = []
    for (let day = 0; day < 7; day += 1) if (mask & (1 << day)) days.push(day)
    return { days, start, end }
  })
}

function photoFrom(code: string, name: string): CatalogPhoto {
  if (!code || code[0] === 'i') {
    return { source: 'illustration', alt: `Illustration of ${name}`, credit: 'Illustration', isIllustration: true }
  }
  const flag = code[0]
  const url = code.slice(2)
  const source = flag === 'f' ? 'flickr' : flag === 'q' ? 'foursquare' : 'wikimedia'
  return {
    source,
    ...(url ? { url } : {}),
    alt: url ? `Photo of ${name}` : `Illustration of ${name}`,
    credit: '',
    ...(flag === 'i' ? { isIllustration: true } : {}),
  }
}

function placeFrom(row: PlaceRow): SlimPlace {
  const [id, name, neighborhood, city, cuisine, placeType, price, oneLiner, perfectFor, periods, lat, lng, closed, guideSlugs, photo, address, website, phone, yelp, rating] = row
  return {
    id,
    ...(city ? { city: city as SlimPlace['city'] } : {}),
    name,
    neighborhood,
    address,
    lat,
    lng,
    cuisine: splitList(cuisine),
    placeType,
    ...(price ? { price: price as Price } : {}),
    oneLiner,
    perfectFor: splitList(perfectFor),
    periods: periodsFrom(periods),
    ...(closed ? { closed: true } : {}),
    ...(rating ? { publicRating: { value: rating[0], count: rating[1], source: 'Yelp' } } : {}),
    gustoScore: null,
    photo: photoFrom(photo, name),
    ...(website ? { website } : {}),
    ...(phone ? { phone } : {}),
    appleMapsUrl: `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`,
    ...(yelp ? { yelpSlug: yelp } : {}),
    guideSlugs: splitList(guideSlugs),
  }
}

function guideFrom(row: GuideRow): GuideSummary {
  const [slug, title, dek, group, updatedAt, ranked, count, city] = row
  return {
    slug,
    title,
    dek,
    group: group as GuideGroup,
    updatedAt,
    ranked: ranked === 1,
    count,
    ...(city ? { city: city as GuideSummary['city'] } : {}),
  }
}

export function expandCatalog(file: SlimFile): { updatedAt: string; hiddenCount: number; places: SlimPlace[]; guides: GuideSummary[] } {
  return {
    updatedAt: file.u,
    hiddenCount: file.h,
    places: file.p.map(placeFrom),
    guides: file.g.map(guideFrom),
  }
}
