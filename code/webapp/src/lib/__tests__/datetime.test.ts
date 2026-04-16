import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { currentTimeLabel, todayDateCdmx } from '../datetime'

// Mock the timezone module to use CDMX timezone for deterministic tests
vi.mock('../timezone', () => ({
  getFrontendTimezone: () => 'America/Mexico_City',
}))

describe('currentTimeLabel', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns time in HH:mm format', () => {
    const result = currentTimeLabel()
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })

  it('returns CDMX time (UTC-6) for a known UTC time', () => {
    // 2026-04-02T22:00:00Z = 16:00 CDMX
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T22:00:00Z'))

    expect(currentTimeLabel()).toBe('16:00')
  })

  it('pads single-digit hours and minutes', () => {
    // 2026-04-02T07:05:00Z = 01:05 CDMX
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T07:05:00Z'))

    expect(currentTimeLabel()).toBe('01:05')
  })

  it('handles midnight UTC (18:00 CDMX previous day)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T00:00:00Z'))

    expect(currentTimeLabel()).toBe('18:00')
  })

  it('handles noon UTC (06:00 CDMX)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T12:00:00Z'))

    expect(currentTimeLabel()).toBe('06:00')
  })
})

describe('todayDateCdmx', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns date in YYYY-MM-DD format', () => {
    const result = todayDateCdmx()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns CDMX date for a known UTC time', () => {
    // 2026-04-02T22:00:00Z = 16:00 CDMX → still April 2
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T22:00:00Z'))

    expect(todayDateCdmx()).toBe('2026-04-02')
  })

  it('returns previous day when UTC is past midnight but CDMX is not', () => {
    // 2026-04-02T03:00:00Z = 21:00 CDMX on April 1
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T03:00:00Z'))

    expect(todayDateCdmx()).toBe('2026-04-01')
  })

  it('pads single-digit months and days', () => {
    // 2026-01-08T15:00:00Z = 09:00 CDMX on Jan 8
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-08T15:00:00Z'))

    expect(todayDateCdmx()).toBe('2026-01-08')
  })

  it('handles midnight CDMX (06:00 UTC)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-09T06:00:00Z'))

    expect(todayDateCdmx()).toBe('2026-04-09')
  })
})
