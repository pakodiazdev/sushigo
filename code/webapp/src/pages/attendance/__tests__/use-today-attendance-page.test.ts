// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useTodayAttendancePage,
  computeSummary,
  attendanceBucket,
  filterRowsForGrid,
  resolveDefaultFilter,
  currentTimeLabel,
  timeToIso,
  todayCdmxDate,
} from '@/pages/attendance/-use-today-attendance-page'
import type { TodayAttendanceRow } from '@/types/attendance'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn((selector: (state: unknown) => unknown) =>
    selector({ currentBranch: { id: 1, name: 'Main Branch' } })
  ),
}))

vi.mock('@/services/attendance-api', () => ({
  attendanceApi: {
    daily: vi.fn(),
    checkIn: vi.fn(),
    lunchStart: vi.fn(),
    lunchReturn: vi.fn(),
    checkOut: vi.fn(),
    overtimeDecision: vi.fn().mockResolvedValue({ data: { status: 200, data: {} } }),
    bulkOvertimeDecision: vi.fn().mockResolvedValue({ data: { status: 200, data: { results: [] } } }),
    closeDay: vi.fn(),
    markDayStatus: vi.fn(),
  },
}))

// Mock timezone to always return America/Mexico_City for deterministic tests
vi.mock('@/lib/timezone', async () => {
  const actual = await vi.importActual('@/lib/timezone')
  return {
    ...actual,
    getFrontendTimezone: () => 'America/Mexico_City',
  }
})

