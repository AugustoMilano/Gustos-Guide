import type { Period } from '../types.ts'

export function isOpenAt(periods: Period[] | undefined, day: number, mins: number): boolean {
  if (!periods?.length) return false
  return periods.some((period) => covers(period, day, mins))
}

export function isOpen(periods: Period[], now = new Date()): boolean {
  return isOpenAt(periods, now.getDay(), now.getHours() * 60 + now.getMinutes())
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

export function hoursPhraseAt(periods: Period[] | undefined, day: number, mins: number): string | null {
  if (!periods?.length) return null
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

export function hoursPhrase(periods: Period[], now = new Date()): string | null {
  return hoursPhraseAt(periods, now.getDay(), now.getHours() * 60 + now.getMinutes())
}

export function formatPeriods(periods: Period[]): string[] {
  return periods.map((period) => {
    const days = period.days.map((day) => NAMES[day]).join(', ')
    return `${days} ${clock(period.start)}–${clock(period.end)}`
  })
}

/**
 * Hours are published in each place's own local time (E2). New York runs on Eastern; every other
 * city in the guide (Seattle, the Bay Area, Los Angeles, San Diego, Vancouver, Portland, Pullman and
 * Moscow, Idaho's panhandle) is on Pacific.
 */
export function placeZone(city: string | undefined): string {
  return city === 'nyc' ? 'America/New_York' : 'America/Los_Angeles'
}

const zoneFormats = new Map<string, Intl.DateTimeFormat>()
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** Day of week (0 = Sunday) and minutes past midnight at `now` in `zone`. */
export function zonedClock(zone: string, now = new Date()): { day: number; mins: number } {
  let format = zoneFormats.get(zone)
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    zoneFormats.set(zone, format)
  }
  const parts = Object.fromEntries(format.formatToParts(now).map((part) => [part.type, part.value]))
  return { day: WEEKDAYS[parts.weekday] ?? now.getDay(), mins: (Number(parts.hour) % 24) * 60 + Number(parts.minute) }
}

/** Whether the place has published hours at all. Unknown hours never count as open. */
export function hasHours(place: { periods?: Period[] }): boolean {
  return Boolean(place.periods?.length)
}

/** Open right now in the place's own timezone, from its published hours only. */
export function isPlaceOpen(place: { periods?: Period[]; city?: string }, now = new Date()): boolean {
  if (!place.periods?.length) return false
  const { day, mins } = zonedClock(placeZone(place.city), now)
  return isOpenAt(place.periods, day, mins)
}

export function placeHoursPhrase(place: { periods?: Period[]; city?: string }, now = new Date()): string | null {
  if (!place.periods?.length) return null
  const { day, mins } = zonedClock(placeZone(place.city), now)
  return hoursPhraseAt(place.periods, day, mins)
}
