import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useDailyAttendance, useCheckIn, useLunchStart, useLunchReturn, useCheckOut, useOvertimeDecision, useBulkOvertimeDecision, useMarkDayStatus } from '@/services/attendance-hooks'
import { useExtraDayExpress } from '@/components/attendance/use-extra-day-express'
import { getAttendancePhase, isAbsentRow, isHiddenFromGrid, attendanceRecordToRowData } from '@/types/attendance'
import { todayDateCdmx } from '@/lib/datetime'
import { timeToIsoWithOffset } from '@/lib/timezone'
import { useBusinessDate } from '@/stores/clock.store'
import type { TodayAttendanceRow, AttendancePhase, TodayAttendanceEmployee, AttendanceRecord, OvertimeDecisionPayload, OvertimePendingEntry, OvertimeValuationMethod } from '@/types/attendance'
import type { AttendanceSummary, AttendanceFilter } from '@/components/attendance'

// Re-export from shared utilities for backwards compatibility
export { currentTimeLabel } from '@/lib/datetime'

export interface PendingAttendanceData {
  employee: TodayAttendanceEmployee
  attendanceId: string
  /** Existing ISO value being corrected — undefined/null means a first-time registration. */
  currentValue?: string | null
}

type AttendanceBucket = 'pending' | 'checkedIn' | 'atLunch' | 'done' | 'absent'

/** Which stat bucket a row belongs to (exported for testing) */
export function attendanceBucket(row: TodayAttendanceRow): AttendanceBucket {
  if (isAbsentRow(row)) return 'absent'
  const phase = getAttendancePhase(row.attendance)
  if (phase === 'pending') return 'pending'
  if (phase === 'done') return 'done'
  if (phase === 'at-lunch') return 'atLunch'
  return 'checkedIn'
}

