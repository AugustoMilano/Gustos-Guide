import { useState } from 'react'
import { PlaceArt } from './PlaceArt.tsx'
import type { DisplayPhoto } from '../lib/gallery.ts'

export function PhotoFrame({ photo, priority = false }: { photo: DisplayPhoto; priority?: boolean }) {
  const [failed, setFailed] = useState(false)
  return (
    <figure className="photo-frame">
      {photo.illustration || !photo.url || failed ? (
        <PlaceArt id={photo.placeId} cuisine={photo.cuisine} neighborhood={photo.neighborhood} />
      ) : (
        <img
          src={photo.url}
          alt={photo.alt}
          width={800}
          height={600}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="place-art object-cover"
          onError={() => setFailed(true)}
        />
      )}
      <figcaption>
        {photo.illustration ? 'Illustration' : photo.credit}
        {photo.license ? ` · ${photo.license}` : ''}
        {photo.creditUrl ? (
          <>
            {' '}
            <a href={photo.creditUrl}>Source</a>
          </>
        ) : null}
      </figcaption>
    </figure>
  )
}
