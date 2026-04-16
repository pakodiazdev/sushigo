// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useTodayAttendancePage,
  computeSummary,
  currentTimeLabel,
  timeToIso,
  todayCdmxDate,
} from '@/pages/attendance/-use-today-attendance-page'
import type { TodayAttendanceRow } from '@/types/attendance'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-provider', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn((selector: (state: unknown) => unknown) =>
    selector({ currentBranch: { id: 1, name: 'Main Branch' } })
  ),
}))

vi.mock('@/services/attendance-api', () => ({
  attendanceApi: {
    today: vi.fn(),
    checkIn: vi.fn(),
    lunchStart: vi.fn(),
    lunchReturn: vi.fn(),
    checkOut: vi.fn(),
    overtimeDecision: vi.fn().mockResolvedValue({ data: { status: 200, data: {} } }),
    closeDay: vi.fn(),
    markDayStatus: vi.fn(),
  },
}))

import { attendanceApi } from '@/services/attendance-api'
import { useAuthStore } from '@/stores/auth.store'

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

/** Creates a test employee with all required fields */
function makeEmployee(overrides: Partial<{ id: string; code: string; first_name: string; last_name: string; roles: string[] }> = {}) {
  return {
    id: 'emp-001',
    code: 'EMP-001',
    first_name: 'Test',
    last_name: 'User',
    roles: [] as string[],
    ...overrides,
  }
}

