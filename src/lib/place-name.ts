const WORD = /[A-Za-z0-9\u00C0-\u024F''-]+/g

/** Longest unbroken token in a place name. That token has to fit on one line. */
export function longestWordLength(name: string): number {
  const words = name.match(WORD) ?? []
  return words.reduce((max, word) => Math.max(max, word.length), 0)
}

/** Smaller type when a word or the whole name would otherwise split. */
export function placeNameClass(name: string, extra = ''): string {
  const word = longestWordLength(name)
  const size = word >= 13 || name.length >= 36 ? 'is-longest' : word >= 11 || name.length >= 28 ? 'is-long' : ''
  return ['place-name', size, extra].filter(Boolean).join(' ')
}
