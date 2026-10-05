import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  clampDay,
  daysInMonth,
  fullDayLabel,
  lagosToday,
  monthCells,
  monthLabel,
  nextRange,
  sameDayIn,
  weekdayOf,
} from '~/utils/calendar'

describe('lagosToday', () => {
  it("is Lagos's date (UTC+1), not UTC's", () => {
    expect(lagosToday(new Date('2026-09-26T22:59:00Z'))).toBe('2026-09-26')
    expect(lagosToday(new Date('2026-09-26T23:00:00Z'))).toBe('2026-09-27')
  })
})

describe('day and month arithmetic', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
  })

  it('knows month lengths, including leap years', () => {
    expect(daysInMonth('2026-09')).toBe(30)
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2028-02')).toBe(29)
  })

  it('clamps the day number when paging to a shorter month', () => {
    expect(sameDayIn('2026-02', '2026-01-31')).toBe('2026-02-28')
    expect(sameDayIn('2026-10', '2026-09-15')).toBe('2026-10-15')
  })

  it('clamps a day to the allowed range', () => {
    expect(clampDay('2023-12-31', '2024-01-01', '2026-09-27')).toBe('2024-01-01')
    expect(clampDay('2026-09-28', '2024-01-01', '2026-09-27')).toBe('2026-09-27')
    expect(clampDay('2026-05-05', '2024-01-01', '2026-09-27')).toBe('2026-05-05')
  })
})

describe('month grid', () => {
  it('starts on Sunday, with blanks before the 1st', () => {
    // 1 September 2026 is a Tuesday.
    expect(weekdayOf('2026-09-01')).toBe(2)
    const cells = monthCells('2026-09')
    expect(cells.slice(0, 3)).toEqual([null, null, '2026-09-01'])
    expect(cells).toHaveLength(2 + 30)
    expect(cells.at(-1)).toBe('2026-09-30')
  })

  it('labels months and days in full', () => {
    expect(monthLabel('2026-09')).toBe('September 2026')
    expect(fullDayLabel('2026-09-03')).toBe('Thursday, 3 September 2026')
  })
})

describe('nextRange (mobile tap rule)', () => {
  const empty = { from: null, to: null }

  it('sets the start, then the end', () => {
    const started = nextRange(empty, '2026-09-03')
    expect(started).toEqual({ from: '2026-09-03', to: null })
    expect(nextRange(started, '2026-09-25')).toEqual({ from: '2026-09-03', to: '2026-09-25' })
  })

  it('swaps when the second tap is earlier', () => {
    expect(nextRange({ from: '2026-09-25', to: null }, '2026-09-03')).toEqual({ from: '2026-09-03', to: '2026-09-25' })
  })

  it('allows a same-day range', () => {
    expect(nextRange({ from: '2026-09-03', to: null }, '2026-09-03')).toEqual({ from: '2026-09-03', to: '2026-09-03' })
  })

  it('starts over on a third tap', () => {
    expect(nextRange({ from: '2026-09-03', to: '2026-09-25' }, '2026-09-10')).toEqual({ from: '2026-09-10', to: null })
  })
})
