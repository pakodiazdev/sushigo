import { useState } from 'react'
import { ChevronDown, ChevronRight, CalendarRange } from 'lucide-react'
import type { EmployeeScheduleHistoryItem, ScheduleDay } from '@/types/schedule'
import { DAY_LABELS } from '@/types/schedule'
import { calcDayHours, formatHours } from './schedule-section-utils'

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateRange(from: string, to: string | null): string {
  if (!to) return `${formatDate(from)} — presente`
  return `${formatDate(from)} — ${formatDate(to)}`
}

function DayRow({ day }: { readonly day: ScheduleDay }) {
  if (day.is_day_off) {
    return (
      <tr className="border-t text-xs">
        <td className="py-1.5 pl-2">{DAY_LABELS[day.day_of_week]}</td>
        <td colSpan={4} className="text-muted-foreground">Descanso</td>
      </tr>
    )
  }

  return (
    <tr className="border-t text-xs">
      <td className="py-1.5 pl-2">{DAY_LABELS[day.day_of_week]}</td>
      <td>{day.expected_start ?? '—'}</td>
      <td>{day.expected_lunch_start ?? '—'}</td>
      <td>{day.lunch_duration_minutes ? `${day.lunch_duration_minutes} min` : '—'}</td>
      <td>{day.expected_end ?? '—'}</td>
      <td className="pr-2 text-right tabular-nums">
        {formatHours(calcDayHours(day.expected_start, day.expected_end, day.lunch_duration_minutes))}
      </td>
    </tr>
  )
}

interface ScheduleHistoryItemProps {
  readonly schedule: EmployeeScheduleHistoryItem
  readonly isFirst: boolean
}

export function ScheduleHistoryItem({ schedule, isFirst }: ScheduleHistoryItemProps) {
  const [expanded, setExpanded] = useState(false)

  // Sort days by day_of_week
  const sortedDays = [...schedule.days].sort((a, b) => a.day_of_week - b.day_of_week)

  return (
    <div className="rounded border bg-card">
      {/* Header — clickable to expand */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {formatDateRange(schedule.effective_from, schedule.effective_to)}
          </span>
          {isFirst && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              Actual
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border px-2 py-0.5">
            {schedule.workday_type === 'FULL' ? 'Completa' : 'Parcial'}
          </span>
          <span>{schedule.working_days_per_week} días</span>
        </div>
      </button>

      {/* Expanded detail — 7-day grid */}
      {expanded && (
        <div className="border-t px-3 py-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-medium text-muted-foreground">
                <th className="py-1 pl-2 text-left">Día</th>
                <th className="py-1 text-left">Entrada</th>
                <th className="py-1 text-left">Comida</th>
                <th className="py-1 text-left">Duración</th>
                <th className="py-1 text-left">Salida</th>
                <th className="py-1 pr-2 text-right">Hrs</th>
              </tr>
            </thead>
            <tbody>
              {sortedDays.map((day) => (
                <DayRow key={day.day_of_week} day={day} />
              ))}
            </tbody>
          </table>

          {/* Overrides section */}
          {schedule.overrides.length > 0 && (
            <div className="mt-3 border-t pt-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Excepciones ({schedule.overrides.length})
              </p>
              <ul className="space-y-1 text-xs">
                {schedule.overrides.map((o) => (
                  <li key={o.id} className="flex items-center gap-2">
                    <span className="font-medium">{DAY_LABELS[o.day_of_week]}</span>
                    <span className="text-muted-foreground">
                      {o.effective_to
                        ? `${formatDate(o.effective_from)} — ${formatDate(o.effective_to)}`
                        : formatDate(o.effective_from)}
                    </span>
                    {o.is_day_off && (
                      <span className="rounded-full bg-orange-100 px-1.5 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        Descanso
                      </span>
                    )}
                    {o.note && (
                      <span className="truncate text-muted-foreground italic">"{o.note}"</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
