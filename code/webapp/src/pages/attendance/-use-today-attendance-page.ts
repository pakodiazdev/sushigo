import { useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useTodayAttendance, useCheckIn, useLunchStart, useLunchReturn, useCheckOut, useOvertimeDecision, useMarkDayStatus } from '@/services/attendance-hooks'
import { useExtraDayExpress } from '@/components/attendance/use-extra-day-express'
import { getAttendancePhase } from '@/types/attendance'
import { todayDateCdmx } from '@/lib/datetime'
import { timeToIsoWithOffset } from '@/lib/timezone'
import type { TodayAttendanceRow, AttendancePhase, TodayAttendanceEmployee, OvertimePendingEntry } from '@/types/attendance'
import type { AttendanceSummary } from '@/components/attendance'

// Re-export from shared utilities for backwards compatibility
export { currentTimeLabel } from '@/lib/datetime'

export interface PendingAttendanceData {
  employee: TodayAttendanceEmployee
  attendanceId: string
}

/** Computes attendance summary from rows (exported for testing) */
export function computeSummary(rows: TodayAttendanceRow[]): AttendanceSummary {
  let pending = 0, checkedIn = 0, done = 0, withOvertime = 0

  for (const row of rows) {
    const phase = getAttendancePhase(row.attendance)
    if (phase === 'pending') pending++
    else if (phase === 'done' || phase === 'on-leave' || phase === 'day-off' || phase === 'absence') done++
    else checkedIn++

    if ((row.attendance?.overtime_minutes ?? 0) > 0) withOvertime++
  }

  return { total: rows.length, pending, checkedIn, done, withOvertime }
}

/**
 * Today's date in business timezone (YYYY-MM-DD).
 * Uses centralized timezone resolver from datetime.ts.
 * Exported for testing.
 */
export function todayCdmxDate(): string {
  return todayDateCdmx()
}

/**
 * ISO 8601 / RFC 3339 from a "HH:mm" string using today's date in business timezone.
 * Uses centralized timezone resolver with proper offset calculation.
 * The backend normalizes to UTC via Carbon::parse($value)->utc().
 * See CLAUDE.md § DateTime Standard.
 * (exported for testing)
 */
export function timeToIso(hhmm: string): string {
  return timeToIsoWithOffset(hhmm)
}

export interface UseTodayAttendancePageResult {
  // Data
  rows: TodayAttendanceRow[]
  summary: AttendanceSummary
  isLoading: boolean
  isError: boolean
  branchName: string | null
  hasBranch: boolean
  branchId: number | null
  getPhase: (row: TodayAttendanceRow) => AttendancePhase
  // Check-in action
  pendingCheckInEmployee: TodayAttendanceEmployee | null
  isCheckingIn: boolean
  openCheckIn: (row: TodayAttendanceRow) => void
  closeCheckIn: () => void
  confirmCheckIn: (time: string) => void
  // Lunch-start action
  pendingLunchStart: PendingAttendanceData | null
  isRegisteringLunch: boolean
  openLunchStart: (employee: TodayAttendanceEmployee, attendanceId: string) => void
  closeLunchStart: () => void
  confirmLunchStart: (time: string) => void
  // Lunch-return action
  pendingLunchReturn: PendingAttendanceData | null
  isRegisteringLunchReturn: boolean
  openLunchReturn: (employee: TodayAttendanceEmployee, attendanceId: string) => void
  closeLunchReturn: () => void
  confirmLunchReturn: (time: string) => void
  // Check-out action
  pendingCheckOut: PendingAttendanceData | null
  isCheckingOut: boolean
  openCheckOut: (employee: TodayAttendanceEmployee, attendanceId: string) => void
  closeCheckOut: () => void
  confirmCheckOut: (time: string) => void
  // Overtime decision action (individual)
  pendingOvertimeDecision: PendingAttendanceData | null
  pendingOvertimeMinutes: number
  isRecordingOvertimeDecision: boolean
  openOvertimeDecision: (employee: TodayAttendanceEmployee, attendanceId: string) => void
  closeOvertimeDecision: () => void
  confirmOvertimeDecision: (authorize: boolean) => void
  // Bulk overtime queue (from bulk day close)
  currentBulkOvertime: OvertimePendingEntry | null
  enqueueBulkOvertime: (entries: OvertimePendingEntry[]) => void
  confirmBulkOvertimeDecision: (authorize: boolean) => void
  closeBulkOvertimeDecision: () => void
  // Mark day status action
  isMarkingDayStatus: boolean
  markDayStatus: (employee: TodayAttendanceEmployee, status: 'ABSENCE') => void
  // Extra day express action
  extraDayRow: TodayAttendanceRow | null
  isRegisteringExtraDay: boolean
  openExtraDay: (row: TodayAttendanceRow) => void
  closeExtraDay: () => void
  confirmExtraDay: (payload: { agreed_daily_wage: number; prima_percent: number; notes: string }) => void
}

