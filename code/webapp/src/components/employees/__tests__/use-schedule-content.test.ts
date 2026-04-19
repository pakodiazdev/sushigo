// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { EmployeeSchedule, ScheduleDayOverride } from '@/types/schedule'

// ── Mock dependencies ─────────────────────────────────────────────────────────

const mockOverride = {
    form: { reset: vi.fn(), handleSubmit: vi.fn() },
    showDialog: false,
    setShowDialog: vi.fn(),
    handleDialogConfirm: vi.fn(),
    isPending: false,
}

const mockWeeklyCalendar = {
    weekStart: '2026-04-13',
    prevWeek: vi.fn(),
    nextWeek: vi.fn(),
    jumpToDate: vi.fn(),
    overrideListDow: null as number | null,
    openOverrideList: vi.fn(),
    closeOverrideList: vi.fn(),
}

vi.mock('../use-create-day-override', () => ({
    useCreateDayOverride: () => mockOverride,
}))

vi.mock('../use-weekly-calendar', () => ({
    useWeeklyCalendar: () => mockWeeklyCalendar,
    calcDayHours: (_start: string | null, _end: string | null, _lunch: number | null) => 8,
}))

vi.mock('../schedule-section-utils', () => ({
    calcDayHours: (start: string | null, end: string | null, lunchMinutes: number | null) => {
        if (!start || !end) return null
        const toMin = (t: string) => {
            const [h = 0, m = 0] = t.split(':').map(Number)
            return h * 60 + m
        }
        const startMin = toMin(start)
        const endMin = toMin(end)
        const span = endMin >= startMin ? endMin - startMin : endMin + 1440 - startMin
        const net = span - (lunchMinutes ?? 0)
        return net > 0 ? net / 60 : null
    },
}))

import { useScheduleContent } from '../use-schedule-content'

// ── Test data ─────────────────────────────────────────────────────────────────

