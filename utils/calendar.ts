/**
 * Calendar-date helpers for the date-range picker (DESIGN_AUDIT.md §3 S5).
 *
 * Days are `YYYY-MM-DD` strings and months `YYYY-MM`. They sort correctly as
 * plain strings and carry no time zone, so a picked day can't shift across
 * midnight. "Today" is Lagos's, because the server reads `from`/`to` as Lagos
 * dates (API_MAP.md §3.5). Mobile uses the device's date instead.
 */

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const LAGOS_DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Africa/Lagos',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const pad = (n: number) => String(n).padStart(2, '0')

/** Today's date in Lagos as `YYYY-MM-DD`. */
export function lagosToday(now: Date = new Date()): string {
  const parts = Object.fromEntries(LAGOS_DATE.formatToParts(now).map((p) => [p.type, p.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

function parts(value: string): [year: number, month: number, day: number] {
  const [year = 1970, month = 1, day = 1] = value.split('-').map(Number)
  return [year, month, day]
}

/** A UTC Date for arithmetic only. Never shown. */
function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day))
}

function isoDay(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export function addDays(day: string, count: number): string {
  const [y, m, d] = parts(day)
  return isoDay(utc(y, m, d + count))
}

export function monthOf(day: string): string {
  return day.slice(0, 7)
}

export function addMonths(month: string, count: number): string {
  const [y, m] = parts(month)
  const date = utc(y, m + count, 1)
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`
}

export function daysInMonth(month: string): number {
  const [y, m] = parts(month)
  return utc(y, m + 1, 0).getUTCDate()
}

/** 0 = Sunday. */
export function weekdayOf(day: string): number {
  const [y, m, d] = parts(day)
  return utc(y, m, d).getUTCDay()
}

/** The same day number in another month, clamped to that month's length (31 Jan → 28 Feb). */
export function sameDayIn(month: string, day: string): string {
  const dayNumber = Math.min(parts(day)[2], daysInMonth(month))
  return `${month}-${pad(dayNumber)}`
}

/** A Sunday-first month grid: `null` for the blanks before the 1st, then every day. */
export function monthCells(month: string): (string | null)[] {
  const first = `${month}-01`
  const blanks: null[] = Array.from({ length: weekdayOf(first) }, () => null)
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => `${month}-${pad(i + 1)}`)
  return [...blanks, ...days]
}

/** `September 2026`. */
export function monthLabel(month: string): string {
  const [y, m] = parts(month)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

/** `Thursday, 3 September 2026`, for screen readers. */
export function fullDayLabel(day: string): string {
  const [y, m, d] = parts(day)
  return `${WEEKDAY_NAMES[weekdayOf(day)]}, ${d} ${MONTH_NAMES[m - 1]} ${y}`
}

export function clampDay(day: string, first: string, last: string): string {
  if (day < first) return first
  if (day > last) return last
  return day
}

export interface PickedRange {
  from: string | null
  to: string | null
}

/**
 * Mobile's tap rule: the first tap sets the start, the second the end
 * (swapping if it's earlier than the start), and a third starts over.
 * A same-day range is allowed.
 */
export function nextRange(range: PickedRange, day: string): PickedRange {
  if (!range.from || range.to) return { from: day, to: null }
  return day < range.from ? { from: day, to: range.from } : { from: range.from, to: day }
}
