import { useState, useMemo, useCallback } from 'react'
import { useCloseDay } from '@/services/attendance-hooks'
import { getAttendancePhase, formatTime } from '@/types/attendance'
import type { TodayAttendanceRow, CloseDayLunchReturn, OvertimePendingEntry } from '@/types/attendance'
import { currentTimeLabel } from '@/lib/datetime'

export interface LunchReturnEntry {
  attendanceId: string
  employeeName: string
  lunchStart: string // ISO datetime from API
  lunchStartDisplay: string // HH:mm for display
  preCalculatedReturn: string // HH:mm pre-calculated
  selectedReturn: string // HH:mm user-selected
}

export interface CloseDaySummary {
  checkOuts: Array<{ employeeName: string }>
  absences: Array<{ employeeName: string }>
}

export type CloseDayStep = 'lunch-returns' | 'confirm'

export interface UseCloseDayPanelResult {
  // Panel state
  isOpen: boolean
  open: () => void
  close: () => void
  // Wizard
  currentStep: CloseDayStep
  hasPendingLunchReturns: boolean
  goNext: () => void
  goBack: () => void
  // Step 1: Lunch returns
  lunchReturnEntries: LunchReturnEntry[]
  updateLunchReturn: (attendanceId: string, time: string) => void
  // Step 2: Confirm
  closeTime: string
  setCloseTime: (time: string) => void
  summary: CloseDaySummary
  // Action
  confirm: () => void
  isSubmitting: boolean
  // Overtime decisions pending after bulk close
  overtimePending: OvertimePendingEntry[]
  clearOvertimePending: () => void
}

/**
 * Compute the pre-calculated lunch return time: lunch_start + lunch_duration_minutes.
 * Returns the HH:mm string, or falls back to current time if data is missing.
 */
function computeExpectedReturn(lunchStartIso: string, lunchDurationMinutes: number | null): string {
  if (!lunchDurationMinutes || !lunchStartIso) {
    return currentTimeLabel()
  }

  // Parse the lunch_start ISO to extract the local CDMX time, then add duration
  const displayTime = formatTime(lunchStartIso)
  if (displayTime === '—') return currentTimeLabel()

  const [hStr, mStr] = displayTime.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  const totalMinutes = h * 60 + m + lunchDurationMinutes
  const retH = Math.floor(totalMinutes / 60) % 24
  const retM = totalMinutes % 60

  return `${String(retH).padStart(2, '0')}:${String(retM).padStart(2, '0')}`
}

export function useCloseDayPanel(
  rows: TodayAttendanceRow[],
  branchId: number | null,
): UseCloseDayPanelResult {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<CloseDayStep>('lunch-returns')
  const [closeTime, setCloseTime] = useState(currentTimeLabel)
  const [overtimePending, setOvertimePending] = useState<OvertimePendingEntry[]>([])
  const closeDayMutation = useCloseDay()

  // Entries for lunch returns: employees at-lunch (lunch_start but no lunch_end)
  const lunchReturnEntries = useMemo(() => {
    const entries: LunchReturnEntry[] = []
    for (const row of rows) {
      const phase = getAttendancePhase(row.attendance)
      if (phase !== 'at-lunch' || !row.attendance) continue

      const lunchStart = row.attendance.lunch_start
      if (!lunchStart) continue

      const preCalc = computeExpectedReturn(
        lunchStart,
        row.schedule?.lunch_duration_minutes ?? null,
      )

      entries.push({
        attendanceId: row.attendance.id,
        employeeName: `${row.employee.first_name} ${row.employee.last_name}`,
        lunchStart,
        lunchStartDisplay: formatTime(lunchStart),
        preCalculatedReturn: preCalc,
        selectedReturn: preCalc,
      })
    }
    return entries
  }, [rows])

  // Track user overrides for lunch return times
  const [lunchReturnOverrides, setLunchReturnOverrides] = useState<Record<string, string>>({})

  const entriesWithOverrides = useMemo(() =>
    lunchReturnEntries.map((e) => ({
      ...e,
      selectedReturn: lunchReturnOverrides[e.attendanceId] ?? e.preCalculatedReturn,
    })),
    [lunchReturnEntries, lunchReturnOverrides],
  )

  const updateLunchReturn = useCallback((attendanceId: string, time: string) => {
    setLunchReturnOverrides((prev) => ({ ...prev, [attendanceId]: time }))
  }, [])

  const hasPendingLunchReturns = lunchReturnEntries.length > 0

  // Summary for step 2
  const summary = useMemo((): CloseDaySummary => {
    const checkOuts: CloseDaySummary['checkOuts'] = []
    const absences: CloseDaySummary['absences'] = []

    for (const row of rows) {
      const phase = getAttendancePhase(row.attendance)
      const name = `${row.employee.first_name} ${row.employee.last_name}`

      if (phase === 'pending') {
        // No check_in → will be marked as ABSENCE
        absences.push({ employeeName: name })
      } else if (
        phase !== 'done' &&
        phase !== 'on-leave' &&
        phase !== 'day-off' &&
        phase !== 'absence'
      ) {
        // Has check_in but no check_out → will receive check-out
        // (includes 'at-lunch' employees whose lunch_end was just resolved in step 1)
        // Excludes day-off and absence — already resolved, no checkout needed.
        checkOuts.push({ employeeName: name })
      }
    }

    return { checkOuts, absences }
  }, [rows])

  const open = useCallback(() => {
    setIsOpen(true)
    setCurrentStep(hasPendingLunchReturns ? 'lunch-returns' : 'confirm')
    setCloseTime(currentTimeLabel())
    setLunchReturnOverrides({})
  }, [hasPendingLunchReturns])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const goNext = useCallback(() => {
    setCurrentStep('confirm')
  }, [])

  const goBack = useCallback(() => {
    setCurrentStep('lunch-returns')
  }, [])

  const clearOvertimePending = useCallback(() => {
    setOvertimePending([])
  }, [])

  const confirm = useCallback(() => {
    if (!branchId) return

    const lunchReturns: CloseDayLunchReturn[] = entriesWithOverrides.map((e) => ({
      attendance_id: e.attendanceId,
      lunch_end: e.selectedReturn,
    }))

    closeDayMutation.mutate(
      {
        branch_id: branchId,
        close_time: closeTime,
        lunch_returns: lunchReturns.length > 0 ? lunchReturns : undefined,
      },
      {
        onSuccess: (result) => {
          close()
          const pending = result.data.data.overtime_pending
          if (pending.length > 0) {
            setOvertimePending(pending)
          }
        },
      },
    )
  }, [branchId, closeTime, entriesWithOverrides, closeDayMutation, close])

  return {
    isOpen,
    open,
    close,
    currentStep,
    hasPendingLunchReturns,
    goNext,
    goBack,
    lunchReturnEntries: entriesWithOverrides,
    updateLunchReturn,
    closeTime,
    setCloseTime,
    summary,
    confirm,
    isSubmitting: closeDayMutation.isPending,
    overtimePending,
    clearOvertimePending,
  }
}
