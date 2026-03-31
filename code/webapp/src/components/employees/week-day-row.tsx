import { Zap } from 'lucide-react'
import { DAY_LABELS } from '@/types/schedule'
import { calcDayHours, formatHours } from './schedule-section-utils'
import { fmtDayShort } from './use-weekly-calendar'
import type { ResolvedDay } from './use-weekly-calendar'
import { formatTime } from '@/lib/time-format'

// ── WeekDayRow ────────────────────────────────────────────────────────────────

interface WeekDayRowProps {
  readonly day: ResolvedDay
  readonly onClickOverride: () => void
}

export function WeekDayRow({ day, onClickOverride }: WeekDayRowProps) {
  const isOverride = day.source === 'override'
  let rowCls: string
  if (day.is_day_off) {
    rowCls = 'border-b last:border-0 opacity-40'
  } else if (isOverride) {
    rowCls = 'border-b last:border-0 bg-amber-50/60 dark:bg-amber-950/20'
  } else {
    rowCls = 'border-b last:border-0'
  }

  const dayName = DAY_LABELS[day.dow] ?? ''
  const dateLabel = fmtDayShort(day.date)

  return (
    <tr className={rowCls}>
      <td className="py-2 pl-3 pr-2 font-medium">
        <span className="flex items-center gap-1.5">
          <span>
            <span className="font-medium">{dayName}</span>
            <span className="ml-1 text-xs font-normal text-muted-foreground">{dateLabel}</span>
          </span>
          {isOverride && (
            <button
              onClick={onClickOverride}
              title="Ver excepciones"
              className="rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900"
            >
              <Zap className="h-3 w-3 text-amber-500" />
            </button>
          )}
        </span>
      </td>
      {day.is_day_off ? (
        <td colSpan={3} className="py-2 pr-3 italic text-muted-foreground">Descanso</td>
      ) : (
        <>
          <td className="py-2 pr-2 text-muted-foreground">{formatTime(day.expected_start)}</td>
          <td className="py-2 pr-2 text-muted-foreground">{formatTime(day.expected_end)}</td>
          <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
            {formatHours(calcDayHours(day.expected_start, day.expected_end, day.lunch_duration_minutes))}
          </td>
        </>
      )}
    </tr>
  )
}
