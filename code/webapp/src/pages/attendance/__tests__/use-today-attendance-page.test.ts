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

// Sample attendance rows for testing
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
    expect(result.total).toBe(2)
    expect(result.pending).toBe(2)
    expect(result.checkedIn).toBe(0)
    expect(result.done).toBe(0)
  })

  it('counts checked-in employees (has check_in, no check_out)', () => {
    const rows = [
      makeRow({ attendance: { id: 'att-1', check_in: '2026-04-01T13:00:00Z' } as TodayAttendanceRow['attendance'] }),
    ]
    const result = computeSummary(rows)
    expect(result.checkedIn).toBe(1)
    expect(result.pending).toBe(0)
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
        employee: { id: 'emp-002', code: 'EMP-002', first_name: 'María', last_name: 'García', roles: [] },
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

  it('counts at-lunch phase as checkedIn', () => {
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
    expect(result.done).toBe(0)
  })

  it('counts returned phase as checkedIn', () => {
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
    expect(result.done).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// currentTimeLabel
// ══════════════════════════════════════════════════════════════════════════════

describe('currentTimeLabel', () => {
  it('returns time in HH:mm format', () => {
    const result = currentTimeLabel()
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })

  it('returns 5 character string', () => {
    expect(currentTimeLabel().length).toBe(5)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// timeToIso
// ══════════════════════════════════════════════════════════════════════════════

describe('timeToIso', () => {
  it('converts HH:mm to ISO 8601 format', () => {
    const result = timeToIso('13:00')
    // Should match ISO format with timezone offset
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T13:00:00[+-]\d{2}:\d{2}$/)
  })

  it('preserves hours and minutes in the output', () => {
    const result = timeToIso('14:30')
    expect(result).toContain('T14:30:00')
  })

  it('throws TypeError for invalid time without colon', () => {
    expect(() => timeToIso('1300')).toThrow(TypeError)
    expect(() => timeToIso('1300')).toThrow('Invalid time value')
  })

  it('throws TypeError for empty string', () => {
    expect(() => timeToIso('')).toThrow(TypeError)
  })

  it('throws TypeError for NaN values', () => {
    expect(() => timeToIso('ab:cd')).toThrow(TypeError)
    expect(() => timeToIso('ab:cd')).toThrow('Invalid time value')
  })

  it('handles midnight correctly', () => {
    const result = timeToIso('00:00')
    expect(result).toContain('T00:00:00')
  })

  it('handles end of day correctly', () => {
    const result = timeToIso('23:59')
    expect(result).toContain('T23:59:00')
  })

  it('includes timezone offset in output', () => {
    const result = timeToIso('12:00')
    // Should end with timezone offset like +06:00 or -06:00
    expect(result).toMatch(/[+-]\d{2}:\d{2}$/)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// useTodayAttendancePage hook
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
    expect(result.current.selectedTime).toBe('')
    expect(result.current.selectedLunchTime).toBe('')
  })

  it('fetches attendance data on mount', async () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useTodayAttendancePage(), { wrapper })

    await waitFor(() => {
      expect(attendanceApi.today).toHaveBeenCalledWith(1)
    })
  })

  // Check-in flow tests
  describe('check-in flow', () => {
    it('openCheckIn sets pending employee and current time', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const employee = makeEmployee()

      act(() => {
        result.current.openCheckIn(employee)
      })

      expect(result.current.pendingCheckInEmployee).toEqual(employee)
      expect(result.current.selectedTime).toMatch(/^\d{2}:\d{2}$/)
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

    it('onTimeChange updates selected time', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.onTimeChange('14:30')
      })

      expect(result.current.selectedTime).toBe('14:30')
    })

    it('confirmCheckIn does nothing if no pending employee', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.confirmCheckIn()
      })

      expect(attendanceApi.checkIn).not.toHaveBeenCalled()
    })

    it('confirmCheckIn does nothing if no selected time', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const employee = makeEmployee()

      act(() => {
        result.current.openCheckIn(employee)
      })

      // Clear the time that was set by openCheckIn
      act(() => {
        result.current.onTimeChange('')
      })

      act(() => {
        result.current.confirmCheckIn()
      })

      expect(attendanceApi.checkIn).not.toHaveBeenCalled()
    })
  })

  // Lunch-start flow tests
  describe('lunch-start flow', () => {
    it('openLunchStart sets pending data and current time', async () => {
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
      expect(result.current.selectedLunchTime).toMatch(/^\d{2}:\d{2}$/)
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

    it('onLunchTimeChange updates selected lunch time', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.onLunchTimeChange('14:00')
      })

      expect(result.current.selectedLunchTime).toBe('14:00')
    })

    it('confirmLunchStart does nothing if no pending data', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.confirmLunchStart()
      })

      expect(attendanceApi.lunchStart).not.toHaveBeenCalled()
    })

    it('confirmLunchStart does nothing if no selected time', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const employee = makeEmployee()

      act(() => {
        result.current.openLunchStart(employee, 'att-123')
      })

      // Clear the time that was set by openLunchStart
      act(() => {
        result.current.onLunchTimeChange('')
      })

      act(() => {
        result.current.confirmLunchStart()
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
        result.current.confirmLunchStart()
      })

      await waitFor(() => {
        expect(attendanceApi.lunchStart).toHaveBeenCalledWith(
          'att-123',
          expect.objectContaining({ lunch_start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) })
        )
      })
    })
  })

  // Summary and phase tests
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

  // No branch scenario
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
