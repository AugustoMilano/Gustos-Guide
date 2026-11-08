/** Readable form of a stored cuisine. The stored string is still what filters match. */
export function cuisineLabel(value: string): string {
  let depth = 0
  let out = ''
  for (const char of value) {
    if (char === '(') {
      depth += 1
      out += char
    } else if (char === ')') {
      if (depth === 0) continue
      depth -= 1
      out += char
    } else {
      out += char
    }
  }
  if (depth > 0) out += ')'.repeat(depth)
  return out.trim()
}

export function cuisineLine(values: readonly (string | undefined)[], separator = ' · '): string {
  return values.filter((value): value is string => Boolean(value)).map((value) => cuisineLabel(value)).join(separator)
}

/** Menu text. A repaired label that would copy a different category keeps its own closed form. */
export function cuisineMenuLabel(value: string, values: readonly string[]): string {
  const label = cuisineLabel(value)
  const clash = values.some((item) => item !== value && cuisineLabel(item) === label)
  return clash && label !== value ? `(${label})` : label
}
