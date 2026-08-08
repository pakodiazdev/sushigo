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
  // Keeps a card rendered through the mark-falta → justify-now? → (dialog) flow,
  // then plays an exit animation once the flow concludes
  isCardExiting: (employeeId: string) => boolean
  pinEmployeeCard: (employeeId: string) => void
  unpinEmployeeCard: (employeeId: string) => void
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
  markingDayStatusEmployeeIds: Set<string>
  markDayStatus: (employee: TodayAttendanceEmployee, status: 'ABSENCE', reason?: string) => Promise<void>
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
  // Tracks WHICH employee(s) have an absence write in flight — markDayStatusMutation.isPending
  // alone is shared across the whole page's single mutation instance, so using it directly
  // would show every other employee's card as busy while only one is actually being marked.
  // A Set (not a single id) because the mutation isn't gated on the previous one settling: if a
  // manager confirms falta for employee A and then, before A's request returns, confirms it for
  // employee B too, both writes are genuinely in flight at once. A single scalar id would get
  // overwritten by B's start and then cleared to null by WHICHEVER request's .finally() runs
  // first — re-enabling and un-spinnering a card whose own write was still pending.
  const [markingDayStatusEmployeeIds, setMarkingDayStatusEmployeeIds] = useState<Set<string>>(new Set())

  const summary = computeSummary(data)

  // ── Stat tab filter ───────────────────────────────────────────────────────────
  const [selectedFilter, setSelectedFilter] = useState<AttendanceFilter | null>(initialFilter)
  const hasAppliedDefaultFilter = useRef(initialFilter !== null)
  // Mirrors `selectedFilter` for startExitAnimation to read at async onSuccess
  // time — a mutation's onSuccess closure is fixed to whatever `selectedFilter`
  // was when `.mutate()` was called, so if the manager switches tabs while the
  // request is in flight, the callback would otherwise judge against a stale
  // tab and either animate a card that now belongs in the active tab, or skip
  // animating one that doesn't.
  const selectedFilterRef = useRef(selectedFilter)
  useEffect(() => {
    selectedFilterRef.current = selectedFilter
  }, [selectedFilter])
  // Same staleness concern as selectedFilterRef, for reading the row's
  // `today_leave` from within an onSuccess closure (see resolveTargetBucket).
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])
  // Same staleness concern again, but for detecting whether the manager
  // switched date/branch WHILE a check-in/lunch/check-out mutation was still
  // in flight. `cardOverrides`/timers already get reset when selectedDate or
  // branchId change (see the effect below), but that reset only clears state
  // already armed at that moment — it can't stop a mutation's onSuccess that
  // hasn't fired yet from later calling startExitAnimation against whatever
  // day/branch happens to be selected by then, animating (and potentially
  // permanently hiding) an unrelated employee's card on a day/branch the
  // action has nothing to do with. Each confirm* callback compares the
  // selectedDate/branchId it captured at `.mutate()` time against these refs
  // inside its onSuccess and no-ops if either has since changed.
  const selectedDateRef = useRef(selectedDate)
  useEffect(() => {
    selectedDateRef.current = selectedDate
  }, [selectedDate])
  const branchIdRef = useRef(branchId)
  useEffect(() => {
    branchIdRef.current = branchId
  }, [branchId])
  // Same staleness concern as selectedDateRef/branchIdRef, but for the
  // mark-falta flow specifically: unlike the four confirm* actions above,
  // onFaltaFlowComplete isn't called from a mutation's onSuccess — it fires
  // whenever the manager dismisses the justify-now?/RegisterLeaveDialog UI,
  // which can be arbitrarily later (and the card is keyed by employee.id, so
  // its dialog state survives a date/branch switch underneath it). Recorded
  // when markDayStatus starts the flow (the actual "mutate time" for this
  // flow), consulted and cleared in onFaltaFlowComplete below.
  const faltaFlowStartedForByEmployee = useRef<Map<string, { date: string; branchId: number | null }>>(new Map())

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
  // 'exiting' — the flow just concluded; play the exit animation for 350ms.
  // 'hidden'  — the animation finished, but `data` hasn't refetched to confirm
  //             the row's new bucket yet; force it out of the grid (unlike
  //             'pinned'/'exiting', which force it IN) so it can't flash back
  //             to full opacity once the exit animation's CSS class is gone.
  //             Cleared by the effect below once fresh data confirms it.
  const [cardOverrides, setCardOverrides] = useState<Map<string, 'pinned' | 'exiting' | 'hidden'>>(new Map())
  const exitTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  // The bucket each row is expected to land in once its mutation's refetch
  // confirms it — checked against the row's LIVE computed bucket (via
  // attendanceBucket()) rather than comparing `data` object references, so
  // it doesn't matter whether the refetch already landed before this was
  // set, lands mid-animation, or lands later: the check is always "does the
  // row's current data already say what we expect", never "has some
  // reference changed since an arbitrary snapshot point". See
  // startExitAnimation and the cleanup effect below.
  const targetBucketByEmployee = useRef<Map<string, AttendanceBucket>>(new Map())
  // Backstop for 'hidden' overrides whose guessed targetBucket never actually
  // materializes — e.g. a concurrent change (another manager approving a
  // full-day leave between the action and its refetch) routes the row to a
  // different bucket than the one assumed when the animation started. The
  // exact-match cleanup effect below would otherwise never fire and the card
  // would stay hidden on every tab forever. See the timer scheduled inside
  // startExitAnimation.
  const hiddenFallbackTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const timers = exitTimers.current
    const fallbackTimers = hiddenFallbackTimers.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      fallbackTimers.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  // `cardOverrides` is keyed only by employeeId, but `data` comes from
  // useDailyAttendance(branchId, selectedDate) — nothing else ties an
  // override to the specific day/branch it was set for. Without this,
  // switching the date (or branch) while an animation timer is still
  // pending left it armed against the NEW day's `data`: the timer fires,
  // resolves the employee's row in the wrong day, finds a bucket mismatch
  // that can never resolve (a past/different day's data never changes), and
  // the card ends up permanently 'hidden' on a date it has nothing to do
  // with the original action. Any pinned/exiting/hidden state is meaningless
  // once the underlying data set it was computed against is gone, so treat a
  // date/branch change as a hard reset instead of trying to carry it over.
  useEffect(() => {
    exitTimers.current.forEach((timer) => clearTimeout(timer))
    exitTimers.current.clear()
    hiddenFallbackTimers.current.forEach((timer) => clearTimeout(timer))
    hiddenFallbackTimers.current.clear()
    targetBucketByEmployee.current.clear()
    setCardOverrides(new Map())
  }, [selectedDate, branchId])

  const pinEmployeeCard = useCallback((employeeId: string) => {
    setCardOverrides((current) => {
      if (current.get(employeeId) === 'pinned') return current
      const next = new Map(current)
      next.set(employeeId, 'pinned')
      return next
    })
  }, [])

  // Releases a pin started by pinEmployeeCard without playing an exit
  // animation — for flows that pin optimistically (e.g. mark-falta, before
  // its mutation resolves) and need to undo that pin on failure, when there
  // is no new bucket to animate toward and the card should just stay put.
  // Deliberately only touches a 'pinned' override, never 'exiting'/'hidden',
  // so it can't interfere with an unrelated animation already in flight.
  const unpinEmployeeCard = useCallback((employeeId: string) => {
    setCardOverrides((current) => {
      if (current.get(employeeId) !== 'pinned') return current
      const next = new Map(current)
      next.delete(employeeId)
      return next
    })
  }, [])

  // Whether a row ending up in `targetBucket` still belongs in the active tab —
  // shared by every action below to decide if a card needs to animate out.
  // Deliberately computed from `filter` alone, never from `data`: `data` can
  // still reflect the pre-mutation row when a flow concludes quickly (a
  // mutation only invalidates/refetches on success, and e.g. the mark-falta
  // flow lets the manager dismiss the justify-now prompt before that refetch
  // lands). Deciding from `data` in that window used the stale (still-pending)
  // bucket and produced the wrong answer once the real data arrived a moment
  // later.
  function staysInActiveTab(targetBucket: AttendanceBucket, filter: AttendanceFilter | null): boolean {
    return filter === null || filter === 'total' || filter === targetBucket
  }

  // Shared exit-animation trigger for every action that can move a card out of
  // the active tab (check-in, lunch-start/return, check-out, and — via
  // onFaltaFlowComplete below — the mark-falta → justify-now? flow, whose final
  // bucket is always 'absent', see isAbsentRow). If the row's final bucket
  // still belongs in the active tab (e.g. the default view shows everything),
  // it never actually needs to leave the grid — clear any pin immediately
  // instead of playing the fade/slide-out animation, which would otherwise
  // make the card vanish and then abruptly pop back in.
  const startExitAnimation = useCallback((employeeId: string, targetBucket: AttendanceBucket) => {
    if (staysInActiveTab(targetBucket, selectedFilterRef.current)) {
      const existingTimer = exitTimers.current.get(employeeId)
      if (existingTimer) {
        clearTimeout(existingTimer)
        exitTimers.current.delete(employeeId)
      }
      const existingFallback = hiddenFallbackTimers.current.get(employeeId)
      if (existingFallback) {
        clearTimeout(existingFallback)
        hiddenFallbackTimers.current.delete(employeeId)
      }
      targetBucketByEmployee.current.delete(employeeId)
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

    const existingFallback = hiddenFallbackTimers.current.get(employeeId)
    if (existingFallback) {
      clearTimeout(existingFallback)
      hiddenFallbackTimers.current.delete(employeeId)
    }

    targetBucketByEmployee.current.set(employeeId, targetBucket)

    const timer = setTimeout(() => {
      const row = dataRef.current.find((r) => r.employee.id === employeeId)
      const alreadyConfirmed = !!row && attendanceBucket(row) === targetBucket

      if (alreadyConfirmed) {
        // `data` already reflects the row in `targetBucket` — whether the
        // refetch landed mid-animation (a fast API outracing the 350ms
        // timer) or long before this timer was even set (e.g. mark-falta's
        // justify-now? dialog can keep the manager away for a while after
        // the mutation's own refetch already completed). Either way there's
        // nothing left to hide; clear the override outright instead of
        // entering 'hidden', which would otherwise wait on a future `data`
        // change that may not come for another 30s (poll interval).
        setCardOverrides((current) => {
          if (!current.has(employeeId)) return current
          const next = new Map(current)
          next.delete(employeeId)
          return next
        })
        targetBucketByEmployee.current.delete(employeeId)
        exitTimers.current.delete(employeeId)
        return
      }

      setCardOverrides((current) => {
        if (!current.has(employeeId)) return current
        const next = new Map(current)
        next.set(employeeId, 'hidden')
        return next
      })
      exitTimers.current.delete(employeeId)

      // Give the normal 30s poll one full cycle plus margin to confirm the
      // guessed targetBucket via the exact-match cleanup effect below. If it
      // never does — the row landed in some OTHER bucket than assumed —
      // force the card back into view with whatever data has landed by then
      // instead of leaving it hidden on every tab indefinitely.
      const fallbackTimer = setTimeout(() => {
        hiddenFallbackTimers.current.delete(employeeId)
        targetBucketByEmployee.current.delete(employeeId)
        setCardOverrides((current) => {
          if (current.get(employeeId) !== 'hidden') return current
          const next = new Map(current)
          next.delete(employeeId)
          return next
        })
      }, 35_000)
      hiddenFallbackTimers.current.set(employeeId, fallbackTimer)
    }, 350)
    exitTimers.current.set(employeeId, timer)
  }, [])

  // Clears 'hidden' overrides once `data` actually confirms the row landed in
  // its expected bucket — without this, a card whose exit animation finishes
  // before the refetch lands would otherwise flash back to full opacity the
  // instant the animation's CSS class is removed, since `data` would still
  // be evaluating the stale (pre-mutation) row.
  //
  // Checked via attendanceBucket() against the target bucket captured in
  // targetBucketByEmployee — a semantic, value-based check — rather than
  // "does the row currently (mis)match the active tab" or "has the `data`
  // array reference changed". Both of those earlier approaches had real
  // bugs: filter-matching could never clear the override once the manager
  // switched to the tab the row correctly moved TO (a real match never
  // satisfies "does NOT match"); array-reference comparison could leave a
  // row stuck forever whenever the reference already happened to be the
  // fresh one by the time it was snapshotted (a fast refetch outracing the
  // 350ms timer, or — for mark-falta specifically — the justify-now? dialog
  // delaying startExitAnimation's call well past when the mutation's own
  // refetch had already completed).
  //
  // The employeeIds to clear are computed here, in the effect body, and the
  // `targetBucketByEmployee` ref mutations happen right after — deliberately
  // NOT inside the setCardOverrides updater below. A setState updater must
  // be pure: <StrictMode> (enabled in main.tsx) invokes it twice per commit
  // to catch exactly this kind of impurity, discarding the first result and
  // keeping only the second. Deleting from the ref inside the updater meant
  // the first invocation correctly computed the cleared map but also
  // deleted the ref entries as a side effect; the second invocation then
  // found those entries already gone, computed "nothing to clear" instead,
  // and React kept THAT (wrong) result — leaving the card stuck 'hidden' in
  // development.
  useEffect(() => {
    const toClear: string[] = []
    for (const [employeeId, state] of cardOverrides) {
      if (state !== 'hidden') continue
      const targetBucket = targetBucketByEmployee.current.get(employeeId)
      const row = data.find((r) => r.employee.id === employeeId)
      if (targetBucket && row && attendanceBucket(row) === targetBucket) {
        toClear.push(employeeId)
      }
    }
    if (toClear.length === 0) return

    toClear.forEach((employeeId) => {
      targetBucketByEmployee.current.delete(employeeId)
      const fallbackTimer = hiddenFallbackTimers.current.get(employeeId)
      if (fallbackTimer) {
        clearTimeout(fallbackTimer)
        hiddenFallbackTimers.current.delete(employeeId)
      }
    })
    setCardOverrides((current) => {
      const next = new Map(current)
      toClear.forEach((employeeId) => next.delete(employeeId))
      return next
    })
  }, [data, cardOverrides])

  // Resolves the bucket a row will actually land in once a mutation succeeds.
  // The four call sites below assume a "normal" forward progression (e.g.
  // check-in → checkedIn), but attendanceBucket()/isAbsentRow() route a row to
  // 'absent' whenever it carries a full-day (OPEN_ENDED) approved leave,
  // regardless of its check-in/lunch/check-out phase — an employee can still
  // have those actions performed on them if the leave was approved after they
  // were already mid-shift. `today_leave` isn't affected by these mutations,
  // so reading it from `dataRef` (as of just before the mutation) is accurate.
  const resolveTargetBucket = useCallback((employeeId: string, normalTarget: AttendanceBucket): AttendanceBucket => {
    const row = dataRef.current.find((r) => r.employee.id === employeeId)
    if (row?.today_leave?.time_mode === 'OPEN_ENDED') return 'absent'
    return normalTarget
  }, [])

  const onFaltaFlowComplete = useCallback((employeeId: string) => {
    const startedFor = faltaFlowStartedForByEmployee.current.get(employeeId)
    faltaFlowStartedForByEmployee.current.delete(employeeId)
    if (startedFor && (startedFor.date !== selectedDateRef.current || startedFor.branchId !== branchIdRef.current)) return
    startExitAnimation(employeeId, 'absent')
  }, [startExitAnimation])

  // Pinned/exiting/hidden rows are kept in their natural `data` position (not
  // appended at the end) so the card doesn't visibly jump while its dialog
  // flow plays out — except 'hidden', which is forced OUT instead, since it
  // exists specifically to suppress a stale-data false-positive match on a
  // BUCKET-SPECIFIC tab (a card that just left "Pendientes" whose refetch
  // hasn't landed yet would otherwise still read as "pending" and flash back
  // into that same tab). "Total" (and the default null view) show every row
  // regardless of bucket, so that false-positive can't happen there — nothing
  // to protect against — and suppressing 'hidden' rows anyway turned "Ver
  // todos" into a dead end: if the hidden card was the last one visible, its
  // own "show all" button switched to a filter that excluded it too.
  const visibleRows = useMemo(() => {
    if (cardOverrides.size === 0) return filterRowsForGrid(data, selectedFilter)
    return data.filter((row) => {
      const override = cardOverrides.get(row.employee.id)
      if (override === 'hidden') {
        if (selectedFilter === 'total' || selectedFilter === null) {
          return matchesGridFilter(row, selectedFilter)
        }
        return false
      }
      if (override === 'pinned' || override === 'exiting') return true
      return matchesGridFilter(row, selectedFilter)
    })
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
    const employeeId = pendingCheckInEmployee.id
    // A correction of an already-recorded check-in never changes the row's
    // bucket, regardless of which tab is active — only a fresh check-in does.
    const isFreshCheckIn = !pendingCheckInCurrentValue
    checkInMutation.mutate(
      { employee_id: employeeId, check_in: timeToIso(time, selectedDate), reason },
      {
        onSuccess: () => {
          if (selectedDate !== selectedDateRef.current || branchId !== branchIdRef.current) return
          if (isFreshCheckIn) startExitAnimation(employeeId, resolveTargetBucket(employeeId, 'checkedIn'))
        },
        onSettled: closeCheckIn,
      }
    )
  }, [pendingCheckInEmployee, pendingCheckInCurrentValue, checkInMutation, closeCheckIn, selectedDate, branchId, startExitAnimation, resolveTargetBucket])

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
    lunchStartMutation.mutate(
      { attendance_id: attendanceId, lunch_start: timeToIso(time, selectedDate), reason },
      {
        onSuccess: () => {
          if (selectedDate !== selectedDateRef.current || branchId !== branchIdRef.current) return
          if (!currentValue) startExitAnimation(employee.id, resolveTargetBucket(employee.id, 'atLunch'))
        },
        onSettled: closeLunchStart,
      }
    )
  }, [pendingLunchStart, lunchStartMutation, closeLunchStart, selectedDate, branchId, startExitAnimation, resolveTargetBucket])

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
    lunchReturnMutation.mutate(
      { attendance_id: attendanceId, lunch_end: timeToIso(time, selectedDate), reason },
      {
        onSuccess: () => {
          if (selectedDate !== selectedDateRef.current || branchId !== branchIdRef.current) return
          if (!currentValue) startExitAnimation(employee.id, resolveTargetBucket(employee.id, 'checkedIn'))
        },
        onSettled: closeLunchReturn,
      }
    )
  }, [pendingLunchReturn, lunchReturnMutation, closeLunchReturn, selectedDate, branchId, startExitAnimation, resolveTargetBucket])

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
    checkOutMutation.mutate(
      { attendance_id: attendanceId, check_out: timeToIso(time, selectedDate), reason },
      {
        onSuccess: () => {
          if (selectedDate !== selectedDateRef.current || branchId !== branchIdRef.current) return
          if (!currentValue) startExitAnimation(employee.id, resolveTargetBucket(employee.id, 'done'))
        },
        onSettled: closeCheckOut,
      }
    )
  }, [pendingCheckOut, checkOutMutation, closeCheckOut, selectedDate, branchId, startExitAnimation, resolveTargetBucket])

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
  // Returns the mutation's promise (mutateAsync, not the fire-and-forget
  // mutate) so callers — specifically confirmFalta in
  // use-employee-attendance-card.ts — can gate the justify-now? dialog on
  // actual success instead of opening it unconditionally: without this, a
  // failed mutation (e.g. a 422 because an Attendance record already exists
  // for that date) still walked through the full justify-now?  → exit-
  // animation flow as if it had succeeded, permanently hiding a card whose
  // bucket never actually changed to 'absent'.
  const markDayStatus = useCallback(
    (employee: TodayAttendanceEmployee, status: 'ABSENCE', reason?: string): Promise<void> => {
      setMarkingDayStatusEmployeeIds((current) => {
        if (current.has(employee.id)) return current
        const next = new Set(current)
        next.add(employee.id)
        return next
      })
      // See faltaFlowStartedForByEmployee: this is the flow's real "mutate
      // time" — the value onFaltaFlowComplete will later check itself
      // against, no matter how much later the manager dismisses the
      // justify-now?/RegisterLeaveDialog UI that follows a success.
      faltaFlowStartedForByEmployee.current.set(employee.id, { date: selectedDate, branchId })
      return markDayStatusMutation.mutateAsync({
        employee_id: employee.id,
        date: selectedDate,
        day_status: status,
        reason,
      }).then(() => undefined).catch((error: unknown) => {
        // No justify-now?/onFaltaFlowComplete will follow a failed write.
        faltaFlowStartedForByEmployee.current.delete(employee.id)
        throw error
      }).finally(() => {
        setMarkingDayStatusEmployeeIds((current) => {
          if (!current.has(employee.id)) return current
          const next = new Set(current)
          next.delete(employee.id)
          return next
        })
      })
    },
    [markDayStatusMutation, selectedDate, branchId],
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
    unpinEmployeeCard,
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
    markingDayStatusEmployeeIds,
    markDayStatus,
    // Extra day express
    extraDayRow,
    isRegisteringExtraDay: extraDayMutation.isPending,
    openExtraDay,
    closeExtraDay,
    confirmExtraDay,
  }
}
