// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { TodayAttendanceRow, TodayAttendanceData, TodayScheduleDay } from '@/types/attendance'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockMutate = vi.fn()

vi.mock('@/services/attendance-hooks', () => ({
  useCloseDay: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}))

import { useCloseDayPanel } from '../use-close-day-panel'

// Default time used as the third argument for useCloseDayPanel
const DEFAULT_TIME = '22:00'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<TodayAttendanceRow> = {}): TodayAttendanceRow {
  return {
    employee: {
      id: `emp-${Math.random().toString(36).slice(2, 6)}`,
      first_name: 'Carlos',
      last_name: 'Mendoza',
      code: 'EMP-001',
      roles: ['employee'],
    },
    attendance: null,
    schedule: null,
    today_leave: null,
    ...overrides,
  }
}

function makeSchedule(overrides: Partial<TodayScheduleDay> = {}): TodayScheduleDay {
  return {
    day_of_week: 4,
    is_day_off: false,
    expected_start: '2026-04-02T19:00:00Z',
    expected_lunch_start: '2026-04-02T20:00:00Z',
    expected_lunch_end: '2026-04-02T20:30:00Z',
    lunch_duration_minutes: 60,
    expected_end: '2026-04-03T04:00:00Z',
    ...overrides,
  }
}

function makeAttendanceData(phase: 'pending' | 'checked-in' | 'at-lunch' | 'returned' | 'done'): TodayAttendanceData | null {
  const base: TodayAttendanceData = {
    id: `att-${Math.random().toString(36).slice(2, 6)}`,
    check_in: '2026-04-02T19:00:00Z',
    check_out: null,
    lunch_start: null,
    lunch_end: null,
    entry_late_seconds: 0,
    entry_late_minutes: 0,
    is_entry_deductible: false,
    overtime_minutes: 0,
    overtime_authorized: false,
    overtime_authorized_at: null,
    requires_overtime_decision: false,
    day_status: 'WORKED',
  }

  switch (phase) {
    case 'pending':
      return null
    case 'checked-in':
      return { ...base }
    case 'at-lunch':
      return { ...base, lunch_start: '2026-04-02T20:00:00Z' }
    case 'returned':
      return { ...base, lunch_start: '2026-04-02T20:00:00Z', lunch_end: '2026-04-02T21:00:00Z' }
    case 'done':
      return { ...base, lunch_start: '2026-04-02T20:00:00Z', lunch_end: '2026-04-02T21:00:00Z', check_out: '2026-04-03T04:00:00Z' }
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.clearAllMocks()
})

