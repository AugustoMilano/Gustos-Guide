/** Size of a photo drawn with object-fit: contain inside a box (the letterboxed picture). */
export function containSize(boxW: number, boxH: number, natW: number, natH: number): { w: number; h: number } {
  if (!(boxW > 0 && boxH > 0)) return { w: 0, h: 0 }
  if (!(natW > 0 && natH > 0)) return { w: boxW, h: boxH }
  const k = Math.min(boxW / natW, boxH / natH)
  return { w: natW * k, h: natH * k }
}

export const MIN_ZOOM = 1
export const MAX_ZOOM = 5

/**
 * Clamp a zoomed view so every edge of the photo can be reached and none of it is pushed past
 * the box: pan limit per axis is half of how far the scaled picture overflows the box.
 */
export function clampView(
  view: { scale: number; x: number; y: number },
  box: { w: number; h: number },
  picture: { w: number; h: number },
): { scale: number; x: number; y: number } {
  const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.scale))
  if (scale <= 1.01) return { scale: 1, x: 0, y: 0 }
  const mx = Math.max(0, (picture.w * scale - box.w) / 2)
  const my = Math.max(0, (picture.h * scale - box.h) / 2)
  return {
    scale,
    x: Math.min(mx, Math.max(-mx, view.x)),
    y: Math.min(my, Math.max(-my, view.y)),
  }
}

/** Zoom that makes the photo fill the box on its short side (at least 2.5x), for tap or click zoom. */
export function tapZoom(box: { w: number; h: number }, picture: { w: number; h: number }): number {
  if (!(picture.w > 0 && picture.h > 0)) return 2.5
  const fill = Math.max(box.w / picture.w, box.h / picture.h)
  return Math.min(MAX_ZOOM, Math.max(2.5, fill))
}
