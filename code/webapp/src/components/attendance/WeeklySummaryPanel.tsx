import { WeeklySummaryDialog } from './WeeklySummaryDialog'
import type { WeeklySummaryDialogState } from './use-weekly-summary-dialog'

export interface WeeklySummaryPanelProps {
  readonly weeklySummary: WeeklySummaryDialogState
}

/** Wires a WeeklySummaryDialogState (from useWeeklySummaryDialog) into WeeklySummaryDialog's props. */
export function WeeklySummaryPanel({ weeklySummary }: WeeklySummaryPanelProps) {
  return (
    <WeeklySummaryDialog
      isOpen={weeklySummary.isOpen}
      onClose={weeklySummary.close}
      employeeName={weeklySummary.employeeName}
      periodStart={weeklySummary.periodStart}
      periodEnd={weeklySummary.periodEnd}
      onPrevWeek={weeklySummary.prevWeek}
      onNextWeek={weeklySummary.nextWeek}
      onJumpToDate={weeklySummary.jumpToDate}
      isCurrentWeek={weeklySummary.isCurrentWeek}
      isEarliestWeek={weeklySummary.isEarliestWeek}
      earliestWeekStart={weeklySummary.earliestWeekStart}
      onGoToCurrentWeek={weeklySummary.goToCurrentWeek}
      summary={weeklySummary.summary}
      isLoading={weeklySummary.isLoading}
      isError={weeklySummary.isError}
    />
  )
}
