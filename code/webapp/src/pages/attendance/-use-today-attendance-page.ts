import { useAuthStore } from '@/stores/auth.store'
import { useTodayAttendance } from '@/services/attendance-hooks'
import { getAttendancePhase } from '@/types/attendance'
import type { TodayAttendanceRow, AttendancePhase } from '@/types/attendance'

// ============================================================================
// Hook: useTodayAttendancePage
// Owns all data-fetching, derived state, and summary metrics for the page.
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

export interface UseTodayAttendancePageResult {
  rows: TodayAttendanceRow[]
  summary: AttendanceSummary
  isLoading: boolean
  isError: boolean
  branchName: string | null
  hasBranch: boolean
  getPhase: (row: TodayAttendanceRow) => AttendancePhase
}

export function useTodayAttendancePage(): UseTodayAttendancePageResult {
  const currentBranch = useAuthStore(s => s.currentBranch)
  const branchId = currentBranch?.id ?? null

  const { data = [], isLoading, isError } = useTodayAttendance(branchId)

  const summary = computeSummary(data)

  return {
    rows: data,
    summary,
    isLoading,
    isError,
    branchName: currentBranch?.name ?? null,
    hasBranch: !!branchId,
    getPhase: (row) => getAttendancePhase(row.attendance),
  }
}
