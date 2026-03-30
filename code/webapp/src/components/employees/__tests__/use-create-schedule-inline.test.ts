// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  buildPayload,
  useCreateScheduleInline,
} from '@/components/employees/-use-create-schedule-inline'
import type { CreateScheduleSimpleValues } from '@/components/employees/-use-create-schedule-inline'

vi.mock('@/services/schedule-api', () => ({
  scheduleApi: {
    createPayload: vi.fn().mockResolvedValue({ data: { data: { id: 'sched-1' } } }),
  },
}))

vi.mock('@/components/ui/toast-provider', () => ({
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

  it('uses initialEffectiveFrom when provided', () => {
    const { result } = renderHook(
      () => useCreateScheduleInline('emp-1', 'period-1', vi.fn(), '2026-03-15'),
      { wrapper: createWrapper() }
    )
    expect(result.current.form.getValues('effective_from')).toBe('2026-03-15')
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
})