const mockNegotiatedRegister = vi.fn()
vi.mock('@/services/negotiated-extra-day-api', () => ({
  negotiatedExtraDayApi: {
    register: (...args: unknown[]) => mockNegotiatedRegister(...args),
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

/**
 * Same as makeWrapper(), but under <StrictMode> — which the real app renders
 * under (main.tsx) and which double-invokes setState updater functions in
 * dev mode to catch impure ones. Used to reproduce bugs that only manifest
 * under that double-invocation.
 */
function makeStrictWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(QueryClientProvider, { client: queryClient }, children),
    )
  return { queryClient, wrapper }
}

/** Creates a test employee with all required fields */
function makeEmployee(overrides: Partial<{ id: string; code: string; user: { first_name: string; last_name: string }; roles: string[]; daily_wage: number | null }> = {}) {
  return {
    id: 'emp-001',
    code: 'EMP-001',
    user: { first_name: 'Test', last_name: 'User' },
    roles: [] as string[],
    daily_wage: null as number | null,
    ...overrides,
  }
}

/** Sample attendance rows for testing */
function makeRow(overrides: Partial<TodayAttendanceRow> = {}): TodayAttendanceRow {
  return {
    employee: {
      id: 'emp-001',
      code: 'EMP-001',
      user: { first_name: 'Carlos', last_name: 'Mendoza' },
      roles: [],
      daily_wage: null,
    },
    attendance: null,
    schedule: null,
    today_leave: null,
    today_vacation: false,
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
      atLunch: 0,
      done: 0,
      absent: 0,
      withOvertime: 0,
    })
  })

  it('counts pending employees (no attendance)', () => {
    const rows = [makeRow(), makeRow({ employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'María', last_name: 'García' }, roles: [], daily_wage: null } })]
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
        employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null },
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

  it('counts at-lunch as atLunch, not checkedIn', () => {
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
    expect(result.atLunch).toBe(1)
    expect(result.checkedIn).toBe(0)
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
    expect(result.atLunch).toBe(0)
  })

  it('counts ABSENCE, VACATION and LEAVE day_status as absent — not done', () => {
    const rows = [
      makeRow({ attendance: { id: 'att-1', day_status: 'ABSENCE' } as TodayAttendanceRow['attendance'] }),
      makeRow({
        employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null },
        attendance: { id: 'att-2', day_status: 'VACATION' } as TodayAttendanceRow['attendance'],
      }),
      makeRow({
        employee: { id: 'emp-003', code: 'EMP-003', user: { first_name: 'Beto', last_name: 'Ruiz' }, roles: [], daily_wage: null },
        attendance: { id: 'att-3', day_status: 'LEAVE' } as TodayAttendanceRow['attendance'],
      }),
    ]
    const result = computeSummary(rows)
    expect(result.absent).toBe(3)
    expect(result.done).toBe(0)
    expect(result.pending).toBe(0)
    expect(result.checkedIn).toBe(0)
  })

  it('counts a full-day OPEN_ENDED today_leave as absent, even without an attendance record', () => {
    const rows = [
      makeRow({
        today_leave: {
          id: 'leave-1',
          time_mode: 'OPEN_ENDED',
          calculation_mode: 'FIXED_PERCENTAGE',
          is_paid: true,
          starts_at: null,
          ends_at: null,
          note: null,
        },
      }),
    ]
    const result = computeSummary(rows)
    expect(result.absent).toBe(1)
    expect(result.pending).toBe(0)
  })

  it('does not count a partial SCHEDULED today_leave as absent — stays pending/checkedIn', () => {
    const rows = [
      makeRow({
        today_leave: {
          id: 'leave-1',
          time_mode: 'SCHEDULED',
          calculation_mode: 'PROPORTIONAL_HOURS',
          is_paid: true,
          starts_at: '2026-04-01T19:00:00Z',
          ends_at: '2026-04-01T22:00:00Z',
          note: null,
        },
      }),
    ]
    const result = computeSummary(rows)
    expect(result.absent).toBe(0)
    expect(result.pending).toBe(1)
  })

  it('counts DAY_OFF (scheduled rest day) as absent, not done', () => {
    const rows = [
      makeRow({ attendance: { id: 'att-1', day_status: 'DAY_OFF' } as TodayAttendanceRow['attendance'] }),
    ]
    const result = computeSummary(rows)
    expect(result.absent).toBe(1)
    expect(result.done).toBe(0)
  })

  it('counts today_vacation as absent, even without an attendance record', () => {
    const rows = [makeRow({ today_vacation: true })]
    const result = computeSummary(rows)
    expect(result.absent).toBe(1)
    expect(result.pending).toBe(0)
  })

  it('counts a scheduled rest day (schedule.is_day_off) as absent, even without an attendance record', () => {
    const rows = [
      makeRow({
        schedule: {
          day_of_week: 7,
          is_day_off: true,
          expected_start: null,
          expected_lunch_start: null,
          expected_lunch_end: null,
          lunch_duration_minutes: null,
          expected_end: null,
        },
      }),
    ]
    const result = computeSummary(rows)
    expect(result.absent).toBe(1)
    expect(result.pending).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// attendanceBucket
// ══════════════════════════════════════════════════════════════════════════════

describe('attendanceBucket', () => {
  it('returns "pending" for a row with no attendance', () => {
    expect(attendanceBucket(makeRow())).toBe('pending')
  })

  it('returns "checkedIn" for checked-in/returned rows', () => {
    const checkedIn = makeRow({ attendance: { id: 'a', check_in: '2026-04-01T13:00:00Z' } as TodayAttendanceRow['attendance'] })
    const returned = makeRow({ attendance: { id: 'a', check_in: '2026-04-01T13:00:00Z', lunch_start: '2026-04-01T14:00:00Z', lunch_end: '2026-04-01T15:00:00Z' } as TodayAttendanceRow['attendance'] })
    expect(attendanceBucket(checkedIn)).toBe('checkedIn')
    expect(attendanceBucket(returned)).toBe('checkedIn')
  })

  it('returns "atLunch" for at-lunch rows', () => {
    const atLunch = makeRow({ attendance: { id: 'a', check_in: '2026-04-01T13:00:00Z', lunch_start: '2026-04-01T14:00:00Z' } as TodayAttendanceRow['attendance'] })
    expect(attendanceBucket(atLunch)).toBe('atLunch')
  })

  it('returns "done" for a checked-out row', () => {
    const row = makeRow({ attendance: { id: 'a', check_in: '2026-04-01T13:00:00Z', check_out: '2026-04-01T22:00:00Z' } as TodayAttendanceRow['attendance'] })
    expect(attendanceBucket(row)).toBe('done')
  })

  it.each(['ABSENCE', 'VACATION', 'LEAVE', 'DAY_OFF'])('returns "absent" for day_status %s', (day_status) => {
    const row = makeRow({ attendance: { id: 'a', day_status } as TodayAttendanceRow['attendance'] })
    expect(attendanceBucket(row)).toBe('absent')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// filterRowsForGrid
// ══════════════════════════════════════════════════════════════════════════════

describe('filterRowsForGrid', () => {
  function rowsFixture() {
    return [
      makeRow({ employee: { id: 'e1', code: 'E1', user: { first_name: 'A', last_name: 'A' }, roles: [], daily_wage: null } }), // pending
      makeRow({
        employee: { id: 'e2', code: 'E2', user: { first_name: 'B', last_name: 'B' }, roles: [], daily_wage: null },
        attendance: { id: 'a2', check_in: '2026-04-01T13:00:00Z' } as TodayAttendanceRow['attendance'],
      }), // checkedIn
      makeRow({
        employee: { id: 'e3', code: 'E3', user: { first_name: 'C', last_name: 'C' }, roles: [], daily_wage: null },
        attendance: { id: 'a3', check_in: '2026-04-01T13:00:00Z', check_out: '2026-04-01T22:00:00Z' } as TodayAttendanceRow['attendance'],
      }), // done
      makeRow({
        employee: { id: 'e4', code: 'E4', user: { first_name: 'D', last_name: 'D' }, roles: [], daily_wage: null },
        attendance: { id: 'a4', day_status: 'ABSENCE' } as TodayAttendanceRow['attendance'],
      }), // absent — stays visible by default
      makeRow({
        employee: { id: 'e5', code: 'E5', user: { first_name: 'E', last_name: 'E' }, roles: [], daily_wage: null },
        attendance: { id: 'a5', day_status: 'VACATION' } as TodayAttendanceRow['attendance'],
      }), // absent — hidden by default
      makeRow({
        employee: { id: 'e6', code: 'E6', user: { first_name: 'F', last_name: 'F' }, roles: [], daily_wage: null },
        attendance: { id: 'a6', day_status: 'DAY_OFF' } as TodayAttendanceRow['attendance'],
      }), // absent — hidden by default
      makeRow({
        employee: { id: 'e7', code: 'E7', user: { first_name: 'G', last_name: 'G' }, roles: [], daily_wage: null },
        attendance: { id: 'a7', check_in: '2026-04-01T13:00:00Z', lunch_start: '2026-04-01T14:00:00Z' } as TodayAttendanceRow['attendance'],
      }), // atLunch
      makeRow({
        employee: { id: 'e8', code: 'E8', user: { first_name: 'H', last_name: 'H' }, roles: [], daily_wage: null },
        today_vacation: true,
      }), // absent (today_vacation, no attendance record yet) — hidden by default
      makeRow({
        employee: { id: 'e9', code: 'E9', user: { first_name: 'I', last_name: 'I' }, roles: [], daily_wage: null },
        schedule: {
          day_of_week: 7,
          is_day_off: true,
          expected_start: null,
          expected_lunch_start: null,
          expected_lunch_end: null,
          lunch_duration_minutes: null,
          expected_end: null,
        },
      }), // absent (schedule.is_day_off, no attendance record yet) — stays visible by default, live check-in action
    ]
  }

  it('with null filter, shows everyone except VACATION/DAY_OFF (default view)', () => {
    const visible = filterRowsForGrid(rowsFixture(), null)
    expect(visible.map((r) => r.employee.code)).toEqual(['E1', 'E2', 'E3', 'E4', 'E7', 'E9'])
  })

  it('with "total" filter, shows literally everyone including VACATION/DAY_OFF', () => {
    const visible = filterRowsForGrid(rowsFixture(), 'total')
    expect(visible).toHaveLength(9)
  })

  it('with "absent" filter, shows only ABSENCE/VACATION/DAY_OFF rows', () => {
    const visible = filterRowsForGrid(rowsFixture(), 'absent')
    expect(visible.map((r) => r.employee.code)).toEqual(['E4', 'E5', 'E6', 'E8', 'E9'])
  })

  it('with "pending" filter, shows only the pending row', () => {
    const visible = filterRowsForGrid(rowsFixture(), 'pending')
    expect(visible.map((r) => r.employee.code)).toEqual(['E1'])
  })

  it('with "checkedIn" filter, shows only the checked-in row', () => {
    const visible = filterRowsForGrid(rowsFixture(), 'checkedIn')
    expect(visible.map((r) => r.employee.code)).toEqual(['E2'])
  })

  it('with "atLunch" filter, shows only the at-lunch row', () => {
    const visible = filterRowsForGrid(rowsFixture(), 'atLunch')
    expect(visible.map((r) => r.employee.code)).toEqual(['E7'])
  })

  it('with "done" filter, shows only the done row', () => {
    const visible = filterRowsForGrid(rowsFixture(), 'done')
    expect(visible.map((r) => r.employee.code)).toEqual(['E3'])
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// resolveDefaultFilter
// ══════════════════════════════════════════════════════════════════════════════

describe('resolveDefaultFilter', () => {
  it('returns "pending" when there is at least one pending employee', () => {
    const summary = { total: 3, pending: 2, checkedIn: 1, atLunch: 0, done: 0, absent: 0, withOvertime: 0 }
    expect(resolveDefaultFilter(summary)).toBe('pending')
  })

  it('returns "checkedIn" when there are no pending employees', () => {
    const summary = { total: 3, pending: 0, checkedIn: 1, atLunch: 0, done: 2, absent: 0, withOvertime: 0 }
    expect(resolveDefaultFilter(summary)).toBe('checkedIn')
  })

  it('returns "atLunch" when nobody is pending or checked in, but someone is at lunch', () => {
    const summary = { total: 2, pending: 0, checkedIn: 0, atLunch: 1, done: 0, absent: 1, withOvertime: 0 }
    expect(resolveDefaultFilter(summary)).toBe('atLunch')
  })

  it('returns "done" when nobody is pending, checked in or at lunch, but someone has finished', () => {
    const summary = { total: 2, pending: 0, checkedIn: 0, atLunch: 0, done: 1, absent: 1, withOvertime: 0 }
    expect(resolveDefaultFilter(summary)).toBe('done')
  })

  it('returns "absent" when everyone is absent and no other bucket has anyone', () => {
    const summary = { total: 1, pending: 0, checkedIn: 0, atLunch: 0, done: 0, absent: 1, withOvertime: 0 }
    expect(resolveDefaultFilter(summary)).toBe('absent')
  })

  it('returns null when there are no employees at all, instead of landing on an empty bucket tab', () => {
    const summary = { total: 0, pending: 0, checkedIn: 0, atLunch: 0, done: 0, absent: 0, withOvertime: 0 }
    expect(resolveDefaultFilter(summary)).toBeNull()
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

  it('returns ISO 8601 string with timezone offset', () => {
    vi.useFakeTimers()
    // Set system time to any UTC time - timeToIso uses today's date in frontend timezone
    vi.setSystemTime(new Date('2026-04-01T18:00:00Z'))

    const iso = timeToIso('14:30')
    // Should have valid ISO 8601 format with offset (browser timezone in test = UTC)
    expect(iso).toMatch(/^2026-04-01T14:30:00[+-]\d{2}:\d{2}$/)

    vi.useRealTimers()
  })

  it('returns ISO 8601 string with valid timezone offset', () => {
    const iso = timeToIso('14:30')
    // Should end with a valid timezone offset (±HH:MM)
    expect(iso).toMatch(/[+-]\d{2}:\d{2}$/)
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
    vi.mocked(attendanceApi.daily).mockResolvedValue(mockTodayResponse as never)
    vi.mocked(attendanceApi.checkIn).mockResolvedValue({ data: { status: 200, data: {} } } as never)
    vi.mocked(attendanceApi.lunchStart).mockResolvedValue({ data: { status: 200, data: {} } } as never)
    vi.mocked(attendanceApi.lunchReturn).mockResolvedValue({ data: { status: 200, data: {} } } as never)
    vi.mocked(attendanceApi.checkOut).mockResolvedValue({ data: { status: 200, data: {} } } as never)
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
      expect(attendanceApi.daily).toHaveBeenCalled()
    })
  })

  // ── Check-in flow tests ──────────────────────────────────────────────────────

  describe('check-in flow', () => {
    it('openCheckIn sets pending employee for normal day', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const row = makeRow({ schedule: { day_of_week: 1, is_day_off: false, expected_start: '13:00', expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null, expected_end: '22:00' } })

      act(() => {
        result.current.openCheckIn(row)
      })

      expect(result.current.pendingCheckInEmployee).toEqual(row.employee)
    })

    it('openCheckIn opens extra day dialog for rest day instead of check-in', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const row = makeRow({ schedule: { day_of_week: 1, is_day_off: true, expected_start: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null, expected_end: null } })

      act(() => {
        result.current.openCheckIn(row)
      })

      expect(result.current.pendingCheckInEmployee).toBeNull()
      expect(result.current.extraDayRow).toEqual(row)
    })

    it('openCheckIn skips negotiation and opens check-in when day_status is EXTRA', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      // Agreement already approved — skip negotiation
      const row = makeRow({
        schedule: { day_of_week: 7, is_day_off: true, expected_start: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null, expected_end: null },
        attendance: {
          id: 'att-extra-001',
          check_in: null,
          lunch_start: null,
          lunch_end: null,
          check_out: null,
          day_status: 'EXTRA',
          entry_late_seconds: 0,
          entry_late_minutes: 0,
          is_entry_deductible: false,
          overtime_minutes: 0,
          overtime_authorized: false,
          overtime_authorized_at: null,
          overtime_valuation_method: null,
          overtime_rate_applied: null,
          overtime_amount: null,
          requires_overtime_decision: false,
        },
      })

      act(() => {
        result.current.openCheckIn(row)
      })

      expect(result.current.extraDayRow).toBeNull()
      expect(result.current.pendingCheckInEmployee).toEqual(row.employee)
    })

    it('openCheckIn never opens the extra-day dialog when correcting an already-recorded check-in, even if the schedule now looks like a rest day', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      // Schedule changed to a rest day AFTER the check-in was recorded — day_status
      // is still WORKED (not EXTRA), but this is a correction of an existing value,
      // not a new extra-day negotiation.
      const row = makeRow({
        schedule: { day_of_week: 1, is_day_off: true, expected_start: null, expected_lunch_start: null, expected_lunch_end: null, lunch_duration_minutes: null, expected_end: null },
        attendance: {
          id: 'att-correction-001',
          check_in: '2026-02-23T13:00:00Z',
          lunch_start: null,
          lunch_end: null,
          check_out: null,
          day_status: 'WORKED',
          entry_late_seconds: 0,
          entry_late_minutes: 0,
          is_entry_deductible: false,
          overtime_minutes: 0,
          overtime_authorized: false,
          overtime_authorized_at: null,
          overtime_valuation_method: null,
          overtime_rate_applied: null,
          overtime_amount: null,
          requires_overtime_decision: false,
        },
      })

      act(() => {
        result.current.openCheckIn(row)
      })

      expect(result.current.extraDayRow).toBeNull()
      expect(result.current.pendingCheckInEmployee).toEqual(row.employee)
      expect(result.current.pendingCheckInCurrentValue).toBe('2026-02-23T13:00:00Z')
    })

    it('closeCheckIn clears pending employee', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const row = makeRow()

      act(() => {
        result.current.openCheckIn(row)
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

      const row = makeRow()

      act(() => {
        result.current.openCheckIn(row)
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

      const row = makeRow()

      act(() => {
        result.current.openCheckIn(row)
      })

      await act(async () => {
        result.current.confirmCheckIn('14:00')
      })

      await waitFor(() => {
        expect(result.current.pendingCheckInEmployee).toBeNull()
      })
    })

    it('confirmCheckIn plays the exit animation when a fresh check-in moves the card out of the active tab', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      const row = makeRow()
      act(() => result.current.openCheckIn(row))

      vi.useFakeTimers()
      await act(async () => {
        result.current.confirmCheckIn('14:00')
      })

      expect(result.current.isCardExiting('emp-001')).toBe(true)
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001'])

      // The pin/exit override clears itself once the timer fires — whether the
      // card actually leaves `visibleRows` afterward depends on the refetched
      // `data` reflecting the new bucket, which is covered separately by the
      // "pin + exit animation" suite below.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })
      expect(result.current.isCardExiting('emp-001')).toBe(false)
      vi.useRealTimers()
    })

    it('does not get stuck hidden after the selected date changes mid-animation', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      const row = makeRow()
      act(() => result.current.openCheckIn(row))

      vi.useFakeTimers()
      await act(async () => {
        result.current.confirmCheckIn('14:00')
      })
      expect(result.current.isCardExiting('emp-001')).toBe(true)

      // Manager switches to a different date before the 350ms exit-animation
      // timer fires. `data` is now a different day's rows, entirely
      // unrelated to the check-in that was just confirmed on the original
      // day — the pending override must not survive the switch.
      act(() => result.current.setSelectedDate('2026-02-24'))

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })
      vi.useRealTimers()

      // Without the fix, the timer would still fire against the OLD day's
      // pinned bucket check, find a permanent mismatch (a past day's data
      // never changes), and force the row 'hidden' on the newly selected
      // date too — even though nothing about that date has anything to do
      // with the original check-in.
      expect(result.current.isCardExiting('emp-001')).toBe(false)
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001'])
    })

    it('does not animate an unrelated card on the newly selected date if the manager switches dates while a check-in is still in flight', async () => {
      let resolveCheckIn: (value: unknown) => void
      vi.mocked(attendanceApi.checkIn).mockReturnValueOnce(
        new Promise((resolve) => { resolveCheckIn = resolve }) as never
      )

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      const row = makeRow()
      act(() => result.current.openCheckIn(row))
      act(() => { result.current.confirmCheckIn('14:00') })

      // Manager switches to a different date BEFORE the in-flight check-in
      // request resolves — not after, which the existing "changes
      // mid-animation" test already covers (a timer already armed against
      // the old day). Here no timer has been armed yet at all: the mutation
      // itself is still pending when the date changes.
      act(() => result.current.setSelectedDate('2026-02-24'))
      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      vi.useFakeTimers()
      await act(async () => {
        resolveCheckIn({ data: { status: 200, data: {} } })
        await Promise.resolve()
      })

      // Without the fix, onSuccess would call startExitAnimation for
      // emp-001 against whatever the NEWLY selected date's data says —
      // animating and potentially permanently hiding a card on a day the
      // original check-in has nothing to do with.
      expect(result.current.isCardExiting('emp-001')).toBe(false)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(35_000)
      })
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001'])
      vi.useRealTimers()
    })

    it('does not play the exit animation using a stale tab if the manager switches tabs while check-in is still in flight', async () => {
      let resolveCheckIn: (value: unknown) => void
      vi.mocked(attendanceApi.checkIn).mockReturnValueOnce(
        new Promise((resolve) => { resolveCheckIn = resolve }) as never
      )

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      const row = makeRow()
      act(() => result.current.openCheckIn(row))
      act(() => { result.current.confirmCheckIn('14:00') })

      // Manager switches to the "checkedIn" tab while the request is still in
      // flight — the row's target bucket ('checkedIn') now matches the active
      // tab, so once the request resolves it must NOT play the exit animation,
      // even though the tab was "pending" (a mismatch) at the moment the
      // request was originally sent.
      act(() => result.current.toggleFilter('checkedIn'))

      await act(async () => {
        resolveCheckIn({ data: { status: 200, data: {} } })
        await Promise.resolve()
      })

      expect(result.current.isCardExiting('emp-001')).toBe(false)
    })

    it('does not let a card flash back into view when the exit animation finishes before the refetch lands', async () => {
      // `attendanceApi.daily` is never re-mocked here, so the refetch that
      // useCheckIn's onSuccess triggers still resolves to the same stale
      // "pending" row even after the 350ms exit animation completes.
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      const row = makeRow()
      act(() => result.current.openCheckIn(row))

      vi.useFakeTimers()
      await act(async () => {
        result.current.confirmCheckIn('14:00')
      })
      expect(result.current.isCardExiting('emp-001')).toBe(true)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      // Without the fix, the card would reappear here: the override is
      // cleared and the still-stale (pending) row still matches the "pending"
      // tab, so it would flash back to full opacity instead of staying gone.
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual([])
      vi.useRealTimers()
    })

    it('does not stay hidden forever if the guessed target bucket never materializes — a bounded fallback reveals it', async () => {
      // `attendanceApi.daily` is never re-mocked, so the row stays "pending"
      // forever — the exact-match cleanup effect can never fire, since it
      // requires attendanceBucket(row) === 'checkedIn'. This simulates a
      // concurrent change (e.g. another manager approving a full-day leave)
      // routing the row to a bucket other than the one assumed when the exit
      // animation started, which the exact-match check alone can never recover
      // from.
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      const row = makeRow()
      act(() => result.current.openCheckIn(row))

      vi.useFakeTimers()
      await act(async () => {
        result.current.confirmCheckIn('14:00')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      // 'hidden' forces the row out of the bucket-specific tab it left.
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual([])

      // Without the fallback, the row would stay hidden indefinitely on THIS
      // tab — the 30s poll keeps returning the same stale "pending" data, so
      // the exact bucket match never happens. The fallback timer (35s) must
      // force the card back into view regardless.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(35_000)
      })
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001'])
      vi.useRealTimers()
    })

    it('does not leave "Ver todos" pointing at an equally empty grid while a card is force-hidden', async () => {
      // Same setup as the fallback test above: `attendanceApi.daily` is never
      // re-mocked, so the row stays "pending" and the exact-match cleanup
      // effect can never clear the 'hidden' override on its own.
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      const row = makeRow()
      act(() => result.current.openCheckIn(row))

      vi.useFakeTimers()
      await act(async () => {
        result.current.confirmCheckIn('14:00')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      // Still suppressed on the bucket-specific tab it left...
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual([])

      // ...but "Total" (NoMatchesForFilterState's onShowAll target) must NOT
      // be an equally empty dead end — 'hidden' only guards against a stale
      // row incorrectly re-matching its OWN bucket-specific tab, which can't
      // happen on a view that shows every row regardless of bucket.
      act(() => result.current.toggleFilter('total'))
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001'])

      // Switching back to the bucket-specific tab re-suppresses it, since the
      // override is still 'hidden' and the underlying data still hasn't
      // refetched to confirm the new bucket.
      act(() => result.current.toggleFilter('pending'))
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual([])

      vi.useRealTimers()
    })

    it('reveals the card once fresh data lands, even if the manager already switched to the tab it now belongs to', async () => {
      const { wrapper, queryClient } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      const row = makeRow()
      act(() => result.current.openCheckIn(row))

      vi.useFakeTimers()
      await act(async () => {
        result.current.confirmCheckIn('14:00')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })
      // Still hidden — the refetch hasn't landed yet.
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual([])

      // Manager switches to the tab the employee actually moved to — an
      // earlier, buggier version of the cleanup effect could never reveal
      // the card here, since it only cleared 'hidden' when the row did NOT
      // match the active tab.
      act(() => result.current.toggleFilter('checkedIn'))
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual([])

      vi.useRealTimers()
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow({ attendance: { id: 'att-1', check_in: '2026-02-23T14:00:00Z' } as TodayAttendanceRow['attendance'] }),
          ],
        },
      } as never)
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: ['attendances', 'daily'] })
      })

      // The cleanup effect needs an extra render/commit cycle to settle after
      // the refetch lands, which isn't always fully flushed within a single
      // act() call under heavier parallel load — waitFor tolerates that.
      await waitFor(() => {
        expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001'])
      })
    })

    it('reveals the card once fresh data lands under <StrictMode> (setCardOverrides updater must stay pure)', async () => {
      // Same scenario as the test above, but under <StrictMode> — which the
      // real app renders under (main.tsx) and which double-invokes setState
      // updater functions in dev mode specifically to catch impure ones. If
      // the cleanup effect's ref bookkeeping (targetBucketByEmployee) were
      // mutated INSIDE the setCardOverrides updater instead of in the effect
      // body, the first invocation would correctly clear the override and
      // delete the ref entry as a side effect; the second invocation would
      // then find that entry already gone, compute "nothing to clear", and
      // React would keep that (wrong) result — leaving the card stuck
      // 'hidden' only in development.
      const { wrapper, queryClient } = makeStrictWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      const row = makeRow()
      act(() => result.current.openCheckIn(row))

      vi.useFakeTimers()
      await act(async () => {
        result.current.confirmCheckIn('14:00')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual([])

      // Manager switches to the tab the employee actually moved to.
      act(() => result.current.toggleFilter('checkedIn'))
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual([])

      vi.useRealTimers()
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow({ attendance: { id: 'att-1', check_in: '2026-02-23T14:00:00Z' } as TodayAttendanceRow['attendance'] }),
          ],
        },
      } as never)
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: ['attendances', 'daily'] })
      })

      await waitFor(() => {
        expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001'])
      })
    })

    it('does not get stuck hidden on every tab when the refetch lands before the exit animation finishes', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      const row = makeRow()
      act(() => result.current.openCheckIn(row))

      // Mocked BEFORE confirming, not after: invalidateQueries fires inside
      // useCheckIn's onSuccess, and with no artificial network delay on the
      // mock, that refetch can settle within the same microtask flush as
      // confirmCheckIn itself — well before the 350ms exit animation timer
      // even starts ticking. This is the fast-API case the fix targets.
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow({ attendance: { id: 'att-1', check_in: '2026-02-23T14:00:00Z' } as TodayAttendanceRow['attendance'] }),
          ],
        },
      } as never)

      vi.useFakeTimers()
      await act(async () => {
        result.current.confirmCheckIn('14:00')
      })
      expect(result.current.isCardExiting('emp-001')).toBe(true)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })
      expect(result.current.isCardExiting('emp-001')).toBe(false)
      vi.useRealTimers()

      // Without the fix, the row would now be forced out of every tab via
      // the 'hidden' override (the hide-time `data` snapshot would already
      // equal the fresh reference, so the cleanup effect would never see a
      // later mismatch) — stuck until the next 30s poll happens to change
      // the reference again. Switching to the tab the employee actually
      // belongs to must reveal it immediately instead.
      act(() => result.current.toggleFilter('checkedIn'))
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001'])
    })

    it('confirmCheckIn does not play the exit animation when correcting an already-recorded check-in', async () => {
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow({ attendance: { id: 'att-1', check_in: '2026-02-23T13:00:00Z' } as TodayAttendanceRow['attendance'] }),
          ],
        },
      } as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('checkedIn'))

      const row = makeRow({ attendance: { id: 'att-1', check_in: '2026-02-23T13:00:00Z' } as TodayAttendanceRow['attendance'] })
      act(() => result.current.openCheckIn(row))
      expect(result.current.pendingCheckInCurrentValue).toBe('2026-02-23T13:00:00Z')

      await act(async () => {
        result.current.confirmCheckIn('14:05')
      })

      expect(result.current.isCardExiting('emp-001')).toBe(false)
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

    it('confirmLunchStart plays the exit animation when a fresh lunch-start moves the card out of the active tab', async () => {
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow({ attendance: { id: 'att-1', check_in: '2026-02-23T13:00:00Z' } as TodayAttendanceRow['attendance'] }),
          ],
        },
      } as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('checkedIn'))

      act(() => result.current.openLunchStart(makeEmployee(), 'att-1'))

      vi.useFakeTimers()
      await act(async () => {
        result.current.confirmLunchStart('14:00')
      })

      expect(result.current.isCardExiting('emp-001')).toBe(true)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })
      expect(result.current.isCardExiting('emp-001')).toBe(false)
      vi.useRealTimers()
    })

    it('confirmLunchStart does not play the exit animation when correcting an already-recorded lunch-start', async () => {
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow({
              attendance: {
                id: 'att-1',
                check_in: '2026-02-23T13:00:00Z',
                lunch_start: '2026-02-23T16:00:00Z',
              } as TodayAttendanceRow['attendance'],
            }),
          ],
        },
      } as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('atLunch'))

      act(() => result.current.openLunchStart(makeEmployee(), 'att-1', '2026-02-23T16:00:00Z'))

      await act(async () => {
        result.current.confirmLunchStart('16:05')
      })

      expect(result.current.isCardExiting('emp-001')).toBe(false)
    })

    it('does not incorrectly animate a fresh lunch-start when the row also carries a full-day (OPEN_ENDED) leave, since it stays in the "absent" bucket', async () => {
      // Checked-in AND a full-day leave was approved after the fact — the row
      // is still "absent" per isAbsentRow/attendanceBucket regardless of
      // check-in phase, so the naive 'atLunch' target would be wrong here.
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow({
              attendance: { id: 'att-1', check_in: '2026-02-23T13:00:00Z' } as TodayAttendanceRow['attendance'],
              today_leave: {
                id: 'leave-1',
                time_mode: 'OPEN_ENDED',
                calculation_mode: 'FIXED_PERCENTAGE',
                is_paid: true,
                starts_at: null,
                ends_at: null,
                note: null,
              },
            }),
          ],
        },
      } as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      // Only bucket with anyone in it is "absent" (per isAbsentRow), so the
      // smart default lands there.
      await waitFor(() => expect(result.current.selectedFilter).toBe('absent'))

      act(() => result.current.openLunchStart(makeEmployee(), 'att-1'))

      await act(async () => {
        result.current.confirmLunchStart('14:00')
      })

      // The row's real target bucket is 'absent' (matches the active tab), not
      // the naive 'atLunch' — must NOT play the exit animation.
      expect(result.current.isCardExiting('emp-001')).toBe(false)
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

    it('confirmLunchReturn plays the exit animation when a fresh lunch-return moves the card out of the active tab', async () => {
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow({
              attendance: {
                id: 'att-1',
                check_in: '2026-02-23T13:00:00Z',
                lunch_start: '2026-02-23T16:00:00Z',
              } as TodayAttendanceRow['attendance'],
            }),
          ],
        },
      } as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('atLunch'))

      act(() => result.current.openLunchReturn(makeEmployee(), 'att-1'))

      vi.useFakeTimers()
      await act(async () => {
        result.current.confirmLunchReturn('17:00')
      })

      expect(result.current.isCardExiting('emp-001')).toBe(true)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })
      expect(result.current.isCardExiting('emp-001')).toBe(false)
      vi.useRealTimers()
    })

    it('confirmLunchReturn does not play the exit animation when correcting an already-recorded lunch-return', async () => {
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow({
              attendance: {
                id: 'att-1',
                check_in: '2026-02-23T13:00:00Z',
                lunch_start: '2026-02-23T16:00:00Z',
                lunch_end: '2026-02-23T17:00:00Z',
              } as TodayAttendanceRow['attendance'],
            }),
          ],
        },
      } as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('checkedIn'))

      act(() => result.current.openLunchReturn(makeEmployee(), 'att-1', '2026-02-23T17:00:00Z'))

      await act(async () => {
        result.current.confirmLunchReturn('17:05')
      })

      expect(result.current.isCardExiting('emp-001')).toBe(false)
    })
  })

  // ── Check-out flow tests ─────────────────────────────────────────────────────

  describe('check-out flow', () => {
    it('openCheckOut sets pending data', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const employee = makeEmployee()

      act(() => {
        result.current.openCheckOut(employee, 'att-789')
      })

      expect(result.current.pendingCheckOut).toEqual({
        employee,
        attendanceId: 'att-789',
      })
    })

    it('closeCheckOut clears pending data', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const employee = makeEmployee()

      act(() => {
        result.current.openCheckOut(employee, 'att-789')
      })

      act(() => {
        result.current.closeCheckOut()
      })

      expect(result.current.pendingCheckOut).toBeNull()
    })

    it('confirmCheckOut does nothing if no pending data', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.confirmCheckOut('18:00')
      })

      expect(attendanceApi.checkOut).not.toHaveBeenCalled()
    })

    it('confirmCheckOut calls API with correct data', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const employee = makeEmployee()

      act(() => {
        result.current.openCheckOut(employee, 'att-789')
      })

      await act(async () => {
        result.current.confirmCheckOut('18:00')
      })

      await waitFor(() => {
        expect(attendanceApi.checkOut).toHaveBeenCalledWith(
          'att-789',
          expect.objectContaining({
            check_out: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T18:00:00[+-]\d{2}:\d{2}$/),
          })
        )
      })
    })

    it('confirmCheckOut clears pending data after success', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const employee = makeEmployee()

      act(() => {
        result.current.openCheckOut(employee, 'att-789')
      })

      await act(async () => {
        result.current.confirmCheckOut('18:00')
      })

      await waitFor(() => {
        expect(result.current.pendingCheckOut).toBeNull()
      })
    })

    it('confirmCheckOut plays the exit animation when a fresh check-out moves the card out of the active tab', async () => {
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow({
              attendance: {
                id: 'att-1',
                check_in: '2026-02-23T13:00:00Z',
                lunch_start: '2026-02-23T16:00:00Z',
                lunch_end: '2026-02-23T17:00:00Z',
              } as TodayAttendanceRow['attendance'],
            }),
          ],
        },
      } as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('checkedIn'))

      act(() => result.current.openCheckOut(makeEmployee(), 'att-1'))

      vi.useFakeTimers()
      await act(async () => {
        result.current.confirmCheckOut('22:00')
      })

      expect(result.current.isCardExiting('emp-001')).toBe(true)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })
      expect(result.current.isCardExiting('emp-001')).toBe(false)
      vi.useRealTimers()
    })

    it('confirmCheckOut does not play the exit animation when correcting an already-recorded check-out', async () => {
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow({
              attendance: {
                id: 'att-1',
                check_in: '2026-02-23T13:00:00Z',
                lunch_start: '2026-02-23T16:00:00Z',
                lunch_end: '2026-02-23T17:00:00Z',
                check_out: '2026-02-23T22:00:00Z',
              } as TodayAttendanceRow['attendance'],
            }),
          ],
        },
      } as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('done'))

      act(() => result.current.openCheckOut(makeEmployee(), 'att-1', '2026-02-23T22:00:00Z'))

      await act(async () => {
        result.current.confirmCheckOut('22:05')
      })

      expect(result.current.isCardExiting('emp-001')).toBe(false)
    })
  })

  // ── Mark day status flow ──────────────────────────────────────────────────────

  describe('mark day status flow', () => {
    it('only marks the acted-on employee busy while their absence write is in flight, not every other card', async () => {
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: { data: [makeRow(), makeRow({ employee: makeEmployee({ id: 'emp-002' }) })] },
      } as never)

      let resolveMarkDayStatus: (value: unknown) => void
      vi.mocked(attendanceApi.markDayStatus).mockReturnValueOnce(
        new Promise((resolve) => { resolveMarkDayStatus = resolve }) as never
      )

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
      expect(result.current.markingDayStatusEmployeeIds.size).toBe(0)

      act(() => { void result.current.markDayStatus(makeEmployee({ id: 'emp-001' }), 'ABSENCE') })

      // Only emp-001 (the one actually being marked) should read as busy —
      // emp-002 must stay fully interactive while emp-001's write is in flight.
      expect(result.current.markingDayStatusEmployeeIds.has('emp-001')).toBe(true)
      expect(result.current.markingDayStatusEmployeeIds.has('emp-002')).toBe(false)

      await act(async () => {
        resolveMarkDayStatus({ data: { status: 200, data: {} } })
        await Promise.resolve()
      })

      expect(result.current.markingDayStatusEmployeeIds.size).toBe(0)
    })

    it('keeps a second employee marked busy even after a first, overlapping absence write settles', async () => {
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: { data: [makeRow(), makeRow({ employee: makeEmployee({ id: 'emp-002' }) })] },
      } as never)

      let resolveA: (value: unknown) => void
      let resolveB: (value: unknown) => void
      vi.mocked(attendanceApi.markDayStatus)
        .mockReturnValueOnce(new Promise((resolve) => { resolveA = resolve }) as never)
        .mockReturnValueOnce(new Promise((resolve) => { resolveB = resolve }) as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      // Manager confirms falta for emp-001, then — before that request returns —
      // also confirms it for emp-002. Both writes are genuinely in flight at once.
      act(() => { void result.current.markDayStatus(makeEmployee({ id: 'emp-001' }), 'ABSENCE') })
      act(() => { void result.current.markDayStatus(makeEmployee({ id: 'emp-002' }), 'ABSENCE') })

      expect(result.current.markingDayStatusEmployeeIds.has('emp-001')).toBe(true)
      expect(result.current.markingDayStatusEmployeeIds.has('emp-002')).toBe(true)

      // emp-001's write settles first — a single shared "last one wins" marker
      // would clear to nothing here and falsely re-enable emp-002's card even
      // though emp-002's own write is still pending.
      await act(async () => {
        resolveA({ data: { status: 200, data: {} } })
        await Promise.resolve()
      })

      expect(result.current.markingDayStatusEmployeeIds.has('emp-001')).toBe(false)
      expect(result.current.markingDayStatusEmployeeIds.has('emp-002')).toBe(true)

      await act(async () => {
        resolveB({ data: { status: 200, data: {} } })
        await Promise.resolve()
      })

      expect(result.current.markingDayStatusEmployeeIds.size).toBe(0)
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
        atLunch: 0,
        done: 0,
        absent: 0,
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

  // ── Tab filter (smart default + URL initial value) ────────────────────────────

  describe('tab filter', () => {
    it('defaults to "pending" once loaded when there is a pending employee', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
    })

    it('defaults to "checkedIn" once loaded when nobody is pending', async () => {
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow({
              attendance: { id: 'att-1', check_in: '2026-04-01T13:00:00Z' } as TodayAttendanceRow['attendance'],
            }),
          ],
        },
      } as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      await waitFor(() => expect(result.current.selectedFilter).toBe('checkedIn'))
    })

    it('defaults to "atLunch" once loaded when nobody is pending or checked in, but someone is at lunch', async () => {
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow({
              attendance: {
                id: 'att-1',
                check_in: '2026-04-01T13:00:00Z',
                lunch_start: '2026-04-01T14:00:00Z',
              } as TodayAttendanceRow['attendance'],
            }),
          ],
        },
      } as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      await waitFor(() => expect(result.current.selectedFilter).toBe('atLunch'))
    })

    it('keeps an explicit initialFilter (e.g. from the URL) instead of applying the smart default', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage('done'), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Give the smart-default effect a tick to (not) fire
      await waitFor(() => expect(result.current.selectedFilter).toBe('done'))
    })

    it('a manual toggleFilter call before the initial load resolves is not later overwritten by the smart default', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      // Click a tab immediately, while the initial fetch is still in flight
      expect(result.current.isLoading).toBe(true)
      act(() => result.current.toggleFilter('checkedIn'))
      expect(result.current.selectedFilter).toBe('checkedIn')

      // Once the load resolves, the smart default (which would pick "pending"
      // for this fixture) must NOT clobber the manual selection
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.selectedFilter).toBe('checkedIn')
    })

    it('toggleFilter clicking the active tab again clears the filter back to null', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      act(() => result.current.toggleFilter('pending'))
      expect(result.current.selectedFilter).toBeNull()
    })
  })

  // ── Pin + exit animation (e.g. after marking falta) ───────────────────────────

  describe('pin + exit animation', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    function mockPendingPlusAbsent() {
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow(), // EMP-001, pending — resolves the default filter to "pending"
            makeRow({
              employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null },
              attendance: { id: 'att-2', day_status: 'ABSENCE' } as TodayAttendanceRow['attendance'],
            }),
          ],
        },
      } as never)
    }

    it('pinEmployeeCard keeps a row rendered even once it no longer matches the active filter, with no exit animation yet', async () => {
      mockPendingPlusAbsent()

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      // Under the "pending" filter, EMP-002 (absent) is normally hidden
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001'])

      act(() => result.current.pinEmployeeCard('emp-002'))

      // Pinned — stays rendered, but not yet playing the exit animation
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001', 'emp-002'])
      expect(result.current.isCardExiting('emp-002')).toBe(false)
    })

    it('onFaltaFlowComplete plays the exit animation, then removes the row after it finishes', async () => {
      mockPendingPlusAbsent()

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      act(() => result.current.pinEmployeeCard('emp-002'))
      expect(result.current.isCardExiting('emp-002')).toBe(false)

      vi.useFakeTimers()
      act(() => result.current.onFaltaFlowComplete('emp-002'))

      // Still rendered — now playing the exit animation
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001', 'emp-002'])
      expect(result.current.isCardExiting('emp-002')).toBe(true)

      act(() => vi.advanceTimersByTime(350))

      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001'])
      expect(result.current.isCardExiting('emp-002')).toBe(false)
    })

    it('does not get stuck hidden on every tab when the refetch already confirmed the bucket before the animation even started', async () => {
      // `mockPendingPlusAbsent()` has emp-002 already ABSENCE in `data` from the
      // very first load — simulating the real mark-falta timing: the manager
      // can sit on the "¿Deseas justificar la falta ahora?" dialog for a while
      // after the mutation's own refetch already landed, so by the time
      // onFaltaFlowComplete finally calls startExitAnimation, `data` has long
      // since confirmed the new bucket. A snapshot taken only at animation
      // start (or only at animation end) is already the fresh reference in
      // this case, so a reference-based check can never detect a "later"
      // change — this must be decided from the row's live computed bucket
      // instead (see attendanceBucket() in startExitAnimation).
      mockPendingPlusAbsent()

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      act(() => result.current.pinEmployeeCard('emp-002'))

      vi.useFakeTimers()
      act(() => result.current.onFaltaFlowComplete('emp-002'))
      act(() => vi.advanceTimersByTime(350))
      vi.useRealTimers()

      // Without the fix, the row would now be forced out of every tab via the
      // 'hidden' override, since the reference captured whenever the timer
      // read `data` would already equal whatever it's compared against later
      // — stuck until some unrelated future refetch happens to change the
      // reference. Switching to the tab the employee actually belongs to
      // must reveal it immediately instead.
      act(() => result.current.toggleFilter('absent'))
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-002'])
    })

    it('onFaltaFlowComplete plays the exit animation even when `data` has not refetched yet (still shows the row as pending)', async () => {
      // Both rows still pending in `data` — simulating the window between
      // "Confirmar falta" (which fires the mutation and pins the card) and
      // the mutation's onSuccess refetch actually landing. The decision to
      // animate must not be based on this stale snapshot.
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow(), // emp-001, pending
            makeRow({
              employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null },
            }), // emp-002, still pending in `data` — refetch hasn't landed
          ],
        },
      } as never)

      const { wrapper, queryClient } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      act(() => result.current.pinEmployeeCard('emp-002'))

      vi.useFakeTimers()
      act(() => result.current.onFaltaFlowComplete('emp-002'))

      // Must still play the exit animation — the flow guarantees emp-002 ends
      // up ABSENCE (bucket 'absent'), which doesn't match the "pending" tab,
      // even though `data` here hasn't caught up yet.
      expect(result.current.isCardExiting('emp-002')).toBe(true)

      // The mutation's refetch lands mid-animation, now reflecting ABSENCE —
      // same as useMarkDayStatus's onSuccess invalidateQueries in production.
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow(),
            makeRow({
              employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null },
              attendance: { id: 'att-2', day_status: 'ABSENCE' } as TodayAttendanceRow['attendance'],
            }),
          ],
        },
      } as never)
      await act(async () => {
        await queryClient.invalidateQueries({ queryKey: ['attendances', 'daily'] })
      })

      act(() => vi.advanceTimersByTime(350))
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001'])
    })

    it('onFaltaFlowComplete clears the pin immediately, with no exit animation, when the row still matches the active filter', async () => {
      mockPendingPlusAbsent()

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      // "Total" reveals everyone, so the ABSENCE row (emp-002) already matches
      // the active filter before and after the flow — it never needs to leave.
      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
      act(() => result.current.toggleFilter('total'))

      act(() => result.current.pinEmployeeCard('emp-002'))
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001', 'emp-002'])

      act(() => result.current.onFaltaFlowComplete('emp-002'))

      // Pin cleared immediately — no 'exiting' state, no animation, row stays put
      expect(result.current.isCardExiting('emp-002')).toBe(false)
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001', 'emp-002'])
    })

    it('does not animate a card against the newly selected date if the manager switches dates while a mark-falta flow is still open', async () => {
      // Unlike the four confirm* actions, onFaltaFlowComplete isn't called
      // from a mutation's onSuccess — it fires whenever the manager dismisses
      // the justify-now?/RegisterLeaveDialog UI, which can happen well after
      // markDayStatus started the flow (and well after a date switch reset
      // cardOverrides underneath the still-open dialog).
      mockPendingPlusAbsent()
      vi.mocked(attendanceApi.markDayStatus).mockReturnValueOnce(new Promise(() => {}) as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      act(() => result.current.pinEmployeeCard('emp-002'))
      act(() => { void result.current.markDayStatus(makeEmployee({ id: 'emp-002' }), 'ABSENCE') })

      // Manager switches to a different date before dismissing the
      // justify-now? dialog that follows a successful falta.
      act(() => result.current.setSelectedDate('2026-02-24'))

      vi.useFakeTimers()
      act(() => result.current.onFaltaFlowComplete('emp-002'))

      // Without the fix, this would start the exit animation against
      // whatever the newly selected date's row says — and since it never
      // matches the guessed 'absent' target bucket on an unrelated day, the
      // card would end up force-hidden on every tab for up to 35s.
      expect(result.current.isCardExiting('emp-002')).toBe(false)

      act(() => vi.advanceTimersByTime(35_000))
      expect(result.current.isCardExiting('emp-002')).toBe(false)
      vi.useRealTimers()
    })

    it('keeps a pinned/exiting row in its original grid position instead of moving it to the end', async () => {
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow(), // emp-001, pending
            makeRow({
              employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null },
              attendance: { id: 'att-2', day_status: 'ABSENCE' } as TodayAttendanceRow['attendance'],
            }), // emp-002, absent — sits BETWEEN two pending rows
            makeRow({
              employee: { id: 'emp-003', code: 'EMP-003', user: { first_name: 'Beto', last_name: 'Ruiz' }, roles: [], daily_wage: null },
            }), // emp-003, pending
          ],
        },
      } as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001', 'emp-003'])

      act(() => result.current.pinEmployeeCard('emp-002'))

      // emp-002 reappears in its original slot (between emp-001 and emp-003),
      // not appended after emp-003
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001', 'emp-002', 'emp-003'])
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
        result.current.confirmBulkOvertimeDecision(true, 'LFT_PROPORTIONAL')
      })

      await waitFor(() => {
        expect(attendanceApi.overtimeDecision).toHaveBeenCalledWith('att-001', {
          authorize: true,
          valuation_method: 'LFT_PROPORTIONAL',
        })
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

    it('enqueueBulkOvertime appends entries on successive calls (does not replace)', async () => {
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

      act(() => {
        result.current.enqueueBulkOvertime([
          { attendance_id: 'att-002', employee_name: 'María García', overtime_minutes: 20 },
        ])
      })

      // First entry is still current (second call appended, not replaced)
      expect(result.current.currentBulkOvertime?.attendance_id).toBe('att-001')

      // Confirm first decision — queue should advance to att-002
      await act(async () => {
        result.current.confirmBulkOvertimeDecision(true)
      })

      await waitFor(() => {
        expect(result.current.currentBulkOvertime?.attendance_id).toBe('att-002')
      })
    })

    it('does not advance queue when API call fails', async () => {
      vi.mocked(attendanceApi.overtimeDecision).mockRejectedValueOnce(new Error('Network error'))
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.enqueueBulkOvertime([
          { attendance_id: 'att-001', employee_name: 'Carlos Mendoza', overtime_minutes: 35 },
          { attendance_id: 'att-002', employee_name: 'María García', overtime_minutes: 20 },
        ])
      })

      await act(async () => {
        result.current.confirmBulkOvertimeDecision(true)
      })

      // Wait for mutation to fully settle (isPending → false) before asserting queue state
      await waitFor(() => {
        expect(result.current.isRecordingOvertimeDecision).toBe(false)
      })

      // Queue must not have advanced — att-001 is retryable, att-002 not yet processed
      expect(result.current.currentBulkOvertime?.attendance_id).toBe('att-001')
      expect(attendanceApi.overtimeDecision).toHaveBeenCalledTimes(1)
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

    // ── applyToRest=true ("Aplicar para el resto" checkbox) ──────────────────

    it('confirmBulkOvertimeDecision(applyToRest=true) calls the bulk endpoint with every queued attendance_id', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.enqueueBulkOvertime([
          { attendance_id: 'att-001', employee_name: 'Carlos Mendoza', overtime_minutes: 35 },
          { attendance_id: 'att-002', employee_name: 'María García', overtime_minutes: 20 },
          { attendance_id: 'att-003', employee_name: 'Ana López', overtime_minutes: 15 },
        ])
      })

      await act(async () => {
        result.current.confirmBulkOvertimeDecision(true, 'AGREED_RATE', 90, undefined, true)
      })

      await waitFor(() => {
        expect(attendanceApi.bulkOvertimeDecision).toHaveBeenCalledWith({
          attendance_ids: ['att-001', 'att-002', 'att-003'],
          authorize: true,
          valuation_method: 'AGREED_RATE',
          agreed_rate: 90,
        })
      })
      expect(attendanceApi.overtimeDecision).not.toHaveBeenCalled()
    })

    it('confirmBulkOvertimeDecision(applyToRest=true) clears the whole queue on success', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.enqueueBulkOvertime([
          { attendance_id: 'att-001', employee_name: 'Carlos Mendoza', overtime_minutes: 35 },
          { attendance_id: 'att-002', employee_name: 'María García', overtime_minutes: 20 },
        ])
      })

      await act(async () => {
        result.current.confirmBulkOvertimeDecision(false, undefined, undefined, undefined, true)
      })

      await waitFor(() => {
        expect(result.current.currentBulkOvertime).toBeNull()
      })
    })

    it('confirmBulkOvertimeDecision(applyToRest=true) does nothing when queue is empty', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.confirmBulkOvertimeDecision(true, undefined, undefined, undefined, true)
      })

      expect(attendanceApi.bulkOvertimeDecision).not.toHaveBeenCalled()
    })
  })

  // ── Extra day express flow ───────────────────────────────────────────────────

  describe('extra day flow', () => {
    const restDaySchedule = {
      day_of_week: 7,
      is_day_off: true,
      expected_start: null,
      expected_lunch_start: null,
      expected_lunch_end: null,
      lunch_duration_minutes: null,
      expected_end: null,
    }

    const mockExtraDay = {
      id: 'ned-001',
      employee_id: 'emp-001',
      branch_id: 1,
      date: '2026-04-20',
      agreed_daily_wage: 200,
      prima_percent: 100,
      prima_amount: 200,
      approved_by: 'usr-001',
      status: 'APPROVED' as const,
      notes: null,
    }

    it('openExtraDay sets extraDayRow', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const row = makeRow()
      act(() => { result.current.openExtraDay(row) })

      expect(result.current.extraDayRow).toEqual(row)
    })

    it('closeExtraDay clears extraDayRow', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const row = makeRow()
      act(() => { result.current.openExtraDay(row) })
      act(() => { result.current.closeExtraDay() })

      expect(result.current.extraDayRow).toBeNull()
    })

    it('confirmExtraDay does nothing when extraDayRow is null', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      act(() => {
        result.current.confirmExtraDay({ agreed_daily_wage: 200, prima_percent: 100, notes: '' })
      })

      expect(mockNegotiatedRegister).not.toHaveBeenCalled()
    })

    it('confirmExtraDay calls negotiatedExtraDayApi.register with correct payload', async () => {
      mockNegotiatedRegister.mockResolvedValueOnce(mockExtraDay)
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const row = makeRow()
      act(() => { result.current.openExtraDay(row) })

      await act(async () => {
        result.current.confirmExtraDay({ agreed_daily_wage: 200, prima_percent: 100, notes: '' })
      })

      await waitFor(() =>
        expect(mockNegotiatedRegister).toHaveBeenCalledWith(
          expect.objectContaining({
            employee_id: 'emp-001',
            agreed_daily_wage: 200,
            prima_percent: 100,
          }),
        ),
      )
    })

    it('confirmExtraDay clears extraDayRow and opens check-in dialog on success', async () => {
      mockNegotiatedRegister.mockResolvedValueOnce(mockExtraDay)
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const row = makeRow()
      act(() => { result.current.openExtraDay(row) })

      await act(async () => {
        result.current.confirmExtraDay({ agreed_daily_wage: 200, prima_percent: 100, notes: '' })
      })

      await waitFor(() => {
        expect(result.current.extraDayRow).toBeNull()
        expect(result.current.pendingCheckInEmployee).toEqual(row.employee)
      })
    })

    it('confirmExtraDay closes extra day dialog on API error', async () => {
      mockNegotiatedRegister.mockRejectedValueOnce(new Error('Network error'))
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const row = makeRow()
      act(() => { result.current.openExtraDay(row) })

      await act(async () => {
        result.current.confirmExtraDay({ agreed_daily_wage: 200, prima_percent: 100, notes: '' })
      })

      await waitFor(() => {
        expect(result.current.extraDayRow).toBeNull()
        expect(result.current.pendingCheckInEmployee).toBeNull()
      })
    })

    it('openCheckIn intercepts rest-day row and sets extraDayRow instead', async () => {
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const row = makeRow({ schedule: restDaySchedule })
      act(() => { result.current.openCheckIn(row) })

      expect(result.current.extraDayRow).toEqual(row)
      expect(result.current.pendingCheckInEmployee).toBeNull()
    })

    it('isRegisteringExtraDay is true while mutation is in flight', async () => {
      let resolve!: (v: unknown) => void
      mockNegotiatedRegister.mockReturnValueOnce(new Promise(r => { resolve = r }))
      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      const row = makeRow()
      act(() => { result.current.openExtraDay(row) })

      act(() => {
        result.current.confirmExtraDay({ agreed_daily_wage: 200, prima_percent: 100, notes: '' })
      })

      await waitFor(() => expect(result.current.isRegisteringExtraDay).toBe(true))
      await act(async () => { resolve(mockExtraDay) })
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
