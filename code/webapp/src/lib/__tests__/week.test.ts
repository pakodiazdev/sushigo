import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  currentWeekRange,
  weekRangeContaining,
  addDays,
  formatWeekLabel,
  weeksInYear,
  weekNumberForDate,
  weeksInMonth,
  weekOrdinalInMonth,
  formatWeekOrdinal,
  formatWeekTitle,
  isCloseGateOpen,
  weeksBetween,
} from '../week'

// Mock the timezone module to use CDMX timezone for deterministic tests
vi.mock('../timezone', () => ({
  getFrontendTimezone: () => 'America/Mexico_City',
}))

describe('addDays', () => {
  it('adds days within the same month', () => {
    expect(addDays('2026-06-16', 1)).toBe('2026-06-17')
  })

  it('subtracts days across a month boundary', () => {
    expect(addDays('2026-06-01', -1)).toBe('2026-05-31')
  })

  it('shifts a full week forward', () => {
    expect(addDays('2026-06-16', 7)).toBe('2026-06-23')
  })

  it('shifts a full week backward', () => {
    expect(addDays('2026-06-16', -7)).toBe('2026-06-09')
  })
})

describe('weekRangeContaining', () => {
  it('returns the Monday–Sunday range for a mid-week date', () => {
    // 2026-06-17 is a Wednesday
    expect(weekRangeContaining('2026-06-17')).toEqual({ start: '2026-06-15', end: '2026-06-21' })
  })

  it('returns the same range when the date is itself the Monday', () => {
    expect(weekRangeContaining('2026-06-15')).toEqual({ start: '2026-06-15', end: '2026-06-21' })
  })
})

describe('formatWeekLabel', () => {
  it('includes both day numbers and the end year', () => {
    const label = formatWeekLabel('2026-06-16', '2026-06-22')
    expect(label).toContain('16')
    expect(label).toContain('22')
    expect(label).toContain('2026')
  })
})

describe('currentWeekRange', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a 6-day span between start and end', () => {
    const { start, end } = currentWeekRange()
    expect(addDays(start, 6)).toBe(end)
  })

  it('uses the CDMX date, not the UTC date, during evening hours', () => {
    // Sunday 2026-06-21 19:00 CDMX = Monday 2026-06-22 01:00 UTC.
    // A UTC-based date extraction would wrongly land on Monday, the *next* week.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-22T01:00:00Z'))

    expect(currentWeekRange()).toEqual({ start: '2026-06-15', end: '2026-06-21' })
  })
})

describe('weeksInYear', () => {
  it('numbers weeks from 1, each a 7-day Mon–Sun span', () => {
    const weeks = weeksInYear(2026)
    expect(weeks[0]!.weekNumber).toBe(1)
    weeks.forEach((week, i) => {
      expect(week.weekNumber).toBe(i + 1)
      expect(addDays(week.start, 6)).toBe(week.end)
    })
  })

  it('chains weeks 7 days apart with no gaps or overlaps', () => {
    const weeks = weeksInYear(2026)
    for (let i = 1; i < weeks.length; i++) {
      expect(addDays(weeks[i - 1]!.start, 7)).toBe(weeks[i]!.start)
    }
  })

  it('week 1 starts on the first Monday on/after Jan 1, not before', () => {
    const weeks = weeksInYear(2026)
    // 2026-01-01 is a Thursday, so the first Monday on/after it is 2026-01-05
    expect(weeks[0]!.start).toBe('2026-01-05')
  })

  it('does not include the boundary week twice across consecutive years', () => {
    const weeks2026 = weeksInYear(2026)
    const lastOf2026 = weeks2026[weeks2026.length - 1]!
    const firstOf2027 = weeksInYear(2027)[0]!
    expect(lastOf2026.start).not.toBe(firstOf2027.start)
    expect(addDays(lastOf2026.start, 7)).toBe(firstOf2027.start)
  })
})

describe('weekNumberForDate', () => {
  it('resolves a mid-year week to the correct year and number', () => {
    const weeks = weeksInYear(2026)
    const midYear = weeks[24]!
    expect(weekNumberForDate(midYear.start)).toEqual({ year: 2026, weekNumber: 25 })
  })

  it('resolves week 1 to the year whose Jan 1 the first Monday follows', () => {
    expect(weekNumberForDate('2026-01-05')).toEqual({ year: 2026, weekNumber: 1 })
  })
})

