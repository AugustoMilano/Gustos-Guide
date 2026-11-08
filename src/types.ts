export type Price = 1 | 2 | 3 | 4
export type VisitStatus = 'togo' | 'been'
export type GuideGroup = 'Best of' | 'Cuisine' | 'Occasion' | 'Neighborhoods' | 'Drinks'
export type Bucket = 'loved' | 'liked' | 'fine' | 'didnt'

export type CatalogPhoto = {
  /** gusto: Augusto's own photo, credited 'Photo by Gusto'. */
  source: 'gusto' | 'wikimedia' | 'flickr' | 'illustration' | 'foursquare'
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
  /** Omitted places are Seattle. Eastside and Los Angeles are marked. */
  city?: 'seattle' | 'eastside' | 'la' | 'sf' | 'eastbay' | 'peninsula' | 'northbay' | 'sandiego' | 'vancouver' | 'portland' | 'nyc' | 'pullman' | 'moscow'
  name: string
  neighborhood: string
  address: string
  lat: number
  lng: number
  cuisine: string[]
  placeType: string
  /** Missing when no price band was published. */
  price?: Price
  oneLiner: string
  perfectFor: string[]
  periods: Period[]
  /** Set only when a stable source says the place has closed. Lists hide it; the page stays. */
  closed?: boolean
  publicRating?: { value: number; count: number; source: string }
  gustoScore: null
  photo: CatalogPhoto
  website?: string
  phone?: string
  appleMapsUrl: string
  applePlaceUrl?: string
  yelpSlug?: string
  guideSlugs: string[]
}

export type Place = Omit<SlimPlace, 'photo'> & {
  muid: string
  hoursLabel: string
  blurb: string
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
  vibe?: string
}

export type Guide = {
  slug: string
  title: string
  dek: string
  group: GuideGroup
  intro: string
  updatedAt: string
  ranked: boolean
  /** Manual order. Score sort does not reshuffle a pinned guide. */
  pinned?: boolean
  /** Omitted guides are Seattle. */
  city?: 'seattle' | 'eastside' | 'la' | 'sf' | 'eastbay' | 'peninsula' | 'northbay' | 'sandiego' | 'vancouver' | 'portland' | 'nyc' | 'pullman' | 'moscow'
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
  /** Omitted guides are Seattle. */
  city?: 'seattle' | 'eastside' | 'la' | 'sf' | 'eastbay' | 'peninsula' | 'northbay' | 'sandiego' | 'vancouver' | 'portland' | 'nyc' | 'pullman' | 'moscow'
}

export type GuideVisibility = 'private' | 'friends' | 'public'

export type UserGuide = {
  id: string
  title: string
  placeIds: string[]
  shared: boolean
  collaboratorIds: string[]
  ownerId?: string
  demo?: boolean
  isPublic?: boolean
  visibility?: GuideVisibility
  coverPlaceId?: string
  inviteToken?: string
  emoji?: string
  color?: string
  notes?: Record<string, string>
  addedAt?: Record<string, string>
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
  votes: Record<string, { placeId?: string; date?: string; time?: string }>
  rsvps: Record<string, 'yes' | 'no' | 'maybe'>
  inviteIds: string[]
  locked?: boolean
  vibe?: string
  inviteToken?: string
}

export type Notice = {
  id: string
  text: string
  href: string
  read: boolean
  createdAt: string
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
  avatarUrl?: string
  /** Display only. Not written to the profile. */
  givenName?: string
}
