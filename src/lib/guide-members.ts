/** Guide entries that the guide page can render: known places, once each. */
export function resolvedMembers<T extends { placeId: string }>(entries: readonly T[], placeIds: ReadonlySet<string>): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const entry of entries) {
    if (!entry.placeId || seen.has(entry.placeId) || !placeIds.has(entry.placeId)) continue
    seen.add(entry.placeId)
    out.push(entry)
  }
  return out
}
