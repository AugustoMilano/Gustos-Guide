export type Price = 1 | 2 | 3 | 4

export type VisitStatus = 'togo' | 'been'

export interface City {
  id: string
  name: string
  slug: string
  region: string
  blurb: string
  comingSoon: boolean
  center: { lat: number; lng: number } | null
}

export interface Place {
  id: string
  slug: string
  name: string
  cityId: string
  neighborhood: string
  cuisine: string
  price: Price
  rating: number
  dish: string
  note: string
  address: string
  lat: number
  lng: number
  website?: string
  hours?: string
  photoUrl?: string
  source: 'house' | 'user'
}

export interface Guide {
  id: string
  slug: string
  title: string
  cityId: string
  dek: string
  kind: 'house' | 'user'
  placeIds: string[]
}

export interface LocalUser {
  id: string
  name: string
}

export interface UserDocument {
  version: 1
  cities: City[]
  places: Place[]
  guides: Guide[]
  statuses: Record<string, VisitStatus>
}

export interface NewPlaceInput {
  name: string
  cityId: string
  neighborhood: string
  cuisine: string
  price: Price
  rating: number
  dish: string
  note: string
  address: string
  lat: number
  lng: number
  website?: string
  hours?: string
  photoUrl?: string
}
