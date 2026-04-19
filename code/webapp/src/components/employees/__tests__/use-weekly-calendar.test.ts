// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
    addDays,
    getWeekStart,
    fmtDayShort,
    resolveWeek,
    useWeeklyCalendar,
} from '../use-weekly-calendar'
import type { ScheduleDay, ScheduleDayOverride } from '@/types/schedule'

// ── Date utility tests ────────────────────────────────────────────────────────

describe('addDays', () => {
    it('adds positive days', () => {
        expect(addDays('2026-04-15', 3)).toBe('2026-04-18')
    })

    it('adds negative days', () => {
        expect(addDays('2026-04-15', -5)).toBe('2026-04-10')
    })

    it('handles month boundaries', () => {
        expect(addDays('2026-01-30', 5)).toBe('2026-02-04')
    })

    it('handles year boundaries', () => {
        expect(addDays('2025-12-30', 5)).toBe('2026-01-04')
    })
})

describe('getWeekStart', () => {
    it('returns Monday when given a Wednesday', () => {
        const wed = new Date('2026-04-15T12:00:00') // Wednesday
        expect(getWeekStart(wed)).toBe('2026-04-13') // Monday
    })

    it('returns Monday when given a Monday', () => {
        const mon = new Date('2026-04-13T12:00:00') // Monday
        expect(getWeekStart(mon)).toBe('2026-04-13')
    })

    it('returns previous Monday when given a Sunday', () => {
        const sun = new Date('2026-04-19T12:00:00') // Sunday
        expect(getWeekStart(sun)).toBe('2026-04-13')
    })

    it('returns previous Monday when given a Saturday', () => {
        const sat = new Date('2026-04-18T12:00:00') // Saturday
        expect(getWeekStart(sat)).toBe('2026-04-13')
    })
})

describe('fmtDayShort', () => {
    it('formats date in Spanish locale', () => {
        const result = fmtDayShort('2026-04-15')
        // Format varies by locale, but should contain day number
        expect(result).toMatch(/15/)
    })
})

// ── resolveWeek tests ─────────────────────────────────────────────────────────

