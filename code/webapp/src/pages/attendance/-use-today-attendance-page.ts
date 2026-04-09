import { useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useTodayAttendance, useCheckIn, useLunchStart, useLunchReturn, useCheckOut } from '@/services/attendance-hooks'
import { getAttendancePhase } from '@/types/attendance'
import type { TodayAttendanceRow, AttendancePhase, TodayAttendanceEmployee } from '@/types/attendance'
import type { AttendanceSummary } from '@/components/attendance'

interface PendingAttendanceData {
  employee: TodayAttendanceEmployee
  attendanceId: string
}

/** Computes attendance summary from rows (exported for testing) */
export function computeSummary(rows: TodayAttendanceRow[]): AttendanceSummary {
  let pending = 0, checkedIn = 0, done = 0, withOvertime = 0

  for (const row of rows) {
    const phase = getAttendancePhase(row.attendance)
    if (phase === 'pending') pending++
    else if (phase === 'done' || phase === 'on-leave') done++
    else checkedIn++

    if ((row.attendance?.overtime_minutes ?? 0) > 0) withOvertime++
  }

  return { total: rows.length, pending, checkedIn, done, withOvertime }
}

// Re-export from shared utility for backwards compatibility with today.tsx import
export { currentTimeLabel } from '@/lib/datetime'

/** CDMX timezone offset — hardcoded to UTC-6 (standard time). DST is not handled. */
const CDMX_OFFSET_HOURS = -6

/**
 * ISO 8601 / RFC 3339 from a "HH:mm" string using today's date in CDMX timezone.
 * Hardcodes -06:00 offset (CDMX standard time) because this is a business app
 * that always operates in the CDMX timezone — the backend normalizes to UTC via
 * Carbon::parse($value)->utc(). See CLAUDE.md § DateTime Standard.
 * (exported for testing)
 */
export function timeToIso(hhmm: string): string {
  if (!hhmm?.includes(':')) {
    throw new TypeError(`Invalid time value: "${hhmm}"`)
  }
  const [hours = 0, minutes = 0] = hhmm.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new TypeError(`Invalid time value: "${hhmm}"`)
  }
  // Get today's date in CDMX timezone using manual offset
  const now = new Date()
  const cdmxTime = new Date(now.getTime() + CDMX_OFFSET_HOURS * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  // Always use CDMX offset (-06:00)
  return `${cdmxTime.getUTCFullYear()}-${pad(cdmxTime.getUTCMonth() + 1)}-${pad(cdmxTime.getUTCDate())}T${pad(hours)}:${pad(minutes)}:00-06:00`
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
  // Register leave action
  pendingLeaveEmployee: TodayAttendanceEmployee | null
  openRegisterLeave: (employee: TodayAttendanceEmployee) => void
  closeRegisterLeave: () => void
}

export function useTodayAttendancePage(): UseTodayAttendancePageResult {
  const currentBranch = useAuthStore(s => s.currentBranch)
  const branchId = currentBranch?.id ?? null

  const { data = [], isLoading, isError } = useTodayAttendance(branchId)
  const checkInMutation = useCheckIn()
  const lunchStartMutation = useLunchStart()
  const lunchReturnMutation = useLunchReturn()
  const checkOutMutation = useCheckOut()

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

  // ── Register leave state ─────────────────────────────────────────────────────
  const [pendingLeaveEmployee, setPendingLeaveEmployee] =
    useState<TodayAttendanceEmployee | null>(null)

  const openRegisterLeave = useCallback((employee: TodayAttendanceEmployee) => {
    setPendingLeaveEmployee(employee)
  }, [])

  const closeRegisterLeave = useCallback(() => {
    setPendingLeaveEmployee(null)
  }, [])

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
    // Register leave
    pendingLeaveEmployee,
    openRegisterLeave,
    closeRegisterLeave,
  }
}
