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

export function formatPeriods(periods: Period[]): string[] {
  return periods.map((period) => {
    const days = period.days.map((day) => NAMES[day]).join(', ')
    return `${days} ${clock(period.start)}–${clock(period.end)}`
  })
}
