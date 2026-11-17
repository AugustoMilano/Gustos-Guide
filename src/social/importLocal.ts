import { readPhotos, type StoredPhoto } from '../lib/photos.ts'
import type { Plan, RankScore, UserGuide, VisitStatus } from '../types.ts'

/** Everything the old name-only sign-in kept on this phone, ready to move into an account. */
export type LocalBundle = {
  statuses: Record<string, VisitStatus>
  guides: UserGuide[]
  photos: StoredPhoto[]
  /** Personal ranks; the profile's Top 10 is built from these. */
  scores: Record<string, RankScore>
  plans: Plan[]
}

const DOC_PREFIX = 'gusto.doc.v1.'
const BUCKETS = new Set(['loved', 'liked', 'fine', 'didnt'])

export async function scanLocalBundle(userId: string): Promise<LocalBundle | null> {
  const flag = localStorage.getItem(`gusto.import.v1.${userId}`) ?? ''
  if (flag === 'done' || flag === 'skip') return null
  // Another tab is moving it right now. A move cut off by a reload or a closed tab goes stale and resumes.
  if (flag.startsWith('running:') && Date.now() - Number(flag.slice(8)) < 60_000) return null
  const statuses: Record<string, VisitStatus> = {}
  const guides: UserGuide[] = []
  const scores: Record<string, RankScore> = {}
  const plans: Plan[] = []
  const seenGuides = new Set<string>()
  const seenPlans = new Set<string>()
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key?.startsWith(DOC_PREFIX)) continue
    const owner = key.slice(DOC_PREFIX.length)
    if (!owner.startsWith('local-') || owner === userId) continue
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '') as {
        statuses?: Record<string, VisitStatus>
        guides?: UserGuide[]
        scores?: Record<string, RankScore>
        plans?: Plan[]
      }
      for (const [placeId, status] of Object.entries(parsed.statuses ?? {})) {
        if (status === 'togo' || status === 'been') statuses[placeId] = status
      }
      for (const guide of parsed.guides ?? []) {
        if (guide.demo || !guide.title || seenGuides.has(guide.id)) continue
        seenGuides.add(guide.id)
        guides.push(guide)
      }
      for (const [placeId, rank] of Object.entries(parsed.scores ?? {})) {
        if (!rank || !BUCKETS.has(rank.bucket) || typeof rank.score !== 'number' || !Number.isFinite(rank.score)) continue
        if (!scores[placeId]) scores[placeId] = { bucket: rank.bucket, score: rank.score }
      }
      for (const plan of parsed.plans ?? []) {
        // Only plans this phone's person hosted; seeded demo plans stay behind.
        if (plan.demo || !plan.title || seenPlans.has(plan.id) || (plan.hostId && plan.hostId !== owner)) continue
        seenPlans.add(plan.id)
        plans.push({ ...plan, hostId: owner, placeIds: plan.placeIds ?? [], dates: plan.dates ?? [], votes: plan.votes ?? {}, rsvps: plan.rsvps ?? {}, inviteIds: [] })
      }
    } catch {
      // A broken local document is skipped. The rest can still move.
    }
  }
  let photos: StoredPhoto[] = []
  try {
    const rows = await readPhotos()
    // House (owner) shots are not a visitor's photos; they stay on the device.
    photos = rows.filter((row) => row.userId.startsWith('local-') && !row.owner && row.blob)
  } catch {
    photos = []
  }
  if (!Object.keys(statuses).length && !guides.length && !photos.length && !Object.keys(scores).length && !plans.length) return null
  return { statuses, guides, photos, scores, plans }
}
