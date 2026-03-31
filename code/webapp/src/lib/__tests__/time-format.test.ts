import { describe, it, expect } from 'vitest'
import { formatTime } from '@/lib/time-format'

describe('formatTime', () => {
  // ── Null / missing values ───────────────────────────────────────────────────

  it('returns "—" for null', () => {
    expect(formatTime(null)).toBe('—')
  })

  it('returns "—" for undefined', () => {
    expect(formatTime(undefined)).toBe('—')
  })

  it('returns "—" for empty string', () => {
    expect(formatTime('')).toBe('—')
  })

  it('returns "—" for non-time string', () => {
    expect(formatTime('invalid')).toBe('—')
  })

  it('returns "—" for string without colon', () => {
    expect(formatTime('1234')).toBe('—')
  })

  it('returns "—" for partial time string', () => {
    expect(formatTime('12:')).toBe('—')
    expect(formatTime(':30')).toBe('—')
  })

  // ── 12-hour format (default) ────────────────────────────────────────────────

  it('formats afternoon hour as PM', () => {
    expect(formatTime('13:00', '12')).toBe('1:00 PM')
  })

  it('formats morning hour as AM', () => {
    expect(formatTime('09:30', '12')).toBe('9:30 AM')
  })

  it('formats midnight as 12:00 AM', () => {
    expect(formatTime('00:00', '12')).toBe('12:00 AM')
  })

  it('formats noon as 12:00 PM', () => {
    expect(formatTime('12:00', '12')).toBe('12:00 PM')
  })

  it('formats 23:59 correctly', () => {
    expect(formatTime('23:59', '12')).toBe('11:59 PM')
  })

  it('pads minutes with leading zero', () => {
    expect(formatTime('14:05', '12')).toBe('2:05 PM')
  })

  it('accepts HH:mm:ss format (ignores seconds)', () => {
    expect(formatTime('13:00:00', '12')).toBe('1:00 PM')
  })

  // ── 24-hour format ──────────────────────────────────────────────────────────

  it('returns 24hr string unchanged', () => {
    expect(formatTime('13:00', '24')).toBe('13:00')
  })

  it('pads midnight hour in 24hr', () => {
    expect(formatTime('00:30', '24')).toBe('00:30')
  })

  it('pads single-digit hour in 24hr', () => {
    expect(formatTime('09:05', '24')).toBe('09:05')
  })

  it('formats 22:00 in 24hr', () => {
    expect(formatTime('22:00', '24')).toBe('22:00')
  })
})
