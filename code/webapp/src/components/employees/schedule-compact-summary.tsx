import { Zap } from 'lucide-react'
import type { EmployeeSchedule } from '@/types/schedule'
import { buildCompactSummaryLine } from './schedule-section-utils'

interface ScheduleCompactSummaryProps {
  readonly schedule: EmployeeSchedule
}

/**
 * Compact one-line summary of the active schedule shown in the dialog header.
 * Format: "🕐 L-V · 1:00 PM – 10:00 PM · 🍽 1h · 🏠 Sáb-Dom  ⚡ +3"
 */
export function ScheduleCompactSummary({ schedule }: ScheduleCompactSummaryProps) {
  const summaryLine = buildCompactSummaryLine(schedule.days, schedule.active_overrides ?? [])
  const overrideCount = (schedule.active_overrides ?? []).filter((o) => o.effective_to !== null).length

  if (!summaryLine) return null

  return (
    <div className="flex items-center justify-between gap-2 border-b px-5 py-2 text-sm text-muted-foreground">
      <span>{summaryLine}</span>
      {overrideCount > 0 && (
        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Zap className="h-3 w-3" />
          +{overrideCount}
        </span>
      )}
    </div>
  )
}
