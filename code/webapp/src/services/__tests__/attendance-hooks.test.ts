// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDailyAttendance, useTodayAttendance, useCheckIn, useLunchStart, useLunchReturn } from '@/services/attendance-hooks'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/services/attendance-api', () => ({
  attendanceApi: {
    daily: vi.fn(),
    checkIn: vi.fn(),
    lunchStart: vi.fn(),
    lunchReturn: vi.fn(),
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

const mockTodayResponse = {
  data: {
    data: [
      {
        employee: { id: 'emp-001', code: 'EMP-001', user: { first_name: 'Carlos', last_name: 'Mendoza' } },
        attendance: null,
        schedule_day: null,
      },
      {
        employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'María', last_name: 'García' } },
        attendance: { id: 'att-001', check_in: '2026-04-01T13:00:00Z' },
        schedule_day: null,
      },
    ],
  },
}

const mockAttendanceRecord = {
  data: {
    status: 200,
    data: {
      id: 'att-123',
      employee_id: 'emp-001',
      date: '2026-04-01',
      check_in: '2026-04-01T13:00:00-06:00',
    },
  },
}

// ── useDailyAttendance ─────────────────────────────────────────────────────────

describe('useDailyAttendance', () => {
  beforeEach(() => {
    vi.mocked(attendanceApi.daily).mockResolvedValue(mockTodayResponse as never)
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns undefined data when branchId is null (query disabled)', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDailyAttendance(null), { wrapper })

    expect(result.current.data).toBeUndefined()
    expect(attendanceApi.daily).not.toHaveBeenCalled()
  })

  it('fetches attendance data when branchId is provided', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDailyAttendance(5), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(attendanceApi.daily).toHaveBeenCalledWith(5, undefined)
    expect(result.current.data).toEqual(mockTodayResponse.data.data)
  })

  it('is disabled when branchId is null', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useDailyAttendance(null), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
  })

  it('passes date param when provided', async () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useDailyAttendance(10, '2026-06-23'), { wrapper })

    await waitFor(() => expect(attendanceApi.daily).toHaveBeenCalledWith(10, '2026-06-23'))
  })

  it('useTodayAttendance alias still works', async () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useTodayAttendance(5), { wrapper })

    await waitFor(() => expect(attendanceApi.daily).toHaveBeenCalled())
  })
})

// ── useCheckIn ─────────────────────────────────────────────────────────────────

describe('useCheckIn', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls attendanceApi.checkIn with correct data', async () => {
    vi.mocked(attendanceApi.checkIn).mockResolvedValueOnce(mockAttendanceRecord as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCheckIn(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        employee_id: 'emp-001',
        check_in: '2026-04-01T13:00:00-06:00',
      })
    })

    expect(attendanceApi.checkIn).toHaveBeenCalledWith({
      employee_id: 'emp-001',
      check_in: '2026-04-01T13:00:00-06:00',
    })
  })

  it('shows success toast on successful check-in', async () => {
    vi.mocked(attendanceApi.checkIn).mockResolvedValueOnce(mockAttendanceRecord as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCheckIn(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        employee_id: 'emp-001',
        check_in: '2026-04-01T13:00:00-06:00',
      })
    })

    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Entrada registrada correctamente.',
      'Check-in'
    )
  })

  it('shows error toast on failure', async () => {
    vi.mocked(attendanceApi.checkIn).mockRejectedValueOnce(new Error('Network error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCheckIn(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({
          employee_id: 'emp-001',
          check_in: '2026-04-01T13:00:00-06:00',
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
    vi.mocked(attendanceApi.checkIn).mockResolvedValueOnce(mockAttendanceRecord as never)
    const { wrapper, queryClient } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCheckIn(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        employee_id: 'emp-001',
        check_in: '2026-04-01T13:00:00-06:00',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendances', 'daily'] })
  })

  it('splices the confirmed attendance record into the cached row immediately, without waiting for a refetch', async () => {
    vi.mocked(attendanceApi.checkIn).mockResolvedValueOnce(mockAttendanceRecord as never)
    const { wrapper, queryClient } = makeLiveWrapper()
    const queryKey = ['attendances', 'daily', '2026-04-01', 5]
    queryClient.setQueryData(queryKey, [
      { employee: { id: 'emp-001', code: 'EMP-001', user: { first_name: 'Carlos', last_name: 'Mendoza' }, roles: [], daily_wage: null }, attendance: null, schedule: null, today_leave: null, today_vacation: false },
      { employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'María', last_name: 'García' }, roles: [], daily_wage: null }, attendance: null, schedule: null, today_leave: null, today_vacation: false },
    ])

    const { result } = renderHook(() => useCheckIn(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        employee_id: 'emp-001',
        check_in: '2026-04-01T13:00:00-06:00',
      })
    })

    const rows = queryClient.getQueryData<{ employee: { id: string }; attendance: { id: string; check_in: string | null } | null }[]>(queryKey)
    expect(rows?.find((r) => r.employee.id === 'emp-001')?.attendance).toEqual(
      expect.objectContaining({ id: 'att-123', check_in: '2026-04-01T13:00:00-06:00' })
    )
    // Unrelated row untouched
    expect(rows?.find((r) => r.employee.id === 'emp-002')?.attendance).toBeNull()
  })

  it('does not splice the confirmed record into a cached list for a different date', async () => {
    vi.mocked(attendanceApi.checkIn).mockResolvedValueOnce(mockAttendanceRecord as never)
    const { wrapper, queryClient } = makeLiveWrapper()
    const otherDayKey = ['attendances', 'daily', '2026-04-02', 5]
    queryClient.setQueryData(otherDayKey, [
      { employee: { id: 'emp-001', code: 'EMP-001', user: { first_name: 'Carlos', last_name: 'Mendoza' }, roles: [], daily_wage: null }, attendance: null, schedule: null, today_leave: null, today_vacation: false },
    ])

    const { result } = renderHook(() => useCheckIn(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        employee_id: 'emp-001',
        check_in: '2026-04-01T13:00:00-06:00',
      })
    })

    const rows = queryClient.getQueryData<{ employee: { id: string }; attendance: { id: string; check_in: string | null } | null }[]>(otherDayKey)
    // A record confirmed for 2026-04-01 must never overwrite the row cached under 2026-04-02.
    expect(rows?.find((r) => r.employee.id === 'emp-001')?.attendance).toBeNull()
  })
})

