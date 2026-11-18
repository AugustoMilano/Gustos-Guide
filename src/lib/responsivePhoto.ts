import sizes from '../content/photo-sizes.json'

type SizeEntry = { w: number; h: number; widths: number[]; webp?: number[]; avif?: number[] }

const table = sizes as Record<string, SizeEntry>

// Photos are cached for a year under their filename. A variant that once shipped
// broken and was regenerated in place gets a version query so edge and browser
// caches fetch the fixed file.
export const REISSUED: Record<string, number> = {
  'ascend-prime-steak-and-sushi-gusto-9.960.avif': 2,
}

const photoPath = (file: string) => (REISSUED[file] ? `/photos/${file}?v=${REISSUED[file]}` : `/photos/${file}`)

export function responsivePhoto(url: string | undefined, sizesAttr: string) {
  if (!url?.startsWith('/photos/')) return { src: url }
  const file = url.slice('/photos/'.length)
  const entry = table[file]
  if (!entry) return { src: url }
  const stem = file.replace(/\.(jpe?g|png|webp)$/i, '')
  const srcSet =
    entry.widths.length >= 2
      ? entry.widths
          .map((width) => (width === entry.w ? `${url} ${width}w` : `${photoPath(`${stem}.${width}.jpg`)} ${width}w`))
          .join(', ')
      : undefined
  const webpSrcSet = entry.webp?.length
    ? entry.webp
        .map((width) => (width === entry.w ? `${photoPath(`${stem}.webp`)} ${width}w` : `${photoPath(`${stem}.${width}.webp`)} ${width}w`))
        .join(', ')
    : undefined
  // AVIF first (D2): about half the bytes of WebP at the same look; <picture> falls back to WebP, then JPEG.
  const avifSrcSet = entry.avif?.length
    ? entry.avif
        .map((width) => (width === entry.w ? `${photoPath(`${stem}.avif`)} ${width}w` : `${photoPath(`${stem}.${width}.avif`)} ${width}w`))
        .join(', ')
    : undefined
  return {
    src: url,
    srcSet,
    avifSrcSet,
    webpSrcSet,
    sizes: srcSet || webpSrcSet ? sizesAttr : undefined,
    width: entry.w,
    height: entry.h,
  }
}
