import { readPhotos, type StoredPhoto } from '../lib/photos.ts'
import type { UserGuide, VisitStatus } from '../types.ts'

export type LocalBundle = {
  statuses: Record<string, VisitStatus>
  guides: UserGuide[]
  photos: StoredPhoto[]
}

const DOC_PREFIX = 'gusto.doc.v1.'

export async function scanLocalBundle(userId: string): Promise<LocalBundle | null> {
  const flag = localStorage.getItem(`gusto.import.v1.${userId}`)
  if (flag === 'done' || flag === 'skip') return null
  const statuses: Record<string, VisitStatus> = {}
  const guides: UserGuide[] = []
  const seenGuides = new Set<string>()
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key?.startsWith(DOC_PREFIX)) continue
    const owner = key.slice(DOC_PREFIX.length)
    if (!owner.startsWith('local-') || owner === userId) continue
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '') as {
        statuses?: Record<string, VisitStatus>
        guides?: UserGuide[]
      }
      for (const [placeId, status] of Object.entries(parsed.statuses ?? {})) {
        if (status === 'togo' || status === 'been') statuses[placeId] = status
      }
      for (const guide of parsed.guides ?? []) {
        if (guide.demo || !guide.title || seenGuides.has(guide.id)) continue
        seenGuides.add(guide.id)
        guides.push(guide)
      }
    } catch {
      // A broken local document is skipped. The rest can still move.
    }
  }
  let photos: StoredPhoto[] = []
  try {
    const rows = await readPhotos()
    photos = rows.filter((row) => row.userId.startsWith('local-') && row.blob)
  } catch {
    photos = []
  }
  if (!Object.keys(statuses).length && !guides.length && !photos.length) return null
  return { statuses, guides, photos }
}
