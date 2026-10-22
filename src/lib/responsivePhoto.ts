import sizes from '../content/photo-sizes.json'

type SizeEntry = { w: number; h: number; widths: number[]; webp?: number[] }

const table = sizes as Record<string, SizeEntry>

export function responsivePhoto(url: string | undefined, sizesAttr: string) {
  if (!url?.startsWith('/photos/')) return { src: url }
  const file = url.slice('/photos/'.length)
  const entry = table[file]
  if (!entry) return { src: url }
  const stem = file.replace(/\.(jpe?g|png|webp)$/i, '')
  const srcSet =
    entry.widths.length >= 2
      ? entry.widths
          .map((width) => (width === entry.w ? `${url} ${width}w` : `/photos/${stem}.${width}.jpg ${width}w`))
          .join(', ')
      : undefined
  const webpSrcSet = entry.webp?.length
    ? entry.webp
        .map((width) => (width === entry.w ? `/photos/${stem}.webp ${width}w` : `/photos/${stem}.${width}.webp ${width}w`))
        .join(', ')
    : undefined
  return {
    src: url,
    srcSet,
    webpSrcSet,
    sizes: srcSet || webpSrcSet ? sizesAttr : undefined,
    width: entry.w,
    height: entry.h,
  }
}
