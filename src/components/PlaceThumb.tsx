import { useState } from 'react'
import { PlaceArt } from './PlaceArt.tsx'
import { displayPhotos, type LivePhoto } from '../lib/gallery.ts'
import { responsivePhoto } from '../lib/responsivePhoto.ts'
import type { SlimPlace } from '../types.ts'

export function PlaceThumb({
  place,
  uploads = [],
  eager = false,
  priority = false,
  sizes = '(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw',
}: {
  place: SlimPlace
  uploads?: LivePhoto[]
  eager?: boolean
  priority?: boolean
  sizes?: string
}) {
  const photo = displayPhotos(place, uploads)[0]
  const [failed, setFailed] = useState(false)
  if (!photo || photo.illustration || !photo.url || failed) {
    return <PlaceArt id={place.id} cuisine={place.cuisine[0] ?? 'Seattle'} neighborhood={place.neighborhood} />
  }
  const picture = responsivePhoto(photo.url, sizes)
  return (
    <img
      src={picture.src}
      srcSet={picture.srcSet}
      sizes={picture.srcSet ? picture.sizes : undefined}
      alt=""
      draggable={false}
      className="h-full w-full object-cover"
      loading={eager || priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      onError={() => setFailed(true)}
    />
  )
}
