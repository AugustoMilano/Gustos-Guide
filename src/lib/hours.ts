import type { Period } from '../types.ts'

export function isOpen(periods: Period[], now = new Date()): boolean {
  const day = now.getDay()
  const mins = now.getHours() * 60 + now.getMinutes()
  return periods.some((period) => {
    if (period.end > period.start) return period.days.includes(day) && mins >= period.start && mins < period.end
    if (period.days.includes(day) && mins >= period.start) return true
    const previous = (day + 6) % 7
    return period.days.includes(previous) && mins < period.end
  })
}

const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function clock(mins: number): string {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  const suffix = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return m ? `${hour}:${String(m).padStart(2, '0')}${suffix}` : `${hour}${suffix}`
}

function covers(period: Period, day: number, mins: number): boolean {
  if (period.end > period.start) return period.days.includes(day) && mins >= period.start && mins < period.end
  if (period.end === period.start) return false
  if (period.days.includes(day) && mins >= period.start) return true
  const previous = (day + 6) % 7
  return period.days.includes(previous) && mins < period.end
}

function labelTime(mins: number): string {
  const normalized = ((mins % (24 * 60)) + 24 * 60) % (24 * 60)
  if (normalized === 0) return 'midnight'
  if (normalized === 12 * 60) return 'noon'
  return clock(normalized)
}

export function hoursPhrase(periods: Period[], now = new Date()): string | null {
  if (!periods.length) return null
  const day = now.getDay()
  const mins = now.getHours() * 60 + now.getMinutes()
  const open = periods.find((period) => covers(period, day, mins))
  if (open) return `Open now · until ${labelTime(open.end)}`
  for (let offset = 0; offset < 7; offset += 1) {
    const date = (day + offset) % 7
    const starts = periods
      .filter((period) => period.days.includes(date) && period.end !== period.start)
      .map((period) => period.start)
      .filter((start) => offset > 0 || start > mins)
      .sort((a, b) => a - b)
    if (!starts.length) continue
    const when = labelTime(starts[0])
    return offset === 0 ? `Closed · opens ${when}` : `Closed · opens ${NAMES[date]} ${when}`
  }
  return null
}

export function formatPeriods(periods: Period[]): string[] {
  return periods.map((period) => {
    const days = period.days.map((day) => NAMES[day]).join(', ')
    return `${days} ${clock(period.start)}–${clock(period.end)}`
  })
}
