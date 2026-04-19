import { useScheduleHistory } from './use-schedule-history'
import { ScheduleHistoryItem } from './schedule-history-item'

interface ScheduleHistorySectionProps {
  readonly periodId: string | null
  readonly currentScheduleId: string | null
}

export function ScheduleHistorySection({ periodId, currentScheduleId }: ScheduleHistorySectionProps) {
  const { data, isLoading, isError } = useScheduleHistory(periodId)

  const schedules = data?.data ?? []

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-12 animate-pulse rounded border bg-muted/50" />
        <div className="h-12 animate-pulse rounded border bg-muted/50" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        Error al cargar el historial de horarios.
      </div>
    )
  }

  if (schedules.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No hay horarios registrados.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {schedules.map((schedule) => (
        <ScheduleHistoryItem
          key={schedule.id}
          schedule={schedule}
          isActive={schedule.id === currentScheduleId}
        />
      ))}
    </div>
  )
}
