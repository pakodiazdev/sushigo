import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { EmployeeSchedule } from '@/types/schedule'
import { resolveWeek, addDays, fmtDayShort } from './use-weekly-calendar'
import { calcDayHours, formatHours } from './schedule-section-utils'
import { WeekDayRow } from './week-day-row'

// ── WeeklyCalendar ────────────────────────────────────────────────────────────

interface WeeklyCalendarProps {
  readonly schedule: EmployeeSchedule
  readonly weekStart: string
  readonly prevWeek: () => void
  readonly nextWeek: () => void
  readonly openOverrideList: (dow: number) => void
}

export function WeeklyCalendar({ schedule, weekStart, prevWeek, nextWeek, openOverrideList }: WeeklyCalendarProps) {
  const resolvedDays = resolveWeek(weekStart, schedule.days ?? [], schedule.active_overrides ?? [])
  const weekEnd = addDays(weekStart, 6)
  const weekLabel = `${fmtDayShort(weekStart)} – ${fmtDayShort(weekEnd)} ${new Date(weekEnd + 'T00:00:00').getFullYear()}`

  const weeklyHours = resolvedDays.reduce<number>(
    (sum, d) => sum + (calcDayHours(d.expected_start, d.expected_end, d.lunch_duration_minutes) ?? 0),
    0,
  )

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevWeek}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Semana anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <span className="text-sm font-medium">{weekLabel}</span>
          {weeklyHours > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">· {formatHours(weeklyHours)} total</span>
          )}
        </div>
        <button
          type="button"
          onClick={nextWeek}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Semana siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekly table */}
      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="py-2 pl-3 pr-2 text-left">Día</th>
              <th className="py-2 pr-2 text-left">Entrada</th>
              <th className="py-2 pr-2 text-left">Salida</th>
              <th className="py-2 pr-3 text-right">Hrs</th>
            </tr>
          </thead>
          <tbody>
            {resolvedDays.map((day) => (
              <WeekDayRow
                key={day.date}
                day={day}
                onClickOverride={() => openOverrideList(day.dow)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
