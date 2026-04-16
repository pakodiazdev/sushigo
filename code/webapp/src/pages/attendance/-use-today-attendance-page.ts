import { useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useTodayAttendance, useCheckIn, useLunchStart, useLunchReturn, useCheckOut, useOvertimeDecision, useMarkDayStatus } from '@/services/attendance-hooks'
import { getAttendancePhase } from '@/types/attendance'
import { todayDateCdmx, currentTimeLabel } from '@/lib/datetime'
import { timeToIsoWithOffset } from '@/lib/timezone'
import type { TodayAttendanceRow, AttendancePhase, TodayAttendanceEmployee, OvertimePendingEntry } from '@/types/attendance'
import type { AttendanceSummary } from '@/components/attendance'

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

// Re-export from shared utilities for backwards compatibility
export { currentTimeLabel }

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
  openCheckIn: (employee: TodayAttendanceEmployee) => void
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

  const summary = computeSummary(data)

  // ── Check-in state ───────────────────────────────────────────────────────────
  const [pendingCheckInEmployee, setPendingCheckInEmployee] =
    useState<TodayAttendanceEmployee | null>(null)

  const openCheckIn = useCallback((employee: TodayAttendanceEmployee) => {
    setPendingCheckInEmployee(employee)
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
  }
}