/** Sample attendance rows for testing */
function makeRow(overrides: Partial<TodayAttendanceRow> = {}): TodayAttendanceRow {
  return {
    employee: {
      id: 'emp-001',
      code: 'EMP-001',
      first_name: 'Carlos',
      last_name: 'Mendoza',
      roles: [],
    },
    attendance: null,
    schedule: null,
    today_leave: null,
    ...overrides,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// computeSummary
// ══════════════════════════════════════════════════════════════════════════════

describe('computeSummary', () => {
  it('returns all zeros for empty array', () => {
    const result = computeSummary([])
    expect(result).toEqual({
      total: 0,
      pending: 0,
      checkedIn: 0,
      done: 0,
      withOvertime: 0,
    })
  })

  it('counts pending employees (no attendance)', () => {
    const rows = [makeRow(), makeRow({ employee: { id: 'emp-002', code: 'EMP-002', first_name: 'María', last_name: 'García', roles: [] } })]
    const result = computeSummary(rows)
    expect(result.pending).toBe(2)
    expect(result.checkedIn).toBe(0)
    expect(result.done).toBe(0)
  })

  it('counts checked-in employees (has check_in, no check_out)', () => {
    const rows = [
      makeRow({
        attendance: { id: 'att-1', check_in: '2026-04-01T13:00:00Z' } as TodayAttendanceRow['attendance'],
      }),
    ]
    const result = computeSummary(rows)
    expect(result.checkedIn).toBe(1)
    expect(result.pending).toBe(0)
    expect(result.done).toBe(0)
  })

  it('counts done employees (has check_out)', () => {
    const rows = [
      makeRow({
        attendance: {
          id: 'att-1',
          check_in: '2026-04-01T13:00:00Z',
          check_out: '2026-04-01T22:00:00Z',
        } as TodayAttendanceRow['attendance'],
      }),
    ]
    const result = computeSummary(rows)
    expect(result.done).toBe(1)
    expect(result.checkedIn).toBe(0)
    expect(result.pending).toBe(0)
  })

  it('counts employees with overtime', () => {
    const rows = [
      makeRow({
        attendance: {
          id: 'att-1',
          check_in: '2026-04-01T13:00:00Z',
          overtime_minutes: 30,
        } as TodayAttendanceRow['attendance'],
      }),
      makeRow({
        employee: { id: 'emp-002', code: 'EMP-002', first_name: 'Ana', last_name: 'López', roles: [] },
        attendance: {
          id: 'att-2',
          check_in: '2026-04-01T13:00:00Z',
          overtime_minutes: 0,
        } as TodayAttendanceRow['attendance'],
      }),
    ]
    const result = computeSummary(rows)
    expect(result.withOvertime).toBe(1)
  })

  it('counts at-lunch as checkedIn', () => {
    const rows = [
      makeRow({
        attendance: {
          id: 'att-1',
          check_in: '2026-04-01T13:00:00Z',
          lunch_start: '2026-04-01T14:00:00Z',
        } as TodayAttendanceRow['attendance'],
      }),
    ]
    const result = computeSummary(rows)
    expect(result.checkedIn).toBe(1)
  })

  it('counts returned as checkedIn', () => {
    const rows = [
      makeRow({
        attendance: {
          id: 'att-1',
          check_in: '2026-04-01T13:00:00Z',
          lunch_start: '2026-04-01T14:00:00Z',
          lunch_end: '2026-04-01T15:00:00Z',
        } as TodayAttendanceRow['attendance'],
      }),
    ]
    const result = computeSummary(rows)
    expect(result.checkedIn).toBe(1)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// currentTimeLabel
// ══════════════════════════════════════════════════════════════════════════════

describe('currentTimeLabel', () => {
  it('returns current time in HH:mm format', () => {
    const label = currentTimeLabel()
    expect(label).toMatch(/^\d{2}:\d{2}$/)
  })

  it('returns time in CDMX timezone (UTC-6)', () => {
    vi.useFakeTimers()
    // Set system time to 20:30 UTC = 14:30 CDMX (UTC-6)
    vi.setSystemTime(new Date('2026-04-01T20:30:00Z'))

    const label = currentTimeLabel()
    expect(label).toBe('14:30')

    vi.useRealTimers()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// timeToIso
// ══════════════════════════════════════════════════════════════════════════════

describe('timeToIso', () => {
  it('throws TypeError for invalid time format (no colon)', () => {
    expect(() => timeToIso('1430')).toThrow(TypeError)
  })

  it('throws TypeError for undefined/empty value', () => {
    expect(() => timeToIso('')).toThrow(TypeError)
  })

  it('throws TypeError for invalid time with NaN values', () => {
    expect(() => timeToIso('ab:cd')).toThrow(TypeError)
  })

  it('returns ISO 8601 string with CDMX offset (-06:00)', () => {
    vi.useFakeTimers()
    // Set system time to any UTC time - timeToIso uses today's date in CDMX
    vi.setSystemTime(new Date('2026-04-01T18:00:00Z'))

    const iso = timeToIso('14:30')
    // Should always have CDMX offset (-06:00)
    expect(iso).toBe('2026-04-01T14:30:00-06:00')

    vi.useRealTimers()
  })

  it('always uses -06:00 CDMX offset regardless of system timezone', () => {
    const iso = timeToIso('14:30')
    // Should always end with -06:00 (CDMX standard time)
    expect(iso).toMatch(/-06:00$/)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// todayCdmxDate
// ══════════════════════════════════════════════════════════════════════════════

describe('todayCdmxDate', () => {
  it('returns a YYYY-MM-DD formatted date string', () => {
    const result = todayCdmxDate()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns the CDMX date (UTC-6) when system time is set', () => {
    vi.useFakeTimers()
    // UTC 2026-04-12T04:00:00Z = CDMX (UTC-6) 2026-04-11T22:00:00
    vi.setSystemTime(new Date('2026-04-12T04:00:00Z'))

    expect(todayCdmxDate()).toBe('2026-04-11')

    vi.useRealTimers()
  })

  it('returns the next day in UTC when CDMX is still the same day', () => {
    vi.useFakeTimers()
    // UTC 2026-04-12T07:00:00Z = CDMX (UTC-6) 2026-04-12T01:00:00
    vi.setSystemTime(new Date('2026-04-12T07:00:00Z'))

    expect(todayCdmxDate()).toBe('2026-04-12')

    vi.useRealTimers()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// useTodayAttendancePage
// ══════════════════════════════════════════════════════════════════════════════

describe('useTodayAttendancePage', () => {
  const mockTodayResponse = {
    data: {
      data: [makeRow()],
    },
  }

  beforeEach(() => {
    vi.mocked(attendanceApi.today).mockResolvedValue(mockTodayResponse as never)
    vi.mocked(attendanceApi.checkIn).mockResolvedValue({ data: { status: 200, data: {} } } as never)
    vi.mocked(attendanceApi.lunchStart).mockResolvedValue({ data: { status: 200, data: {} } } as never)
    vi.mocked(attendanceApi.lunchReturn).mockResolvedValue({ data: { status: 200, data: {} } } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns initial state correctly', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

    expect(result.current.branchName).toBe('Main Branch')
    expect(result.current.hasBranch).toBe(true)
    expect(result.current.pendingCheckInEmployee).toBeNull()
    expect(result.current.pendingLunchStart).toBeNull()
    expect(result.current.pendingLunchReturn).toBeNull()
  })

  it('fetches attendance data on mount', async () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useTodayAttendancePage(), { wrapper })

    await waitFor(() => {
      expect(attendanceApi.today).toHaveBeenCalledWith(1)
    })
  })

  // ── Check-in flow tests ──────────────────────────────────────────────────────

  describe('check-in flow', () => {
    it('openCheckIn sets pending employee', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const employee = makeEmployee()

      act(() => {
        result.current.openCheckIn(employee)
      })

      expect(result.current.pendingCheckInEmployee).toEqual(employee)
    })

    it('closeCheckIn clears pending employee', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const employee = makeEmployee()

      act(() => {
        result.current.openCheckIn(employee)
      })

      act(() => {
        result.current.closeCheckIn()
      })

      expect(result.current.pendingCheckInEmployee).toBeNull()
    })

    it('confirmCheckIn does nothing if no pending employee', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.confirmCheckIn('14:00')
      })

      expect(attendanceApi.checkIn).not.toHaveBeenCalled()
    })

    it('confirmCheckIn calls API with correct data', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const employee = makeEmployee()

      act(() => {
        result.current.openCheckIn(employee)
      })

      await act(async () => {
        result.current.confirmCheckIn('14:00')
      })

      await waitFor(() => {
        expect(attendanceApi.checkIn).toHaveBeenCalledWith(
          expect.objectContaining({
            employee_id: 'emp-001',
            check_in: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T14:00:00[+-]\d{2}:\d{2}$/),
          })
        )
      })
    })

    it('confirmCheckIn clears pending employee after success', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const employee = makeEmployee()

      act(() => {
        result.current.openCheckIn(employee)
      })

      await act(async () => {
        result.current.confirmCheckIn('14:00')
      })

      await waitFor(() => {
        expect(result.current.pendingCheckInEmployee).toBeNull()
      })
    })
  })

  // ── Lunch-start flow tests ───────────────────────────────────────────────────

  describe('lunch-start flow', () => {
    it('openLunchStart sets pending data', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const employee = makeEmployee()

      act(() => {
        result.current.openLunchStart(employee, 'att-123')
      })

      expect(result.current.pendingLunchStart).toEqual({
        employee,
        attendanceId: 'att-123',
      })
    })

    it('closeLunchStart clears pending data', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const employee = makeEmployee()

      act(() => {
        result.current.openLunchStart(employee, 'att-123')
      })

      act(() => {
        result.current.closeLunchStart()
      })

      expect(result.current.pendingLunchStart).toBeNull()
    })

    it('confirmLunchStart does nothing if no pending data', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.confirmLunchStart('14:00')
      })

      expect(attendanceApi.lunchStart).not.toHaveBeenCalled()
    })

    it('confirmLunchStart calls API with correct data', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const employee = makeEmployee()

      act(() => {
        result.current.openLunchStart(employee, 'att-123')
      })

      await act(async () => {
        result.current.confirmLunchStart('14:00')
      })

      await waitFor(() => {
        expect(attendanceApi.lunchStart).toHaveBeenCalledWith(
          'att-123',
          expect.objectContaining({
            lunch_start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T14:00:00[+-]\d{2}:\d{2}$/),
          })
        )
      })
    })

    it('confirmLunchStart clears pending data after success', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const employee = makeEmployee()

      act(() => {
        result.current.openLunchStart(employee, 'att-123')
      })

      await act(async () => {
        result.current.confirmLunchStart('14:00')
      })

      await waitFor(() => {
        expect(result.current.pendingLunchStart).toBeNull()
      })
    })
  })

  // ── Lunch-return flow tests ──────────────────────────────────────────────────

  describe('lunch-return flow', () => {
    it('openLunchReturn sets pending data', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const employee = makeEmployee()

      act(() => {
        result.current.openLunchReturn(employee, 'att-456')
      })

      expect(result.current.pendingLunchReturn).toEqual({
        employee,
        attendanceId: 'att-456',
      })
    })

    it('closeLunchReturn clears pending data', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const employee = makeEmployee()

      act(() => {
        result.current.openLunchReturn(employee, 'att-456')
      })

      act(() => {
        result.current.closeLunchReturn()
      })

      expect(result.current.pendingLunchReturn).toBeNull()
    })

    it('confirmLunchReturn does nothing if no pending data', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.confirmLunchReturn('15:00')
      })

      expect(attendanceApi.lunchReturn).not.toHaveBeenCalled()
    })

    it('confirmLunchReturn calls API with correct data', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const employee = makeEmployee()

      act(() => {
        result.current.openLunchReturn(employee, 'att-456')
      })

      await act(async () => {
        result.current.confirmLunchReturn('15:00')
      })

      await waitFor(() => {
        expect(attendanceApi.lunchReturn).toHaveBeenCalledWith(
          'att-456',
          expect.objectContaining({
            lunch_end: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T15:00:00[+-]\d{2}:\d{2}$/),
          })
        )
      })
    })

    it('confirmLunchReturn clears pending data after success', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const employee = makeEmployee()

      act(() => {
        result.current.openLunchReturn(employee, 'att-456')
      })

      await act(async () => {
        result.current.confirmLunchReturn('15:00')
      })

      await waitFor(() => {
        expect(result.current.pendingLunchReturn).toBeNull()
      })
    })
  })

  // ── Summary and phase tests ──────────────────────────────────────────────────

  describe('summary and phase', () => {
    it('computes summary from rows', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.summary).toEqual({
        total: 1,
        pending: 1,
        checkedIn: 0,
        done: 0,
        withOvertime: 0,
      })
    })

    it('getPhase returns correct phase for row', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const pendingRow = makeRow()
      expect(result.current.getPhase(pendingRow)).toBe('pending')

      const checkedInRow = makeRow({
        attendance: { id: 'att-1', check_in: '2026-04-01T13:00:00Z' } as TodayAttendanceRow['attendance'],
      })
      expect(result.current.getPhase(checkedInRow)).toBe('checked-in')
    })
  })

  // ── Bulk overtime queue ──────────────────────────────────────────────────────

  describe('bulk overtime queue', () => {
    it('currentBulkOvertime is null when queue is empty', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      expect(result.current.currentBulkOvertime).toBeNull()
    })

    it('enqueueBulkOvertime sets currentBulkOvertime to first entry', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const entries = [
        { attendance_id: 'att-001', employee_name: 'Carlos Mendoza', overtime_minutes: 35 },
        { attendance_id: 'att-002', employee_name: 'María García', overtime_minutes: 20 },
      ]

      act(() => {
        result.current.enqueueBulkOvertime(entries)
      })

      expect(result.current.currentBulkOvertime).toEqual(entries[0])
    })

    it('closeBulkOvertimeDecision clears the entire queue', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.enqueueBulkOvertime([
          { attendance_id: 'att-001', employee_name: 'Carlos Mendoza', overtime_minutes: 35 },
        ])
      })

      act(() => {
        result.current.closeBulkOvertimeDecision()
      })

      expect(result.current.currentBulkOvertime).toBeNull()
    })

    it('confirmBulkOvertimeDecision does nothing when queue is empty', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.confirmBulkOvertimeDecision(true)
      })

      expect(attendanceApi.overtimeDecision).not.toHaveBeenCalled()
    })

    it('confirmBulkOvertimeDecision calls API with the current entry attendance_id', async () => {
      vi.mocked(attendanceApi.overtimeDecision).mockResolvedValueOnce({
        data: { status: 200, data: {} },
      } as never)
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.enqueueBulkOvertime([
          { attendance_id: 'att-001', employee_name: 'Carlos Mendoza', overtime_minutes: 35 },
        ])
      })

      await act(async () => {
        result.current.confirmBulkOvertimeDecision(true)
      })

      await waitFor(() => {
        expect(attendanceApi.overtimeDecision).toHaveBeenCalledWith('att-001', { authorize: true })
      })
    })

    it('confirmBulkOvertimeDecision advances queue after API settles', async () => {
      vi.mocked(attendanceApi.overtimeDecision).mockResolvedValue({
        data: { status: 200, data: {} },
      } as never)
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const entries = [
        { attendance_id: 'att-001', employee_name: 'Carlos Mendoza', overtime_minutes: 35 },
        { attendance_id: 'att-002', employee_name: 'María García', overtime_minutes: 20 },
      ]

      act(() => {
        result.current.enqueueBulkOvertime(entries)
      })

      // First entry is shown
      expect(result.current.currentBulkOvertime).toEqual(entries[0])

      // Confirm first decision
      await act(async () => {
        result.current.confirmBulkOvertimeDecision(false)
      })

      // Queue advances to second entry
      await waitFor(() => {
        expect(result.current.currentBulkOvertime).toEqual(entries[1])
      })
    })

    it('currentBulkOvertime becomes null after last entry is confirmed', async () => {
      vi.mocked(attendanceApi.overtimeDecision).mockResolvedValue({
        data: { status: 200, data: {} },
      } as never)
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.enqueueBulkOvertime([
          { attendance_id: 'att-001', employee_name: 'Carlos Mendoza', overtime_minutes: 35 },
        ])
      })

      await act(async () => {
        result.current.confirmBulkOvertimeDecision(true)
      })

      await waitFor(() => {
        expect(result.current.currentBulkOvertime).toBeNull()
      })
    })
  })

  // ── No branch scenario ───────────────────────────────────────────────────────

  describe('no branch selected', () => {
    it('returns hasBranch false when no branch', async () => {
      vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({ currentBranch: null } as unknown as Parameters<typeof selector>[0])
      )

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      expect(result.current.hasBranch).toBe(false)
      expect(result.current.branchName).toBeNull()
    })
  })
})
