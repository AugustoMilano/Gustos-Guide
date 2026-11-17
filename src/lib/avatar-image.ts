/** Center-crop a chosen photo to a square and shrink it in the browser before upload. */
export type AvatarImage = { blob: Blob; dataUrl: string }

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* fall through: some browsers cannot decode HEIC or large files this way */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function squareCanvas(source: ImageBitmap | HTMLImageElement, size: number): HTMLCanvasElement {
  const w = 'naturalWidth' in source ? source.naturalWidth : source.width
  const h = 'naturalHeight' in source ? source.naturalHeight : source.height
  const side = Math.min(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot resize photos.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size)
  return canvas
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read that photo.'))), 'image/webp', quality)
  })
}

export async function prepareAvatar(file: File): Promise<AvatarImage> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif|jpe?g|png|webp|gif|avif)$/i.test(file.name)) throw new Error('Pick a photo.')
  if (file.size > 25 * 1024 * 1024) throw new Error('That photo is over 25 MB. Pick a smaller one.')
  let source: ImageBitmap | HTMLImageElement
  try {
    source = await decode(file)
  } catch {
    throw new Error('This browser cannot open that photo. Try a JPEG or PNG.')
  }
  const blob = await toBlob(squareCanvas(source, 384), 0.86)
  // A small copy for the profile row, used only until the avatars bucket exists.
  const small = squareCanvas(source, 160)
  const dataUrl = small.toDataURL('image/webp', 0.8)
  if ('close' in source) source.close()
  return { blob, dataUrl }
}
