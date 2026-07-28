import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDailyAttendance, useCheckIn, useLunchStart, useLunchReturn, useCheckOut, useOvertimeDecision, useBulkOvertimeDecision, useMarkDayStatus } from '@/services/attendance-hooks'
import { useExtraDayExpress } from '@/components/attendance/use-extra-day-express'
import { getAttendancePhase, isAbsentRow, isHiddenFromGrid } from '@/types/attendance'
import { todayDateCdmx } from '@/lib/datetime'
import { timeToIsoWithOffset } from '@/lib/timezone'
import { useBusinessDate } from '@/stores/clock.store'
import type { TodayAttendanceRow, AttendancePhase, TodayAttendanceEmployee, OvertimeDecisionPayload, OvertimePendingEntry, OvertimeValuationMethod } from '@/types/attendance'
import type { AttendanceSummary, AttendanceFilter } from '@/components/attendance'

// Re-export from shared utilities for backwards compatibility
export { currentTimeLabel } from '@/lib/datetime'

export interface PendingAttendanceData {
  employee: TodayAttendanceEmployee
  attendanceId: string
  /** Existing ISO value being corrected — undefined/null means a first-time registration. */
  currentValue?: string | null
}

type AttendanceBucket = 'pending' | 'checkedIn' | 'done' | 'absent'

/** Which stat bucket a row belongs to (exported for testing) */
export function attendanceBucket(row: TodayAttendanceRow): AttendanceBucket {
  if (isAbsentRow(row)) return 'absent'
  const phase = getAttendancePhase(row.attendance)
  if (phase === 'pending') return 'pending'
  if (phase === 'done') return 'done'
  return 'checkedIn'
}

/** Computes attendance summary from rows (exported for testing) */
export function computeSummary(rows: TodayAttendanceRow[]): AttendanceSummary {
  let pending = 0, checkedIn = 0, done = 0, absent = 0, withOvertime = 0

  for (const row of rows) {
    const bucket = attendanceBucket(row)
    if (bucket === 'pending') pending++
    else if (bucket === 'checkedIn') checkedIn++
    else if (bucket === 'done') done++
    else absent++

    if ((row.attendance?.overtime_minutes ?? 0) > 0) withOvertime++
  }

  return { total: rows.length, pending, checkedIn, done, absent, withOvertime }
}

/**
 * Whether a single row belongs in the grid for the given tab filter.
 * `null` (no tab selected) is the default view: everything except rows that never
 * need action (VACATION, scheduled rest days) — ABSENCE/LEAVE stay visible by
 * default since their cards expose actions/info the manager still needs (see
 * isHiddenFromGrid). Selecting "Total" or "Ausentes" overrides that default to
 * reveal the rows hidden from the default view.
 */
function matchesGridFilter(row: TodayAttendanceRow, filter: AttendanceFilter | null): boolean {
  if (filter === 'total') return true
  if (filter === 'absent') return isAbsentRow(row)
  if (filter === null) return !isHiddenFromGrid(row)
  return !isHiddenFromGrid(row) && attendanceBucket(row) === filter
}

/** Rows to render in the main grid for the given tab filter (exported for testing). */
export function filterRowsForGrid(rows: TodayAttendanceRow[], filter: AttendanceFilter | null): TodayAttendanceRow[] {
  return rows.filter((row) => matchesGridFilter(row, filter))
}

/**
 * Smart default tab applied once the page's first data load resolves and no
 * tab was already chosen (e.g. from the URL). Cascades through the buckets in
 * priority order — Pendientes, then En trabajo, then Completados, then
 * Ausentes — landing on the first one that actually has anyone in it, so the
 * manager never lands on an empty single-bucket tab (e.g. once everyone has
 * checked out, or on a day where every employee is on vacation). Falls back
 * to `null` (the default full view) only when there are no employees at all.
 * Exported for testing.
 */
