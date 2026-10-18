import { useState } from 'react'
import { PlaceArt } from './PlaceArt.tsx'
import { displayPhotos, type LivePhoto } from '../lib/gallery.ts'
import type { SlimPlace } from '../types.ts'

export function PlaceThumb({
  place,
  uploads = [],
  eager = false,
}: {
  place: SlimPlace
  uploads?: LivePhoto[]
  eager?: boolean
}) {
  const photo = displayPhotos(place, uploads)[0]
  const [failed, setFailed] = useState(false)
  if (!photo || photo.illustration || !photo.url || failed) {
    return <PlaceArt id={place.id} cuisine={place.cuisine[0] ?? 'Seattle'} neighborhood={place.neighborhood} />
  }
  return (
    <img
      src={photo.url}
      alt=""
      className="h-full w-full object-cover"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
