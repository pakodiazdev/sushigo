import { describe, it, expect } from 'vitest'
import {
    buildSummaryLines,
    calcDayHours,
    formatHours,
    overrideDateLabel,
} from '../schedule-section-utils'
import type { ScheduleDay, ScheduleDayOverride } from '@/types/schedule'

// ── buildSummaryLines tests ───────────────────────────────────────────────────

describe('buildSummaryLines', () => {
    const createDay = (dow: number, isOff: boolean, start?: string, end?: string, lunchStart?: string, lunchMin?: number): ScheduleDay => ({
        day_of_week: dow,
        is_day_off: isOff,
        expected_start: start ?? null,
        expected_end: end ?? null,
        expected_lunch_start: lunchStart ?? null,
        expected_lunch_end: lunchStart ? '14:00' : null,
        lunch_duration_minutes: lunchMin ?? null,
    })

    it('returns empty array when all days are off', () => {
        const days = [1, 2, 3, 4, 5, 6, 7].map(dow => createDay(dow, true))
        expect(buildSummaryLines(days)).toEqual([])
    })

    it('builds work line with consecutive days (L-V)', () => {
        const days = [
            createDay(1, false, '09:00', '18:00', '13:00', 60),
            createDay(2, false, '09:00', '18:00', '13:00', 60),
            createDay(3, false, '09:00', '18:00', '13:00', 60),
            createDay(4, false, '09:00', '18:00', '13:00', 60),
            createDay(5, false, '09:00', '18:00', '13:00', 60),
            createDay(6, true),
            createDay(7, true),
        ]
        const lines = buildSummaryLines(days)
        expect(lines.length).toBeGreaterThanOrEqual(1)
        expect(lines[0]?.icon).toBe('work')
        expect(lines[0]?.text).toContain('L-V')
        expect(lines[0]?.text).toContain('9:00')
        expect(lines[0]?.text).toContain('6:00')
    })

    it('includes lunch line when lunch is configured', () => {
        const days = [
            createDay(1, false, '09:00', '18:00', '13:00', 60),
            createDay(2, true),
            createDay(3, true),
            createDay(4, true),
            createDay(5, true),
            createDay(6, true),
            createDay(7, true),
        ]
        const lines = buildSummaryLines(days)
        const lunchLine = lines.find(l => l.icon === 'lunch')
        expect(lunchLine).toBeDefined()
        expect(lunchLine?.text).toContain('1 hr')
    })

    it('includes rest days line', () => {
        const days = [
            createDay(1, false, '09:00', '18:00'),
            createDay(2, false, '09:00', '18:00'),
            createDay(3, false, '09:00', '18:00'),
            createDay(4, false, '09:00', '18:00'),
            createDay(5, false, '09:00', '18:00'),
            createDay(6, true),
            createDay(7, true),
        ]
        const lines = buildSummaryLines(days)
        const restLine = lines.find(l => l.icon === 'rest')
        expect(restLine).toBeDefined()
        expect(restLine?.text).toContain('Sábado')
        expect(restLine?.text).toContain('Domingo')
    })

    it('shows single day name when only one working day', () => {
        const days = [
            createDay(1, true),
            createDay(2, true),
            createDay(3, false, '09:00', '18:00'),
            createDay(4, true),
            createDay(5, true),
            createDay(6, true),
            createDay(7, true),
        ]
        const lines = buildSummaryLines(days)
        expect(lines[0]?.text).toContain('Miércoles')
    })

    it('shows L-D when all days are working', () => {
        const days = [1, 2, 3, 4, 5, 6, 7].map(dow => createDay(dow, false, '10:00', '18:00'))
        const lines = buildSummaryLines(days)
        expect(lines[0]?.text).toContain('L-D')
    })

    it('formats 30-minute lunch correctly', () => {
        const days = [
            createDay(1, false, '09:00', '14:00', '12:00', 30),
            createDay(2, true),
            createDay(3, true),
            createDay(4, true),
            createDay(5, true),
            createDay(6, true),
            createDay(7, true),
        ]
        const lines = buildSummaryLines(days)
        const lunchLine = lines.find(l => l.icon === 'lunch')
        expect(lunchLine?.text).toContain('30 min')
    })
})

// ── calcDayHours tests ────────────────────────────────────────────────────────

describe('calcDayHours', () => {
    it('calculates simple 8-hour day without lunch', () => {
        expect(calcDayHours('09:00', '17:00', null)).toBe(8)
    })

    it('calculates hours minus lunch duration', () => {
        expect(calcDayHours('09:00', '18:00', 60)).toBe(8) // 9 hours - 1 hour lunch
    })

    it('handles cross-midnight shifts', () => {
        expect(calcDayHours('19:00', '04:00', null)).toBe(9)
    })

    it('returns null when start is null', () => {
        expect(calcDayHours(null, '17:00', null)).toBeNull()
    })

    it('returns null when end is null', () => {
        expect(calcDayHours('09:00', null, null)).toBeNull()
    })

    it('returns null when result would be zero or negative', () => {
        expect(calcDayHours('09:00', '10:00', 120)).toBeNull() // 1 hour span, 2 hour lunch
    })

    it('handles half-hour increments', () => {
        expect(calcDayHours('09:00', '17:30', null)).toBe(8.5)
    })
})

// ── formatHours tests ─────────────────────────────────────────────────────────

describe('formatHours', () => {
    it('formats whole hours', () => {
        expect(formatHours(8)).toBe('8h')
    })

    it('formats hours with minutes', () => {
        expect(formatHours(8.5)).toBe('8h 30m')
    })

    it('formats fractional hours', () => {
        expect(formatHours(1.25)).toBe('1h 15m')
    })

    it('returns dash for null', () => {
        expect(formatHours(null)).toBe('—')
    })

    it('handles zero hours', () => {
        expect(formatHours(0)).toBe('0h')
    })
})

// ── overrideDateLabel tests ───────────────────────────────────────────────────

describe('overrideDateLabel', () => {
    const createOverride = (from: string, to: string | null): ScheduleDayOverride => ({
        id: '1',
        employment_period_id: 'period-01',
        day_of_week: 1,
        effective_from: from,
        effective_to: to,
        is_day_off: true,
        expected_start: null,
        expected_end: null,
        expected_lunch_start: null,
        expected_lunch_end: null,
        lunch_duration_minutes: null,
        note: null,
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
    })

    it('shows "desde" prefix for permanent override', () => {
        const result = overrideDateLabel(createOverride('2026-04-15', null))
        expect(result).toMatch(/^desde/)
        expect(result).toContain('15')
    })

    it('shows single date for same-day range', () => {
        const result = overrideDateLabel(createOverride('2026-04-15', '2026-04-15'))
        expect(result).not.toMatch(/–/)
        expect(result).toContain('15')
    })

    it('shows date range for multi-day override', () => {
        const result = overrideDateLabel(createOverride('2026-04-15', '2026-04-20'))
        expect(result).toMatch(/–/)
        expect(result).toContain('15')
        expect(result).toContain('20')
    })
})
