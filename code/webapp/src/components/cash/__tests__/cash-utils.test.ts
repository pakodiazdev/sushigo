import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatDateTime } from '@/components/cash/cash-utils'

describe('formatCurrency', () => {
    it('formats positive numbers as MXN currency', () => {
        const result = formatCurrency(1234.56)
        // Mexican peso format: $1,234.56 (may include MXN suffix in some locales)
        expect(result).toContain('1,234.56')
    })

    it('formats zero correctly', () => {
        const result = formatCurrency(0)
        expect(result).toContain('0.00')
    })

    it('formats negative numbers', () => {
        const result = formatCurrency(-500)
        expect(result).toContain('500.00')
    })

    it('parses string amounts', () => {
        const result = formatCurrency('1000.50')
        expect(result).toContain('1,000.50')
    })

    it('returns "-" for NaN values', () => {
        expect(formatCurrency('not-a-number')).toBe('-')
        expect(formatCurrency(NaN)).toBe('-')
    })

    it('uses provided currency code', () => {
        const result = formatCurrency(100, 'USD')
        // USD format may vary by locale, but should contain the amount
        expect(result).toContain('100')
    })

    it('handles large numbers', () => {
        const result = formatCurrency(1000000)
        expect(result).toContain('1,000,000')
    })

    it('handles decimal precision', () => {
        const result = formatCurrency(99.999)
        // Should round to 2 decimal places
        expect(result).toMatch(/100\.00/)
    })
})

describe('formatDate', () => {
    it('formats ISO date string to Spanish locale', () => {
        // Using full datetime to avoid timezone issues
        const result = formatDate('2026-03-15T12:00:00')
        // Spanish format includes day, month name, and year
        expect(result.toLowerCase()).toContain('marzo')
        expect(result).toContain('2026')
    })

    it('formats full ISO datetime string', () => {
        const result = formatDate('2026-06-20T12:00:00')
        expect(result.toLowerCase()).toContain('junio')
        expect(result).toContain('2026')
    })

    it('handles different months', () => {
        expect(formatDate('2026-01-15T12:00:00').toLowerCase()).toContain('enero')
        expect(formatDate('2026-06-15T12:00:00').toLowerCase()).toContain('junio')
        expect(formatDate('2026-12-15T12:00:00').toLowerCase()).toContain('diciembre')
    })
})

describe('formatDateTime', () => {
    it('formats datetime with hours and minutes', () => {
        const result = formatDateTime('2026-03-15T15:30:00+00:00')
        // Should include date and time
        expect(result).toContain('15')
        expect(result.toLowerCase()).toContain('marzo')
        expect(result).toContain('2026')
        // Time portion (depends on local timezone, so just check format)
        expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it('formats noon correctly', () => {
        const result = formatDateTime('2026-03-15T12:00:00+00:00')
        expect(result).toContain('15')
        // Should have time component
        expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it('handles different times of day', () => {
        const morning = formatDateTime('2026-03-15T09:15:00+00:00')
        const afternoon = formatDateTime('2026-03-15T14:45:00+00:00')
        const evening = formatDateTime('2026-03-15T20:30:00+00:00')

        // All should have valid time format
        expect(morning).toMatch(/\d{1,2}:\d{2}/)
        expect(afternoon).toMatch(/\d{1,2}:\d{2}/)
        expect(evening).toMatch(/\d{1,2}:\d{2}/)
    })
})
