import { useState } from 'react'
import { PlaceArt } from './PlaceArt.tsx'
import { displayPhotos, type LivePhoto } from '../lib/gallery.ts'
import { portraitClass } from '../lib/portrait-frame.ts'
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
  const [readySrc, setReadySrc] = useState('')
  if (!photo || photo.illustration || !photo.url || failed) {
    return <PlaceArt id={place.id} cuisine={place.cuisine[0] ?? 'Seattle'} neighborhood={place.neighborhood} />
  }
  const picture = responsivePhoto(photo.url, sizes)
  const src = picture.src ?? ''
  const ready = readySrc === src
  return (
    <picture>
      {picture.avifSrcSet ? <source type="image/avif" srcSet={picture.avifSrcSet} sizes={picture.sizes} /> : null}
      {picture.webpSrcSet ? <source type="image/webp" srcSet={picture.webpSrcSet} sizes={picture.sizes} /> : null}
      <img
        ref={(node) => {
          if (node?.complete && node.naturalWidth > 0) setReadySrc(src)
        }}
        src={picture.src}
        srcSet={picture.srcSet}
        sizes={picture.sizes}
        width={picture.width}
        height={picture.height}
        alt=""
        draggable={false}
        className={`h-full w-full object-cover${portraitClass(picture.width, picture.height)}${ready ? '' : ' is-pending'}`}
        loading={eager || priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        onLoad={() => setReadySrc(src)}
        onError={() => setFailed(true)}
      />
    </picture>
  )
}
