const KEY = 'gusto.search.recent.v1'
const LIMIT = 6

export function readRecent(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, LIMIT)
  } catch {
    return []
  }
}

export function rememberSearch(value: string): string[] {
  const next = value.trim()
  if (next.length < 2) return readRecent()
  const list = [next, ...readRecent().filter((item) => item.toLowerCase() !== next.toLowerCase())].slice(0, LIMIT)
  localStorage.setItem(KEY, JSON.stringify(list))
  return list
}

export function clearRecent(): void {
  localStorage.removeItem(KEY)
}