/** Computes attendance summary from rows (exported for testing) */
export function computeSummary(rows: TodayAttendanceRow[]): AttendanceSummary {
  let pending = 0, checkedIn = 0, atLunch = 0, done = 0, absent = 0, withOvertime = 0

  for (const row of rows) {
    const bucket = attendanceBucket(row)
    if (bucket === 'pending') pending++
    else if (bucket === 'checkedIn') checkedIn++
    else if (bucket === 'atLunch') atLunch++
    else if (bucket === 'done') done++
    else absent++

    if ((row.attendance?.overtime_minutes ?? 0) > 0) withOvertime++
  }

  return { total: rows.length, pending, checkedIn, atLunch, done, absent, withOvertime }
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
 * priority order — Pendientes, then En trabajo, then En comida, then
 * Completados, then Ausentes — landing on the first one that actually has
 * anyone in it, so the manager never lands on an empty single-bucket tab
 * (e.g. once everyone has checked out, or on a day where every employee is
 * on vacation). Falls back to `null` (the default full view) only when there
 * are no employees at all. Exported for testing.
 */
export function resolveDefaultFilter(summary: AttendanceSummary): AttendanceFilter | null {
  if (summary.pending > 0) return 'pending'
  if (summary.checkedIn > 0) return 'checkedIn'
  if (summary.atLunch > 0) return 'atLunch'
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
  // Card exit animation — true for any of the 5 actions below once its
  // confirmed result no longer belongs in the active tab
  isCardExiting: (employeeId: string) => boolean
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
  isMarkingDayStatus: (employeeId: string) => boolean
  markDayStatus: (employee: TodayAttendanceEmployee, status: 'ABSENCE', reason?: string) => Promise<boolean>
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
  // Mirrors selectedFilter/selectedDate/branchId for the shared exit-animation
  // trigger to read at async onSuccess time — a mutation's onSuccess closure
  // captures whatever these were when `.mutate()` was called, so if the
  // manager switches tabs/date/branch while the request is in flight, reading
  // these refs (rather than the captured values) lets the trigger judge
  // against what's actually on screen NOW, not what was true when the action
  // started. See startExitAnimation below.
  const selectedFilterRef = useRef(selectedFilter)
  useEffect(() => {
    selectedFilterRef.current = selectedFilter
  }, [selectedFilter])
  const selectedDateRef = useRef(selectedDate)
  useEffect(() => {
    selectedDateRef.current = selectedDate
  }, [selectedDate])
  const branchIdRef = useRef(branchId)
  useEffect(() => {
    branchIdRef.current = branchId
  }, [branchId])

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

  // ── Card exit animation ──────────────────────────────────────────────────────
  // 'pinned'  — a multi-step dialog flow (mark-falta → justify-now? → justify
  //             dialog) is still in progress on this card even though its
  //             confirmed result no longer matches the active tab; render
  //             normally, fully interactive, so the flow isn't yanked out
  //             from under the user.
  // 'exiting' — the action (or flow) just concluded and its confirmed result
  //             no longer belongs in the active tab; play the fade/slide-out
  //             animation for 350ms, then remove.
  //
  // No 'hidden' state and no guessed target bucket: every trigger below
  // already has the mutation's own confirmed AttendanceRecord in hand by the
  // time it decides whether to animate (see startExitAnimation), so there is
  // nothing left to guess or wait on a future poll to confirm.
  const [cardOverrides, setCardOverrides] = useState<Map<string, 'pinned' | 'exiting'>>(new Map())
  const exitTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  // Bridges markDayStatus (flow start) to onFaltaFlowComplete (flow end,
  // fired later from a dialog close — not from a mutation onSuccess, so it
  // has no mutation response in scope of its own). Carries the row already
  // merged with the confirmed post-mutation attendance data, the UNMERGED
  // pre-mutation row (so startExitAnimation can tell whether the card was
  // ever part of the currently active tab — see its own comment), and the
  // date/branch the flow started for.
  const faltaFlowContext = useRef(new Map<string, { date: string; branchId: number | null; row: TodayAttendanceRow; preMutationRow: TodayAttendanceRow }>())
  const [markingDayStatusEmployeeIds, setMarkingDayStatusEmployeeIds] = useState<Set<string>>(new Set())
  const isMarkingDayStatus = useCallback(
    (employeeId: string) => markingDayStatusEmployeeIds.has(employeeId),
    [markingDayStatusEmployeeIds],
  )

  useEffect(() => {
    const timers = exitTimers.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  // `cardOverrides`/`exitTimers`/`faltaFlowContext` are keyed only by
  // employeeId, but `data` comes from useDailyAttendance(branchId,
  // selectedDate) — nothing else ties them to the specific day/branch they
  // were set for. Any pinned/exiting state (or a flow context captured mid-
  // dialog) is meaningless once the underlying data set it was computed
  // against is gone, so treat a date/branch change as a hard reset instead
  // of trying to carry it over. markingDayStatusEmployeeIds is deliberately
  // NOT touched here — it self-clears unconditionally in markDayStatus's
  // .finally(), decoupled on purpose (see markDayStatus below).
  useEffect(() => {
    exitTimers.current.forEach((timer) => clearTimeout(timer))
    exitTimers.current.clear()
    faltaFlowContext.current.clear()
    setCardOverrides(new Map())
  }, [selectedDate, branchId])

  function cancelExitTimer(employeeId: string) {
    const timer = exitTimers.current.get(employeeId)
    if (timer !== undefined) {
      clearTimeout(timer)
      exitTimers.current.delete(employeeId)
    }
  }

  function clearOverride(employeeId: string) {
    setCardOverrides((current) => {
      if (!current.has(employeeId)) return current
      const next = new Map(current)
      next.delete(employeeId)
      return next
    })
  }

  // An 'exiting' override's animation is only meaningful for the tab it was
  // triggered from — the tab the card was actually leaving. If the manager
  // switches tabs while that 350ms fade/slide is still playing, continuing
  // it in the newly selected tab is wrong either way: the card might now
  // genuinely belong there (so it should render normally, not fade out of a
  // tab it just entered) or it might not belong there at all (so it should
  // never have appeared in the first place, per the same reasoning
  // startExitAnimation's own preMutationRow guard applies at trigger time).
  // Cancel any in-flight exit the instant the filter changes; visibleRows'
  // own matchesGridFilter check takes over immediately, with no animation.
  // 'pinned' overrides are deliberately left alone — a mark-falta dialog
  // flow in progress must survive a tab switch, not get cut short by one.
  useEffect(() => {
    cardOverrides.forEach((value, employeeId) => {
      if (value !== 'exiting') return
      cancelExitTimer(employeeId)
      clearOverride(employeeId)
    })
    // Intentionally scoped to selectedFilter alone — cardOverrides is read
    // via the closure, not a dependency, since including it would re-run
    // this on every override change (pins, other exits settling) instead of
    // only when the active tab itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter])

  // Shared exit-animation trigger for every action that can move a card out
  // of the active tab (check-in, lunch-start/return, check-out, and mark-
  // falta via onFaltaFlowComplete below). `mergedRow` must already carry the
  // mutation's confirmed `attendance` — callers build it by spreading a row
  // captured SYNCHRONOUSLY before the mutation started (safe: only
  // `.attendance` is affected by these actions, never `today_leave`/
  // `today_vacation`/`schedule`) over the response's own fresh `attendance`.
  // Deliberately never reads `data`/a data ref here: the mutation hook's own
  // onSuccess (which writes the query cache) and this call-site onSuccess
  // run synchronously back-to-back, before React re-renders, so `data` would
  // still be the PRE-mutation snapshot at this exact point — reading it here
  // would silently reintroduce the same "decide from a value that hasn't
  // caught up yet" class of bug this design otherwise avoids entirely.
  const startExitAnimation = useCallback((employeeId: string, mergedRow: TodayAttendanceRow, preMutationRow: TodayAttendanceRow, forDate: string, forBranchId: number | null) => {
    // The date/branch reset effect above already clears every override the
    // instant selectedDate/branchId changes — synchronously, well before
    // this async callback (at least one network round-trip later) could
    // ever fire. So by the time forDate/forBranchId are stale here, any
    // cardOverrides entry still present for this employeeId is guaranteed
    // to belong to a NEW action started after the switch (e.g. a mark-falta
    // pin on the day now on screen), never a leftover from this stale one.
    // Deliberately do NOT clearOverride here — doing so would clobber that
    // live hold and make the card vanish mid-flow on the day the manager is
    // actually looking at (bug regression, see the test for this exact
    // sequence).
    if (forDate !== selectedDateRef.current || forBranchId !== branchIdRef.current) return

    cancelExitTimer(employeeId)

    if (matchesGridFilter(mergedRow, selectedFilterRef.current)) {
      clearOverride(employeeId)
      return
    }

    // The row no longer matches the active tab — but if it wasn't part of
    // that tab BEFORE this action either (e.g. the manager switched tabs
    // while the request was still in flight, so this card was never visible
    // here), there is nothing to animate OUT of it: forcing an 'exiting'
    // override would flash a card that never belonged to this tab into it,
    // only to immediately slide it back out.
    if (!matchesGridFilter(preMutationRow, selectedFilterRef.current)) {
      clearOverride(employeeId)
      return
    }

    setCardOverrides((current) => {
      const next = new Map(current)
      next.set(employeeId, 'exiting')
      return next
    })

    const timer = setTimeout(() => {
      exitTimers.current.delete(employeeId)
      clearOverride(employeeId)
    }, 350)
    exitTimers.current.set(employeeId, timer)
  }, [])

  const onFaltaFlowComplete = useCallback((employeeId: string) => {
    const context = faltaFlowContext.current.get(employeeId)
    faltaFlowContext.current.delete(employeeId)
    // No context means either the mutation failed (pin already cleared by
    // markDayStatus's own failure path) or rowBeforeMutation wasn't found at
    // mutation time (markDayStatus pinned the card but had nothing to hand
    // off to this flow) — clear defensively either way so a card can never
    // stay pinned in a tab it no longer belongs to with no flow left to
    // release it.
    if (!context) {
      clearOverride(employeeId)
      return
    }
    startExitAnimation(employeeId, context.row, context.preMutationRow, context.date, context.branchId)
  }, [startExitAnimation])

  // Pinned/exiting rows are kept in their natural `data` position (not
  // appended at the end) so the card doesn't visibly jump while its
  // animation/dialog flow plays out.
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
    const employee = pendingCheckInEmployee
    // A correction of an already-recorded check-in never changes the row's
    // bucket, regardless of which tab is active — only a fresh check-in does.
    const isFreshCheckIn = !pendingCheckInCurrentValue
    const rowBeforeMutation = data.find((r) => r.employee.id === employee.id)
    const forDate = selectedDate
    const forBranchId = branchId
    checkInMutation.mutate(
      { employee_id: employee.id, check_in: timeToIso(time, forDate), reason },
      {
        onSuccess: (response) => {
          if (!isFreshCheckIn || !rowBeforeMutation) return
          startExitAnimation(
            employee.id,
            { ...rowBeforeMutation, attendance: attendanceRecordToRowData(response.data.data) },
            rowBeforeMutation,
            forDate,
            forBranchId,
          )
        },
        onSettled: closeCheckIn,
      }
    )
  }, [pendingCheckInEmployee, pendingCheckInCurrentValue, data, checkInMutation, closeCheckIn, selectedDate, branchId, startExitAnimation])

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
    const { employee, attendanceId, currentValue } = pendingLunchStart
    const rowBeforeMutation = data.find((r) => r.employee.id === employee.id)
    const forDate = selectedDate
    const forBranchId = branchId
    lunchStartMutation.mutate(
      { attendance_id: attendanceId, lunch_start: timeToIso(time, forDate), reason },
      {
        onSuccess: (response) => {
          if (currentValue || !rowBeforeMutation) return
          startExitAnimation(
            employee.id,
            { ...rowBeforeMutation, attendance: attendanceRecordToRowData(response.data.data) },
            rowBeforeMutation,
            forDate,
            forBranchId,
          )
        },
        onSettled: closeLunchStart,
      }
    )
  }, [pendingLunchStart, data, lunchStartMutation, closeLunchStart, selectedDate, branchId, startExitAnimation])

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
    const { employee, attendanceId, currentValue } = pendingLunchReturn
    const rowBeforeMutation = data.find((r) => r.employee.id === employee.id)
    const forDate = selectedDate
    const forBranchId = branchId
    lunchReturnMutation.mutate(
      { attendance_id: attendanceId, lunch_end: timeToIso(time, forDate), reason },
      {
        onSuccess: (response) => {
          if (currentValue || !rowBeforeMutation) return
          startExitAnimation(
            employee.id,
            { ...rowBeforeMutation, attendance: attendanceRecordToRowData(response.data.data) },
            rowBeforeMutation,
            forDate,
            forBranchId,
          )
        },
        onSettled: closeLunchReturn,
      }
    )
  }, [pendingLunchReturn, data, lunchReturnMutation, closeLunchReturn, selectedDate, branchId, startExitAnimation])

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
    const { employee, attendanceId, currentValue } = pendingCheckOut
    const rowBeforeMutation = data.find((r) => r.employee.id === employee.id)
    const forDate = selectedDate
    const forBranchId = branchId
    checkOutMutation.mutate(
      { attendance_id: attendanceId, check_out: timeToIso(time, forDate), reason },
      {
        onSuccess: (response) => {
          if (currentValue || !rowBeforeMutation) return
          startExitAnimation(
            employee.id,
            { ...rowBeforeMutation, attendance: attendanceRecordToRowData(response.data.data) },
            rowBeforeMutation,
            forDate,
            forBranchId,
          )
        },
        onSettled: closeCheckOut,
      }
    )
  }, [pendingCheckOut, data, checkOutMutation, closeCheckOut, selectedDate, branchId, startExitAnimation])

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
  // Pins the card immediately (so the justify-now?/justify-dialog flow that
  // follows a success isn't yanked out from under the user), and unpins it
  // again on failure — collapsed into this single function rather than split
  // across the page component and this hook, so a failed mutation can never
  // leave a card pinned forever with no flow left to release it.
  //
  // Returns whether the mutation succeeded (not its raw promise/rejection —
  // attendance-hooks.ts's onError already surfaces the failure toast, the
  // caller only needs to know whether to continue the justify-now? flow).
  const markDayStatus = useCallback(
    (employee: TodayAttendanceEmployee, status: 'ABSENCE', reason?: string): Promise<boolean> => {
      const rowBeforeMutation = data.find((r) => r.employee.id === employee.id)
      const forDate = selectedDate
      const forBranchId = branchId

      setCardOverrides((current) => {
        if (current.get(employee.id) === 'pinned') return current
        const next = new Map(current)
        next.set(employee.id, 'pinned')
        return next
      })
      // Written synchronously, before the mutation's promise even settles,
      // so a same-tick double-click already sees the button disabled on the
      // next render — no separate in-flight-request dedup needed.
      setMarkingDayStatusEmployeeIds((current) => {
        if (current.has(employee.id)) return current
        const next = new Set(current)
        next.add(employee.id)
        return next
      })

      return markDayStatusMutation.mutateAsync({
        employee_id: employee.id,
        date: forDate,
        day_status: status,
        reason,
      }).then(
        (response: { data: { data: AttendanceRecord } }) => {
          if (rowBeforeMutation) {
            faltaFlowContext.current.set(employee.id, {
              date: forDate,
              branchId: forBranchId,
              row: { ...rowBeforeMutation, attendance: attendanceRecordToRowData(response.data.data) },
              preMutationRow: rowBeforeMutation,
            })
          }
          return true
        },
        () => {
          setCardOverrides((current) => {
            if (current.get(employee.id) !== 'pinned') return current
            const next = new Map(current)
            next.delete(employee.id)
            return next
          })
          return false
        },
      ).finally(() => {
        // Unconditional — never gated by the date/branch this flow started
        // for. Gating it would leave a switch-away-and-back employee's
        // buttons disabled forever if the mutation settled while a
        // different date/branch was selected.
        setMarkingDayStatusEmployeeIds((current) => {
          if (!current.has(employee.id)) return current
          const next = new Set(current)
          next.delete(employee.id)
          return next
        })
      })
    },
    [markDayStatusMutation, data, selectedDate, branchId],
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
    onFaltaFlowComplete,
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
    isMarkingDayStatus,
    markDayStatus,
    // Extra day express
    extraDayRow,
    isRegisteringExtraDay: extraDayMutation.isPending,
    openExtraDay,
    closeExtraDay,
    confirmExtraDay,
  }
}
