import { describe, it, expect, vi, afterEach } from 'vitest'
import { currentTimeLabel } from '../datetime'

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
