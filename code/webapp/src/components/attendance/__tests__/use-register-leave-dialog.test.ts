// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRegisterLeaveDialog } from '../use-register-leave-dialog'
import type { TodayAttendanceEmployee } from '@/types/attendance'
import type { LeaveType } from '@/types/leave'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/leave-api', () => ({
  leaveApi: {
    listLeaveTypes: vi.fn(),
    registerDirectLeave: vi.fn(),
    registerLeaveRequest: vi.fn(),
  },
}))

vi.mock('@/lib/datetime', () => ({
  todayDateCdmx: () => '2026-04-09',
  currentTimeLabel: () => '10:00',
}))

import { leaveApi } from '@/services/leave-api'

// ── Test data ──────────────────────────────────────────────────────────────────

const mockEmployee: TodayAttendanceEmployee = {
  id: '01HZTEST00000001',
  code: 'EMP-001',
  first_name: 'Carlos',
  last_name: 'Mendoza',
  roles: [],
  daily_wage: null,
}

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
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// useRegisterLeaveDialog
// ══════════════════════════════════════════════════════════════════════════════

describe('useRegisterLeaveDialog', () => {
  beforeEach(() => {
    vi.mocked(leaveApi.listLeaveTypes).mockResolvedValue({
      data: { status: 200, data: mockLeaveTypes },
    } as never)
    vi.mocked(leaveApi.registerDirectLeave).mockResolvedValue({
      data: { status: 201, data: {} },
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('loads leave types on mount', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        useRegisterLeaveDialog({
          employee: mockEmployee,
          onSuccess: vi.fn(),
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoadingTypes).toBe(false)
      expect(result.current.leaveTypes).toHaveLength(2)
    })
  })

  it('isProportionalHours is false when FIXED_PERCENTAGE type is selected', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        useRegisterLeaveDialog({
          employee: mockEmployee,
          onSuccess: vi.fn(),
        }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isLoadingTypes).toBe(false))

    act(() => {
      result.current.form.setValue('leave_type_id', 1) // MEDICAL — FIXED_PERCENTAGE
    })

    expect(result.current.isProportionalHours).toBe(false)
    expect(result.current.isScheduled).toBe(false)
  })

  it('isProportionalHours is true when PROPORTIONAL_HOURS type is selected', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        useRegisterLeaveDialog({
          employee: mockEmployee,
          onSuccess: vi.fn(),
        }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isLoadingTypes).toBe(false))

    act(() => {
      result.current.form.setValue('leave_type_id', 4) // PERMISSION_HOURS
    })

    expect(result.current.isProportionalHours).toBe(true)
  })

  it('isScheduled is true when time_mode is SCHEDULED', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        useRegisterLeaveDialog({
          employee: mockEmployee,
          onSuccess: vi.fn(),
        }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isLoadingTypes).toBe(false))

    act(() => {
      result.current.form.setValue('leave_type_id', 4)
      result.current.form.setValue('time_mode', 'SCHEDULED')
    })

    expect(result.current.isScheduled).toBe(true)
  })

  it('clears time fields when leave type changes to FIXED_PERCENTAGE', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        useRegisterLeaveDialog({
          employee: mockEmployee,
          onSuccess: vi.fn(),
        }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isLoadingTypes).toBe(false))

    // Set proportional hours type + time fields
    act(() => {
      result.current.form.setValue('leave_type_id', 4)
      result.current.form.setValue('time_mode', 'SCHEDULED')
      result.current.form.setValue('scheduled_start_time', '10:00')
      result.current.form.setValue('scheduled_end_time', '12:00')
    })

    // Switch to FIXED_PERCENTAGE type
    act(() => {
      result.current.form.setValue('leave_type_id', 1)
    })

    await waitFor(() => {
      expect(result.current.form.getValues('time_mode')).toBeNull()
      expect(result.current.form.getValues('scheduled_start_time')).toBeNull()
      expect(result.current.form.getValues('scheduled_end_time')).toBeNull()
    })
  })

  it('submits correctly for FIXED_PERCENTAGE leave', async () => {
    const onSuccess = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useRegisterLeaveDialog({ employee: mockEmployee, onSuccess }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isLoadingTypes).toBe(false))

    act(() => {
      result.current.form.setValue('leave_type_id', 1)
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    await waitFor(() => {
      expect(leaveApi.registerDirectLeave).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: '01HZTEST00000001',
          leave_type_id: 1,
          start_date: '2026-04-09',
          end_date: '2026-04-09',
        })
      )
    })
  })

  it('does not submit when employee is null', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        useRegisterLeaveDialog({
          employee: null,
          onSuccess: vi.fn(),
        }),
      { wrapper }
    )

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(leaveApi.registerDirectLeave).not.toHaveBeenCalled()
  })

  it('does not call API when PROPORTIONAL_HOURS type selected without time_mode', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        useRegisterLeaveDialog({
          employee: mockEmployee,
          onSuccess: vi.fn(),
        }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoadingTypes).toBe(false)
      expect(result.current.leaveTypes).toHaveLength(2)
    })

    act(() => {
      result.current.form.setValue('leave_type_id', 4) // PERMISSION_HOURS
    })

    // Confirm hook reflects the proportional-hours mode
    await waitFor(() => expect(result.current.isProportionalHours).toBe(true))

    await act(async () => {
      await result.current.handleSubmit()
    })

    // The API must NOT be called — time_mode is missing
    expect(leaveApi.registerDirectLeave).not.toHaveBeenCalled()
  })

  it('handleClose resets the form', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () =>
        useRegisterLeaveDialog({
          employee: mockEmployee,
          onSuccess: vi.fn(),
        }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isLoadingTypes).toBe(false))

    act(() => {
      result.current.form.setValue('leave_type_id', 1)
      result.current.form.setValue('notes', 'Some note')
    })

    act(() => {
      result.current.handleClose()
    })

    expect(result.current.form.getValues('leave_type_id')).toBe(0)
    expect(result.current.form.getValues('notes')).toBeNull()
  })

  it('submits via registerLeaveRequest when mode is request', async () => {
    vi.mocked(leaveApi.registerLeaveRequest).mockResolvedValue({
      data: { status: 201, data: {} },
    } as never)

    const onSuccess = vi.fn()
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useRegisterLeaveDialog({ employee: mockEmployee, onSuccess, mode: 'request' }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isLoadingTypes).toBe(false))

    act(() => {
      result.current.form.setValue('leave_type_id', 1)
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    await waitFor(() => {
      expect(leaveApi.registerLeaveRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: '01HZTEST00000001',
          leave_type_id: 1,
          start_date: '2026-04-09',
          end_date: '2026-04-09',
        })
      )
    })

    expect(leaveApi.registerDirectLeave).not.toHaveBeenCalled()
  })

  it('sets error when SCHEDULED mode has no scheduled_end_time', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useRegisterLeaveDialog({ employee: mockEmployee, onSuccess: vi.fn() }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isLoadingTypes).toBe(false))

    act(() => {
      result.current.form.setValue('leave_type_id', 4) // PROPORTIONAL_HOURS
      result.current.form.setValue('time_mode', 'SCHEDULED')
      result.current.form.setValue('scheduled_start_time', '10:00')
      result.current.form.setValue('scheduled_end_time', null)
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(leaveApi.registerDirectLeave).not.toHaveBeenCalled()
  })

  it('sets error when pay_percentage is invalid', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useRegisterLeaveDialog({ employee: mockEmployee, onSuccess: vi.fn() }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isLoadingTypes).toBe(false))

    act(() => {
      result.current.form.setValue('leave_type_id', 1)
      result.current.form.setValue('pay_percentage', 'abc')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    // The API must NOT be called — pay_percentage is invalid
    expect(leaveApi.registerDirectLeave).not.toHaveBeenCalled()
  })

  it('sets error when PROPORTIONAL_HOURS has no scheduled_start_time', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(
      () => useRegisterLeaveDialog({ employee: mockEmployee, onSuccess: vi.fn() }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isLoadingTypes).toBe(false))

    act(() => {
      result.current.form.setValue('leave_type_id', 4) // PROPORTIONAL_HOURS
      result.current.form.setValue('time_mode', 'OPEN_ENDED')
      result.current.form.setValue('scheduled_start_time', null)
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    // The API must NOT be called — scheduled_start_time is missing
    expect(leaveApi.registerDirectLeave).not.toHaveBeenCalled()
  })
})
