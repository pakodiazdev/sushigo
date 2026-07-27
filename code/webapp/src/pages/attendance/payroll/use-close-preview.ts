import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import { useApplicationClockStore } from '@/stores/clock.store'
import {
  useClosePreview,
  useConfirmClose,
  useNextUnclosedPayPeriod,
  type ClosePreviewRange,
} from '@/services/payroll-hooks'
import { getApiErrorMessage } from '@/lib/api-error'
import type { PayPeriodEmployeePreview } from '@/types/attendance-payroll'
import { addDays, currentWeekRange as getWeekRange, isCloseGateOpen, weekRangeContaining, weeksBetween } from '@/lib/week'

export interface UseClosePreviewResult {
  weekRange: ClosePreviewRange
  rows: PayPeriodEmployeePreview[]
  isLoading: boolean
  errorMessage: string | null
  hasBranch: boolean
  isConfirmOpen: boolean
  openConfirm: () => void
  closeConfirm: () => void
  confirmClose: () => Promise<void>
  isClosing: boolean
  canConfirm: boolean
  isRulesOpen: boolean
  openRules: () => void
  closeRules: () => void
  /** True when the period that needs closing next isn't the actual current week — it (and possibly more) were missed. */
  isOverdue: boolean
  /** How many weeks, including the oldest unclosed one, are still waiting to be closed. Only meaningful when isOverdue. */
  overduePeriodsCount: number
  /** True while browsing to an overdue week other than the oldest unclosed one via the nav arrows. */
  isBrowsingOverdue: boolean
  /** True when the currently displayed weekRange is itself one of the overdue (past) weeks — false once navigation reaches the actual current week, which isn't overdue even though other weeks are. */
  isViewingOverdueWeek: boolean
  canViewOlder: boolean
  canViewNewer: boolean
  viewOlder: () => void
  viewNewer: () => void
}

