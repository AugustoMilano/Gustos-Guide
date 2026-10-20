import sizes from '../content/photo-sizes.json'

type SizeEntry = { w: number; h: number; widths: number[] }

const table = sizes as Record<string, SizeEntry>

export function responsivePhoto(url: string | undefined, sizesAttr: string) {
  if (!url?.startsWith('/photos/')) return { src: url }
  const file = url.slice('/photos/'.length)
  const entry = table[file]
  if (!entry || entry.widths.length < 2) return { src: url }
  const stem = file.replace(/\.(jpe?g|png|webp)$/i, '')
  const srcSet = entry.widths
    .map((width) => (width === entry.w ? `${url} ${width}w` : `/photos/${stem}.${width}.jpg ${width}w`))
    .join(', ')
  return { src: url, srcSet, sizes: sizesAttr }
}
