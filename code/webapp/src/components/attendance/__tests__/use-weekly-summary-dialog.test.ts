// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/services/report.service', () => ({
  useWeeklySummary: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
}))

vi.mock('@/services/employee-hooks', () => ({
  useEmployee: vi.fn(() => ({ data: undefined })),
}))

import { useEmployee } from '@/services/employee-hooks'
import { useWeeklySummaryDialog } from '../use-weekly-summary-dialog'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { wrapper }
}

describe('useWeeklySummaryDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Wednesday within the week 2026-06-15 – 2026-06-21, kept consistent with
    // the fixed dates used throughout this file
    vi.setSystemTime(new Date('2026-06-17T12:00:00'))
    // Reset to "no hire-date restriction" — individual tests override as needed
    vi.mocked(useEmployee).mockReturnValue({ data: undefined } as never)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('starts closed with pre-filled current-week dates', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useWeeklySummaryDialog(), { wrapper })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.periodStart).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.current.periodEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('opens with the given employee and resets to the current week', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useWeeklySummaryDialog(), { wrapper })

    act(() => {
      result.current.open('emp-ulid-001', 'Mendoza, Carlos')
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.employeePublicId).toBe('emp-ulid-001')
    expect(result.current.employeeName).toBe('Mendoza, Carlos')
    expect(result.current.isCurrentWeek).toBe(true)
  })

  it('shifts both period bounds back 7 days on prevWeek', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useWeeklySummaryDialog(), { wrapper })

    act(() => {
      result.current.open('emp-ulid-001', 'Mendoza, Carlos')
    })
    const { periodStart: startBefore, periodEnd: endBefore } = result.current

    act(() => {
      result.current.prevWeek()
    })

    expect(result.current.periodStart).not.toBe(startBefore)
    expect(result.current.periodEnd).not.toBe(endBefore)
    const startDiff = new Date(startBefore).getTime() - new Date(result.current.periodStart).getTime()
    const endDiff = new Date(endBefore).getTime() - new Date(result.current.periodEnd).getTime()
    expect(startDiff).toBe(7 * 24 * 60 * 60 * 1000)
    expect(endDiff).toBe(7 * 24 * 60 * 60 * 1000)
    expect(result.current.isCurrentWeek).toBe(false)
  })

  it('shifts both period bounds forward 7 days on nextWeek, after moving back', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useWeeklySummaryDialog(), { wrapper })

    act(() => {
      result.current.open('emp-ulid-001', 'Mendoza, Carlos')
      result.current.prevWeek()
    })
    const { periodStart: startBefore, periodEnd: endBefore } = result.current

    act(() => {
      result.current.nextWeek()
    })

    const startDiff = new Date(result.current.periodStart).getTime() - new Date(startBefore).getTime()
    const endDiff = new Date(result.current.periodEnd).getTime() - new Date(endBefore).getTime()
    expect(startDiff).toBe(7 * 24 * 60 * 60 * 1000)
    expect(endDiff).toBe(7 * 24 * 60 * 60 * 1000)
    expect(result.current.isCurrentWeek).toBe(true)
  })

  it('nextWeek is a no-op once the current week is reached (no future weeks)', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useWeeklySummaryDialog(), { wrapper })

    act(() => {
      result.current.open('emp-ulid-001', 'Mendoza, Carlos')
    })
    expect(result.current.isCurrentWeek).toBe(true)
    const { periodStart, periodEnd } = result.current

    act(() => {
      result.current.nextWeek()
    })

    expect(result.current.periodStart).toBe(periodStart)
    expect(result.current.periodEnd).toBe(periodEnd)
  })

  it('jumps to the week containing an arbitrary date', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useWeeklySummaryDialog(), { wrapper })

    act(() => {
      result.current.open('emp-ulid-001', 'Mendoza, Carlos')
      result.current.prevWeek() // move away first, so the jump below is observable
      result.current.jumpToDate('2026-06-17') // Wednesday, current week
    })

    expect(result.current.periodStart).toBe('2026-06-15')
    expect(result.current.periodEnd).toBe('2026-06-21')
  })

  it('jumpToDate ignores dates whose week is in the future', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useWeeklySummaryDialog(), { wrapper })

    act(() => {
      result.current.open('emp-ulid-001', 'Mendoza, Carlos')
    })
    const { periodStart, periodEnd } = result.current

    act(() => {
      result.current.jumpToDate('2026-07-01') // a future week relative to mocked "now"
    })

    expect(result.current.periodStart).toBe(periodStart)
    expect(result.current.periodEnd).toBe(periodEnd)
  })

  it('exposes isEarliestWeek and blocks navigation before the employee hire date', () => {
    vi.mocked(useEmployee).mockReturnValue({
      data: {
        user: { first_name: 'Carlos', last_name: 'Mendoza' },
        employment_periods: [
          { id: 'p1', branch_id: 1, branch_name: 'Main', start_date: '2026-06-08', end_date: null, termination_reason: null, is_active: true },
        ],
      },
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useWeeklySummaryDialog(), { wrapper })

    act(() => {
      result.current.open('emp-ulid-001', 'Mendoza, Carlos')
    })

    expect(result.current.earliestWeekStart).toBe('2026-06-08')
    expect(result.current.isEarliestWeek).toBe(false) // current week (06-15) is after hire week

    act(() => {
      result.current.jumpToDate('2026-06-08') // move to the hire week
    })
    expect(result.current.isEarliestWeek).toBe(true)
    const { periodStart, periodEnd } = result.current

    // Cannot go further back than the hire week
    act(() => {
      result.current.prevWeek()
    })
    expect(result.current.periodStart).toBe(periodStart)
    expect(result.current.periodEnd).toBe(periodEnd)

    // Cannot jump to a date before the hire date either
    act(() => {
      result.current.jumpToDate('2026-05-01')
    })
    expect(result.current.periodStart).toBe(periodStart)
  })

  it('uses the earliest of multiple employment periods as the hire date', () => {
    vi.mocked(useEmployee).mockReturnValue({
      data: {
        user: { first_name: 'Carlos', last_name: 'Mendoza' },
        employment_periods: [
          { id: 'p2', branch_id: 1, branch_name: 'Main', start_date: '2026-05-04', end_date: '2026-05-18', termination_reason: 'resignation', is_active: false },
          { id: 'p1', branch_id: 1, branch_name: 'Main', start_date: '2026-06-08', end_date: null, termination_reason: null, is_active: true },
        ],
      },
    } as never)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useWeeklySummaryDialog(), { wrapper })

    act(() => {
      result.current.open('emp-ulid-001', 'Mendoza, Carlos')
    })

    expect(result.current.earliestWeekStart).toBe('2026-05-04')
  })

  it('goToCurrentWeek restores the current week after navigating away', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useWeeklySummaryDialog(), { wrapper })

    act(() => {
      result.current.open('emp-ulid-001', 'Mendoza, Carlos')
    })
    const currentStart = result.current.periodStart

    act(() => {
      result.current.jumpToDate('2020-01-01')
    })
    expect(result.current.isCurrentWeek).toBe(false)

    act(() => {
      result.current.goToCurrentWeek()
    })

    expect(result.current.periodStart).toBe(currentStart)
    expect(result.current.isCurrentWeek).toBe(true)
  })

  it('closes when close() is called', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useWeeklySummaryDialog(), { wrapper })

    act(() => {
      result.current.open('emp-ulid-001', 'Mendoza, Carlos')
    })
    act(() => {
      result.current.close()
    })

    expect(result.current.isOpen).toBe(false)
  })
})
