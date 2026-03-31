// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  addMinutesToTime,
  dayToEditValues,
  findNearestWorkingDay,
  useCreateDayOverride,
} from '@/components/employees/use-create-day-override'
import type { ScheduleDay } from '@/types/schedule'

// ── helpers ───────────────────────────────────────────────────────────────────

vi.mock('@/services/schedule-api', () => ({
  scheduleApi: {
    createDayOverride: vi.fn().mockResolvedValue({ data: { data: { id: 'override-1' } } }),
  },
}))

function makeDay(overrides: Partial<ScheduleDay> = {}): ScheduleDay {
  return {
    day_of_week: 1,
    is_day_off: false,
    expected_start: '08:00',
    expected_lunch_start: '13:00',
    expected_lunch_end: '14:00',
    lunch_duration_minutes: 60,
    expected_end: '17:00',
    ...overrides,
  }
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ── addMinutesToTime ──────────────────────────────────────────────────────────

describe('addMinutesToTime', () => {
  it('adds 30 minutes', () => {
    expect(addMinutesToTime('08:00', 30)).toBe('08:30')
  })

  it('wraps past midnight', () => {
    expect(addMinutesToTime('23:45', 30)).toBe('00:15')
  })
})

// ── dayToEditValues ───────────────────────────────────────────────────────────

describe('dayToEditValues', () => {
  it('maps a working day correctly', () => {
    const day = makeDay()
    const values = dayToEditValues(day)
    expect(values.is_day_off).toBe(false)
    expect(values.expected_start).toBe('08:00')
    expect(values.expected_end).toBe('17:00')
    expect(values.lunch_duration_minutes).toBe('60')
  })

  it('maps a day-off correctly', () => {
    const day = makeDay({ is_day_off: true, expected_start: null, expected_end: null, lunch_duration_minutes: null })
    const values = dayToEditValues(day)
    expect(values.is_day_off).toBe(true)
    expect(values.expected_start).toBe('')
    expect(values.expected_end).toBe('')
    expect(values.lunch_duration_minutes).toBe('')
  })

  it('converts null lunch_duration_minutes to empty string', () => {
    const day = makeDay({ lunch_duration_minutes: null })
    const values = dayToEditValues(day)
    expect(values.lunch_duration_minutes).toBe('')
  })

  it('converts null time fields to empty strings', () => {
    const day = makeDay({ expected_start: null, expected_lunch_start: null, expected_end: null })
    const values = dayToEditValues(day)
    expect(values.expected_start).toBe('')
    expect(values.expected_lunch_start).toBe('')
    expect(values.expected_end).toBe('')
  })
})

// ── findNearestWorkingDay ─────────────────────────────────────────────────────

describe('findNearestWorkingDay', () => {
  it('returns null when there are no working days', () => {
    const allDays = [makeDay({ is_day_off: true })]
    expect(findNearestWorkingDay(1, allDays)).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(findNearestWorkingDay(3, [])).toBeNull()
  })

  it('returns the nearest previous working day', () => {
    // Saturday (dow=6) override — nearest previous working day is Friday (5)
    const allDays = [
      makeDay({ day_of_week: 5, is_day_off: false }),
      makeDay({ day_of_week: 6, is_day_off: true }),
    ]
    const result = findNearestWorkingDay(6, allDays)
    expect(result?.day_of_week).toBe(5)
  })

  it('wraps around when needed (Sunday looks back to Saturday)', () => {
    // Sunday (dow=7), only Saturday (dow=6) is working
    const allDays = [
      makeDay({ day_of_week: 6, is_day_off: false }),
    ]
    const result = findNearestWorkingDay(7, allDays)
    expect(result?.day_of_week).toBe(6)
  })

  it('skips days with missing start or end times', () => {
    const allDays = [
      makeDay({ day_of_week: 4, is_day_off: false, expected_start: null }),
      makeDay({ day_of_week: 3, is_day_off: false }),
    ]
    const result = findNearestWorkingDay(5, allDays)
    expect(result?.day_of_week).toBe(3)
  })
})

// ── useCreateDayOverride hook ─────────────────────────────────────────────────

describe('useCreateDayOverride', () => {
  it('starts with editingDow null and scopeOpen false', () => {
    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )
    expect(result.current.editingDow).toBeNull()
    expect(result.current.scopeOpen).toBe(false)
    expect(result.current.editValues).toBeNull()
  })

  it('startEdit sets editingDow and editValues', () => {
    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.startEdit(makeDay({ day_of_week: 3 }))
    })

    expect(result.current.editingDow).toBe(3)
    expect(result.current.editValues).not.toBeNull()
    expect(result.current.editValues?.expected_start).toBe('08:00')
  })

  it('cancelEdit resets editingDow', () => {
    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.startEdit(makeDay({ day_of_week: 2 }))
    })
    act(() => {
      result.current.cancelEdit()
    })

    expect(result.current.editingDow).toBeNull()
    expect(result.current.editValues).toBeNull()
  })

  it('openScopeDialog sets scopeOpen to true', () => {
    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.openScopeDialog()
    })

    expect(result.current.scopeOpen).toBe(true)
  })

  it('closeScopeDialog sets scopeOpen to false', () => {
    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.openScopeDialog()
    })
    act(() => {
      result.current.closeScopeDialog()
    })

    expect(result.current.scopeOpen).toBe(false)
  })

  it('updateEditField updates a specific field', () => {
    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.startEdit(makeDay({ day_of_week: 1 }))
    })
    act(() => {
      result.current.updateEditField('expected_start', '09:00')
    })

    expect(result.current.editValues?.expected_start).toBe('09:00')
  })

  it('toggleDayOff(true) clears time fields', () => {
    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.startEdit(makeDay({ day_of_week: 1 }))
    })
    act(() => {
      result.current.toggleDayOff(true)
    })

    expect(result.current.editValues?.is_day_off).toBe(true)
    expect(result.current.editValues?.expected_start).toBe('')
    expect(result.current.editValues?.expected_end).toBe('')
  })

  it('toggleDayOff(false) does not clear time fields', () => {
    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.startEdit(makeDay({ day_of_week: 1, is_day_off: true, expected_start: null, expected_end: null }))
    })
    act(() => {
      result.current.updateEditField('expected_start', '09:00')
      result.current.updateEditField('expected_end', '17:00')
    })
    act(() => {
      result.current.toggleDayOff(false)
    })

    expect(result.current.editValues?.is_day_off).toBe(false)
  })

  it('hasEditErrors is true when working day has no expected_start', () => {
    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.startEdit(makeDay({ day_of_week: 1, expected_start: null }))
    })

    expect(result.current.hasEditErrors).toBe(true)
    expect(result.current.editErrors.expected_start).toBe('Requerido')
  })

  it('hasEditErrors is false for a day-off', () => {
    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.startEdit(makeDay({ day_of_week: 6, is_day_off: true, expected_start: null, expected_end: null }))
    })

    expect(result.current.hasEditErrors).toBe(false)
  })

  it('startEdit with prefillValues skips template logic', () => {
    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )

    const prefill = {
      is_day_off: false,
      expected_start: '10:00',
      expected_lunch_start: '',
      lunch_duration_minutes: '',
      expected_end: '18:00',
    }

    act(() => {
      result.current.startEdit(makeDay({ day_of_week: 1 }), [], prefill)
    })

    expect(result.current.editValues?.expected_start).toBe('10:00')
    expect(result.current.editValues?.expected_end).toBe('18:00')
  })

  it('startEdit with day-off and template fills from nearest working day', () => {
    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )

    const allDays = [
      makeDay({ day_of_week: 5, is_day_off: false, expected_start: '09:00', expected_end: '18:00', lunch_duration_minutes: 30 }),
    ]

    act(() => {
      result.current.startEdit(
        makeDay({ day_of_week: 6, is_day_off: true, expected_start: null, expected_end: null }),
        allDays
      )
    })

    // Should pre-fill from day 5 (Friday) template
    expect(result.current.editValues?.expected_start).toBe('09:00')
    expect(result.current.editValues?.expected_end).toBe('18:00')
    expect(result.current.editValues?.is_day_off).toBe(false)
  })

  it('submit rejects when periodId is null', async () => {
    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', null),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.startEdit(makeDay({ day_of_week: 1 }))
    })

    await act(async () => {
      result.current.submit({
        scope: 'single_date',
        effectiveFrom: '2026-03-19',
        effectiveTo: '2026-03-19',
        note: '',
      })
      await new Promise((r) => setTimeout(r, 50))
    })

    // mutation should have errored (missing periodId)
    expect(result.current.isError).toBe(true)
  })

  it('submit executes mutationFn and onSuccess closes dialog', async () => {
    const { scheduleApi } = await import('@/services/schedule-api')
    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.startEdit(makeDay({ day_of_week: 3 }))
    })

    await act(async () => {
      result.current.submit({
        scope: 'single_date',
        effectiveFrom: '2026-03-19',
        effectiveTo: '2026-03-19',
        note: 'Test',
      })
      // wait for mutation to settle
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(scheduleApi.createDayOverride).toHaveBeenCalledWith(
      'period-1',
      expect.objectContaining({ day_of_week: 3, effective_from: '2026-03-19' })
    )
    expect(result.current.scopeOpen).toBe(false)
    expect(result.current.editingDow).toBeNull()
  })

  it('submit with range scope passes effectiveTo', async () => {
    const { scheduleApi } = await import('@/services/schedule-api')
    vi.mocked(scheduleApi.createDayOverride).mockClear()

    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.startEdit(makeDay({ day_of_week: 1 }))
    })

    await act(async () => {
      result.current.submit({
        scope: 'range',
        effectiveFrom: '2026-03-01',
        effectiveTo: '2026-03-31',
        note: '',
      })
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(scheduleApi.createDayOverride).toHaveBeenCalledWith(
      'period-1',
      expect.objectContaining({ effective_to: '2026-03-31' })
    )
  })

  it('submit with indefinite scope passes null effectiveTo', async () => {
    const { scheduleApi } = await import('@/services/schedule-api')
    vi.mocked(scheduleApi.createDayOverride).mockClear()

    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.startEdit(makeDay({ day_of_week: 2 }))
    })

    await act(async () => {
      result.current.submit({
        scope: 'indefinite',
        effectiveFrom: '2026-03-01',
        effectiveTo: null,
        note: '',
      })
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(scheduleApi.createDayOverride).toHaveBeenCalledWith(
      'period-1',
      expect.objectContaining({ effective_to: null })
    )
  })

  it('submit with day-off override sends null times', async () => {
    const { scheduleApi } = await import('@/services/schedule-api')
    vi.mocked(scheduleApi.createDayOverride).mockClear()

    const { result } = renderHook(
      () => useCreateDayOverride('emp-1', 'period-1'),
      { wrapper: createWrapper() }
    )

    act(() => {
      result.current.startEdit(makeDay({ day_of_week: 7, is_day_off: true, expected_start: null, expected_end: null }))
    })

    await act(async () => {
      result.current.submit({
        scope: 'single_date',
        effectiveFrom: '2026-03-23',
        effectiveTo: '2026-03-23',
        note: '',
      })
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(scheduleApi.createDayOverride).toHaveBeenCalledWith(
      'period-1',
      expect.objectContaining({ is_day_off: true, expected_start: null, expected_end: null })
    )
  })
})