describe('weeksInMonth', () => {
  it('groups weeks under the month they start in, even if they end in the next one', () => {
    const weeks = weeksInMonth(2026, 5) // June 2026 — June 1 is a Monday
    expect(weeks[0]!.start).toBe('2026-06-01')
    const lastWeek = weeks[weeks.length - 1]!
    expect(lastWeek.start).toBe('2026-06-29')
    expect(lastWeek.end).toBe('2026-07-05') // spills into July, still counted as June's last week
  })

  it('the following month does not re-count the week that already belongs to the previous month', () => {
    const july = weeksInMonth(2026, 6)
    expect(july[0]!.start).toBe('2026-07-06') // not 2026-06-29 — that belongs to June
  })
})

describe('weekOrdinalInMonth', () => {
  it('returns the 1-based position of a week within its month', () => {
    // June 2026: 06-01 (1st), 06-08 (2nd), 06-15 (3rd), 06-22 (4th), 06-29 (5th)
    expect(weekOrdinalInMonth('2026-06-01')).toBe(1)
    expect(weekOrdinalInMonth('2026-06-08')).toBe(2)
    expect(weekOrdinalInMonth('2026-06-15')).toBe(3)
    expect(weekOrdinalInMonth('2026-06-22')).toBe(4)
    expect(weekOrdinalInMonth('2026-06-29')).toBe(5)
  })

  it('attributes a week spilling into the next month to the starting month', () => {
    // 2026-06-29 belongs to June (5th week), not July
    expect(weekOrdinalInMonth('2026-06-29')).toBe(5)
  })
})

describe('formatWeekOrdinal', () => {
  it('formats 1 through 5 with Spanish ordinal abbreviations', () => {
    expect(formatWeekOrdinal(1)).toBe('1ra')
    expect(formatWeekOrdinal(2)).toBe('2da')
    expect(formatWeekOrdinal(3)).toBe('3ra')
    expect(formatWeekOrdinal(4)).toBe('4ta')
    expect(formatWeekOrdinal(5)).toBe('5ta')
  })
})

describe('formatWeekTitle', () => {
  it('combines month ordinal, month name, year week number, and date range', () => {
    // 2026-06-15 is June's 3rd week and the year's 24th week
    const title = formatWeekTitle('2026-06-15', '2026-06-21')
    expect(title).toBe('3ra sem. de Jun. [24] - 15 jun – 21 jun 2026')
  })
})

describe('isCloseGateOpen', () => {
  const PERIOD_END = '2026-06-28' // Sunday

  it('is closed one minute before Sunday 19:00 in the business timezone', () => {
    // 18:59:00 CDMX (UTC-6) = 00:59:00 UTC the next day
    const now = new Date('2026-06-29T00:59:00Z')
    expect(isCloseGateOpen(PERIOD_END, now)).toBe(false)
  })

  it('is open exactly at Sunday 19:00 in the business timezone', () => {
    // 19:00:00 CDMX (UTC-6) = 01:00:00 UTC the next day
    const now = new Date('2026-06-29T01:00:00Z')
    expect(isCloseGateOpen(PERIOD_END, now)).toBe(true)
  })

  it('is open one minute after Sunday 19:00 in the business timezone', () => {
    const now = new Date('2026-06-29T01:01:00Z')
    expect(isCloseGateOpen(PERIOD_END, now)).toBe(true)
  })

  it('is closed mid-week regardless of the hour', () => {
    // Wednesday of the same week, 23:00 CDMX — still before Sunday
    const now = new Date('2026-06-25T05:00:00Z')
    expect(isCloseGateOpen(PERIOD_END, now)).toBe(false)
  })

  it('stays open on days after the period end', () => {
    // The following Monday, 00:30 CDMX
    const now = new Date('2026-06-29T06:30:00Z')
    expect(isCloseGateOpen(PERIOD_END, now)).toBe(true)
  })
})

describe('weeksBetween', () => {
  it('returns 0 for the same week start', () => {
    expect(weeksBetween('2026-06-22', '2026-06-22')).toBe(0)
  })

  it('returns 1 for consecutive weeks', () => {
    expect(weeksBetween('2026-06-22', '2026-06-29')).toBe(1)
  })

  it('returns 2 when two weeks were skipped', () => {
    expect(weeksBetween('2026-06-22', '2026-07-06')).toBe(2)
  })

  it('returns a negative number when "to" is before "from"', () => {
    expect(weeksBetween('2026-07-06', '2026-06-22')).toBe(-2)
  })
})
