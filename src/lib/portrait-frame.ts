/**
 * Tall photos in a landscape card lose the subject if the crop is centered.
 * The default keeps the top. A few handheld shots carry the subject lower.
 */
const LOWER_SUBJECT = new Set(['piroshky-piroshky-gusto-1.jpg'])

export function portraitClass(width?: number, height?: number, url?: string): string {
  if (!width || !height || height <= width) return ''
  const file = url?.split('?')[0]?.split('/').pop() ?? ''
  if (LOWER_SUBJECT.has(file)) return ' is-portrait is-portrait-lower'
  return ' is-portrait'
}
