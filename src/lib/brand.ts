/** Brand key from a place name: "Carmine's" and "Carmines" match; "Il Terrazzo Carmine" does not. */
export function brandKey(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '')
}

/** Keeps the first row per brand. Pass rows already sorted best first. */
export function onePerBrand<T>(rows: T[], nameOf: (row: T) => string): T[] {
  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = brandKey(nameOf(row))
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
