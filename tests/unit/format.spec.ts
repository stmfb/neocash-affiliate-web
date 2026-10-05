import { describe, expect, it } from 'vitest'
import {
  capitalize,
  formatIsoShortDate,
  formatKobo,
  formatKoboCompact,
  formatPercent,
  humanizeKey,
  parseCalendarDate,
  pickerDate,
  pluralize,
  rangeLabel,
  shortDate,
} from '~/utils/format'

describe('money (DESIGN_AUDIT.md §6)', () => {
  it.each([
    [150000, '₦1,500.00'],
    [0, '₦0.00'],
    [5, '₦0.05'],
    [300000000000, '₦3,000,000,000.00'],
    [2222222211168, '₦22,222,222,111.68'],
    [-150050, '-₦1,500.50'],
  ])('formatKobo(%i) = %s', (kobo, expected) => {
    expect(formatKobo(kobo)).toBe(expected)
  })

  it.each([
    [650000000, '₦6.5M'],
    [300000000000, '₦3B'],
    [1234567890123, '₦12.3B'],
    [100000000, '₦1M'],
    [99999999, '₦999,999.99'],
    [-650000000, '-₦6.5M'],
  ])('formatKoboCompact(%i) = %s', (kobo, expected) => {
    expect(formatKoboCompact(kobo)).toBe(expected)
  })

  it('prints rates without a trailing .0', () => {
    expect(formatPercent(1.5)).toBe('1.5')
    expect(formatPercent(1.25)).toBe('1.25')
    expect(formatPercent(2)).toBe('2')
  })
})

describe('dates', () => {
  it('formats short and picker dates', () => {
    const date = new Date(2026, 8, 3)
    expect(shortDate(date)).toBe('3 Sep')
    expect(pickerDate(date)).toBe('Sep 3, 2026')
  })

  it('parses calendar dates as local midnight, not UTC', () => {
    const date = parseCalendarDate('2026-09-03')
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 8, 3, 0])
  })

  it('labels the Home range', () => {
    expect(rangeLabel(null)).toBe('This Month')
    expect(rangeLabel({ from: '2026-09-03', to: '2026-09-25' })).toBe('3 Sep – 25 Sep')
  })

  it('shows unparseable timestamps raw instead of hiding them', () => {
    expect(formatIsoShortDate('not-a-date')).toBe('not-a-date')
  })
})

describe('text helpers', () => {
  it('pluralizes only for counts other than one', () => {
    expect(pluralize('loan', 1)).toBe('loan')
    expect(pluralize('loan', 0)).toBe('loans')
    expect(pluralize('loan', 2)).toBe('loans')
  })

  it('capitalizes and humanizes keys', () => {
    expect(capitalize('estimated')).toBe('Estimated')
    expect(capitalize('')).toBe('')
    expect(humanizeKey('bank_statement')).toBe('Bank statement')
  })
})
