export type ScoredPlace = { id: string; name: string }

/** Highest house score first. Ties break by name, then by the guide's original order. Unscored places stay after the ranked ones, in that original order, and get no number. */
export function rankByHouseScore<T extends { place: ScoredPlace }>(
  rows: readonly T[],
  score: (id: string) => number | null,
): (T & { rank: number | null })[] {
  const tagged = rows.map((row, index) => ({ row, index, score: score(row.place.id) }))
  const scored = tagged.filter((item) => typeof item.score === 'number')
  const unscored = tagged.filter((item) => typeof item.score !== 'number')
  scored.sort((a, b) => {
    const diff = (b.score ?? 0) - (a.score ?? 0)
    if (diff !== 0) return diff
    const name = a.row.place.name.localeCompare(b.row.place.name)
    if (name !== 0) return name
    return a.index - b.index
  })
  return [
    ...scored.map((item, index) => ({ ...item.row, rank: index + 1 })),
    ...unscored.map((item) => ({ ...item.row, rank: null })),
  ]
}
