import type { Bucket, RankScore } from '../types.ts'

export const BANDS: Record<Bucket, [number, number]> = {
  loved: [9, 10],
  liked: [7.5, 8.9],
  fine: [6, 7.4],
  didnt: [0, 5.9],
}

export const BUCKETS: { id: Bucket; label: string }[] = [
  { id: 'loved', label: 'Loved' },
  { id: 'liked', label: 'Liked' },
  { id: 'fine', label: 'Fine' },
  { id: 'didnt', label: "Didn't" },
]

export function scoreAt(bucket: Bucket, index: number, total: number): number {
  const [low, high] = BANDS[bucket]
  if (total <= 1) return Math.round(((low + high) / 2) * 10) / 10
  const t = index / (total - 1)
  return Math.round((high - t * (high - low)) * 10) / 10
}

export function rescore(bucket: Bucket, order: string[]): Record<string, RankScore> {
  const scores: Record<string, RankScore> = {}
  order.forEach((placeId, index) => {
    scores[placeId] = { bucket, score: scoreAt(bucket, index, order.length) }
  })
  return scores
}
