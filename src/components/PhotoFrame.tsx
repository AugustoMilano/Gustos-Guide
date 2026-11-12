import { useState } from 'react'
import { PlaceArt } from './PlaceArt.tsx'
import type { DisplayPhoto } from '../lib/gallery.ts'
import { portraitClass } from '../lib/portrait-frame.ts'
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
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null)
  const [readySrc, setReadySrc] = useState('')
  const failed = brokenUrl != null && brokenUrl === (photo.url ?? '')
  const art = photo.illustration || !photo.url || failed
  const picture = photo.url && !photo.illustration ? responsivePhoto(photo.url, '(min-width: 1024px) 36rem, calc(100vw - 2rem)') : null
  const src = picture?.src ?? ''
  const ready = src !== '' && readySrc === src
  return (
    <figure className={`photo-frame ${compact ? 'is-compact' : ''}${art ? ' is-art' : ''}`} style={transitionName ? { viewTransitionName: transitionName } : undefined}>
      {art || !picture ? (
        <PlaceArt id={photo.placeId} cuisine={photo.cuisine} neighborhood={photo.neighborhood} />
      ) : (
        <picture>
          {picture.avifSrcSet ? <source type="image/avif" srcSet={picture.avifSrcSet} sizes={picture.sizes} /> : null}
          {picture.webpSrcSet ? <source type="image/webp" srcSet={picture.webpSrcSet} sizes={picture.sizes} /> : null}
          <img
            src={picture.src}
            srcSet={picture.srcSet}
            sizes={picture.sizes}
            width={picture.width}
            height={picture.height}
            alt={photo.alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : undefined}
            className={`place-art object-cover${portraitClass(picture.width, picture.height, photo.url)}${ready ? '' : ' is-pending'}`}
            ref={(node) => {
              if (node?.complete && node.naturalWidth > 0) setReadySrc(src)
            }}
            onLoad={() => setReadySrc(src)}
            onError={() => setBrokenUrl(photo.url ?? '')}
          />
        </picture>
      )}
      <figcaption>
        {!art && photo.caption ? `${photo.caption} · ` : null}
        {art ? null : photo.credit}
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
