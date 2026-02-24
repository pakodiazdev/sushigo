import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useTodayAttendance, useCheckIn } from '@/services/attendance-hooks'
import { getAttendancePhase } from '@/types/attendance'
import type { TodayAttendanceRow, AttendancePhase, TodayAttendanceEmployee } from '@/types/attendance'

// ============================================================================
// Hook: useTodayAttendancePage
// Owns all data-fetching, derived state, summary metrics, and check-in action.
// ============================================================================

export interface AttendanceSummary {
  total: number
  pending: number     // No check-in yet
  checkedIn: number   // At work (includes at-lunch / returned phases)
  done: number        // Checked out
  withOvertime: number
}

function computeSummary(rows: TodayAttendanceRow[]): AttendanceSummary {
  let pending = 0, checkedIn = 0, done = 0, withOvertime = 0

  for (const row of rows) {
    const phase = getAttendancePhase(row.attendance)
    if (phase === 'pending') pending++
    else if (phase === 'done') done++
    else checkedIn++

    if ((row.attendance?.overtime_minutes ?? 0) > 0) withOvertime++
  }

  return { total: rows.length, pending, checkedIn, done, withOvertime }
}

/** Format current time as "HH:mm" for display in the confirm dialog */
function currentTimeLabel(): string {
  return new Date().toTimeString().slice(0, 5)
}

/** ISO datetime string truncated to seconds: "2026-02-24T09:05:30" */
function nowIso(): string {
  return new Date().toISOString().slice(0, 19)
}

export interface UseTodayAttendancePageResult {
  // Data
  rows: TodayAttendanceRow[]
  summary: AttendanceSummary
  isLoading: boolean
  isError: boolean
  branchName: string | null
  hasBranch: boolean
  getPhase: (row: TodayAttendanceRow) => AttendancePhase
  // Check-in action
  pendingCheckInEmployee: TodayAttendanceEmployee | null
  isCheckingIn: boolean
  confirmTimeLabel: string
  openCheckIn: (employee: TodayAttendanceEmployee) => void
  closeCheckIn: () => void
  confirmCheckIn: () => void
}

export function useTodayAttendancePage(): UseTodayAttendancePageResult {
  const currentBranch = useAuthStore(s => s.currentBranch)
  const branchId = currentBranch?.id ?? null

  const { data = [], isLoading, isError } = useTodayAttendance(branchId)
  const checkInMutation = useCheckIn()

  const summary = computeSummary(data)

  // Check-in confirm dialog state
  const [pendingCheckInEmployee, setPendingCheckInEmployee] =
    useState<TodayAttendanceEmployee | null>(null)
  const [confirmTimeLabel, setConfirmTimeLabel] = useState('')

  const openCheckIn = (employee: TodayAttendanceEmployee) => {
    setConfirmTimeLabel(currentTimeLabel())
    setPendingCheckInEmployee(employee)
  }

  const closeCheckIn = () => setPendingCheckInEmployee(null)

  const confirmCheckIn = () => {
    if (!pendingCheckInEmployee) return
    checkInMutation.mutate(
      { employee_id: pendingCheckInEmployee.id, check_in: nowIso() },
      { onSettled: closeCheckIn }
    )
  }

  return {
    rows: data,
    summary,
    isLoading,
    isError,
    branchName: currentBranch?.name ?? null,
    hasBranch: !!branchId,
    getPhase: (row) => getAttendancePhase(row.attendance),
    // Check-in
    pendingCheckInEmployee,
    isCheckingIn: checkInMutation.isPending,
    confirmTimeLabel,
    openCheckIn,
    closeCheckIn,
    confirmCheckIn,
  }
}
