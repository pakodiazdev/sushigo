import { createPortal } from 'react-dom'
import { X, Zap, ChevronLeft, ChevronRight } from 'lucide-react'
import { DAY_LABELS } from '@/types/schedule'
import type { EmployeeSchedule, ScheduleDayOverride } from '@/types/schedule'
import { resolveWeek, addDays, fmtDayShort } from './use-weekly-calendar'
import type { ResolvedDay } from './use-weekly-calendar'
import { calcDayHours, formatHours, overrideDateLabel } from './schedule-section-utils'
import { formatTime } from '@/lib/time-format'

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
            <span className="ml-1 text-xs text-muted-foreground font-normal">{dateLabel}</span>
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

// ── OverrideListDialog ────────────────────────────────────────────────────────

interface OverrideListDialogProps {
  readonly dow: number
  readonly dayLabel: string
  readonly overrides: ScheduleDayOverride[]
  readonly onSelect: (override: ScheduleDayOverride) => void
  readonly onClose: () => void
}

export function OverrideListDialog({ dow: _dow, dayLabel, overrides, onSelect, onClose }: OverrideListDialogProps) {
  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center px-4">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 w-full border-0 bg-black/40 p-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" aria-hidden />
            <h3 className="text-base font-semibold">Excepciones — {dayLabel}</h3>
          </div>
          <button onClick={onClose} className="rounded-sm text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {overrides.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">Sin excepciones activas.</p>
          ) : (
            <ul className="divide-y">
              {overrides.map((o) => {
                const hrs = calcDayHours(o.expected_start, o.expected_end, o.lunch_duration_minutes)
                const hrsLabel = hrs ? ` · ${formatHours(hrs)}` : ''
                const overrideTime = o.is_day_off
                  ? 'Descanso'
                  : `${formatTime(o.expected_start)} → ${formatTime(o.expected_end)}${hrsLabel}`
                return (
                  <li key={o.id}>
                    <button
                      onClick={() => onSelect(o)}
                      className="w-full px-5 py-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{overrideDateLabel(o)}</p>
                      <p className="mt-0.5 text-sm">{overrideTime}</p>
                      {o.note && <p className="mt-0.5 text-xs text-muted-foreground">{o.note}</p>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