export function useTodayAttendancePage(): UseTodayAttendancePageResult {
  const currentBranch = useAuthStore(s => s.currentBranch)
  const branchId = currentBranch?.id ?? null

  const { data = [], isLoading, isError } = useTodayAttendance(branchId)
  const checkInMutation = useCheckIn()
  const lunchStartMutation = useLunchStart()
  const lunchReturnMutation = useLunchReturn()
  const checkOutMutation = useCheckOut()
  const overtimeDecisionMutation = useOvertimeDecision()
  const markDayStatusMutation = useMarkDayStatus()
  const extraDayMutation = useExtraDayExpress()

  const summary = computeSummary(data)

  // ── Extra day express state (declared first — openCheckIn depends on it) ──────
  const [extraDayRow, setExtraDayRow] = useState<TodayAttendanceRow | null>(null)

  // ── Check-in state ───────────────────────────────────────────────────────────
  const [pendingCheckInEmployee, setPendingCheckInEmployee] =
    useState<TodayAttendanceEmployee | null>(null)

  // If the row is a scheduled rest day, intercept and show the extra day
  // negotiation dialog first; otherwise go straight to the time dialog.
  const openCheckIn = useCallback((row: TodayAttendanceRow) => {
    if (row.schedule?.is_day_off) {
      setExtraDayRow(row)
    } else {
      setPendingCheckInEmployee(row.employee)
    }
  }, [])

  const closeCheckIn = useCallback(() => {
    setPendingCheckInEmployee(null)
  }, [])

  const confirmCheckIn = useCallback((time: string) => {
    if (!pendingCheckInEmployee) return
    checkInMutation.mutate(
      { employee_id: pendingCheckInEmployee.id, check_in: timeToIso(time) },
      { onSettled: closeCheckIn }
    )
  }, [pendingCheckInEmployee, checkInMutation, closeCheckIn])

  // ── Lunch-start state ────────────────────────────────────────────────────────
  const [pendingLunchStart, setPendingLunchStart] =
    useState<PendingAttendanceData | null>(null)

  const openLunchStart = useCallback((employee: TodayAttendanceEmployee, attendanceId: string) => {
    setPendingLunchStart({ employee, attendanceId })
  }, [])

  const closeLunchStart = useCallback(() => {
    setPendingLunchStart(null)
  }, [])

  const confirmLunchStart = useCallback((time: string) => {
    if (!pendingLunchStart) return
    lunchStartMutation.mutate(
      { attendance_id: pendingLunchStart.attendanceId, lunch_start: timeToIso(time) },
      { onSettled: closeLunchStart }
    )
  }, [pendingLunchStart, lunchStartMutation, closeLunchStart])

  // ── Lunch-return state ───────────────────────────────────────────────────────
  const [pendingLunchReturn, setPendingLunchReturn] =
    useState<PendingAttendanceData | null>(null)

  const openLunchReturn = useCallback((employee: TodayAttendanceEmployee, attendanceId: string) => {
    setPendingLunchReturn({ employee, attendanceId })
  }, [])

  const closeLunchReturn = useCallback(() => {
    setPendingLunchReturn(null)
  }, [])

  const confirmLunchReturn = useCallback((time: string) => {
    if (!pendingLunchReturn) return
    lunchReturnMutation.mutate(
      { attendance_id: pendingLunchReturn.attendanceId, lunch_end: timeToIso(time) },
      { onSettled: closeLunchReturn }
    )
  }, [pendingLunchReturn, lunchReturnMutation, closeLunchReturn])

  // ── Check-out state ──────────────────────────────────────────────────────────
  const [pendingCheckOut, setPendingCheckOut] =
    useState<PendingAttendanceData | null>(null)

  const openCheckOut = useCallback((employee: TodayAttendanceEmployee, attendanceId: string) => {
    setPendingCheckOut({ employee, attendanceId })
  }, [])

  const closeCheckOut = useCallback(() => {
    setPendingCheckOut(null)
  }, [])

  const confirmCheckOut = useCallback((time: string) => {
    if (!pendingCheckOut) return
    checkOutMutation.mutate(
      { attendance_id: pendingCheckOut.attendanceId, check_out: timeToIso(time) },
      { onSettled: closeCheckOut }
    )
  }, [pendingCheckOut, checkOutMutation, closeCheckOut])

  // ── Overtime decision state ───────────────────────────────────────────────────
  const [pendingOvertimeDecision, setPendingOvertimeDecision] =
    useState<PendingAttendanceData | null>(null)

  const openOvertimeDecision = useCallback((employee: TodayAttendanceEmployee, attendanceId: string) => {
    setPendingOvertimeDecision({ employee, attendanceId })
  }, [])

  const closeOvertimeDecision = useCallback(() => {
    setPendingOvertimeDecision(null)
  }, [])

  const confirmOvertimeDecision = useCallback((authorize: boolean) => {
    if (!pendingOvertimeDecision) return
    overtimeDecisionMutation.mutate(
      { attendance_id: pendingOvertimeDecision.attendanceId, authorize },
      { onSettled: closeOvertimeDecision }
    )
  }, [pendingOvertimeDecision, overtimeDecisionMutation, closeOvertimeDecision])

  const pendingOvertimeMinutes = pendingOvertimeDecision
    ? (data.find(r => r.attendance?.id === pendingOvertimeDecision.attendanceId)?.attendance?.overtime_minutes ?? 0)
    : 0

  // ── Bulk overtime queue (after bulk day close) ───────────────────────────────
  const [bulkOvertimeQueue, setBulkOvertimeQueue] = useState<OvertimePendingEntry[]>([])

  const currentBulkOvertime = bulkOvertimeQueue[0] ?? null

  const enqueueBulkOvertime = useCallback((entries: OvertimePendingEntry[]) => {
    setBulkOvertimeQueue(queue => [...queue, ...entries])
  }, [])

  const confirmBulkOvertimeDecision = useCallback((authorize: boolean) => {
    if (!currentBulkOvertime) return
    overtimeDecisionMutation.mutate(
      { attendance_id: currentBulkOvertime.attendance_id, authorize },
      { onSuccess: () => setBulkOvertimeQueue(q => q.slice(1)) },
    )
  }, [currentBulkOvertime, overtimeDecisionMutation])

  const closeBulkOvertimeDecision = useCallback(() => {
    setBulkOvertimeQueue([])
  }, [])

  // ── Mark day status ───────────────────────────────────────────────────────────
  const markDayStatus = useCallback(
    (employee: TodayAttendanceEmployee, status: 'ABSENCE') => {
      markDayStatusMutation.mutate({
        employee_id: employee.id,
        date: todayCdmxDate(),
        day_status: status,
      })
    },
    [markDayStatusMutation],
  )

  // ── Extra day express ─────────────────────────────────────────────────────────
  // Note: extraDayRow state is declared at the top of the hook (before openCheckIn)
  // because openCheckIn intercepts rest-day rows and opens this dialog directly.

  const openExtraDay = useCallback((row: TodayAttendanceRow) => {
    setExtraDayRow(row)
  }, [])

  const closeExtraDay = useCallback(() => {
    setExtraDayRow(null)
  }, [])

  const confirmExtraDay = useCallback(
    (payload: { agreed_daily_wage: number; prima_percent: number; notes: string }) => {
      if (!extraDayRow) return
      const employee = extraDayRow.employee
      const date = todayCdmxDate()
      extraDayMutation.mutate(
        {
          employee_id: employee.id,
          date,
          agreed_daily_wage: payload.agreed_daily_wage,
          prima_percent: payload.prima_percent,
          notes: payload.notes || undefined,
        },
        {
          onSuccess: () => {
            // Extra day negotiated — close dialog and open the time picker
            // so the manager can register the actual arrival time.
            setExtraDayRow(null)
            setPendingCheckInEmployee(employee)
          },
          onError: closeExtraDay,
        },
      )
    },
    [extraDayRow, extraDayMutation, closeExtraDay],
  )

  return {
    rows: data,
    summary,
    isLoading,
    isError,
    branchName: currentBranch?.name ?? null,
    hasBranch: !!branchId,
    branchId,
    getPhase: (row) => getAttendancePhase(row.attendance),
    // Check-in
    pendingCheckInEmployee,
    isCheckingIn: checkInMutation.isPending,
    openCheckIn,
    closeCheckIn,
    confirmCheckIn,
    // Lunch-start
    pendingLunchStart,
    isRegisteringLunch: lunchStartMutation.isPending,
    openLunchStart,
    closeLunchStart,
    confirmLunchStart,
    // Lunch-return
    pendingLunchReturn,
    isRegisteringLunchReturn: lunchReturnMutation.isPending,
    openLunchReturn,
    closeLunchReturn,
    confirmLunchReturn,
    // Check-out
    pendingCheckOut,
    isCheckingOut: checkOutMutation.isPending,
    openCheckOut,
    closeCheckOut,
    confirmCheckOut,
    // Overtime decision (individual)
    pendingOvertimeDecision,
    pendingOvertimeMinutes,
    isRecordingOvertimeDecision: overtimeDecisionMutation.isPending,
    openOvertimeDecision,
    closeOvertimeDecision,
    confirmOvertimeDecision,
    // Bulk overtime queue
    currentBulkOvertime,
    enqueueBulkOvertime,
    confirmBulkOvertimeDecision,
    closeBulkOvertimeDecision,
    // Mark day status
    isMarkingDayStatus: markDayStatusMutation.isPending,
    markDayStatus,
    // Extra day express
    extraDayRow,
    isRegisteringExtraDay: extraDayMutation.isPending,
    openExtraDay,
    closeExtraDay,
    confirmExtraDay,
  }
}
