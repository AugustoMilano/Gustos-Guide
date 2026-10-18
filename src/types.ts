export type Price = 1 | 2 | 3 | 4
export type VisitStatus = 'togo' | 'been'
export type GuideGroup = 'Best of' | 'Cuisine' | 'Occasion' | 'Neighborhoods' | 'Drinks'
export type Bucket = 'loved' | 'liked' | 'fine' | 'didnt'

export type CatalogPhoto = {
  source: 'wikimedia' | 'illustration' | 'foursquare'
  url?: string
  alt: string
  credit: string
  creditUrl?: string
  license?: string
  isIllustration?: boolean
  fsqPhotoId?: string
  fsqPrefix?: string
  fsqSuffix?: string
}

export type Period = { days: number[]; start: number; end: number }

export type SlimPlace = {
  id: string
  name: string
  neighborhood: string
  address: string
  lat: number
  lng: number
  cuisine: string[]
  placeType: string
  price: Price
  oneLiner: string
  perfectFor: string[]
  periods: Period[]
  appleRating?: { percent: number; count?: number }
  publicRating?: { value: number; count: number; source: string }
  gustoScore: null
  photo: CatalogPhoto
  website?: string
  phone?: string
  appleMapsUrl: string
  yelpSlug?: string
  guideSlugs: string[]
}

export type Place = Omit<SlimPlace, 'photo'> & {
  muid: string
  hoursLabel: string
  review: string
  orderThis: { dish: string; note: string }[]
  ids: { fsq?: string; yelp?: string }
  copySource: 'draft'
  updatedAt: string
  photos: CatalogPhoto[]
}

export type GuideEntry = {
  placeId: string
  pullQuote: string
  blurb: string
  copySource: 'draft'
}

export type Guide = {
  slug: string
  title: string
  dek: string
  group: GuideGroup
  intro: string
  updatedAt: string
  ranked: boolean
  entries: GuideEntry[]
}

export type GuideSummary = {
  slug: string
  title: string
  dek: string
  group: GuideGroup
  updatedAt: string
  ranked: boolean
  count: number
}

export type UserGuide = {
  id: string
  title: string
  placeIds: string[]
  shared: boolean
  collaboratorIds: string[]
}

export type Activity = {
  id: string
  userId: string
  type: 'been' | 'saved' | 'rated' | 'list' | 'photo'
  placeId?: string
  listId?: string
  listTitle?: string
  text: string
  score?: number
  createdAt: string
}

export type Plan = {
  id: string
  title: string
  hostId: string
  demo?: boolean
  placeIds: string[]
  dates: string[]
  votes: Record<string, { placeId?: string; date?: string }>
  rsvps: Record<string, 'yes' | 'no' | 'maybe'>
  inviteIds: string[]
}

export type Comment = {
  id: string
  activityId: string
  userId: string
  text: string
  createdAt: string
}

export type RankScore = { bucket: Bucket; score: number }

export type SessionUser = {
  id: string
  name: string
  handle: string
  isOwner: boolean
}