describe('useCloseDayPanel', () => {
  describe('panel state', () => {
    it('starts closed', () => {
      const { result } = renderHook(() => useCloseDayPanel([], null, DEFAULT_TIME))
      expect(result.current.isOpen).toBe(false)
    })

    it('opens and closes', () => {
      const { result } = renderHook(() => useCloseDayPanel([], 1, DEFAULT_TIME))

      act(() => result.current.open())
      expect(result.current.isOpen).toBe(true)

      act(() => result.current.close())
      expect(result.current.isOpen).toBe(false)
    })
  })

  describe('step navigation', () => {
    it('starts on confirm step when no pending lunch returns', () => {
      const rows = [makeRow({ attendance: makeAttendanceData('returned') })]
      const { result } = renderHook(() => useCloseDayPanel(rows, 1, DEFAULT_TIME))

      act(() => result.current.open())
      expect(result.current.currentStep).toBe('confirm')
      expect(result.current.hasPendingLunchReturns).toBe(false)
    })

    it('starts on lunch-returns step when there are pending lunches', () => {
      const rows = [makeRow({ attendance: makeAttendanceData('at-lunch') })]
      const { result } = renderHook(() => useCloseDayPanel(rows, 1, DEFAULT_TIME))

      act(() => result.current.open())
      expect(result.current.currentStep).toBe('lunch-returns')
      expect(result.current.hasPendingLunchReturns).toBe(true)
    })

    it('navigates forward and backward', () => {
      const rows = [makeRow({ attendance: makeAttendanceData('at-lunch') })]
      const { result } = renderHook(() => useCloseDayPanel(rows, 1, DEFAULT_TIME))

      act(() => result.current.open())
      expect(result.current.currentStep).toBe('lunch-returns')

      act(() => result.current.goNext())
      expect(result.current.currentStep).toBe('confirm')

      act(() => result.current.goBack())
      expect(result.current.currentStep).toBe('lunch-returns')
    })
  })

  describe('lunch return entries', () => {
    it('computes entries for at-lunch employees', () => {
      const rows = [
        makeRow({
          employee: { id: 'emp-001', first_name: 'Carlos', last_name: 'Mendoza', code: 'EMP-001', roles: ['employee'] },
          attendance: makeAttendanceData('at-lunch'),
          schedule: makeSchedule({ lunch_duration_minutes: 60 }),
        }),
      ]
      const { result } = renderHook(() => useCloseDayPanel(rows, 1, DEFAULT_TIME))

      expect(result.current.lunchReturnEntries).toHaveLength(1)
      expect(result.current.lunchReturnEntries[0]!.employeeName).toBe('Carlos Mendoza')
    })

    it('does not include returned or pending employees', () => {
      const rows = [
        makeRow({ attendance: makeAttendanceData('returned') }),
        makeRow({ attendance: makeAttendanceData('pending') }),
        makeRow({ attendance: makeAttendanceData('done') }),
      ]
      const { result } = renderHook(() => useCloseDayPanel(rows, 1, DEFAULT_TIME))
      expect(result.current.lunchReturnEntries).toHaveLength(0)
    })

    it('allows updating lunch return time', () => {
      const attData = makeAttendanceData('at-lunch')
      const rows = [makeRow({ attendance: attData })]
      const { result } = renderHook(() => useCloseDayPanel(rows, 1, DEFAULT_TIME))

      const attId = result.current.lunchReturnEntries[0]!.attendanceId

      act(() => result.current.updateLunchReturn(attId, '16:30'))

      expect(result.current.lunchReturnEntries[0]!.selectedReturn).toBe('16:30')
    })
  })

  describe('summary', () => {
    it('computes check-outs for non-done non-pending employees', () => {
      const rows = [
        makeRow({ attendance: makeAttendanceData('returned') }),
        makeRow({ attendance: makeAttendanceData('checked-in') }),
      ]
      const { result } = renderHook(() => useCloseDayPanel(rows, 1, DEFAULT_TIME))

      expect(result.current.summary.checkOuts).toHaveLength(2)
      expect(result.current.summary.absences).toHaveLength(0)
    })

    it('computes absences for pending employees', () => {
      const rows = [
        makeRow({ attendance: makeAttendanceData('pending') }),
        makeRow({ attendance: makeAttendanceData('pending') }),
      ]
      const { result } = renderHook(() => useCloseDayPanel(rows, 1, DEFAULT_TIME))

      expect(result.current.summary.checkOuts).toHaveLength(0)
      expect(result.current.summary.absences).toHaveLength(2)
    })

    it('excludes done employees from both lists', () => {
      const rows = [makeRow({ attendance: makeAttendanceData('done') })]
      const { result } = renderHook(() => useCloseDayPanel(rows, 1, DEFAULT_TIME))

      expect(result.current.summary.checkOuts).toHaveLength(0)
      expect(result.current.summary.absences).toHaveLength(0)
    })
  })

  describe('close time', () => {
    it('defaults to current time label', () => {
      const { result } = renderHook(() => useCloseDayPanel([], 1, DEFAULT_TIME))
      act(() => result.current.open())
      expect(result.current.closeTime).toBe('22:00')
    })

    it('allows setting close time', () => {
      const { result } = renderHook(() => useCloseDayPanel([], 1, DEFAULT_TIME))
      act(() => result.current.open())

      act(() => result.current.setCloseTime('17:30'))
      expect(result.current.closeTime).toBe('17:30')
    })
  })

  describe('overtime pending', () => {
    it('starts with empty overtimePending', () => {
      const { result } = renderHook(() => useCloseDayPanel([], 1, DEFAULT_TIME))
      expect(result.current.overtimePending).toEqual([])
    })

    it('clearOvertimePending resets to empty array', () => {
      const { result } = renderHook(() => useCloseDayPanel([], 1, DEFAULT_TIME))

      // Simulate overtime being set by manually calling clear — starts already empty
      act(() => result.current.clearOvertimePending())
      expect(result.current.overtimePending).toEqual([])
    })

    it('confirm passes onSuccess callback that captures overtime_pending', () => {
      const rows = [makeRow({ attendance: makeAttendanceData('returned') })]
      const { result } = renderHook(() => useCloseDayPanel(rows, 1, DEFAULT_TIME))

      act(() => result.current.open())
      act(() => result.current.confirm())

      // Extract the onSuccess callback from the mutation call
      const [, mutateOptions] = mockMutate.mock.calls[0] as [unknown, { onSuccess: (r: unknown) => void }]

      const fakeResponse = {
        data: {
          data: {
            lunch_returns: 0,
            check_outs: 1,
            absences: 0,
            leaves: 0,
            day_offs: 0,
            overtime_pending: [
              { attendance_id: 'att-001', employee_name: 'Carlos Mendoza', overtime_minutes: 35 },
            ],
          },
        },
      }

      act(() => mutateOptions.onSuccess(fakeResponse))

      expect(result.current.overtimePending).toEqual([
        { attendance_id: 'att-001', employee_name: 'Carlos Mendoza', overtime_minutes: 35 },
      ])
    })

    it('does not crash when overtime_pending is absent from response', () => {
      const rows = [makeRow({ attendance: makeAttendanceData('returned') })]
      const { result } = renderHook(() => useCloseDayPanel(rows, 1, DEFAULT_TIME))

      act(() => result.current.open())
      act(() => result.current.confirm())

      const [, mutateOptions] = mockMutate.mock.calls[0] as [unknown, { onSuccess: (r: unknown) => void }]

      // Backend version that doesn't return overtime_pending at all
      expect(() =>
        act(() => mutateOptions.onSuccess({
          data: { data: { lunch_returns: 0, check_outs: 1, absences: 0, leaves: 0, day_offs: 0 } },
        }))
      ).not.toThrow()

      expect(result.current.overtimePending).toEqual([])
    })

    it('confirm does not set overtimePending when overtime_pending is empty', () => {
      const rows = [makeRow({ attendance: makeAttendanceData('returned') })]
      const { result } = renderHook(() => useCloseDayPanel(rows, 1, DEFAULT_TIME))

      act(() => result.current.open())
      act(() => result.current.confirm())

      const [, mutateOptions] = mockMutate.mock.calls[0] as [unknown, { onSuccess: (r: unknown) => void }]

      act(() => mutateOptions.onSuccess({
        data: { data: { lunch_returns: 0, check_outs: 1, absences: 0, leaves: 0, day_offs: 0, overtime_pending: [] } },
      }))

      expect(result.current.overtimePending).toEqual([])
    })

    it('closes the panel on successful confirm', () => {
      const rows = [makeRow({ attendance: makeAttendanceData('returned') })]
      const { result } = renderHook(() => useCloseDayPanel(rows, 1, DEFAULT_TIME))

      act(() => result.current.open())
      expect(result.current.isOpen).toBe(true)

      act(() => result.current.confirm())
      const [, mutateOptions] = mockMutate.mock.calls[0] as [unknown, { onSuccess: (r: unknown) => void }]
      act(() => mutateOptions.onSuccess({
        data: { data: { overtime_pending: [] } },
      }))

      expect(result.current.isOpen).toBe(false)
    })
  })

  describe('confirm', () => {
    it('calls mutation with correct data (no lunch returns)', () => {
      const rows = [makeRow({ attendance: makeAttendanceData('returned') })]
      const { result } = renderHook(() => useCloseDayPanel(rows, 1, DEFAULT_TIME))

      act(() => result.current.open())
      act(() => result.current.setCloseTime('22:00'))
      act(() => result.current.confirm())

      expect(mockMutate).toHaveBeenCalledWith(
        {
          branch_id: 1,
          close_time: '22:00',
          lunch_returns: undefined,
        },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    })

    it('calls mutation with lunch returns when present', () => {
      const attData = makeAttendanceData('at-lunch')
      const rows = [
        makeRow({
          attendance: attData,
          schedule: makeSchedule({ lunch_duration_minutes: 60 }),
        }),
      ]
      const { result } = renderHook(() => useCloseDayPanel(rows, 1, DEFAULT_TIME))

      act(() => result.current.open())
      act(() => result.current.confirm())

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          branch_id: 1,
          lunch_returns: expect.arrayContaining([
            expect.objectContaining({
              attendance_id: attData!.id,
              lunch_end: expect.any(String),
            }),
          ]),
        }),
        expect.any(Object)
      )
    })

    it('does not call mutation when branchId is null', () => {
      const { result } = renderHook(() => useCloseDayPanel([], null, DEFAULT_TIME))
      act(() => result.current.confirm())
      expect(mockMutate).not.toHaveBeenCalled()
    })
  })
})
