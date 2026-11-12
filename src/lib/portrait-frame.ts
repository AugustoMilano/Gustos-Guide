/**
 * Tall photos in a landscape frame. The crop stays centered so a plate in the
 * lower half is not cut off. A few handheld shots carry the subject lower still.
 */
const LOWER_SUBJECT = new Set(['piroshky-piroshky-gusto-1.jpg'])

export function portraitClass(width?: number, height?: number, url?: string): string {
  if (!width || !height || height <= width) return ''
  const file = url?.split('?')[0]?.split('/').pop() ?? ''
  if (LOWER_SUBJECT.has(file)) return ' is-portrait is-portrait-lower'
  return ' is-portrait'
}