const baseSchedule: EmployeeSchedule = {
    id: 'sch-01',
    employment_period_id: 'emp-period-01',
    effective_from: '2026-04-01',
    effective_to: null,
    workday_type: 'FULL',
    working_days_per_week: 5,
    days: [
        { day_of_week: 1, is_day_off: false, expected_start: '09:00', expected_end: '18:00', expected_lunch_start: '13:00', expected_lunch_end: '14:00', lunch_duration_minutes: 60 },
        { day_of_week: 2, is_day_off: false, expected_start: '09:00', expected_end: '18:00', expected_lunch_start: '13:00', expected_lunch_end: '14:00', lunch_duration_minutes: 60 },
        { day_of_week: 3, is_day_off: false, expected_start: '09:00', expected_end: '18:00', expected_lunch_start: '13:00', expected_lunch_end: '14:00', lunch_duration_minutes: 60 },
        { day_of_week: 4, is_day_off: false, expected_start: '09:00', expected_end: '18:00', expected_lunch_start: '13:00', expected_lunch_end: '14:00', lunch_duration_minutes: 60 },
        { day_of_week: 5, is_day_off: false, expected_start: '09:00', expected_end: '18:00', expected_lunch_start: '13:00', expected_lunch_end: '14:00', lunch_duration_minutes: 60 },
        { day_of_week: 6, is_day_off: true, expected_start: null, expected_end: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
        { day_of_week: 7, is_day_off: true, expected_start: null, expected_end: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
    ],
    active_overrides: [],
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useScheduleContent', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-04-15T12:00:00'))
        mockWeeklyCalendar.overrideListDow = null
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    it('initializes with config viewMode', () => {
        const { result } = renderHook(() =>
            useScheduleContent(baseSchedule, 'emp-01', 'period-01'),
        )

        expect(result.current.viewMode).toBe('config')
    })

    it('can toggle viewMode to week', () => {
        const { result } = renderHook(() =>
            useScheduleContent(baseSchedule, 'emp-01', 'period-01'),
        )

        act(() => {
            result.current.setViewMode('week')
        })

        expect(result.current.viewMode).toBe('week')
    })

    it('sorts days by day_of_week', () => {
        const unsortedSchedule: EmployeeSchedule = {
            ...baseSchedule,
            days: [
                { day_of_week: 5, is_day_off: false, expected_start: '09:00', expected_end: '18:00', expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
                { day_of_week: 1, is_day_off: false, expected_start: '09:00', expected_end: '18:00', expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
                { day_of_week: 3, is_day_off: false, expected_start: '09:00', expected_end: '18:00', expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
            ],
        }

        const { result } = renderHook(() =>
            useScheduleContent(unsortedSchedule, 'emp-01', 'period-01'),
        )

        expect(result.current.sortedDays.map(d => d.day_of_week)).toEqual([1, 3, 5])
    })

    it('computes todayLocal in YYYY-MM-DD format', () => {
        const { result } = renderHook(() =>
            useScheduleContent(baseSchedule, 'emp-01', 'period-01'),
        )

        expect(result.current.todayLocal).toBe('2026-04-15')
    })

    it('groups overrides by day of week', () => {
        const scheduleWithOverrides: EmployeeSchedule = {
            ...baseSchedule,
            active_overrides: [
                {
                    id: '1',
                    employment_period_id: 'period-01',
                    day_of_week: 1,
                    effective_from: '2026-04-13',
                    effective_to: null,
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
                {
                    id: '2',
                    employment_period_id: 'period-01',
                    day_of_week: 1,
                    effective_from: '2026-04-06',
                    effective_to: '2026-04-06',
                    is_day_off: false,
                    expected_start: '10:00',
                    expected_end: '19:00',
                    expected_lunch_start: null,
                    expected_lunch_end: null,
                    lunch_duration_minutes: null,
                    note: null,
                    created_at: '2026-04-01T00:00:00Z',
                    updated_at: '2026-04-01T00:00:00Z',
                },
            ],
        }

        const { result } = renderHook(() =>
            useScheduleContent(scheduleWithOverrides, 'emp-01', 'period-01'),
        )

        expect(result.current.overridesByDow[1]).toHaveLength(2)
        expect(result.current.overridesByDow[2]).toBeUndefined()
    })

    it('finds active permanent override for a day', () => {
        const scheduleWithPermanentOverride: EmployeeSchedule = {
            ...baseSchedule,
            active_overrides: [
                {
                    id: '1',
                    employment_period_id: 'period-01',
                    day_of_week: 1,
                    effective_from: '2026-04-01',
                    effective_to: null,
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
            ],
        }

        const { result } = renderHook(() =>
            useScheduleContent(scheduleWithPermanentOverride, 'emp-01', 'period-01'),
        )

        const override = result.current.findActivePermanentOverride(1)
        expect(override?.id).toBe('1')
    })

    it('returns null for non-existent permanent override', () => {
        const { result } = renderHook(() =>
            useScheduleContent(baseSchedule, 'emp-01', 'period-01'),
        )

        expect(result.current.findActivePermanentOverride(1)).toBeNull()
    })

    it('calculates expectedWeeklyHours for FULL workday type', () => {
        const { result } = renderHook(() =>
            useScheduleContent(baseSchedule, 'emp-01', 'period-01'),
        )

        expect(result.current.expectedWeeklyHours).toBe(40) // 5 days × 8 hours
    })

    it('returns null expectedWeeklyHours for non-FULL workday type', () => {
        const partTimeSchedule: EmployeeSchedule = {
            ...baseSchedule,
            workday_type: 'PARTIAL',
        }

        const { result } = renderHook(() =>
            useScheduleContent(partTimeSchedule, 'emp-01', 'period-01'),
        )

        expect(result.current.expectedWeeklyHours).toBeNull()
    })

    it('returns overridesForDow when overrideListDow is set', () => {
        const scheduleWithOverrides: EmployeeSchedule = {
            ...baseSchedule,
            active_overrides: [
                {
                    id: '1',
                    employment_period_id: 'period-01',
                    day_of_week: 3,
                    effective_from: '2026-04-01',
                    effective_to: null,
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
            ],
        }
        mockWeeklyCalendar.overrideListDow = 3

        const { result } = renderHook(() =>
            useScheduleContent(scheduleWithOverrides, 'emp-01', 'period-01'),
        )

        expect(result.current.overridesForDow).toHaveLength(1)
        expect(result.current.overridesForDow[0]?.day_of_week).toBe(3)
    })

    it('handleOverrideSelect closes list and jumps to date', () => {
        const override: ScheduleDayOverride = {
            id: '1',
            employment_period_id: 'period-01',
            day_of_week: 1,
            effective_from: '2026-04-20',
            effective_to: null,
            is_day_off: true,
            expected_start: null,
            expected_end: null,
            expected_lunch_start: null,
            expected_lunch_end: null,
            lunch_duration_minutes: null,
            note: null,
            created_at: '2026-04-01T00:00:00Z',
            updated_at: '2026-04-01T00:00:00Z',
        }

        const { result } = renderHook(() =>
            useScheduleContent(baseSchedule, 'emp-01', 'period-01'),
        )

        act(() => {
            result.current.handleOverrideSelect(override)
        })

        expect(mockWeeklyCalendar.closeOverrideList).toHaveBeenCalled()
        expect(mockWeeklyCalendar.jumpToDate).toHaveBeenCalledWith('2026-04-20')
        expect(result.current.viewMode).toBe('week')
    })

    it('tabCls returns correct classes for active tab', () => {
        const { result } = renderHook(() =>
            useScheduleContent(baseSchedule, 'emp-01', 'period-01'),
        )

        expect(result.current.tabCls('config')).toContain('border-primary')
        expect(result.current.tabCls('week')).toContain('border-transparent')
    })
})
