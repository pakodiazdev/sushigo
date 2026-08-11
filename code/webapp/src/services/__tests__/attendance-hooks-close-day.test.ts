// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCheckOut, useCloseDay } from '@/services/attendance-hooks'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/attendance-api', () => ({
  attendanceApi: {
    today: vi.fn(),
    checkIn: vi.fn(),
    lunchStart: vi.fn(),
    lunchReturn: vi.fn(),
    checkOut: vi.fn(),
    closeDay: vi.fn(),
  },
}))

import { attendanceApi } from '@/services/attendance-api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

/**
 * Same as makeWrapper(), but with the library's default (non-zero) gcTime —
 * for tests that seed cache data directly via setQueryData() with no active
 * useQuery observer keeping it alive. makeWrapper()'s gcTime: 0 schedules
 * that unobserved data for garbage collection almost immediately, which
 * would make it disappear before the test can assert on it.
 */
function makeLiveWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { queryClient, wrapper }
}

// ── useCheckOut ────────────────────────────────────────────────────────────────

describe('useCheckOut', () => {
  const mockCheckOutResponse = {
    data: {
      status: 200,
      data: {
        id: 'att-123',
        employee_id: 'emp-001',
        date: '2026-04-01',
        check_out: '2026-04-01T22:00:00-06:00',
        net_worked_minutes: 420,
        overtime_minutes: 0,
      },
    },
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls attendanceApi.checkOut with correct params', async () => {
    vi.mocked(attendanceApi.checkOut).mockResolvedValueOnce(mockCheckOutResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCheckOut(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-123',
        check_out: '2026-04-01T22:00:00-06:00',
      })
    })

    expect(attendanceApi.checkOut).toHaveBeenCalledWith('att-123', {
      check_out: '2026-04-01T22:00:00-06:00',
    })
  })

  it('shows success toast on successful check-out', async () => {
    vi.mocked(attendanceApi.checkOut).mockResolvedValueOnce(mockCheckOutResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCheckOut(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-123',
        check_out: '2026-04-01T22:00:00-06:00',
      })
    })

    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Salida registrada correctamente.',
      'Check-out'
    )
  })

  it('shows error toast on failure', async () => {
    vi.mocked(attendanceApi.checkOut).mockRejectedValueOnce(new Error('Network error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCheckOut(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({
          attendance_id: 'att-123',
          check_out: '2026-04-01T22:00:00-06:00',
        })
      } catch {
        /* expected */
      }
    })

    expect(mockShowError).toHaveBeenCalledWith(
      expect.any(String),
      'Error al registrar'
    )
  })

  it('invalidates today attendance queries on success', async () => {
    vi.mocked(attendanceApi.checkOut).mockResolvedValueOnce(mockCheckOutResponse as never)
    const { wrapper, queryClient } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCheckOut(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-123',
        check_out: '2026-04-01T22:00:00-06:00',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendances', 'daily'] })
  })

  it('splices the confirmed attendance record into the cached row', async () => {
    vi.mocked(attendanceApi.checkOut).mockResolvedValueOnce(mockCheckOutResponse as never)
    const { wrapper, queryClient } = makeLiveWrapper()
    const queryKey = ['attendances', 'daily', '2026-04-01', 5]
    queryClient.setQueryData(queryKey, [
      { employee: { id: 'emp-001', code: 'EMP-001', user: { first_name: 'Carlos', last_name: 'Mendoza' }, roles: [], daily_wage: null }, attendance: { id: 'att-123', check_in: '2026-04-01T13:00:00-06:00', check_out: null }, schedule: null, today_leave: null, today_vacation: false },
    ])

    const { result } = renderHook(() => useCheckOut(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-123',
        check_out: '2026-04-01T22:00:00-06:00',
      })
    })

    const rows = queryClient.getQueryData<{ employee: { id: string }; attendance: { check_out: string | null } | null }[]>(queryKey)
    expect(rows?.[0]?.attendance?.check_out).toBe('2026-04-01T22:00:00-06:00')
  })
})

// ── useCloseDay ────────────────────────────────────────────────────────────────

describe('useCloseDay', () => {
  const mockCloseDayResponse = {
    data: {
      status: 200,
      data: {
        lunch_returns: 2,
        check_outs: 5,
        absences: 1,
      },
    },
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls attendanceApi.closeDay with correct data', async () => {
    vi.mocked(attendanceApi.closeDay).mockResolvedValueOnce(mockCloseDayResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCloseDay(), { wrapper })

    const request = {
      branch_id: 1,
      close_time: '22:00',
      lunch_returns: [
        { attendance_id: 'att-001', lunch_end: '15:00' },
      ],
    }

    await act(async () => {
      await result.current.mutateAsync(request)
    })

    expect(attendanceApi.closeDay).toHaveBeenCalledWith(request)
  })

  it('shows success toast with counts on success', async () => {
    vi.mocked(attendanceApi.closeDay).mockResolvedValueOnce(mockCloseDayResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCloseDay(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        branch_id: 1,
        close_time: '22:00',
      })
    })

    expect(mockShowSuccess).toHaveBeenCalledWith(
      '2 regresos, 5 salidas, 1 faltas',
      'Día cerrado'
    )
  })

  it('shows leaves and day_offs in success toast when non-zero', async () => {
    vi.mocked(attendanceApi.closeDay).mockResolvedValueOnce({
      data: { status: 200, data: { lunch_returns: 0, check_outs: 0, absences: 0, leaves: 2, day_offs: 1, overtime_pending: [] } },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCloseDay(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ branch_id: 1, close_time: '22:00' })
    })

    expect(mockShowSuccess).toHaveBeenCalledWith('2 permisos, 1 descansos', 'Día cerrado')
  })

  it('shows success toast without parts when zero changes', async () => {
    vi.mocked(attendanceApi.closeDay).mockResolvedValueOnce({
      data: { status: 200, data: { lunch_returns: 0, check_outs: 0, absences: 0 } },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCloseDay(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ branch_id: 1, close_time: '22:00' })
    })

    expect(mockShowSuccess).toHaveBeenCalledWith('Sin cambios', 'Día cerrado')
  })

  it('shows only non-zero counts in success message', async () => {
    vi.mocked(attendanceApi.closeDay).mockResolvedValueOnce({
      data: { status: 200, data: { lunch_returns: 0, check_outs: 3, absences: 0 } },
    } as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCloseDay(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ branch_id: 1, close_time: '22:00' })
    })

    expect(mockShowSuccess).toHaveBeenCalledWith('3 salidas', 'Día cerrado')
  })

  it('shows error toast on failure', async () => {
    vi.mocked(attendanceApi.closeDay).mockRejectedValueOnce(new Error('Server error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCloseDay(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({ branch_id: 1, close_time: '22:00' })
      } catch {
        /* expected */
      }
    })

    expect(mockShowError).toHaveBeenCalledWith(
      expect.any(String),
      'Error al cerrar'
    )
  })

  it('invalidates today attendance queries on success', async () => {
    vi.mocked(attendanceApi.closeDay).mockResolvedValueOnce(mockCloseDayResponse as never)
    const { wrapper, queryClient } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCloseDay(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ branch_id: 1, close_time: '22:00' })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendances', 'daily'] })
  })

  it('sends request without lunch_returns when none provided', async () => {
    vi.mocked(attendanceApi.closeDay).mockResolvedValueOnce(mockCloseDayResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCloseDay(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ branch_id: 1, close_time: '17:00' })
    })

    expect(attendanceApi.closeDay).toHaveBeenCalledWith({
      branch_id: 1,
      close_time: '17:00',
    })
  })
})
