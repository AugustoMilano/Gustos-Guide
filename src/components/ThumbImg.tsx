import { responsivePhoto } from '../lib/responsivePhoto.ts'

export function ThumbImg({ url, sizes = '64px' }: { url: string; sizes?: string }) {
  const picture = responsivePhoto(url, sizes)
  return (
    <picture>
      {picture.webpSrcSet ? <source type="image/webp" srcSet={picture.webpSrcSet} sizes={picture.sizes} /> : null}
      <img
        src={picture.src}
        srcSet={picture.srcSet}
        sizes={picture.sizes}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </picture>
  )
}
