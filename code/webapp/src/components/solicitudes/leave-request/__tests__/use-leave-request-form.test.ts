// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLeaveRequestForm } from '../use-leave-request-form'
import type { LeaveType } from '@/types/leave'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockMutate = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}))

const mockLeaveTypesQuery = vi.fn()

vi.mock('@/services/leave-hooks', () => ({
  useLeaveTypes: () => mockLeaveTypesQuery(),
}))

vi.mock('@/services/employee-request-hooks', () => ({
  useRequestLeave: () => ({ mutate: mockMutate, isPending: false }),
}))

vi.mock('@/lib/datetime', () => ({
  todayDateCdmx: () => '2026-04-09',
}))

// ── Test data ──────────────────────────────────────────────────────────────────

const mockLeaveTypes: LeaveType[] = [
  {
    id: 1,
    code: 'MEDICAL',
    name: 'Incapacidad médica',
    calculation_mode: 'FIXED_PERCENTAGE',
    default_pay_percentage: 0,
    default_rest_day_factor: 'NONE',
    counts_for_bonus: false,
  },
  {
    id: 4,
    code: 'PERMISSION_HOURS',
    name: 'Permiso por horas',
    calculation_mode: 'PROPORTIONAL_HOURS',
    default_pay_percentage: 0,
    default_rest_day_factor: 'PROPORTIONAL',
    counts_for_bonus: false,
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useLeaveRequestForm', () => {
  beforeEach(() => {
    mockLeaveTypesQuery.mockReturnValue({ data: mockLeaveTypes, isLoading: false })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('defaults dates to an empty selection', () => {
    const { result } = renderHook(() => useLeaveRequestForm('emp-1', vi.fn()), { wrapper: makeWrapper() })
    expect(result.current.form.getValues('dates')).toEqual([])
  })

  it('submits a full-day leave request with type=LEAVE and auto_approve=false', async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useLeaveRequestForm('emp-1', onSuccess), { wrapper: makeWrapper() })

    act(() => {
      result.current.form.setValue('leave_type_id', 1)
      result.current.form.setValue('dates', ['2026-05-01', '2026-05-03'])
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    await waitFor(() => expect(mockMutate).toHaveBeenCalledOnce())

    const [payload, options] = mockMutate.mock.calls[0] as [Record<string, unknown>, { onSuccess: () => void }]
    expect(payload).toMatchObject({
      employee_id: 'emp-1',
      type: 'LEAVE',
      auto_approve: false,
      payload: {
        leave_type_id: 1,
        dates: ['2026-05-01', '2026-05-03'],
      },
    })

    options.onSuccess()
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('isProportionalHours is true for PROPORTIONAL_HOURS types', () => {
    const { result } = renderHook(() => useLeaveRequestForm('emp-1', vi.fn()), { wrapper: makeWrapper() })

    act(() => result.current.form.setValue('leave_type_id', 4))

    expect(result.current.isProportionalHours).toBe(true)
  })

  it('collapses to a single date for PROPORTIONAL_HOURS types', async () => {
    const { result } = renderHook(() => useLeaveRequestForm('emp-1', vi.fn()), { wrapper: makeWrapper() })

    act(() => {
      result.current.form.setValue('dates', ['2026-05-10', '2026-05-12'])
      result.current.form.setValue('leave_type_id', 4)
    })

    await waitFor(() => expect(result.current.form.getValues('dates')).toEqual(['2026-05-10']))
  })

  it('does not submit when PROPORTIONAL_HOURS type has no time_mode', async () => {
    const { result } = renderHook(() => useLeaveRequestForm('emp-1', vi.fn()), { wrapper: makeWrapper() })

    act(() => {
      result.current.form.setValue('leave_type_id', 4)
    })

    await waitFor(() => expect(result.current.isProportionalHours).toBe(true))

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('does not submit when SCHEDULED mode has no scheduled_end_time', async () => {
    const { result } = renderHook(() => useLeaveRequestForm('emp-1', vi.fn()), { wrapper: makeWrapper() })

    act(() => {
      result.current.form.setValue('leave_type_id', 4)
      result.current.form.setValue('time_mode', 'SCHEDULED')
      result.current.form.setValue('scheduled_start_time', '14:00')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('submits SCHEDULED payload with time fields', async () => {
    const { result } = renderHook(() => useLeaveRequestForm('emp-1', vi.fn()), { wrapper: makeWrapper() })

    act(() => {
      result.current.form.setValue('dates', ['2026-05-01'])
      result.current.form.setValue('leave_type_id', 4)
      result.current.form.setValue('time_mode', 'SCHEDULED')
      result.current.form.setValue('scheduled_start_time', '14:00')
      result.current.form.setValue('scheduled_end_time', '16:00')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    await waitFor(() => expect(mockMutate).toHaveBeenCalledOnce())

    const [payload] = mockMutate.mock.calls[0] as [Record<string, unknown>]
    expect(payload).toMatchObject({
      payload: {
        time_mode: 'SCHEDULED',
        scheduled_start_time: '14:00',
        scheduled_end_time: '16:00',
      },
    })
  })

  it('sends pay_percentage 0 when "request_paid" is unchecked — the manager still decides at approval time', async () => {
    const { result } = renderHook(() => useLeaveRequestForm('emp-1', vi.fn()), { wrapper: makeWrapper() })

    act(() => {
      result.current.form.setValue('leave_type_id', 1)
      result.current.form.setValue('dates', ['2026-05-01'])
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    await waitFor(() => expect(mockMutate).toHaveBeenCalledOnce())

    const [payload] = mockMutate.mock.calls[0] as [{ payload: Record<string, unknown> }]
    expect(payload.payload).toMatchObject({ pay_percentage: 0 })
  })

  it('sends pay_percentage 100 when "request_paid" is checked', async () => {
    const { result } = renderHook(() => useLeaveRequestForm('emp-1', vi.fn()), { wrapper: makeWrapper() })

    act(() => {
      result.current.form.setValue('leave_type_id', 1)
      result.current.form.setValue('dates', ['2026-05-01'])
      result.current.form.setValue('request_paid', true)
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    await waitFor(() => expect(mockMutate).toHaveBeenCalledOnce())

    const [payload] = mockMutate.mock.calls[0] as [{ payload: Record<string, unknown> }]
    expect(payload.payload).toMatchObject({ pay_percentage: 100 })
  })
})