export function resolveDefaultFilter(summary: AttendanceSummary): AttendanceFilter | null {
  if (summary.pending > 0) return 'pending'
  if (summary.checkedIn > 0) return 'checkedIn'
  if (summary.done > 0) return 'done'
  if (summary.absent > 0) return 'absent'
  return null
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
 * Builds the discriminated overtime-decision payload from the dialog's loose
 * positional args. `valuation_method` (and its matching rate/factor) is only
 * attached when authorizing, so a reject never carries stale method state.
 * Exported for testing.
 */
export function buildOvertimeDecisionPayload(
  authorize: boolean,
  valuationMethod?: OvertimeValuationMethod,
  agreedRate?: number,
  agreedFactor?: number,
): OvertimeDecisionPayload {
  if (!authorize) return { authorize: false }

  if (valuationMethod === 'AGREED_RATE') {
    return { authorize: true, valuation_method: 'AGREED_RATE', agreed_rate: agreedRate ?? 0 }
  }
  if (valuationMethod === 'SALARY_FACTOR') {
    return { authorize: true, valuation_method: 'SALARY_FACTOR', agreed_factor: agreedFactor ?? 0 }
  }
  return { authorize: true, valuation_method: 'LFT_PROPORTIONAL' }
}

/**
 * ISO 8601 / RFC 3339 from a "HH:mm" string using the given date in business timezone.
 * Uses centralized timezone resolver with proper offset calculation.
 * The backend normalizes to UTC via Carbon::parse($value)->utc().
 * See CLAUDE.md § DateTime Standard.
 * (exported for testing)
 */
export function timeToIso(hhmm: string, date?: string): string {
  return timeToIsoWithOffset(hhmm, date)
}

export interface UseTodayAttendancePageResult {
  // Data
  rows: TodayAttendanceRow[]
  visibleRows: TodayAttendanceRow[]
  summary: AttendanceSummary
  isLoading: boolean
  isError: boolean
  branchName: string | null
  hasBranch: boolean
  branchId: number | null
  getPhase: (row: TodayAttendanceRow) => AttendancePhase
  // Stat tab filter
  selectedFilter: AttendanceFilter | null
  toggleFilter: (filter: AttendanceFilter) => void
  // Keeps a card rendered through the mark-falta → justify-now? → (dialog) flow,
  // then plays an exit animation once the flow concludes
  isCardExiting: (employeeId: string) => boolean
  pinEmployeeCard: (employeeId: string) => void
  onFaltaFlowComplete: (employeeId: string) => void
  // Date selection
  selectedDate: string
  setSelectedDate: (date: string) => void
  // Check-in action
  pendingCheckInEmployee: TodayAttendanceEmployee | null
  pendingCheckInCurrentValue: string | null
  isCheckingIn: boolean
  openCheckIn: (row: TodayAttendanceRow) => void
  closeCheckIn: () => void
  confirmCheckIn: (time: string, reason?: string) => void
  // Lunch-start action
  pendingLunchStart: PendingAttendanceData | null
  isRegisteringLunch: boolean
  openLunchStart: (employee: TodayAttendanceEmployee, attendanceId: string, currentValue?: string | null) => void
  closeLunchStart: () => void
  confirmLunchStart: (time: string, reason?: string) => void
  // Lunch-return action
  pendingLunchReturn: PendingAttendanceData | null
  isRegisteringLunchReturn: boolean
  openLunchReturn: (employee: TodayAttendanceEmployee, attendanceId: string, currentValue?: string | null) => void
  closeLunchReturn: () => void
  confirmLunchReturn: (time: string, reason?: string) => void
  // Check-out action
  pendingCheckOut: PendingAttendanceData | null
  isCheckingOut: boolean
  openCheckOut: (employee: TodayAttendanceEmployee, attendanceId: string, currentValue?: string | null) => void
  closeCheckOut: () => void
  confirmCheckOut: (time: string, reason?: string) => void
  // Overtime decision action (individual)
  pendingOvertimeDecision: PendingAttendanceData | null
  pendingOvertimeMinutes: number
  isRecordingOvertimeDecision: boolean
  openOvertimeDecision: (employee: TodayAttendanceEmployee, attendanceId: string) => void
  closeOvertimeDecision: () => void
  confirmOvertimeDecision: (authorize: boolean, valuationMethod?: OvertimeValuationMethod, agreedRate?: number, agreedFactor?: number) => void
  // Bulk overtime queue (from bulk day close)
  currentBulkOvertime: OvertimePendingEntry | null
  bulkOvertimeQueueLength: number
  enqueueBulkOvertime: (entries: OvertimePendingEntry[]) => void
  confirmBulkOvertimeDecision: (authorize: boolean, valuationMethod?: OvertimeValuationMethod, agreedRate?: number, agreedFactor?: number, applyToRest?: boolean) => void
  closeBulkOvertimeDecision: () => void
  // Mark day status action
  isMarkingDayStatus: boolean
  markDayStatus: (employee: TodayAttendanceEmployee, status: 'ABSENCE', reason?: string) => void
  // Extra day express action
  extraDayRow: TodayAttendanceRow | null
  isRegisteringExtraDay: boolean
  openExtraDay: (row: TodayAttendanceRow) => void
  closeExtraDay: () => void
  confirmExtraDay: (payload: { agreed_daily_wage: number; prima_percent: number; notes: string }) => void
}

export function useTodayAttendancePage(initialFilter: AttendanceFilter | null = null): UseTodayAttendancePageResult {
  const currentBranch = useAuthStore(s => s.currentBranch)
  const branchId = currentBranch?.id ?? null

  const businessDate = useBusinessDate()
  const [selectedDate, setSelectedDate] = useState<string>(businessDate ?? todayDateCdmx())

  // Sync selectedDate when business_date changes (clock simulation, Layout pre-fetch)
  useEffect(() => {
    if (businessDate) setSelectedDate(businessDate)
  }, [businessDate])

  const { data = [], isLoading, isError } = useDailyAttendance(branchId, selectedDate)
  const checkInMutation = useCheckIn()
  const lunchStartMutation = useLunchStart()
  const lunchReturnMutation = useLunchReturn()
  const checkOutMutation = useCheckOut()
  const overtimeDecisionMutation = useOvertimeDecision()
  const bulkOvertimeDecisionMutation = useBulkOvertimeDecision()
  const markDayStatusMutation = useMarkDayStatus()
  const extraDayMutation = useExtraDayExpress()

  const summary = computeSummary(data)

  // ── Stat tab filter ───────────────────────────────────────────────────────────
  const [selectedFilter, setSelectedFilter] = useState<AttendanceFilter | null>(initialFilter)
  const hasAppliedDefaultFilter = useRef(initialFilter !== null)

  // Apply the smart default (Pendientes, or En trabajo if nothing is pending)
  // once the first load resolves, unless a tab was already chosen (e.g. from
  // the URL). Runs at most once — later loading states (refetches, date
  // changes) never override a filter the user or the URL already picked.
  useEffect(() => {
    if (hasAppliedDefaultFilter.current || isLoading) return
    hasAppliedDefaultFilter.current = true
    setSelectedFilter(resolveDefaultFilter(summary))
  }, [isLoading, summary])

  const toggleFilter = useCallback((filter: AttendanceFilter) => {
    // A manual click always wins over the smart default — even one that
    // arrives before the initial load resolves (the default-filter effect
    // below checks this same ref and skips applying its value if so).
    hasAppliedDefaultFilter.current = true
    setSelectedFilter((current) => (current === filter ? null : filter))
  }, [])

  // ── Keep a card rendered through the mark-falta → justify-now? → (dialog) flow ──
  // 'pinned'  — the underlying row no longer matches the active tab, but a dialog
  //             flow on this exact card is still in progress; render normally,
  //             fully interactive, so the flow isn't yanked out from under the user.
  // 'exiting' — the flow just concluded; play the exit animation, then remove.
  const [cardOverrides, setCardOverrides] = useState<Map<string, 'pinned' | 'exiting'>>(new Map())
  const exitTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const timers = exitTimers.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const pinEmployeeCard = useCallback((employeeId: string) => {
    setCardOverrides((current) => {
      if (current.get(employeeId) === 'pinned') return current
      const next = new Map(current)
      next.set(employeeId, 'pinned')
      return next
    })
  }, [])

  // The mark-falta flow always ends with the row in the 'absent' bucket,
  // regardless of which choice the manager makes:
  //  - Decline / no leave registered → day_status stays ABSENCE.
  //  - Justify with a full-day (non-SCHEDULED) leave → RegisterDirectLeaveAction
  //    overwrites the existing Attendance record's day_status to LEAVE.
  //  - Justify with a partial (SCHEDULED) leave → shouldCreateAttendanceRecords()
  //    is false, so RegisterDirectLeaveAction skips touching Attendance entirely
  //    and day_status is left as ABSENCE (see RegisterDirectLeaveAction.php).
  // Either way day_status ends up ABSENCE or LEAVE, so isAbsentRow is true and
  // isHiddenFromGrid is false — today_leave.time_mode never overrides this,
  // since isAbsentRow checks getAttendancePhase(row.attendance) first and only
  // falls back to today_leave for rows with NO attendance record at all.
  // This is computed from `filter` alone — deliberately NOT from `data` —
  // because `data` can still reflect the pre-mutation row when the flow
  // concludes quickly (useMarkDayStatus only invalidates/refetches on
  // success, and the manager can dismiss the justify-now prompt before that
  // refetch lands). Deciding from `data` in that window used the stale
  // (still-pending) bucket and produced the wrong answer once the real data
  // arrived a moment later.
  function matchesFilterAfterFalta(filter: AttendanceFilter | null): boolean {
    return filter === null || filter === 'total' || filter === 'absent'
  }

  // Ends the pin started by pinEmployeeCard once the mark-falta → justify-now?
  // flow concludes. If the row's final status still belongs in the active tab
  // (e.g. ABSENCE stays visible on the default view), it never actually needs
  // to leave the grid — clear the pin immediately instead of playing the
  // fade/slide-out animation, which would otherwise make the card vanish and
  // then abruptly pop back in.
  const startExitAnimation = useCallback((employeeId: string) => {
    if (matchesFilterAfterFalta(selectedFilter)) {
      const existingTimer = exitTimers.current.get(employeeId)
      if (existingTimer) {
        clearTimeout(existingTimer)
        exitTimers.current.delete(employeeId)
      }
      setCardOverrides((current) => {
        if (!current.has(employeeId)) return current
        const next = new Map(current)
        next.delete(employeeId)
        return next
      })
      return
    }

    setCardOverrides((current) => {
      const next = new Map(current)
      next.set(employeeId, 'exiting')
      return next
    })

    const existingTimer = exitTimers.current.get(employeeId)
    if (existingTimer) clearTimeout(existingTimer)

    const timer = setTimeout(() => {
      setCardOverrides((current) => {
        if (!current.has(employeeId)) return current
        const next = new Map(current)
        next.delete(employeeId)
        return next
      })
      exitTimers.current.delete(employeeId)
    }, 350)
    exitTimers.current.set(employeeId, timer)
  }, [selectedFilter])

  // Pinned/exiting rows are kept in their natural `data` position (not appended
  // at the end) so the card doesn't visibly jump while its dialog flow plays out.
  const visibleRows = useMemo(() => {
    if (cardOverrides.size === 0) return filterRowsForGrid(data, selectedFilter)
    return data.filter((row) => cardOverrides.has(row.employee.id) || matchesGridFilter(row, selectedFilter))
  }, [data, selectedFilter, cardOverrides])

  // ── Extra day express state (declared first — openCheckIn depends on it) ──────
  const [extraDayRow, setExtraDayRow] = useState<TodayAttendanceRow | null>(null)

  // ── Check-in state ───────────────────────────────────────────────────────────
  const [pendingCheckInEmployee, setPendingCheckInEmployee] =
    useState<TodayAttendanceEmployee | null>(null)
  const [pendingCheckInCurrentValue, setPendingCheckInCurrentValue] =
    useState<string | null>(null)

  // If the row is a scheduled rest day AND no extra-day agreement exists yet,
  // intercept and show the negotiation dialog first.
  // If day_status === 'EXTRA' the agreement was already approved (e.g. the
  // manager cancelled the time-picker after negotiating), so skip straight to
  // the time dialog. Correcting an already-recorded check-in never goes
  // through the extra-day dialog either — the schedule may have changed since
  // the original check-in, but a correction is editing what's already there,
  // not negotiating a new extra day.
  const openCheckIn = useCallback((row: TodayAttendanceRow) => {
    const isCorrection = !!row.attendance?.check_in
    const needsExtraDayNegotiation = row.schedule?.is_day_off && row.attendance?.day_status !== 'EXTRA'

    if (!isCorrection && needsExtraDayNegotiation) {
      setExtraDayRow(row)
    } else {
      setPendingCheckInEmployee(row.employee)
      setPendingCheckInCurrentValue(row.attendance?.check_in ?? null)
    }
  }, [])

  const closeCheckIn = useCallback(() => {
    setPendingCheckInEmployee(null)
    setPendingCheckInCurrentValue(null)
  }, [])

  const confirmCheckIn = useCallback((time: string, reason?: string) => {
    if (!pendingCheckInEmployee) return
    checkInMutation.mutate(
      { employee_id: pendingCheckInEmployee.id, check_in: timeToIso(time, selectedDate), reason },
      { onSettled: closeCheckIn }
    )
  }, [pendingCheckInEmployee, checkInMutation, closeCheckIn, selectedDate])

  // ── Lunch-start state ────────────────────────────────────────────────────────
  const [pendingLunchStart, setPendingLunchStart] =
    useState<PendingAttendanceData | null>(null)

  const openLunchStart = useCallback((employee: TodayAttendanceEmployee, attendanceId: string, currentValue?: string | null) => {
    setPendingLunchStart({ employee, attendanceId, currentValue })
  }, [])

  const closeLunchStart = useCallback(() => {
    setPendingLunchStart(null)
  }, [])

  const confirmLunchStart = useCallback((time: string, reason?: string) => {
    if (!pendingLunchStart) return
    lunchStartMutation.mutate(
      { attendance_id: pendingLunchStart.attendanceId, lunch_start: timeToIso(time, selectedDate), reason },
      { onSettled: closeLunchStart }
    )
  }, [pendingLunchStart, lunchStartMutation, closeLunchStart, selectedDate])

  // ── Lunch-return state ───────────────────────────────────────────────────────
  const [pendingLunchReturn, setPendingLunchReturn] =
    useState<PendingAttendanceData | null>(null)

  const openLunchReturn = useCallback((employee: TodayAttendanceEmployee, attendanceId: string, currentValue?: string | null) => {
    setPendingLunchReturn({ employee, attendanceId, currentValue })
  }, [])

  const closeLunchReturn = useCallback(() => {
    setPendingLunchReturn(null)
  }, [])

  const confirmLunchReturn = useCallback((time: string, reason?: string) => {
    if (!pendingLunchReturn) return
    lunchReturnMutation.mutate(
      { attendance_id: pendingLunchReturn.attendanceId, lunch_end: timeToIso(time, selectedDate), reason },
      { onSettled: closeLunchReturn }
    )
  }, [pendingLunchReturn, lunchReturnMutation, closeLunchReturn, selectedDate])

  // ── Check-out state ──────────────────────────────────────────────────────────
  const [pendingCheckOut, setPendingCheckOut] =
    useState<PendingAttendanceData | null>(null)

  const openCheckOut = useCallback((employee: TodayAttendanceEmployee, attendanceId: string, currentValue?: string | null) => {
    setPendingCheckOut({ employee, attendanceId, currentValue })
  }, [])

  const closeCheckOut = useCallback(() => {
    setPendingCheckOut(null)
  }, [])

  const confirmCheckOut = useCallback((time: string, reason?: string) => {
    if (!pendingCheckOut) return
    checkOutMutation.mutate(
      { attendance_id: pendingCheckOut.attendanceId, check_out: timeToIso(time, selectedDate), reason },
      { onSettled: closeCheckOut }
    )
  }, [pendingCheckOut, checkOutMutation, closeCheckOut, selectedDate])

  // ── Overtime decision state ───────────────────────────────────────────────────
  const [pendingOvertimeDecision, setPendingOvertimeDecision] =
    useState<PendingAttendanceData | null>(null)

  const openOvertimeDecision = useCallback((employee: TodayAttendanceEmployee, attendanceId: string) => {
    setPendingOvertimeDecision({ employee, attendanceId })
  }, [])

  const closeOvertimeDecision = useCallback(() => {
    setPendingOvertimeDecision(null)
  }, [])

  const confirmOvertimeDecision = useCallback((
    authorize: boolean,
    valuationMethod?: OvertimeValuationMethod,
    agreedRate?: number,
    agreedFactor?: number,
  ) => {
    if (!pendingOvertimeDecision) return
    overtimeDecisionMutation.mutate(
      {
        attendance_id: pendingOvertimeDecision.attendanceId,
        ...buildOvertimeDecisionPayload(authorize, valuationMethod, agreedRate, agreedFactor),
      },
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

  const confirmBulkOvertimeDecision = useCallback((
    authorize: boolean,
    valuationMethod?: OvertimeValuationMethod,
    agreedRate?: number,
    agreedFactor?: number,
    applyToRest?: boolean,
  ) => {
    if (!currentBulkOvertime) return

    if (applyToRest) {
      bulkOvertimeDecisionMutation.mutate(
        {
          attendance_ids: bulkOvertimeQueue.map(entry => entry.attendance_id),
          ...buildOvertimeDecisionPayload(authorize, valuationMethod, agreedRate, agreedFactor),
        },
        { onSuccess: () => setBulkOvertimeQueue([]) },
      )
      return
    }

    overtimeDecisionMutation.mutate(
      {
        attendance_id: currentBulkOvertime.attendance_id,
        ...buildOvertimeDecisionPayload(authorize, valuationMethod, agreedRate, agreedFactor),
      },
      { onSuccess: () => setBulkOvertimeQueue(q => q.slice(1)) },
    )
  }, [currentBulkOvertime, bulkOvertimeQueue, overtimeDecisionMutation, bulkOvertimeDecisionMutation])

  const closeBulkOvertimeDecision = useCallback(() => {
    setBulkOvertimeQueue([])
  }, [])

  // ── Mark day status ───────────────────────────────────────────────────────────
  const markDayStatus = useCallback(
    (employee: TodayAttendanceEmployee, status: 'ABSENCE', reason?: string) => {
      markDayStatusMutation.mutate({
        employee_id: employee.id,
        date: selectedDate,
        day_status: status,
        reason,
      })
    },
    [markDayStatusMutation, selectedDate],
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
      extraDayMutation.mutate(
        {
          employee_id: employee.id,
          date: selectedDate,
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
    [extraDayRow, extraDayMutation, closeExtraDay, selectedDate],
  )

  return {
    rows: data,
    visibleRows,
    summary,
    isLoading,
    isError,
    branchName: currentBranch?.name ?? null,
    hasBranch: !!branchId,
    branchId,
    getPhase: (row) => getAttendancePhase(row.attendance),
    selectedFilter,
    toggleFilter,
    isCardExiting: (employeeId) => cardOverrides.get(employeeId) === 'exiting',
    pinEmployeeCard,
    onFaltaFlowComplete: startExitAnimation,
    selectedDate,
    setSelectedDate,
    // Check-in
    pendingCheckInEmployee,
    pendingCheckInCurrentValue,
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
    isRecordingOvertimeDecision: overtimeDecisionMutation.isPending || bulkOvertimeDecisionMutation.isPending,
    openOvertimeDecision,
    closeOvertimeDecision,
    confirmOvertimeDecision,
    // Bulk overtime queue
    currentBulkOvertime,
    bulkOvertimeQueueLength: bulkOvertimeQueue.length,
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
