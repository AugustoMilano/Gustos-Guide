import type { CatalogPhoto, SlimPlace } from '../types.ts'

export type LivePhoto = {
  id: string
  placeId: string
  userId?: string
  userName: string
  owner: boolean
  url: string
  width: number
  height: number
  storagePath?: string
  shareUrl?: string
}

// House shots are public. A signed URL from the private bucket still wins for
// someone who can read it, so an owner photo keeps working until its object
// is copied into owner-photos. Visitors only have the public URL.
export function mergeUploads(house: LivePhoto[], account: LivePhoto[]): LivePhoto[] {
  const byId = new Map<string, LivePhoto>()
  for (const photo of house) if (photo.url) byId.set(photo.id, photo)
  for (const photo of account) {
    if (!photo.url) continue
    const prior = byId.get(photo.id)
    byId.set(photo.id, { ...photo, shareUrl: photo.shareUrl || prior?.shareUrl })
  }
  return [...byId.values()]
}

export type DisplayPhoto = {
  key: string
  url?: string
  shareUrl?: string
  alt: string
  credit: string
  creditUrl?: string
  license?: string
  illustration: boolean
  cuisine: string
  neighborhood: string
  placeId: string
}

export function displayPhotos(place: Pick<SlimPlace, 'id' | 'name' | 'cuisine' | 'neighborhood'> & { photo?: CatalogPhoto; photos?: CatalogPhoto[] }, uploads: LivePhoto[]): DisplayPhoto[] {
  const catalog = place.photos?.length ? place.photos : place.photo ? [place.photo] : []
  const owner = uploads
    .filter((photo) => photo.placeId === place.id && photo.owner)
    .map((photo) => ({
      key: photo.id,
      url: photo.url,
      shareUrl: photo.shareUrl,
      alt: `Photo of ${place.name} by Gusto`,
      credit: 'Photo by Gusto',
      illustration: false,
      cuisine: place.cuisine[0] ?? 'Restaurant',
      neighborhood: place.neighborhood,
      placeId: place.id,
    }))
  const friends = uploads
    .filter((photo) => photo.placeId === place.id && !photo.owner)
    .map((photo) => ({
      key: photo.id,
      url: photo.url,
      alt: `Photo of ${place.name} by ${photo.userName}`,
      credit: `Photo by ${photo.userName}`,
      illustration: false,
      cuisine: place.cuisine[0] ?? 'Restaurant',
      neighborhood: place.neighborhood,
      placeId: place.id,
    }))
  const commons = catalog
    .filter((photo) => photo.source === 'wikimedia' && photo.url)
    .map((photo) => ({
      key: photo.url ?? photo.credit,
      url: photo.url,
      alt: photo.alt,
      credit: photo.credit,
      creditUrl: photo.creditUrl,
      license: photo.license,
      illustration: false,
      cuisine: place.cuisine[0] ?? 'Restaurant',
      neighborhood: place.neighborhood,
      placeId: place.id,
    }))
  const photos = [...owner, ...friends, ...commons]
  if (photos.length) return photos
  return [
    {
      key: `${place.id}-art`,
      alt: `Illustration suggesting ${place.cuisine[0] ?? 'a meal'} at ${place.name}`,
      credit: 'Illustration',
      illustration: true,
      cuisine: place.cuisine[0] ?? 'Restaurant',
      neighborhood: place.neighborhood,
      placeId: place.id,
    },
  ]
}
