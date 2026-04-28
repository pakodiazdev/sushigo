import { useBusinessDate } from '@/stores/clock.store'
import type { EmployeeSchedule } from '@/types/schedule'
import { buildSummaryLines } from './schedule-section-utils'

export function ScheduleSummary({ schedule }: { readonly schedule: EmployeeSchedule }) {
  const businessDate = useBusinessDate()
  const lines = buildSummaryLines(schedule.days, schedule.active_overrides ?? [], businessDate ?? undefined)
  if (lines.length === 0) return null

  return (
    <div className="mt-1.5 space-y-0.5 pl-0.5">
      {lines.map((line) => (
        <div key={line.icon} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{line.text}</span>
        </div>
      ))}
    </div>
  )
}
