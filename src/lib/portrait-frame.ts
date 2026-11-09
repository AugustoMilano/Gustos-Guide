/** Tall photos in a landscape card lose the subject if the crop is centered. Bias those toward the top. */
export function portraitClass(width?: number, height?: number): string {
  if (!width || !height || height <= width) return ''
  return ' is-portrait'
}