describe('resolveWeek', () => {
    const baseDays: ScheduleDay[] = [
        { day_of_week: 1, is_day_off: false, expected_start: '09:00', expected_end: '18:00', expected_lunch_start: '13:00', expected_lunch_end: '14:00', lunch_duration_minutes: 60 },
        { day_of_week: 2, is_day_off: false, expected_start: '09:00', expected_end: '18:00', expected_lunch_start: '13:00', expected_lunch_end: '14:00', lunch_duration_minutes: 60 },
        { day_of_week: 3, is_day_off: false, expected_start: '09:00', expected_end: '18:00', expected_lunch_start: '13:00', expected_lunch_end: '14:00', lunch_duration_minutes: 60 },
        { day_of_week: 4, is_day_off: false, expected_start: '09:00', expected_end: '18:00', expected_lunch_start: '13:00', expected_lunch_end: '14:00', lunch_duration_minutes: 60 },
        { day_of_week: 5, is_day_off: false, expected_start: '09:00', expected_end: '18:00', expected_lunch_start: '13:00', expected_lunch_end: '14:00', lunch_duration_minutes: 60 },
        { day_of_week: 6, is_day_off: true, expected_start: null, expected_end: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
        { day_of_week: 7, is_day_off: true, expected_start: null, expected_end: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
    ]

    it('returns 7 days for a week', () => {
        const result = resolveWeek('2026-04-13', baseDays, [])
        expect(result).toHaveLength(7)
    })

    it('uses base schedule when no overrides', () => {
        const result = resolveWeek('2026-04-13', baseDays, [])
        const monday = result.find(d => d.dow === 1)
        expect(monday?.source).toBe('base')
        expect(monday?.is_day_off).toBe(false)
        expect(monday?.expected_start).toBe('09:00')
    })

    it('marks Saturday and Sunday as day off from base', () => {
        const result = resolveWeek('2026-04-13', baseDays, [])
        const saturday = result.find(d => d.dow === 6)
        const sunday = result.find(d => d.dow === 7)
        expect(saturday?.is_day_off).toBe(true)
        expect(sunday?.is_day_off).toBe(true)
    })

    it('applies active override when present', () => {
        const overrides: ScheduleDayOverride[] = [
            {
                id: '1',
                employment_period_id: 'period-01',
                day_of_week: 1,
                effective_from: '2026-04-13',
                effective_to: '2026-04-13',
                is_day_off: true,
                expected_start: null,
                expected_end: null,
                expected_lunch_start: null,
                expected_lunch_end: null,
                lunch_duration_minutes: null,
                note: null,
                created_at: '2026-04-01T00:00:00Z',
                updated_at: '2026-04-01T00:00:00Z',
            },
        ]

        const result = resolveWeek('2026-04-13', baseDays, overrides)
        const monday = result.find(d => d.dow === 1)
        expect(monday?.source).toBe('override')
        expect(monday?.is_day_off).toBe(true)
        expect(monday?.override).toBeDefined()
    })

    it('does not apply override outside date range', () => {
        const overrides: ScheduleDayOverride[] = [
            {
                id: '1',
                employment_period_id: 'period-01',
                day_of_week: 1,
                effective_from: '2026-04-20', // Next week
                effective_to: '2026-04-20',
                is_day_off: true,
                expected_start: null,
                expected_end: null,
                expected_lunch_start: null,
                expected_lunch_end: null,
                lunch_duration_minutes: null,
                note: null,
                created_at: '2026-04-01T00:00:00Z',
                updated_at: '2026-04-01T00:00:00Z',
            },
        ]

        const result = resolveWeek('2026-04-13', baseDays, overrides)
        const monday = result.find(d => d.dow === 1)
        expect(monday?.source).toBe('base')
    })

    it('uses most recent override when multiple exist', () => {
        const overrides: ScheduleDayOverride[] = [
            {
                id: '1',
                employment_period_id: 'period-01',
                day_of_week: 1,
                effective_from: '2026-04-01',
                effective_to: null,
                is_day_off: false,
                expected_start: '08:00',
                expected_end: '17:00',
                expected_lunch_start: '12:00',
                expected_lunch_end: '13:00',
                lunch_duration_minutes: 60,
                note: null,
                created_at: '2026-04-01T00:00:00Z',
                updated_at: '2026-04-01T00:00:00Z',
            },
            {
                id: '2',
                employment_period_id: 'period-01',
                day_of_week: 1,
                effective_from: '2026-04-10',
                effective_to: null,
                is_day_off: false,
                expected_start: '10:00', // Latest override
                expected_end: '19:00',
                expected_lunch_start: '14:00',
                expected_lunch_end: '15:00',
                lunch_duration_minutes: 60,
                note: null,
                created_at: '2026-04-10T00:00:00Z',
                updated_at: '2026-04-10T00:00:00Z',
            },
        ]

        const result = resolveWeek('2026-04-13', baseDays, overrides)
        const monday = result.find(d => d.dow === 1)
        expect(monday?.expected_start).toBe('10:00')
    })

    it('handles missing base day gracefully', () => {
        const partialBase = baseDays.filter(d => d.day_of_week !== 1)
        const result = resolveWeek('2026-04-13', partialBase, [])
        const monday = result.find(d => d.dow === 1)
        expect(monday?.is_day_off).toBe(true) // Defaults to day off
    })
})

// ── useWeeklyCalendar hook tests ──────────────────────────────────────────────

describe('useWeeklyCalendar', () => {
    beforeEach(() => {
        // Mock Date to Wednesday 2026-04-15
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-04-15T12:00:00'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('initializes weekStart to current Monday', () => {
        const { result } = renderHook(() => useWeeklyCalendar())
        expect(result.current.weekStart).toBe('2026-04-13')
    })

    it('prevWeek navigates back 7 days', () => {
        const { result } = renderHook(() => useWeeklyCalendar())

        act(() => {
            result.current.prevWeek()
        })

        expect(result.current.weekStart).toBe('2026-04-06')
    })

    it('nextWeek navigates forward 7 days', () => {
        const { result } = renderHook(() => useWeeklyCalendar())

        act(() => {
            result.current.nextWeek()
        })

        expect(result.current.weekStart).toBe('2026-04-20')
    })

    it('jumpToDate sets weekStart to Monday of that week', () => {
        const { result } = renderHook(() => useWeeklyCalendar())

        act(() => {
            result.current.jumpToDate('2026-05-08') // Friday
        })

        expect(result.current.weekStart).toBe('2026-05-04') // Monday
    })

    it('overrideListDow starts as null', () => {
        const { result } = renderHook(() => useWeeklyCalendar())
        expect(result.current.overrideListDow).toBeNull()
    })

    it('openOverrideList sets overrideListDow', () => {
        const { result } = renderHook(() => useWeeklyCalendar())

        act(() => {
            result.current.openOverrideList(3)
        })

        expect(result.current.overrideListDow).toBe(3)
    })

    it('closeOverrideList resets overrideListDow to null', () => {
        const { result } = renderHook(() => useWeeklyCalendar())

        act(() => {
            result.current.openOverrideList(5)
            result.current.closeOverrideList()
        })

        expect(result.current.overrideListDow).toBeNull()
    })
})