// ── useLunchStart ──────────────────────────────────────────────────────────────

describe('useLunchStart', () => {
  const mockLunchResponse = {
    data: {
      status: 200,
      data: {
        id: 'att-123',
        lunch_start: '2026-04-01T14:00:00-06:00',
      },
    },
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls attendanceApi.lunchStart with correct data', async () => {
    vi.mocked(attendanceApi.lunchStart).mockResolvedValueOnce(mockLunchResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLunchStart(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-123',
        lunch_start: '2026-04-01T14:00:00-06:00',
      })
    })

    expect(attendanceApi.lunchStart).toHaveBeenCalledWith('att-123', {
      lunch_start: '2026-04-01T14:00:00-06:00',
    })
  })

  it('shows success toast on successful lunch-start', async () => {
    vi.mocked(attendanceApi.lunchStart).mockResolvedValueOnce(mockLunchResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLunchStart(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-123',
        lunch_start: '2026-04-01T14:00:00-06:00',
      })
    })

    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Salida a comida registrada correctamente.',
      'Lunch Start'
    )
  })

  it('shows error toast on failure', async () => {
    vi.mocked(attendanceApi.lunchStart).mockRejectedValueOnce(new Error('Network error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLunchStart(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({
          attendance_id: 'att-123',
          lunch_start: '2026-04-01T14:00:00-06:00',
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
    vi.mocked(attendanceApi.lunchStart).mockResolvedValueOnce(mockLunchResponse as never)
    const { wrapper, queryClient } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useLunchStart(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-123',
        lunch_start: '2026-04-01T14:00:00-06:00',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendances', 'daily'] })
  })

  it('passes attendance_id and lunch_start separately', async () => {
    vi.mocked(attendanceApi.lunchStart).mockResolvedValueOnce(mockLunchResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLunchStart(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'different-id',
        lunch_start: '2026-04-01T15:30:00-06:00',
      })
    })

    expect(attendanceApi.lunchStart).toHaveBeenCalledWith('different-id', {
      lunch_start: '2026-04-01T15:30:00-06:00',
    })
  })

  it('splices the confirmed attendance record into the cached row, matched by employee_id (not the attendance_id the request was keyed by)', async () => {
    vi.mocked(attendanceApi.lunchStart).mockResolvedValueOnce({
      data: { status: 200, data: { id: 'att-123', employee_id: 'emp-002', date: '2026-04-01', lunch_start: '2026-04-01T14:00:00-06:00' } },
    } as never)
    const { wrapper, queryClient } = makeLiveWrapper()
    const queryKey = ['attendances', 'daily', '2026-04-01', 5]
    queryClient.setQueryData(queryKey, [
      { employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'María', last_name: 'García' }, roles: [], daily_wage: null }, attendance: { id: 'att-123', check_in: '2026-04-01T13:00:00-06:00', lunch_start: null }, schedule: null, today_leave: null, today_vacation: false },
    ])

    const { result } = renderHook(() => useLunchStart(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-123',
        lunch_start: '2026-04-01T14:00:00-06:00',
      })
    })

    const rows = queryClient.getQueryData<{ employee: { id: string }; attendance: { lunch_start: string | null } | null }[]>(queryKey)
    expect(rows?.[0]?.attendance?.lunch_start).toBe('2026-04-01T14:00:00-06:00')
  })
})