export function useClosePreviewPage(): UseClosePreviewResult {
  const navigate = useNavigate()
  const currentBranch = useAuthStore(s => s.currentBranch)
  const branchId = currentBranch?.id ?? null

  // The Application Clock is the same source of truth the backend uses (real time, or
  // simulated via the devtools clock panel) — only available outside production. Falls
  // back to the browser's real clock (in the fixed business timezone) when it isn't.
  const clockState = useApplicationClockStore(s => s.clockState)
  const fetchClock = useApplicationClockStore(s => s.fetchClock)

  useEffect(() => {
    fetchClock()
  }, [fetchClock])

  const applicationNow = clockState ? new Date(clockState.application_now_utc) : undefined
  const currentWeek = clockState ? weekRangeContaining(clockState.business_date) : getWeekRange()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isRulesOpen, setIsRulesOpen] = useState(false)

  // The page always targets the OLDEST week that still needs an initial close, not just "this
  // calendar week" — payroll must close every Sunday, but if a week was ever missed (an
  // exceptional case: no session to close it that Sunday), the calendar week alone would
  // silently skip it forever, since it's always in the past by the time anyone notices. This is
  // computed server-side (walking every week from the branch's first PayPeriod forward for the
  // first one with no row at all) rather than derived from "the latest period_start + 1 week":
  // periods can now be closed out of order via the nav arrows below, so a naive "latest period"
  // lookup would treat a newer out-of-order close as if it caught everything up to it, silently
  // hiding an older skipped week that nothing else in this page could ever reach again.
  const { data: nextUnclosedData, isLoading: isCheckingLatestPeriod } = useNextUnclosedPayPeriod(branchId)

  // The oldest unclosed week — what the page shows and targets by default, before any nav-arrow
  // browsing. Confirming is not restricted to this one, though: any past week is closeable
  // regardless of order, via whatever the nav arrows are currently showing (weekRange below).
  const targetWeekRange: ClosePreviewRange = nextUnclosedData ?? { periodStart: currentWeek.start, periodEnd: currentWeek.end }

  // In practice this should never be > 0 — payroll must close every Sunday — but if a close
  // session is ever missed, this surfaces it instead of silently showing the oldest week with
  // no explanation of why it isn't "this week".
  const overduePeriodsCount = weeksBetween(targetWeekRange.periodStart, currentWeek.start)
  const isOverdue = overduePeriodsCount > 0

  // Lets a manager reach the other overdue weeks (and the actual current week) without having
  // to close them in strict order — whichever week this lands on is exactly what
  // "Confirmar cierre" targets (see confirmClose below).
  //
  // overduePeriodsCount can be negative (the target week was just closed right at its own
  // deadline, so "today" is still technically within it — the next week isn't due yet) — the
  // upper bound must never go below 0, or the offset clamp collapses to a negative number and
  // silently shifts the displayed week backward into an already-closed one.
  const maxViewOffset = Math.max(overduePeriodsCount, 0)
  const [viewOffsetWeeks, setViewOffsetWeeks] = useState(0)
  useEffect(() => {
    setViewOffsetWeeks(0)
  }, [targetWeekRange.periodStart])
  const clampedOffset = Math.min(Math.max(viewOffsetWeeks, 0), maxViewOffset)
  const weekRange: ClosePreviewRange = clampedOffset === 0
    ? targetWeekRange
    : {
      periodStart: addDays(targetWeekRange.periodStart, clampedOffset * 7),
      periodEnd: addDays(targetWeekRange.periodEnd, clampedOffset * 7),
    }
  const isBrowsingOverdue = clampedOffset > 0
  // Distinct from isOverdue: isOverdue answers "is anything overdue at all" (drives whether the
  // nav arrows render), this answers "is the week ON SCREEN right now one of those overdue
  // weeks" — false once the arrows reach the actual current week, which is never overdue even
  // when other weeks are.
  const isViewingOverdueWeek = clampedOffset < maxViewOffset

  // Wait until we know the most recently closed period before fetching the preview, so we
  // never fetch (and briefly flash) the wrong week.
  const { data = [], isLoading: isPreviewLoading, error } = useClosePreview(
    branchId,
    isCheckingLatestPeriod ? null : weekRange,
  )
  const isLoading = isCheckingLatestPeriod || isPreviewLoading
  const confirmCloseMutation = useConfirmClose()

  const confirmClose = async (): Promise<void> => {
    try {
      if (!branchId) return

      // Closes whatever week is currently displayed (weekRange), not just the oldest unclosed
      // one — the gate exists to stop closing a period before its OWN weekend is over, not to
      // force closing in order. Every past period's own Sunday >= 19:00 has already happened,
      // so the gate only meaningfully blocks the actual current (most recent) period.
      await confirmCloseMutation.mutateAsync({
        branchId,
        periodStart: weekRange.periodStart,
        periodEnd: weekRange.periodEnd,
      })
      await navigate({ to: '/attendance/payroll' })
    } catch {
      // Error toast already shown by useConfirmClose's onError. Close the dialog so the
      // toast (z-50) isn't hidden behind the still-open confirm overlay (z-60).
    } finally {
      // `finally` always runs — including the branchId guard above — so the dialog
      // never gets stuck open if branch context changes while it's visible.
      setIsConfirmOpen(false)
    }
  }

  return {
    weekRange,
    rows: data,
    isLoading,
    errorMessage: error ? getApiErrorMessage(error, 'Error al calcular el preview') : null,
    hasBranch: Boolean(branchId),
    isConfirmOpen,
    openConfirm: () => setIsConfirmOpen(true),
    closeConfirm: () => setIsConfirmOpen(false),
    confirmClose,
    isClosing: confirmCloseMutation.isPending,
    // Gated purely by the viewed week's own Sunday >= 19:00 — a past period is always closeable
    // (its own gate already opened, however long ago), regardless of whether it's the oldest
    // unclosed one or one being browsed to via the nav arrows.
    canConfirm: isCloseGateOpen(weekRange.periodEnd, applicationNow),
    isRulesOpen,
    openRules: () => setIsRulesOpen(true),
    closeRules: () => setIsRulesOpen(false),
    isOverdue,
    overduePeriodsCount,
    isBrowsingOverdue,
    isViewingOverdueWeek,
    canViewOlder: clampedOffset > 0,
    canViewNewer: clampedOffset < maxViewOffset,
    viewOlder: () => setViewOffsetWeeks(o => Math.max(o - 1, 0)),
    viewNewer: () => setViewOffsetWeeks(o => Math.min(o + 1, maxViewOffset)),
  }
}
