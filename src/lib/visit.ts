import type { Price } from '../types.ts'

type VisitPlace = {
  id: string
  placeType: string
  cuisine: string[]
  price?: Price
  website?: string
  phone?: string
}

const KNOWN: Record<string, string> = {
  canlis: 'Reservations go through the Canlis website. This guide does not invent a booking window.',
  spinasse: 'The room is small. Reserve if you can, or hope for a seat at the bar.',
  delancey: 'Walk in and wait. A reservation is not the point.',
  'the-walrus-and-the-carpenter': 'Walk in. The line is the reservation.',
  paseo: 'Counter service. There is no reservation to make.',
}

export function howToGetIn(place: VisitPlace): string | null {
  if (KNOWN[place.id]) return KNOWN[place.id]
  const blob = `${place.placeType} ${place.cuisine.join(' ')}`.toLowerCase()
  if (/counter|coffee|bakery|cafe|café|dessert/.test(blob)) {
    return 'Show up. Nothing here implies a reservation.'
  }
  if (place.price != null && place.price >= 3 && place.website) {
    return 'Use the website if they take tables. This guide does not invent a booking window.'
  }
  if (place.phone) return 'Call the restaurant. This guide does not invent a booking window.'
  return null
}