// ── useLunchReturn ─────────────────────────────────────────────────────────────

describe('useLunchReturn', () => {
  const mockLunchReturnResponse = {
    data: {
      status: 200,
      data: {
        id: 'att-123',
        lunch_end: '2026-04-01T15:00:00-06:00',
      },
    },
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls attendanceApi.lunchReturn with correct data', async () => {
    vi.mocked(attendanceApi.lunchReturn).mockResolvedValueOnce(mockLunchReturnResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLunchReturn(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-123',
        lunch_end: '2026-04-01T15:00:00-06:00',
      })
    })

    expect(attendanceApi.lunchReturn).toHaveBeenCalledWith('att-123', {
      lunch_end: '2026-04-01T15:00:00-06:00',
    })
  })

  it('shows success toast on successful lunch-return', async () => {
    vi.mocked(attendanceApi.lunchReturn).mockResolvedValueOnce(mockLunchReturnResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLunchReturn(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-123',
        lunch_end: '2026-04-01T15:00:00-06:00',
      })
    })

    expect(mockShowSuccess).toHaveBeenCalledWith(
      'Regreso de comida registrado correctamente.',
      'Lunch Return'
    )
  })

  it('shows error toast on failure', async () => {
    vi.mocked(attendanceApi.lunchReturn).mockRejectedValueOnce(new Error('Network error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLunchReturn(), { wrapper })

    await act(async () => {
      try {
        await result.current.mutateAsync({
          attendance_id: 'att-123',
          lunch_end: '2026-04-01T15:00:00-06:00',
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
    vi.mocked(attendanceApi.lunchReturn).mockResolvedValueOnce(mockLunchReturnResponse as never)
    const { wrapper, queryClient } = makeWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useLunchReturn(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-123',
        lunch_end: '2026-04-01T15:00:00-06:00',
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['attendances', 'daily'] })
  })

  it('passes attendance_id and lunch_end separately', async () => {
    vi.mocked(attendanceApi.lunchReturn).mockResolvedValueOnce(mockLunchReturnResponse as never)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLunchReturn(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'different-id',
        lunch_end: '2026-04-01T16:30:00-06:00',
      })
    })

    expect(attendanceApi.lunchReturn).toHaveBeenCalledWith('different-id', {
      lunch_end: '2026-04-01T16:30:00-06:00',
    })
  })

  it('splices the confirmed attendance record into the cached row', async () => {
    vi.mocked(attendanceApi.lunchReturn).mockResolvedValueOnce({
      data: { status: 200, data: { id: 'att-123', employee_id: 'emp-001', date: '2026-04-01', lunch_end: '2026-04-01T15:00:00-06:00' } },
    } as never)
    const { wrapper, queryClient } = makeLiveWrapper()
    const queryKey = ['attendances', 'daily', '2026-04-01', 5]
    queryClient.setQueryData(queryKey, [
      { employee: { id: 'emp-001', code: 'EMP-001', user: { first_name: 'Carlos', last_name: 'Mendoza' }, roles: [], daily_wage: null }, attendance: { id: 'att-123', lunch_start: '2026-04-01T14:00:00-06:00', lunch_end: null }, schedule: null, today_leave: null, today_vacation: false },
    ])

    const { result } = renderHook(() => useLunchReturn(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        attendance_id: 'att-123',
        lunch_end: '2026-04-01T15:00:00-06:00',
      })
    })

    const rows = queryClient.getQueryData<{ employee: { id: string }; attendance: { lunch_end: string | null } | null }[]>(queryKey)
    expect(rows?.[0]?.attendance?.lunch_end).toBe('2026-04-01T15:00:00-06:00')
  })
})
