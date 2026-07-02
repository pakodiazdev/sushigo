import { CalendarDays, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Employee } from '@/types/employee'
import { useScheduleSection } from './use-schedule-section'
import { ScheduleSummary } from './schedule-summary'
import { ScheduleDialog } from './schedule-dialog'

// ── Props ─────────────────────────────────────────────────────────────────────

interface ScheduleSectionProps {
  readonly employee: Employee
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ScheduleSection({ employee }: ScheduleSectionProps) {
  const ctx = useScheduleSection(employee.id)

  // hasSchedule is undefined while the initial fetch is in flight.
  // Once resolved: true = has active schedule, false = no schedule yet.
  const noSchedule = ctx.hasSchedule === false

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4" />
          Horario activo
        </h3>
        {noSchedule ? (
          <Button size="sm" variant="ghost" onClick={ctx.openToCreate} className="h-7 gap-1 px-2 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Agregar horario
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={ctx.open} className="h-7 gap-1 px-2 text-xs">
            <CalendarDays className="h-3.5 w-3.5" />
            Ver horario
          </Button>
        )}
      </div>

      {/* Compact schedule summary shown directly in the detail view */}
      {ctx.schedule && <ScheduleSummary schedule={ctx.schedule} />}

      <ScheduleDialog ctx={ctx} employee={employee} />
    </>
  )
}
