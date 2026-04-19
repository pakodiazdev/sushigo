import { History, Loader2 } from 'lucide-react'
import { useScheduleHistory } from './use-schedule-history'
import { ScheduleHistoryItem } from './schedule-history-item'

interface ScheduleHistorySectionProps {
  readonly periodId: string | null
  readonly currentScheduleId: string | null
}

export function ScheduleHistorySection({ periodId, currentScheduleId }: ScheduleHistorySectionProps) {
  const { data, isLoading, isError } = useScheduleHistory(periodId)

  // Filter out the current (active) schedule from history
  const schedules = (data?.data ?? []).filter((s) => s.id !== currentScheduleId)

  if (isLoading) {
    return (
      <div className="mt-4 flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando historial...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mt-4 rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        Error al cargar el historial de horarios.
      </div>
    )
  }

  if (schedules.length === 0) {
    return null // No past schedules to show
  }

  return (
    <div className="mt-4 border-t pt-4">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <History className="h-4 w-4" />
        Historial de horarios ({schedules.length})
      </h4>
      <div className="space-y-2">
        {schedules.map((schedule, index) => (
          <ScheduleHistoryItem key={schedule.id} schedule={schedule} isFirst={index === 0} />
        ))}
      </div>
    </div>
  )
}
