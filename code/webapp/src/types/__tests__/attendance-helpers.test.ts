import { describe, it, expect } from 'vitest'
import { getAttendancePhase, formatSeconds, formatTime } from '../attendance'
import type { TodayAttendanceData } from '../attendance'

// ── getAttendancePhase ────────────────────────────────────────────────────────

describe('getAttendancePhase', () => {
  const base: TodayAttendanceData = {
    id: 'att-001',
    check_in: '2026-04-02T19:00:00Z',
    check_out: null,
    lunch_start: null,
    lunch_end: null,
    day_status: 'WORKED',
    entry_late_seconds: 0,
    entry_late_minutes: 0,
    is_entry_deductible: false,
    overtime_minutes: 0,
    overtime_authorized: false,
    overtime_authorized_at: null,
    requires_overtime_decision: false,
  }

  it('returns pending when attendance is null', () => {
    expect(getAttendancePhase(null)).toBe('pending')
  })

  it('returns pending when check_in is null', () => {
    expect(getAttendancePhase({ ...base, check_in: null })).toBe('pending')
  })

  it('returns checked-in when only check_in exists', () => {
    expect(getAttendancePhase(base)).toBe('checked-in')
  })

  it('returns at-lunch when lunch_start exists but no lunch_end', () => {
    expect(getAttendancePhase({ ...base, lunch_start: '2026-04-02T20:00:00Z' })).toBe('at-lunch')
  })

  it('returns returned when lunch_end exists but no check_out', () => {
    expect(getAttendancePhase({
      ...base,
      lunch_start: '2026-04-02T20:00:00Z',
      lunch_end: '2026-04-02T21:00:00Z',
    })).toBe('returned')
  })

  it('returns done when check_out exists', () => {
    expect(getAttendancePhase({ ...base, check_out: '2026-04-03T04:00:00Z' })).toBe('done')
  })

  it('returns done when check_out exists even without lunch', () => {
    expect(getAttendancePhase({
      ...base,
      check_out: '2026-04-03T04:00:00Z',
      lunch_start: null,
      lunch_end: null,
    })).toBe('done')
  })
})

// ── formatSeconds ─────────────────────────────────────────────────────────────

describe('formatSeconds', () => {
  it('returns 0m for null', () => {
    expect(formatSeconds(null)).toBe('0m')
  })

  it('returns 0m for zero', () => {
    expect(formatSeconds(0)).toBe('0m')
  })

  it('returns 0m for negative values', () => {
    expect(formatSeconds(-60)).toBe('0m')
  })

  it('formats seconds under an hour as minutes', () => {
    expect(formatSeconds(900)).toBe('15m')
  })

  it('formats exactly one hour', () => {
    expect(formatSeconds(3600)).toBe('1h')
  })

  it('formats hours and minutes', () => {
    expect(formatSeconds(5400)).toBe('1h 30m')
  })

  it('formats multiple hours with no remainder', () => {
    expect(formatSeconds(7200)).toBe('2h')
  })

  it('formats partial minutes (rounds down)', () => {
    expect(formatSeconds(90)).toBe('1m')
  })
})

// ── formatTime ────────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('returns dash for null', () => {
    expect(formatTime(null)).toBe('—')
  })

  it('returns dash for invalid ISO string', () => {
    expect(formatTime('not-a-date')).toBe('—')
  })

  it('converts UTC midnight to 18:00 CDMX (previous day)', () => {
    expect(formatTime('2026-04-02T00:00:00Z')).toBe('18:00')
  })

  it('converts UTC+00:00 to CDMX time', () => {
    expect(formatTime('2026-04-02T19:00:00+00:00')).toBe('13:00')
  })

  it('handles Z suffix correctly', () => {
    expect(formatTime('2026-04-02T19:00:00Z')).toBe('13:00')
  })

  it('converts positive offset correctly', () => {
    // 15:00 UTC+02:00 = 13:00 UTC = 07:00 CDMX
    expect(formatTime('2026-04-02T15:00:00+02:00')).toBe('07:00')
  })

  it('converts negative offset correctly', () => {
    // 13:00 UTC-06:00 = 19:00 UTC = 13:00 CDMX
    expect(formatTime('2026-04-02T13:00:00-06:00')).toBe('13:00')
  })

  it('formats minutes correctly', () => {
    expect(formatTime('2026-04-02T19:15:00+00:00')).toBe('13:15')
  })

  it('pads hours and minutes with zero', () => {
    expect(formatTime('2026-04-02T07:05:00+00:00')).toBe('01:05')
  })
})
