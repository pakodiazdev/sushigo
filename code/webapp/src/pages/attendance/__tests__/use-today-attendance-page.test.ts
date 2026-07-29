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
    ]
  }

  it('with null filter, shows everyone except VACATION/DAY_OFF (default view)', () => {
    const visible = filterRowsForGrid(rowsFixture(), null)
    expect(visible.map((r) => r.employee.code)).toEqual(['E1', 'E2', 'E3', 'E4', 'E7'])
  })

  it('with "total" filter, shows literally everyone including VACATION/DAY_OFF', () => {
    const visible = filterRowsForGrid(rowsFixture(), 'total')
    expect(visible).toHaveLength(7)
  })

  it('with "absent" filter, shows only ABSENCE/VACATION/DAY_OFF rows', () => {
    const visible = filterRowsForGrid(rowsFixture(), 'absent')
    expect(visible.map((r) => r.employee.code)).toEqual(['E4', 'E5', 'E6'])
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
