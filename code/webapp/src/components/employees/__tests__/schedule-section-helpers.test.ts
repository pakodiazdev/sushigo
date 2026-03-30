import { describe, it, expect } from 'vitest'
import { calcDayHours, formatHours, overrideDateLabel } from '@/components/employees/schedule-section'
import type { ScheduleDayOverride } from '@/types/schedule'

// ── calcDayHours ──────────────────────────────────────────────────────────────

describe('calcDayHours', () => {
  it('returns null when start is null', () => {
    expect(calcDayHours(null, '22:00', null)).toBeNull()
  })

  it('returns null when end is null', () => {
    expect(calcDayHours('13:00', null, null)).toBeNull()
  })

  it('computes hours for a simple shift without lunch', () => {
    // 13:00 to 22:00 = 9 hours
    expect(calcDayHours('13:00', '22:00', null)).toBeCloseTo(9, 5)
  })

  it('subtracts lunch duration from total', () => {
    // 13:00 to 22:00 = 9h, minus 60min = 8h
    expect(calcDayHours('13:00', '22:00', 60)).toBeCloseTo(8, 5)
  })

  it('handles cross-midnight shifts', () => {
    // 22:00 to 06:00 = 8 hours across midnight
    expect(calcDayHours('22:00', '06:00', null)).toBeCloseTo(8, 5)
  })

  it('returns null when net hours is 0 or negative', () => {
    // Same start and end → 0 span → null
    expect(calcDayHours('09:00', '09:00', null)).toBeNull()
  })

  it('handles a 2-hour shift with 30min lunch', () => {
    // 09:00 to 11:00 = 2h, minus 30min = 1.5h
    expect(calcDayHours('09:00', '11:00', 30)).toBeCloseTo(1.5, 5)
  })
})

// ── formatHours ───────────────────────────────────────────────────────────────

describe('formatHours', () => {
  it('returns "—" for null', () => {
    expect(formatHours(null)).toBe('—')
  })

  it('formats whole hours without minutes', () => {
    expect(formatHours(8)).toBe('8h')
  })

  it('formats hours and minutes', () => {
    // 1.5 hours = 1h 30m
    expect(formatHours(1.5)).toBe('1h 30m')
  })

  it('formats 9 hours exactly', () => {
    expect(formatHours(9)).toBe('9h')
  })

  it('formats fractional hours with rounding', () => {
    // 8.25 hours = 8h 15m
    expect(formatHours(8.25)).toBe('8h 15m')
  })

  it('formats 0.5 hours as 0h 30m', () => {
    expect(formatHours(0.5)).toBe('0h 30m')
  })
})

// ── overrideDateLabel ─────────────────────────────────────────────────────────

function makeOverride(from: string, to: string | null): ScheduleDayOverride {
  return {
    id: 'o-1',
    employment_period_id: 'p-1',
    day_of_week: 1,
    effective_from: from,
    effective_to: to,
    is_day_off: false,
    expected_start: '15:00',
    expected_lunch_start: null,
    expected_lunch_end: null,
    lunch_duration_minutes: null,
    expected_end: '23:00',
    note: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('overrideDateLabel', () => {
  it('shows "desde <date>" for indefinite overrides (effective_to = null)', () => {
    const label = overrideDateLabel(makeOverride('2026-03-01', null))
    expect(label).toContain('desde')
    expect(label).toMatch(/1/)
  })

  it('shows single date for same-day overrides', () => {
    const label = overrideDateLabel(makeOverride('2026-03-15', '2026-03-15'))
    // Should show just the date, no "–" separator
    expect(label).not.toContain('–')
    expect(label).toMatch(/15/)
  })

  it('shows date range for multi-day overrides', () => {
    const label = overrideDateLabel(makeOverride('2026-03-01', '2026-03-31'))
    expect(label).toContain('–')
  })
})
