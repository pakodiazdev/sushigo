import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useTodayAttendance, useCheckIn } from '@/services/attendance-hooks'
import { getAttendancePhase } from '@/types/attendance'
import type { TodayAttendanceRow, AttendancePhase, TodayAttendanceEmployee } from '@/types/attendance'

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

/** ISO 8601 / RFC 3339 from a "HH:mm" string using today's date and local timezone offset */
function timeToIso(hhmm: string): string {
  const [hours = 0, minutes = 0] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  const offset = -d.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const absOff = Math.abs(offset)
  const oh = pad(Math.floor(absOff / 60))
  const om = pad(absOff % 60)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${sign}${oh}:${om}`
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
  selectedTime: string
  onTimeChange: (time: string) => void
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

  const [pendingCheckInEmployee, setPendingCheckInEmployee] =
    useState<TodayAttendanceEmployee | null>(null)
  const [selectedTime, setSelectedTime] = useState('')

  const openCheckIn = (employee: TodayAttendanceEmployee) => {
    setSelectedTime(currentTimeLabel())
    setPendingCheckInEmployee(employee)
  }

  const closeCheckIn = () => setPendingCheckInEmployee(null)

  const confirmCheckIn = () => {
    if (!pendingCheckInEmployee) return
    checkInMutation.mutate(
      { employee_id: pendingCheckInEmployee.id, check_in: timeToIso(selectedTime) },
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
    pendingCheckInEmployee,
    isCheckingIn: checkInMutation.isPending,
    selectedTime,
    onTimeChange: setSelectedTime,
    openCheckIn,
    closeCheckIn,
    confirmCheckIn,
  }
}
