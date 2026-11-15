/** Match mechanics ("Place name", "Guide title") are not labels a reader needs. */
const MECHANICS = new Set(['Place name', 'Guide title', 'Match', 'Close spelling', 'Closest guide', 'Description'])

/** The gray line under a result: only reasons the row's title and detail don't already say. */
export function resultNote(hit: { title: string; detail: string; why: string }): string {
  const seen = `${hit.title} · ${hit.detail}`.toLowerCase().split(/\s*·\s*/)
  const title = hit.title.toLowerCase()
  return hit.why
    .split(' · ')
    .map((part) => part.trim())
    .filter((part) => part && !MECHANICS.has(part))
    .filter((part) => !seen.includes(part.toLowerCase()) && !title.includes(part.toLowerCase()))
    .join(' · ')
}
