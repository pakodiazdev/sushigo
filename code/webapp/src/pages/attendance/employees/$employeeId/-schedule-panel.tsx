import { CheckCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DAY_LABELS } from '@/types/schedule'
import type { EmployeeSchedule } from '@/types/schedule'

// ── Types ──────────────────────────────────────────────────────────────────────

export type SchedulePanelSchedule = Pick<
  EmployeeSchedule,
  'workday_type' | 'working_days_per_week' | 'effective_from' | 'days'
>

// ── Component ──────────────────────────────────────────────────────────────────

interface SchedulePanelProps {
  readonly schedule: SchedulePanelSchedule
}

export function SchedulePanel({ schedule }: SchedulePanelProps) {
  return (
    <div className="rounded-md border">
      {/* Header info */}
      <div className="flex flex-wrap gap-3 border-b px-4 py-3 text-sm">
        <Badge>{schedule.workday_type === 'FULL' ? 'Jornada completa' : 'Jornada parcial'}</Badge>
        <span className="text-muted-foreground">
          {schedule.working_days_per_week} días/semana
        </span>
        <span className="text-muted-foreground">
          Desde {new Date(schedule.effective_from + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* Days grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
              <th className="py-2 pl-4 pr-3">Día</th>
              <th className="py-2 pr-3">Entrada</th>
              <th className="py-2 pr-3">Fin almuerzo</th>
              <th className="py-2 pr-3">Salida</th>
              <th className="py-2 pr-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {[...(schedule.days ?? [])].sort((a, b) => a.day_of_week - b.day_of_week).map((day) => (
              <tr key={day.day_of_week} className="border-b last:border-0">
                <td className="py-2 pl-4 pr-3 font-medium">{DAY_LABELS[day.day_of_week]}</td>
                <td className="py-2 pr-3 text-muted-foreground">{day.expected_start ?? '—'}</td>
                <td className="py-2 pr-3 text-muted-foreground">{day.expected_lunch_end ?? '—'}</td>
                <td className="py-2 pr-3 text-muted-foreground">{day.expected_end ?? '—'}</td>
                <td className="py-2 pr-4 text-center">
                  {day.is_day_off ? (
                    <XCircle className="mx-auto h-4 w-4 text-muted-foreground" />
                  ) : (
                    <CheckCircle className="mx-auto h-4 w-4 text-green-500" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
