// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useScheduleSection } from '@/components/employees/use-schedule-section'

vi.mock('@/services/schedule-api', () => ({
  scheduleApi: {
    getCurrent: vi.fn().mockResolvedValue({
      data: {
        data: {
          id: 'sched-1',
          employment_period_id: 'period-1',
          effective_from: '2026-01-01',
          effective_to: null,
          workday_type: 'FULL',
          working_days_per_week: 5,
          days: [],
          active_overrides: [],
          created_at: '2026-01-01T00:00:00+00:00',
          updated_at: '2026-01-01T00:00:00+00:00',
        },
      },
    }),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useScheduleSection', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with isOpen=false and view=schedule', () => {
    const { result } = renderHook(
      () => useScheduleSection('emp-1'),
      { wrapper: createWrapper() }
    )
    expect(result.current.isOpen).toBe(false)
    expect(result.current.view).toBe('schedule')
    expect(result.current.isTransitioning).toBe(false)
  })

  it('open() sets isOpen=true and view=schedule', () => {
    const { result } = renderHook(
      () => useScheduleSection('emp-1'),
      { wrapper: createWrapper() }
    )
    act(() => { result.current.open() })
    expect(result.current.isOpen).toBe(true)
    expect(result.current.view).toBe('schedule')
  })

  it('openToCreate() sets isOpen=true and view=create', () => {
    const { result } = renderHook(
      () => useScheduleSection('emp-1'),
      { wrapper: createWrapper() }
    )
    act(() => { result.current.openToCreate() })
    expect(result.current.isOpen).toBe(true)
    expect(result.current.view).toBe('create')
  })

  it('close() sets isOpen=false and resets view=schedule', () => {
    const { result } = renderHook(
      () => useScheduleSection('emp-1'),
      { wrapper: createWrapper() }
    )
    act(() => { result.current.openToCreate() })
    act(() => { result.current.close() })
    expect(result.current.isOpen).toBe(false)
    expect(result.current.view).toBe('schedule')
  })

  it('showCreate() transitions to create view after timeout', () => {
    vi.useFakeTimers()
    const { result } = renderHook(
      () => useScheduleSection('emp-1'),
      { wrapper: createWrapper() }
    )
    act(() => { result.current.showCreate() })
    expect(result.current.isTransitioning).toBe(true)

    act(() => { vi.runAllTimers() })
    expect(result.current.view).toBe('create')
    expect(result.current.isTransitioning).toBe(false)
  })

  it('showSchedule() transitions to schedule view after timeout', () => {
    vi.useFakeTimers()
    const { result } = renderHook(
      () => useScheduleSection('emp-1'),
      { wrapper: createWrapper() }
    )
    act(() => { result.current.openToCreate() })
    act(() => { result.current.showSchedule() })
    expect(result.current.isTransitioning).toBe(true)

    act(() => { vi.runAllTimers() })
    expect(result.current.view).toBe('schedule')
    expect(result.current.isTransitioning).toBe(false)
  })

  it('onScheduleCreated() transitions to schedule view', () => {
    vi.useFakeTimers()
    const { result } = renderHook(
      () => useScheduleSection('emp-1'),
      { wrapper: createWrapper() }
    )
    act(() => { result.current.showCreate() })
    act(() => { vi.runAllTimers() })
    act(() => { result.current.onScheduleCreated() })
    act(() => { vi.runAllTimers() })
    expect(result.current.view).toBe('schedule')
  })

  it('hasSchedule is true after successful schedule fetch', async () => {
    const { result } = renderHook(
      () => useScheduleSection('emp-1'),
      { wrapper: createWrapper() }
    )
    await waitFor(() => expect(result.current.hasSchedule).toBe(true))
    expect(result.current.schedule).not.toBeNull()
    expect(result.current.periodId).toBe('period-1')
  })

  it('hasSchedule is false when API returns 404', async () => {
    const { scheduleApi } = await import('@/services/schedule-api')
    vi.mocked(scheduleApi.getCurrent).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 404,
        data: { meta: { employment_period_id: 'period-2' } },
      },
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useScheduleSection('emp-2'), { wrapper })
    await waitFor(() => expect(result.current.hasSchedule).toBe(false))
    expect(result.current.schedule).toBeNull()
    expect(result.current.periodId).toBe('period-2')
  })

  it('isError is true when API throws non-404 error', async () => {
    const { scheduleApi } = await import('@/services/schedule-api')
    vi.mocked(scheduleApi.getCurrent).mockRejectedValueOnce(new Error('Network error'))

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useScheduleSection('emp-3'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
