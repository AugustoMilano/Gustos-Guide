import { useState } from 'react'
import { PlaceArt } from './PlaceArt.tsx'
import type { DisplayPhoto } from '../lib/gallery.ts'
import { responsivePhoto } from '../lib/responsivePhoto.ts'

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
  const [readySrc, setReadySrc] = useState('')
  const art = photo.illustration || !photo.url || failed
  const picture = photo.url && !photo.illustration ? responsivePhoto(photo.url, '(min-width: 1024px) 60vw, 100vw') : null
  const src = picture?.src ?? ''
  const ready = src !== '' && readySrc === src
  return (
    <figure className={`photo-frame ${compact || art ? 'is-compact' : ''}`} style={transitionName ? { viewTransitionName: transitionName } : undefined}>
      {art || !picture ? (
        <PlaceArt id={photo.placeId} cuisine={photo.cuisine} neighborhood={photo.neighborhood} />
      ) : (
        <img
          {...picture}
          alt={photo.alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : undefined}
          className={`place-art object-cover${ready ? '' : ' is-pending'}`}
          ref={(node) => {
            if (node?.complete && node.naturalWidth > 0) setReadySrc(src)
          }}
          onLoad={() => setReadySrc(src)}
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
