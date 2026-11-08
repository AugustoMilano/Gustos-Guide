/** House scores move by one tenth. Integer tenths avoid 0.30000000000000004. */
export const HOUSE_SCORE_MIN = 1
export const HOUSE_SCORE_MAX = 10

export function stepHouseScore(current: number | null, direction: -1 | 1): number | null {
  if (current == null) return direction === 1 ? HOUSE_SCORE_MIN : null
  const tenths = Math.round(current * 10) + direction
  if (tenths < HOUSE_SCORE_MIN * 10 || tenths > HOUSE_SCORE_MAX * 10) {
    return Math.round(current * 10) / 10
  }
  return tenths / 10
}

export function formatHouseScore(score: number): string {
  return (Math.round(score * 10) / 10).toFixed(1)
}
