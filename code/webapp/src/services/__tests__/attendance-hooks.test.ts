// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDailyAttendance, useTodayAttendance, useCheckIn, useLunchStart, useLunchReturn } from '@/services/attendance-hooks'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-provider', () => ({
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

const mockTodayResponse = {
  data: {
    data: [
      {
        employee: { id: 'emp-001', first_name: 'Carlos', last_name: 'Mendoza', code: 'EMP-001' },
        attendance: null,
        schedule_day: null,
      },
      {
        employee: { id: 'emp-002', first_name: 'María', last_name: 'García', code: 'EMP-002' },
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
})
