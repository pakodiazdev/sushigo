// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  buildPayload,
  useCreateScheduleInline,
  getNextMonday,
} from '@/components/employees/use-create-schedule-inline'
import type { CreateScheduleSimpleValues } from '@/components/employees/use-create-schedule-inline'
import type { EmployeeSchedule } from '@/types/schedule'

vi.mock('@/services/schedule-api', () => ({
  scheduleApi: {
    createPayload: vi.fn().mockResolvedValue({ data: { data: { id: 'sched-1' } } }),
    update: vi.fn().mockResolvedValue({ data: { data: { id: 'sched-1' } } }),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

function makeValues(overrides: Partial<CreateScheduleSimpleValues> = {}): CreateScheduleSimpleValues {
  return {
    effective_from: '2026-03-01',
    expected_start: '09:00',
    expected_lunch_start: '14:00',
    lunch_duration_minutes: '60',
    expected_end: '18:00',
    dow_1_off: false,
    dow_2_off: false,
    dow_3_off: false,
    dow_4_off: false,
    dow_5_off: false,
    dow_6_off: true,
    dow_7_off: true,
    ...overrides,
  }
}

// ── getNextMonday ─────────────────────────────────────────────────────────────

describe('getNextMonday', () => {
  it('returns today when today is Monday', () => {
    // Mock Monday (day 1)
    const mockMonday = new Date('2026-04-20T12:00:00') // April 20, 2026 is Monday
    vi.setSystemTime(mockMonday)
    expect(getNextMonday()).toBe('2026-04-20')
    vi.useRealTimers()
  })

  it('returns next Monday when today is Sunday', () => {
    const mockSunday = new Date('2026-04-19T12:00:00') // April 19, 2026 is Sunday
    vi.setSystemTime(mockSunday)
    expect(getNextMonday()).toBe('2026-04-20')
    vi.useRealTimers()
  })

  it('returns next Monday when today is Tuesday', () => {
    const mockTuesday = new Date('2026-04-21T12:00:00') // April 21, 2026 is Tuesday
    vi.setSystemTime(mockTuesday)
    expect(getNextMonday()).toBe('2026-04-27')
    vi.useRealTimers()
  })

  it('returns next Monday when today is Saturday', () => {
    const mockSaturday = new Date('2026-04-18T12:00:00') // April 18, 2026 is Saturday
    vi.setSystemTime(mockSaturday)
    expect(getNextMonday()).toBe('2026-04-20')
    vi.useRealTimers()
  })

  it('returns next Monday when today is Wednesday', () => {
    const mockWednesday = new Date('2026-04-22T12:00:00') // April 22, 2026 is Wednesday
    vi.setSystemTime(mockWednesday)
    expect(getNextMonday()).toBe('2026-04-27')
    vi.useRealTimers()
  })
})

// ── buildPayload ──────────────────────────────────────────────────────────────

describe('buildPayload', () => {
  it('maps effective_from and workday_type=FULL', () => {
    const result = buildPayload(makeValues())
    expect(result.effective_from).toBe('2026-03-01')
    expect(result.workday_type).toBe('FULL')
  })

  it('counts working days correctly (5 of 7)', () => {
    const result = buildPayload(makeValues())
    expect(result.working_days_per_week).toBe(5)
  })

  it('computes lunch_end from lunch_start + duration', () => {
    const result = buildPayload(makeValues())
    const monday = result.days.find((d) => d.day_of_week === 1)!
    expect(monday.expected_lunch_start).toBe('14:00')
    expect(monday.expected_lunch_end).toBe('15:00')
  })

  it('sets null times for day-off days', () => {
    const result = buildPayload(makeValues())
    const saturday = result.days.find((d) => d.day_of_week === 6)!
    expect(saturday.is_day_off).toBe(true)
    expect(saturday.expected_start).toBeNull()
    expect(saturday.expected_end).toBeNull()
    expect(saturday.expected_lunch_start).toBeNull()
  })

  it('sets lunch_end to null when no lunch_start', () => {
    const result = buildPayload(makeValues({ expected_lunch_start: '' }))
    const monday = result.days.find((d) => d.day_of_week === 1)!
    expect(monday.expected_lunch_end).toBeNull()
    expect(monday.lunch_duration_minutes).toBeNull()
  })

  it('sets lunch_end to null when no lunch_duration', () => {
    const result = buildPayload(makeValues({ lunch_duration_minutes: '' }))
    const monday = result.days.find((d) => d.day_of_week === 1)!
    expect(monday.lunch_duration_minutes).toBeNull()
    expect(monday.expected_lunch_end).toBeNull()
  })

  it('counts all 7 days when none are off', () => {
    const values = makeValues({ dow_6_off: false, dow_7_off: false })
    const result = buildPayload(values)
    expect(result.working_days_per_week).toBe(7)
  })
})

// ── useCreateScheduleInline hook ──────────────────────────────────────────────

const mockSchedule: EmployeeSchedule = {
  id: 'sched-123',
  employment_period_id: 'period-1',
  effective_from: '2026-01-01',
  effective_to: null,
  workday_type: 'FULL',
  working_days_per_week: 6,
  created_at: '2026-01-01T00:00:00+00:00',
  updated_at: '2026-01-01T00:00:00+00:00',
  days: [
    { day_of_week: 1, is_day_off: false, expected_start: '14:00', expected_end: '23:00', expected_lunch_start: '18:00', expected_lunch_end: '18:30', lunch_duration_minutes: 30 },
    { day_of_week: 2, is_day_off: false, expected_start: '14:00', expected_end: '23:00', expected_lunch_start: '18:00', expected_lunch_end: '18:30', lunch_duration_minutes: 30 },
    { day_of_week: 3, is_day_off: false, expected_start: '14:00', expected_end: '23:00', expected_lunch_start: '18:00', expected_lunch_end: '18:30', lunch_duration_minutes: 30 },
    { day_of_week: 4, is_day_off: false, expected_start: '14:00', expected_end: '23:00', expected_lunch_start: '18:00', expected_lunch_end: '18:30', lunch_duration_minutes: 30 },
    { day_of_week: 5, is_day_off: false, expected_start: '14:00', expected_end: '23:00', expected_lunch_start: '18:00', expected_lunch_end: '18:30', lunch_duration_minutes: 30 },
    { day_of_week: 6, is_day_off: false, expected_start: '14:00', expected_end: '23:00', expected_lunch_start: '18:00', expected_lunch_end: '18:30', lunch_duration_minutes: 30 },
    { day_of_week: 7, is_day_off: true, expected_start: null, expected_end: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
  ],
  active_overrides: [],
}

describe('useCreateScheduleInline', () => {
  it('initializes with correct defaults', () => {
    const { result } = renderHook(
      () => useCreateScheduleInline('emp-1', 'period-1', vi.fn()),
      { wrapper: createWrapper() }
    )
    expect(result.current.isPending).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.form).toBeDefined()
    expect(result.current.dowKeys).toHaveLength(7)
  })

  it('pre-fills form with values from currentSchedule', () => {
    const { result } = renderHook(
      () => useCreateScheduleInline('emp-1', 'period-1', vi.fn(), mockSchedule),
      { wrapper: createWrapper() }
    )
    // Should use next Monday as effective_from
    expect(result.current.form.getValues('effective_from')).toBe(getNextMonday())
    // Should use times from first working day
    expect(result.current.form.getValues('expected_start')).toBe('14:00')
    expect(result.current.form.getValues('expected_end')).toBe('23:00')
    expect(result.current.form.getValues('expected_lunch_start')).toBe('18:00')
    expect(result.current.form.getValues('lunch_duration_minutes')).toBe('30')
    // Should copy rest days from schedule
    expect(result.current.form.getValues('dow_7_off')).toBe(true) // Sunday off
    expect(result.current.form.getValues('dow_1_off')).toBe(false) // Monday working
  })

  it('uses default values when no currentSchedule', () => {
    const { result } = renderHook(
      () => useCreateScheduleInline('emp-1', 'period-1', vi.fn()),
      { wrapper: createWrapper() }
    )
    // Should default to next Monday
    expect(result.current.form.getValues('effective_from')).toBe(getNextMonday())
    // Default times
    expect(result.current.form.getValues('expected_start')).toBe('13:00')
    expect(result.current.form.getValues('expected_end')).toBe('22:00')
    // Default rest days (Sat & Sun)
    expect(result.current.form.getValues('dow_6_off')).toBe(true)
    expect(result.current.form.getValues('dow_7_off')).toBe(true)
  })

  it('exposes dowKeys, dayLabels, lunchOptions', () => {
    const { result } = renderHook(
      () => useCreateScheduleInline('emp-1', 'period-1', vi.fn()),
      { wrapper: createWrapper() }
    )
    expect(result.current.dowKeys).toContain('dow_1_off')
    expect(result.current.dayLabels[1]).toBe('Lunes')
    expect(result.current.lunchOptions.length).toBeGreaterThan(0)
  })

  it('mutationFn rejects when periodId is null', async () => {
    const { result } = renderHook(
      () => useCreateScheduleInline('emp-1', null, vi.fn()),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.form.setValue('effective_from', '2026-03-01')
      result.current.form.setValue('expected_start', '09:00')
      result.current.form.setValue('expected_end', '18:00')
    })

    await act(async () => {
      await result.current.onSubmit({ preventDefault: vi.fn() } as unknown as React.BaseSyntheticEvent)
      await new Promise((r) => setTimeout(r, 50))
    })

    // With null periodId the mutation should fail
    expect(result.current.isError).toBe(true)
  })

  it('submits successfully and calls onSuccess callback', async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(
      () => useCreateScheduleInline('emp-1', 'period-1', onSuccess),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.form.setValue('effective_from', '2026-03-01')
      result.current.form.setValue('expected_start', '09:00')
      result.current.form.setValue('expected_end', '18:00')
    })

    await act(async () => {
      await result.current.onSubmit({ preventDefault: vi.fn() } as unknown as React.BaseSyntheticEvent)
      await new Promise((r) => setTimeout(r, 50))
    })

    const { scheduleApi } = await import('@/services/schedule-api')
    expect(scheduleApi.createPayload).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })

  it('pre-fills defaults when schedule has no working days', () => {
    const allDaysOffSchedule: EmployeeSchedule = {
      ...mockSchedule,
      days: [
        { day_of_week: 1, is_day_off: true, expected_start: null, expected_end: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
        { day_of_week: 2, is_day_off: true, expected_start: null, expected_end: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
        { day_of_week: 3, is_day_off: true, expected_start: null, expected_end: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
        { day_of_week: 4, is_day_off: true, expected_start: null, expected_end: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
        { day_of_week: 5, is_day_off: true, expected_start: null, expected_end: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
        { day_of_week: 6, is_day_off: true, expected_start: null, expected_end: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
        { day_of_week: 7, is_day_off: true, expected_start: null, expected_end: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
      ],
    }
    const { result } = renderHook(
      () => useCreateScheduleInline('emp-1', 'period-1', vi.fn(), allDaysOffSchedule),
      { wrapper: createWrapper() }
    )
    // Should fall back to defaults since no working day
    expect(result.current.form.getValues('expected_start')).toBe('13:00')
    expect(result.current.form.getValues('expected_end')).toBe('22:00')
  })

  it('handles schedule with no lunch data', () => {
    const noLunchSchedule: EmployeeSchedule = {
      ...mockSchedule,
      days: [
        { day_of_week: 1, is_day_off: false, expected_start: '09:00', expected_end: '17:00', expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
        { day_of_week: 2, is_day_off: false, expected_start: '09:00', expected_end: '17:00', expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
        { day_of_week: 3, is_day_off: false, expected_start: '09:00', expected_end: '17:00', expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
        { day_of_week: 4, is_day_off: false, expected_start: '09:00', expected_end: '17:00', expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
        { day_of_week: 5, is_day_off: false, expected_start: '09:00', expected_end: '17:00', expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
        { day_of_week: 6, is_day_off: true, expected_start: null, expected_end: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
        { day_of_week: 7, is_day_off: true, expected_start: null, expected_end: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
      ],
    }
    const { result } = renderHook(
      () => useCreateScheduleInline('emp-1', 'period-1', vi.fn(), noLunchSchedule),
      { wrapper: createWrapper() }
    )
    expect(result.current.form.getValues('expected_start')).toBe('09:00')
    expect(result.current.form.getValues('expected_lunch_start')).toBe('')
    expect(result.current.form.getValues('lunch_duration_minutes')).toBe('')
  })

  it('handles schedule with missing day entries (uses defaults)', () => {
    const partialSchedule: EmployeeSchedule = {
      ...mockSchedule,
      days: [
        { day_of_week: 1, is_day_off: false, expected_start: '10:00', expected_end: '19:00', expected_lunch_start: '13:00', expected_lunch_end: '14:00', lunch_duration_minutes: 60 },
        { day_of_week: 7, is_day_off: true, expected_start: null, expected_end: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null },
      ],
    }
    const { result } = renderHook(
      () => useCreateScheduleInline('emp-1', 'period-1', vi.fn(), partialSchedule),
      { wrapper: createWrapper() }
    )
    // Should use times from day 1 (only working day)
    expect(result.current.form.getValues('expected_start')).toBe('10:00')
    // Missing days should default (dow_2_off through dow_6_off should be false by default)
    expect(result.current.form.getValues('dow_2_off')).toBe(false)
    expect(result.current.form.getValues('dow_6_off')).toBe(true) // defaults to true
  })

  it('uses periodStartDate for first-time schedule instead of getNextMonday', () => {
    const periodStart = '2025-05-01'
    const { result } = renderHook(
      () => useCreateScheduleInline('emp-1', 'period-1', vi.fn(), null, periodStart),
      { wrapper: createWrapper() }
    )
    expect(result.current.form.getValues('effective_from')).toBe(periodStart)
  })

  it('uses getNextMonday when periodStartDate is not provided for first-time schedule', () => {
    const { result } = renderHook(
      () => useCreateScheduleInline('emp-1', 'period-1', vi.fn(), null, undefined),
      { wrapper: createWrapper() }
    )
    // Should be a future Monday (format YYYY-MM-DD)
    const effectiveFrom = result.current.form.getValues('effective_from')
    expect(effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const effectiveDate = new Date(effectiveFrom + 'T00:00:00')
    expect(effectiveDate.getDay()).toBe(1) // Monday
  })

  // ── Edit mode ──────────────────────────────────────────────────────────────

  it('pre-fills effective_from with the schedule own date in edit mode (not next Monday)', () => {
    const { result } = renderHook(
      () => useCreateScheduleInline('emp-1', 'period-1', vi.fn(), mockSchedule, undefined, 'sched-123'),
      { wrapper: createWrapper() }
    )
    expect(result.current.form.getValues('effective_from')).toBe('2026-01-01')
    expect(result.current.mode).toBe('edit')
  })

  it('submits via scheduleApi.update when editScheduleId is provided', async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(
      () => useCreateScheduleInline('emp-1', 'period-1', onSuccess, mockSchedule, undefined, 'sched-123'),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      await result.current.onSubmit({ preventDefault: vi.fn() } as unknown as React.BaseSyntheticEvent)
      await new Promise((r) => setTimeout(r, 50))
    })

    const { scheduleApi } = await import('@/services/schedule-api')
    expect(scheduleApi.update).toHaveBeenCalledWith('sched-123', expect.objectContaining({ effective_from: '2026-01-01' }))
    expect(onSuccess).toHaveBeenCalled()
  })

  it('defaults to create mode when editScheduleId is not provided', () => {
    const { result } = renderHook(
      () => useCreateScheduleInline('emp-1', 'period-1', vi.fn()),
      { wrapper: createWrapper() }
    )
    expect(result.current.mode).toBe('create')
  })
})
