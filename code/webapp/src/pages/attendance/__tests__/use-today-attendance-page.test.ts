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
 * dev mode to catch impure ones.
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

  // ── Card exit animation ─────────────────────────────────────────────────────

  describe('card exit animation', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    function mockTwoPending() {
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow(), // emp-001, pending — resolves the default filter to "pending"
            makeRow({
              employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null },
            }),
          ],
        },
      } as never)
    }

    function mockAbsenceRecord() {
      return {
        data: {
          status: 201,
          data: {
            id: 'att-2', employee_id: 'emp-002', date: '2026-04-01',
            check_in: null, lunch_start: null, lunch_end: null, check_out: null,
            day_status: 'ABSENCE',
          },
        },
      }
    }

    function mockCheckInRecord(employeeId: string) {
      return {
        data: {
          status: 200,
          data: {
            id: 'att-x', employee_id: employeeId, date: '2026-04-01',
            check_in: '2026-04-01T13:00:00-06:00', lunch_start: null, lunch_end: null, check_out: null,
            day_status: 'WORKED',
          },
        },
      }
    }

    // ── check-in / lunch / check-out (new: these never animated before) ──────

    it('confirmCheckIn plays the exit animation when the confirmed record no longer matches the active tab', async () => {
      // Initial load: both pending. Any subsequent refetch (the real
      // useCheckIn hook's own invalidateQueries) must reflect the check-in —
      // otherwise this test would be asserting against its own stale fixture,
      // not the app's behavior.
      vi.mocked(attendanceApi.daily)
        .mockResolvedValueOnce({ data: { data: [makeRow(), makeRow({ employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null } })] } } as never)
        .mockResolvedValue({
          data: {
            data: [
              makeRow({ attendance: { id: 'att-x', check_in: '2026-04-01T13:00:00-06:00', day_status: 'WORKED' } as TodayAttendanceRow['attendance'] }),
              makeRow({ employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null } }),
            ],
          },
        } as never)
      vi.mocked(attendanceApi.checkIn).mockResolvedValueOnce(mockCheckInRecord('emp-001') as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
      const row = makeRow()
      act(() => result.current.openCheckIn(row))

      vi.useFakeTimers()
      await act(async () => { result.current.confirmCheckIn('14:00') })

      expect(result.current.isCardExiting('emp-001')).toBe(true)
      act(() => vi.advanceTimersByTime(350))
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-002'])
    })

    it('confirmCheckIn does not animate a correction of an already-recorded check-in', async () => {
      mockTwoPending()
      vi.mocked(attendanceApi.checkIn).mockResolvedValueOnce(mockCheckInRecord('emp-001') as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
      const row = makeRow({
        attendance: { id: 'att-x', check_in: '2026-04-01T12:00:00Z' } as TodayAttendanceRow['attendance'],
      })
      act(() => result.current.openCheckIn(row))

      await act(async () => { result.current.confirmCheckIn('14:00') })

      expect(result.current.isCardExiting('emp-001')).toBe(false)
    })

    it('does not animate an unrelated card on the newly selected date if the manager switches dates while a check-in is still in flight', async () => {
      mockTwoPending()
      let resolveCheckIn: (value: unknown) => void
      vi.mocked(attendanceApi.checkIn).mockReturnValueOnce(
        new Promise((resolve) => { resolveCheckIn = resolve }) as never
      )

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
      act(() => result.current.openCheckIn(makeRow()))
      act(() => { result.current.confirmCheckIn('14:00') })

      act(() => result.current.setSelectedDate('2026-02-24'))
      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      vi.useFakeTimers()
      await act(async () => {
        resolveCheckIn(mockCheckInRecord('emp-001'))
        await Promise.resolve()
      })

      // Without the staleness guard, this would animate/hide emp-001 on the
      // NEWLY selected date, which the original check-in has nothing to do with.
      expect(result.current.isCardExiting('emp-001')).toBe(false)
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001', 'emp-002'])
    })

    it('does not clobber a live hold on the currently viewed day when a stale response from a previously viewed day finally arrives (bug regression: card must not vanish mid-dialog)', async () => {
      // Mount (date X) and the new date's own first load both show two
      // pending rows; every call after that (the background refetch
      // markDayStatus's own invalidateQueries triggers) reflects emp-001 as
      // ABSENCE — same two-then-persistent pattern as the markDayStatus
      // test elsewhere in this file, so that refetch doesn't silently
      // revert the confirmed absence back to its stale pre-mutation fixture.
      vi.mocked(attendanceApi.daily)
        .mockResolvedValueOnce({ data: { data: [makeRow(), makeRow({ employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null } })] } } as never)
        .mockResolvedValueOnce({ data: { data: [makeRow(), makeRow({ employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null } })] } } as never)
        .mockResolvedValue({
          data: {
            data: [
              makeRow({ attendance: { id: 'att-2', day_status: 'ABSENCE' } as TodayAttendanceRow['attendance'] }),
              makeRow({ employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null } }),
            ],
          },
        } as never)
      let resolveCheckIn: (value: unknown) => void
      vi.mocked(attendanceApi.checkIn).mockReturnValueOnce(
        new Promise((resolve) => { resolveCheckIn = resolve }) as never
      )
      vi.mocked(attendanceApi.markDayStatus).mockResolvedValueOnce({
        data: {
          status: 201,
          data: { id: 'att-2', employee_id: 'emp-001', date: '2026-02-24', check_in: null, check_out: null, day_status: 'ABSENCE' },
        },
      } as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      // Confirm a check-in for emp-001 on the ORIGINAL date — left in flight.
      act(() => result.current.openCheckIn(makeRow()))
      act(() => { result.current.confirmCheckIn('14:00') })

      // Switch to a different date before that check-in resolves.
      act(() => result.current.setSelectedDate('2026-02-24'))
      // Wait for the NEW date's own query to actually resolve (not just for
      // selectedFilter, which doesn't reset on a date change and so would
      // already read 'pending' from before) — markDayStatus needs a real
      // row in `data` to capture as rowBeforeMutation, and the cache splice
      // below needs an already-populated cache entry to update.
      await waitFor(() => expect(result.current.rows.map((r) => r.employee.id)).toContain('emp-001'))

      // On the NEW date, mark falta for the SAME employee — pins the card
      // while its justify-now? dialog flow is still in progress. The
      // confirmed ABSENCE no longer matches "Pendientes", so from here on
      // the pin alone is what keeps the row in visibleRows.
      const succeeded = await act(async () => result.current.markDayStatus(makeEmployee({ id: 'emp-001' }), 'ABSENCE'))
      expect(succeeded).toBe(true)
      // Wait for the background refetch (markDayStatus's own
      // invalidateQueries) to land the confirmed ABSENCE — from here on,
      // the row no longer naturally matches "Pendientes", so the pin alone
      // is what keeps it in visibleRows.
      await waitFor(() => expect(result.current.rows.find((r) => r.employee.id === 'emp-001')?.attendance?.day_status).toBe('ABSENCE'))

      // The original date's check-in finally resolves — its stale-guard
      // fires since the date it was captured for no longer matches what's
      // on screen.
      vi.useFakeTimers()
      await act(async () => {
        resolveCheckIn(mockCheckInRecord('emp-001'))
        await Promise.resolve()
      })

      // The live 'pinned' hold from the falta flow on the CURRENT date must
      // survive — without it the ABSENCE row would vanish from visibleRows
      // while its justify-now? dialog is still open.
      expect(result.current.visibleRows.map((r) => r.employee.id)).toContain('emp-001')
    })

    it('does not flash an unrelated card into a different tab if the manager switches tabs while a check-in is still in flight (bug regression: card never belonged to the newly active tab)', async () => {
      mockTwoPending()
      let resolveCheckIn: (value: unknown) => void
      vi.mocked(attendanceApi.checkIn).mockReturnValueOnce(
        new Promise((resolve) => { resolveCheckIn = resolve }) as never
      )

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
      act(() => result.current.openCheckIn(makeRow()))
      act(() => { result.current.confirmCheckIn('14:00') })

      // Switch to "Ausentes" — emp-001 was never part of this tab, before or
      // after the check-in (it lands as 'checkedIn', not 'absent').
      act(() => result.current.toggleFilter('absent'))
      expect(result.current.selectedFilter).toBe('absent')

      vi.useFakeTimers()
      await act(async () => {
        resolveCheckIn(mockCheckInRecord('emp-001'))
        await Promise.resolve()
      })

      // Without the preMutationRow check, the confirmed row wouldn't match
      // 'absent' either, forcing an 'exiting' override that would flash
      // emp-001 into "Ausentes" for 350ms before sliding it back out — a card
      // that never belonged to this tab in the first place.
      expect(result.current.isCardExiting('emp-001')).toBe(false)
      expect(result.current.visibleRows.map((r) => r.employee.id)).not.toContain('emp-001')
    })

    it('cancels an in-flight exit animation immediately when the manager switches to the tab the card now belongs in (bug regression: no half-faded, unclickable flash before snapping to normal)', async () => {
      // Initial load: both pending. The follow-up (persistent) response
      // reflects emp-001 checked in — same two-response pattern as the
      // markDayStatus test below, so a background refetch triggered by the
      // mutation's own invalidateQueries doesn't silently revert `data`
      // back to its stale pre-mutation fixture out from under this test.
      vi.mocked(attendanceApi.daily)
        .mockResolvedValueOnce({ data: { data: [makeRow(), makeRow({ employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null } })] } } as never)
        .mockResolvedValue({
          data: {
            data: [
              makeRow({ attendance: { id: 'att-x', check_in: '2026-04-01T13:00:00-06:00', day_status: 'WORKED' } as TodayAttendanceRow['attendance'] }),
              makeRow({ employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null } }),
            ],
          },
        } as never)
      vi.mocked(attendanceApi.checkIn).mockResolvedValueOnce(mockCheckInRecord('emp-001') as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
      act(() => result.current.openCheckIn(makeRow()))
      await act(async () => { result.current.confirmCheckIn('14:00') })

      // Still on "Pendientes" — the checked-in row doesn't match it, so the
      // exit animation legitimately starts playing.
      expect(result.current.isCardExiting('emp-001')).toBe(true)

      // Switch to "En trabajo" mid-animation — the row genuinely belongs
      // here now.
      await waitFor(() => expect(result.current.rows.find((r) => r.employee.id === 'emp-001')?.attendance?.check_in).not.toBeNull())
      act(() => result.current.toggleFilter('checkedIn'))

      // The stale exit (whose animation was for LEAVING "Pendientes") must
      // be cancelled immediately instead of continuing to fade/pop the card
      // for the remainder of its 350ms window in a tab it actually belongs to.
      expect(result.current.isCardExiting('emp-001')).toBe(false)
      expect(result.current.visibleRows.map((r) => r.employee.id)).toContain('emp-001')
    })

    it('two mutations for the same employee within the animation window only ever leave one live timer armed', async () => {
      mockTwoPending()
      vi.mocked(attendanceApi.checkIn).mockResolvedValueOnce(mockCheckInRecord('emp-001') as never)
      vi.mocked(attendanceApi.lunchStart).mockResolvedValueOnce({
        data: { status: 200, data: { id: 'att-x', employee_id: 'emp-001', lunch_start: '2026-04-01T14:00:00-06:00', check_in: '2026-04-01T13:00:00-06:00', day_status: 'WORKED' } },
      } as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      act(() => result.current.openCheckIn(makeRow()))
      await act(async () => { result.current.confirmCheckIn('14:00') })
      expect(result.current.isCardExiting('emp-001')).toBe(true)

      // Immediately act again on the same employee (lunch-start) before the
      // first 350ms timer would fire — the stale timer must be cancelled.
      act(() => result.current.openLunchStart(makeRow().employee, 'att-x'))
      await act(async () => { result.current.confirmLunchStart('14:00') })

      expect(clearTimeoutSpy).toHaveBeenCalled()
      expect(result.current.isCardExiting('emp-001')).toBe(true)
      clearTimeoutSpy.mockRestore()
    })

    // ── mark-falta (existing flow, now routed through markDayStatus's own
    //    confirmed response instead of a manually-called pinEmployeeCard) ────

    it('markDayStatus pins the row immediately and keeps it interactive until the flow concludes', async () => {
      mockTwoPending()
      vi.mocked(attendanceApi.markDayStatus).mockReturnValueOnce(new Promise(() => {}) as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      act(() => { void result.current.markDayStatus(makeEmployee({ id: 'emp-002' }), 'ABSENCE') })

      // Pinned — still rendered (its own row is already 'pending' so this
      // isn't observable via visibility, but isMarkingDayStatus flips true)
      expect(result.current.isMarkingDayStatus('emp-002')).toBe(true)
      expect(result.current.isCardExiting('emp-002')).toBe(false)
    })

    it('onFaltaFlowComplete plays the exit animation using the response captured when markDayStatus succeeded, then removes the row', async () => {
      // Initial load: both pending. Any subsequent refetch (the real
      // useMarkDayStatus hook's own invalidateQueries) must reflect the
      // absence — otherwise this test would be asserting against its own
      // stale fixture, not the app's behavior.
      vi.mocked(attendanceApi.daily)
        .mockResolvedValueOnce({ data: { data: [makeRow(), makeRow({ employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null } })] } } as never)
        .mockResolvedValue({
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
      vi.mocked(attendanceApi.markDayStatus).mockResolvedValueOnce(mockAbsenceRecord() as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      await act(async () => { await result.current.markDayStatus(makeEmployee({ id: 'emp-002' }), 'ABSENCE') })
      expect(result.current.isCardExiting('emp-002')).toBe(false)

      vi.useFakeTimers()
      act(() => result.current.onFaltaFlowComplete('emp-002'))

      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001', 'emp-002'])
      expect(result.current.isCardExiting('emp-002')).toBe(true)

      act(() => vi.advanceTimersByTime(350))

      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001'])
      expect(result.current.isCardExiting('emp-002')).toBe(false)
    })

    it('onFaltaFlowComplete uses the mutation response, not the page\'s (possibly still-stale) live data', async () => {
      // `data` never reflects the absence — simulating the window before any
      // refetch/poll has landed. The exit decision must not depend on it.
      mockTwoPending()
      vi.mocked(attendanceApi.markDayStatus).mockResolvedValueOnce(mockAbsenceRecord() as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
      await act(async () => { await result.current.markDayStatus(makeEmployee({ id: 'emp-002' }), 'ABSENCE') })

      vi.useFakeTimers()
      act(() => result.current.onFaltaFlowComplete('emp-002'))

      // `data` (from attendanceApi.daily) still says emp-002 is pending, yet
      // the animation must still fire because the CAPTURED response says ABSENCE.
      expect(result.current.isCardExiting('emp-002')).toBe(true)
    })

    it('markDayStatus failure releases the pin (bug regression: no permanent stuck pin on a failed write)', async () => {
      mockTwoPending()
      vi.mocked(attendanceApi.markDayStatus).mockRejectedValueOnce(new Error('422'))

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      const succeeded = await act(async () => result.current.markDayStatus(makeEmployee({ id: 'emp-002' }), 'ABSENCE'))
      expect(succeeded).toBe(false)
      expect(result.current.isMarkingDayStatus('emp-002')).toBe(false)

      // onFaltaFlowComplete is never reached in production on a failure (the
      // card hook's confirmFalta only opens askJustifyOpen on success), but
      // even if called, there's no captured context to animate from.
      act(() => result.current.onFaltaFlowComplete('emp-002'))
      expect(result.current.isCardExiting('emp-002')).toBe(false)
    })

    it('onFaltaFlowComplete releases a stuck pin when markDayStatus succeeded but had no pre-mutation row to hand off (bug regression: no permanent stuck pin outside its own tab)', async () => {
      // emp-002 doesn't exist in `data` yet at mutation time — markDayStatus's
      // own `data.find(...)` (captured synchronously before the mutation) has
      // nothing to hand off, so faltaFlowContext is never set for it, even
      // though the pin below is still set unconditionally. The follow-up
      // mock (landing via markDayStatus's own invalidateQueries) brings
      // emp-002 into `data` for the first time, already ABSENCE — simulating
      // a background refetch resolving the row after the action.
      vi.mocked(attendanceApi.daily)
        .mockResolvedValueOnce({ data: { data: [makeRow()] } } as never)
        .mockResolvedValue({
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
      vi.mocked(attendanceApi.markDayStatus).mockResolvedValueOnce(mockAbsenceRecord() as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001'])

      const succeeded = await act(async () => result.current.markDayStatus(makeEmployee({ id: 'emp-002' }), 'ABSENCE'))
      expect(succeeded).toBe(true)

      // The refetch lands, bringing emp-002 (now ABSENCE) into `data` for the
      // first time — force-included in "Pendientes" only because of the
      // 'pinned' override set when markDayStatus started.
      await waitFor(() => expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001', 'emp-002']))

      // No captured context exists for emp-002, so onFaltaFlowComplete must
      // clear the pin itself instead of silently returning — otherwise
      // emp-002 stays force-included in "Pendientes" forever despite being
      // ABSENCE, with no way to clear it short of a page reload.
      act(() => result.current.onFaltaFlowComplete('emp-002'))

      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001'])
    })

    it('onFaltaFlowComplete clears the pin immediately, with no exit animation, when the confirmed result still matches the active filter', async () => {
      mockTwoPending()
      vi.mocked(attendanceApi.markDayStatus).mockResolvedValueOnce(mockAbsenceRecord() as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      // "Total" reveals everyone, so the ABSENCE row already matches the
      // active filter before and after the flow — it never needs to leave.
      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
      act(() => result.current.toggleFilter('total'))

      await act(async () => { await result.current.markDayStatus(makeEmployee({ id: 'emp-002' }), 'ABSENCE') })
      act(() => result.current.onFaltaFlowComplete('emp-002'))

      expect(result.current.isCardExiting('emp-002')).toBe(false)
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001', 'emp-002'])
    })

    it('two employees\' overlapping markDayStatus calls keep independent busy/pin state', async () => {
      mockTwoPending()
      let resolveA: (value: unknown) => void
      let resolveB: (value: unknown) => void
      vi.mocked(attendanceApi.markDayStatus)
        .mockReturnValueOnce(new Promise((resolve) => { resolveA = resolve }) as never)
        .mockReturnValueOnce(new Promise((resolve) => { resolveB = resolve }) as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))

      act(() => { void result.current.markDayStatus(makeEmployee({ id: 'emp-001' }), 'ABSENCE') })
      act(() => { void result.current.markDayStatus(makeEmployee({ id: 'emp-002' }), 'ABSENCE') })

      expect(result.current.isMarkingDayStatus('emp-001')).toBe(true)
      expect(result.current.isMarkingDayStatus('emp-002')).toBe(true)

      await act(async () => {
        resolveA({ data: { status: 201, data: { id: 'att-1', employee_id: 'emp-001', day_status: 'ABSENCE' } } })
        await Promise.resolve()
      })

      expect(result.current.isMarkingDayStatus('emp-001')).toBe(false)
      expect(result.current.isMarkingDayStatus('emp-002')).toBe(true)

      await act(async () => {
        resolveB({ data: { status: 201, data: { id: 'att-2', employee_id: 'emp-002', day_status: 'ABSENCE' } } })
        await Promise.resolve()
      })
      expect(result.current.isMarkingDayStatus('emp-002')).toBe(false)
    })

    it('date/branch switch resets pinned/exiting overrides and cancels pending timers, even under StrictMode', async () => {
      mockTwoPending()
      vi.mocked(attendanceApi.markDayStatus).mockResolvedValueOnce(mockAbsenceRecord() as never)

      const { wrapper } = makeStrictWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
      await act(async () => { await result.current.markDayStatus(makeEmployee({ id: 'emp-002' }), 'ABSENCE') })

      vi.useFakeTimers()
      act(() => result.current.onFaltaFlowComplete('emp-002'))
      expect(result.current.isCardExiting('emp-002')).toBe(true)

      act(() => result.current.setSelectedDate('2026-02-24'))

      expect(result.current.isCardExiting('emp-002')).toBe(false)
      // Advancing time after the reset must not resurrect the cleared override
      act(() => vi.advanceTimersByTime(350))
      expect(result.current.isCardExiting('emp-002')).toBe(false)
    })

    it('never dead-ends the "Ver todos"/total tab — an overridden row is still included there', async () => {
      mockTwoPending()
      vi.mocked(attendanceApi.markDayStatus).mockReturnValueOnce(new Promise(() => {}) as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
      act(() => { void result.current.markDayStatus(makeEmployee({ id: 'emp-002' }), 'ABSENCE') })

      act(() => result.current.toggleFilter('total'))
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(expect.arrayContaining(['emp-001', 'emp-002']))
    })

    it('keeps a pinned/exiting row in its original grid position instead of moving it to the end', async () => {
      vi.mocked(attendanceApi.daily).mockResolvedValue({
        data: {
          data: [
            makeRow(), // emp-001, pending
            makeRow({
              employee: { id: 'emp-002', code: 'EMP-002', user: { first_name: 'Ana', last_name: 'López' }, roles: [], daily_wage: null },
              attendance: { id: 'att-2', day_status: 'ABSENCE' } as TodayAttendanceRow['attendance'],
            }), // emp-002, absent — sits BETWEEN two pending rows, doesn't match "pending"
            makeRow({
              employee: { id: 'emp-003', code: 'EMP-003', user: { first_name: 'Beto', last_name: 'Ruiz' }, roles: [], daily_wage: null },
            }), // emp-003, pending
          ],
        },
      } as never)
      vi.mocked(attendanceApi.markDayStatus).mockReturnValueOnce(new Promise(() => {}) as never)

      const { wrapper } = makeWrapper()
      const { result } = renderHook(() => useTodayAttendancePage(), { wrapper })

      await waitFor(() => expect(result.current.selectedFilter).toBe('pending'))
      expect(result.current.visibleRows.map((r) => r.employee.id)).toEqual(['emp-001', 'emp-003'])

      act(() => { void result.current.markDayStatus(makeEmployee({ id: 'emp-002' }), 'ABSENCE') })

      // emp-002 (pinned, ABSENCE — doesn't match "pending") reappears in its
      // original slot between emp-001 and emp-003, not appended after emp-003
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
