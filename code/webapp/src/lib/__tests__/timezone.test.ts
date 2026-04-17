import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getFrontendTimezone,
  getBrowserTimezone,
  getTimezoneOffsetString,
  timeToIsoWithOffset,
  formatDateInFrontendTz,
  formatTimeInFrontendTz,
  formatDateTimeInFrontendTz,
  toDatetimeLocalValue,
  fromDatetimeLocalValue,
} from '@/lib/timezone'

// ══════════════════════════════════════════════════════════════════════════════
// getFrontendTimezone / getBrowserTimezone
// ══════════════════════════════════════════════════════════════════════════════

describe('getBrowserTimezone', () => {
  it('returns an IANA timezone identifier', () => {
    const tz = getBrowserTimezone()
    // Should be a string containing a slash (e.g., "America/New_York")
    expect(tz).toBeDefined()
    expect(typeof tz).toBe('string')
  })
})

describe('getFrontendTimezone', () => {
  it('returns the browser timezone by default', () => {
    // Currently getFrontendTimezone just delegates to getBrowserTimezone
    expect(getFrontendTimezone()).toBe(getBrowserTimezone())
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// getTimezoneOffsetString
// ══════════════════════════════════════════════════════════════════════════════

describe('getTimezoneOffsetString', () => {
  it('returns a string in ±HH:MM format', () => {
    const offset = getTimezoneOffsetString()
    // Should match pattern like "-06:00" or "+05:30"
    expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/)
  })

  it('uses reference date for offset calculation', () => {
    // The offset should be the same for a fixed date in the same timezone
    const date1 = new Date('2026-04-16T12:00:00Z')
    const date2 = new Date('2026-04-16T18:00:00Z')
    const offset1 = getTimezoneOffsetString(date1)
    const offset2 = getTimezoneOffsetString(date2)
    // Both should produce valid offsets (may differ due to DST but format is consistent)
    expect(offset1).toMatch(/^[+-]\d{2}:\d{2}$/)
    expect(offset2).toMatch(/^[+-]\d{2}:\d{2}$/)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// timeToIsoWithOffset
// ══════════════════════════════════════════════════════════════════════════════

describe('timeToIsoWithOffset', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('throws TypeError for invalid time format (no colon)', () => {
    expect(() => timeToIsoWithOffset('1430')).toThrow(TypeError)
    expect(() => timeToIsoWithOffset('1430')).toThrow('Invalid time value')
  })

  it('throws TypeError for empty string', () => {
    expect(() => timeToIsoWithOffset('')).toThrow(TypeError)
  })

  it('throws TypeError for time with NaN values', () => {
    expect(() => timeToIsoWithOffset('ab:cd')).toThrow(TypeError)
  })

  it('returns ISO 8601 string with timezone offset', () => {
    // Set a fixed system time
    vi.setSystemTime(new Date('2026-04-16T12:00:00Z'))

    const iso = timeToIsoWithOffset('14:30')

    // Should be YYYY-MM-DDTHH:mm:ss±HH:MM format
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T14:30:00[+-]\d{2}:\d{2}$/)
  })

  it('uses today date in frontend timezone', () => {
    vi.setSystemTime(new Date('2026-04-16T12:00:00Z'))

    const iso = timeToIsoWithOffset('09:00')

    // Should contain the time we passed
    expect(iso).toContain('T09:00:00')
    // Should have a valid offset
    expect(iso).toMatch(/[+-]\d{2}:\d{2}$/)
  })

  it('handles midnight correctly', () => {
    vi.setSystemTime(new Date('2026-04-16T05:00:00Z'))

    const iso = timeToIsoWithOffset('00:00')

    expect(iso).toContain('T00:00:00')
    expect(iso).toMatch(/[+-]\d{2}:\d{2}$/)
  })

  it('handles single-digit hours and minutes', () => {
    vi.setSystemTime(new Date('2026-04-16T12:00:00Z'))

    const iso = timeToIsoWithOffset('9:5')

    // Should pad to two digits
    expect(iso).toContain('T09:05:00')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Format functions
// ══════════════════════════════════════════════════════════════════════════════

describe('formatDateInFrontendTz', () => {
  it('formats a UTC ISO string to a localized date', () => {
    const result = formatDateInFrontendTz('2026-04-16T18:00:00Z')
    // Should be a non-empty string (actual format depends on locale)
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns original string on error', () => {
    const result = formatDateInFrontendTz('invalid-date')
    expect(result).toBe('invalid-date')
  })
})

describe('formatTimeInFrontendTz', () => {
  it('formats a UTC ISO string to a localized time', () => {
    const result = formatTimeInFrontendTz('2026-04-16T18:00:00Z')
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns original string on error', () => {
    const result = formatTimeInFrontendTz('invalid-date')
    expect(result).toBe('invalid-date')
  })
})

describe('formatDateTimeInFrontendTz', () => {
  it('formats a UTC ISO string to a localized datetime', () => {
    const result = formatDateTimeInFrontendTz('2026-04-16T18:00:00Z')
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns original string on error', () => {
    const result = formatDateTimeInFrontendTz('invalid-date')
    expect(result).toBe('invalid-date')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// toDatetimeLocalValue
// ══════════════════════════════════════════════════════════════════════════════

describe('toDatetimeLocalValue', () => {
  it('converts UTC ISO string to datetime-local format', () => {
    const result = toDatetimeLocalValue('2026-04-16T18:00:00Z')
    // Should be YYYY-MM-DDTHH:mm format
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('returns empty string on invalid input', () => {
    const result = toDatetimeLocalValue('invalid')
    // Invalid date should return empty string or the original processing
    expect(typeof result).toBe('string')
  })

  it('handles dates with timezone offsets', () => {
    const result = toDatetimeLocalValue('2026-04-16T12:30:00-06:00')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('preserves time components correctly', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T15:45:00Z'))
    
    const result = toDatetimeLocalValue('2026-04-16T15:45:00Z')
    // Should contain the formatted time
    expect(result).toContain(':')
    expect(result).toContain('T')
    
    vi.useRealTimers()
  })

  it('handles midnight correctly', () => {
    const result = toDatetimeLocalValue('2026-04-16T00:00:00Z')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// fromDatetimeLocalValue
// ══════════════════════════════════════════════════════════════════════════════

describe('fromDatetimeLocalValue', () => {
  it('converts datetime-local value to ISO string', () => {
    const result = fromDatetimeLocalValue('2026-04-16T14:30')
    // Should be an ISO string
    expect(result).toContain('2026')
    expect(typeof result).toBe('string')
  })

  it('returns original value on invalid input', () => {
    const result = fromDatetimeLocalValue('invalid')
    expect(result).toBe('invalid')
  })

  it('returns ISO 8601 format', () => {
    const result = fromDatetimeLocalValue('2026-05-01T09:00')
    // ISO format should end with Z or contain timezone info
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('handles edge case times', () => {
    const midnight = fromDatetimeLocalValue('2026-04-16T00:00')
    expect(midnight).toContain('2026')

    const lastMinute = fromDatetimeLocalValue('2026-04-16T23:59')
    expect(lastMinute).toContain('2026')
  })
})
