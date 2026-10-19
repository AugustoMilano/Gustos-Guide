import { useState } from 'react'
import { PlaceArt } from './PlaceArt.tsx'
import type { DisplayPhoto } from '../lib/gallery.ts'

export function PhotoFrame({
  photo,
  priority = false,
  compact = false,
  transitionName,
}: {
  photo: DisplayPhoto
  priority?: boolean
  compact?: boolean
  transitionName?: string
}) {
  const [failed, setFailed] = useState(false)
  const art = photo.illustration || !photo.url || failed
  return (
    <figure className={`photo-frame ${compact || art ? 'is-compact' : ''}`} style={transitionName ? { viewTransitionName: transitionName } : undefined}>
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
        {!art && photo.caption ? `${photo.caption} · ` : null}
        {art ? 'Illustration' : photo.credit}
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
