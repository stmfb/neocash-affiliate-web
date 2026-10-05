/**
 * Display formatting (DESIGN_AUDIT.md §6). Money stays integer kobo until the
 * display edge. Dates show in the device's local time, like mobile's
 * `.toLocal()`.
 */

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `150000` → `₦1,500.00`. */
export function formatKobo(kobo: number): string {
  const sign = kobo < 0 ? '-' : ''
  const abs = Math.abs(Math.trunc(kobo))
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const fraction = (abs % 100).toString().padStart(2, '0')
  return `${sign}₦${whole}.${fraction}`
}

function compact(naira: number, unit: number): string {
  const scaled = Math.round((naira / unit) * 10) / 10
  return Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1)
}

/** `650000000` → `₦6.5M`, `300000000000` → `₦3B`. Below ₦1M it's the full amount. */
export function formatKoboCompact(kobo: number): string {
  const sign = kobo < 0 ? '-' : ''
  const naira = Math.abs(kobo) / 100
  if (naira >= 1e9) return `${sign}₦${compact(naira, 1e9)}B`
  if (naira >= 1e6) return `${sign}₦${compact(naira, 1e6)}M`
  return formatKobo(kobo)
}

/**
 * `150` bps → `1.5`. Prints `2` rather than mobile's Dart-style `2.0` for
 * whole-number rates (DESIGN_AUDIT.md §7 #8).
 */
export function formatPercent(percent: number): string {
  return String(percent)
}

/** `3 Sep`. */
export function shortDate(date: Date): string {
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`
}

/** `Sep 3, 2026`, the date-range picker's style. */
export function pickerDate(date: Date): string {
  return `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

/** An RFC 3339 timestamp as `3 Sep` local time. Unparseable values show raw rather than vanish. */
export function formatIsoShortDate(iso: string): string {
  const time = Date.parse(iso)
  return Number.isNaN(time) ? iso : shortDate(new Date(time))
}

/** `YYYY-MM-DD` → a local-midnight Date. `new Date('2026-09-03')` would be UTC and could shift a day. */
export function parseCalendarDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

/** `3 Sep – 25 Sep` (en dash), or `This Month` when no range is picked. */
export function rangeLabel(range: { from: string; to: string } | null): string {
  if (!range) return 'This Month'
  return `${shortDate(parseCalendarDate(range.from))} – ${shortDate(parseCalendarDate(range.to))}`
}

export function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`
}

export function capitalize(value: string): string {
  return value ? value[0]!.toUpperCase() + value.slice(1) : value
}

/** `bank_statement` → `Bank statement`. */
export function humanizeKey(value: string): string {
  return capitalize(value.replaceAll('_', ' '))
}
