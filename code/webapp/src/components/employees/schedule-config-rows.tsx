import { Pencil, Check, Ban } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { DAY_LABELS, formatLunchDuration } from '@/types/schedule'
import type { ScheduleDay, ScheduleDayOverride } from '@/types/schedule'
import type { EditDayValues } from './use-create-day-override'
import { calcDayHours, formatHours } from './schedule-section-utils'
import { formatTime } from '@/lib/time-format'
import { DayLabel } from './day-label'

// ── ReadRow ───────────────────────────────────────────────────────────────────

interface ReadRowProps {
  readonly day: ScheduleDay
  /** An indefinite override whose effective_from ≤ today — treated as the
   *  day's current schedule rather than a temporary exception. */
  readonly permanentOverride: ScheduleDayOverride | null
  /** True when there are active/upcoming overrides besides the permanentOverride. */
  readonly hasTemporaryOverride: boolean
  readonly onEdit: () => void
  readonly onClickOverride?: () => void
  readonly showActions: boolean
}

export function ReadRow({ day, permanentOverride, hasTemporaryOverride, onEdit, onClickOverride, showActions }: ReadRowProps) {
  const hasPermanentOverride = permanentOverride !== null
  // The effective day-off state: override wins over base when active.
  const effectiveIsDayOff = permanentOverride ? permanentOverride.is_day_off : day.is_day_off

  // Row tint: amber when a permanent change is in effect; dim when a base rest day.
  let rowCls: string
  if (hasPermanentOverride) {
    rowCls = 'border-b last:border-0 bg-amber-50/40 dark:bg-amber-950/15'
  } else if (effectiveIsDayOff) {
    rowCls = 'border-b last:border-0 opacity-40'
  } else {
    rowCls = 'border-b last:border-0'
  }

  if (effectiveIsDayOff) {
    return (
      <tr className={rowCls}>
        <td className="py-2 pl-3 pr-2 font-medium">
          <DayLabel
            label={DAY_LABELS[day.day_of_week] ?? ''}
            hasTemporaryOverride={hasTemporaryOverride}
            hasPermanentOverride={hasPermanentOverride}
            onClickOverride={onClickOverride}
          />
        </td>
        <td colSpan={5} className="py-2 pr-2 italic text-muted-foreground">Descanso</td>
        {showActions && (
          <td className="py-2 pr-3">
            <button type="button" onClick={onEdit} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Agregar excepción">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </td>
        )}
      </tr>
    )
  }

  // Working day — use override values when a permanent change is active.
  const displayStart = permanentOverride ? permanentOverride.expected_start : day.expected_start
  const displayLunchStart = permanentOverride ? permanentOverride.expected_lunch_start : day.expected_lunch_start
  const displayLunchDuration = permanentOverride ? permanentOverride.lunch_duration_minutes : day.lunch_duration_minutes
  const displayEnd = permanentOverride ? permanentOverride.expected_end : day.expected_end

  return (
    <tr className={rowCls}>
      <td className="py-2 pl-3 pr-2 font-medium">
        <DayLabel
          label={DAY_LABELS[day.day_of_week] ?? ''}
          hasTemporaryOverride={hasTemporaryOverride}
          hasPermanentOverride={hasPermanentOverride}
          onClickOverride={onClickOverride}
        />
      </td>
      <td className="py-2 pr-2 text-muted-foreground">{formatTime(displayStart)}</td>
      <td className="py-2 pr-2 text-muted-foreground">{formatTime(displayLunchStart)}</td>
      <td className="py-2 pr-2 text-muted-foreground">{formatLunchDuration(displayLunchDuration)}</td>
      <td className="py-2 pr-2 text-muted-foreground">{formatTime(displayEnd)}</td>
      <td className="py-2 pr-2 text-right tabular-nums text-muted-foreground">
        {formatHours(calcDayHours(displayStart, displayEnd, displayLunchDuration))}
      </td>
      {showActions && (
        <td className="py-2 pr-3">
          <button type="button" onClick={onEdit} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Agregar excepción">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </td>
      )}
    </tr>
  )
}

// ── EditRow ───────────────────────────────────────────────────────────────────

interface EditRowProps {
  readonly day: ScheduleDay
  readonly values: EditDayValues
  readonly errors: { expected_start: string | null; expected_end: string | null }
  readonly hasErrors: boolean
  readonly isPending: boolean
  readonly onUpdate: <K extends keyof EditDayValues>(field: K, value: EditDayValues[K]) => void
  readonly onToggleDayOff: (val: boolean) => void
  readonly onSave: () => void
  readonly onCancel: () => void
  readonly lunchOptions: { value: string; label: string }[]
  readonly showActions: boolean
}

export function EditRow({ day, values, errors, hasErrors, isPending, onUpdate, onToggleDayOff, onSave, onCancel, lunchOptions, showActions }: EditRowProps) {
  const editLunchMins = values.lunch_duration_minutes ? Number(values.lunch_duration_minutes) : null
  const editHours = values.is_day_off ? null : calcDayHours(values.expected_start, values.expected_end, editLunchMins)
  return (
    <tr className="border-b last:border-0 bg-muted/20">
      <td className="py-2 pl-3 pr-2 text-sm font-medium">
        <div className="flex flex-col gap-0.5">
          <span>{DAY_LABELS[day.day_of_week]}</span>
          <label className="flex cursor-pointer items-center gap-1 text-xs font-normal text-muted-foreground">
            <input type="checkbox" checked={values.is_day_off} onChange={(e) => onToggleDayOff(e.target.checked)} className="h-3 w-3" />
            {' '}Descanso
          </label>
        </div>
      </td>
      <td className="py-2 pr-2">
        <div className="flex flex-col gap-0.5">
          <Input type="time" disabled={values.is_day_off} value={values.expected_start} onChange={(e) => onUpdate('expected_start', e.target.value)} error={!!errors.expected_start} className="h-8 w-24 text-xs" />
          {errors.expected_start && <span className="text-[10px] text-red-600">{errors.expected_start}</span>}
        </div>
      </td>
      <td className="py-2 pr-2">
        <Input type="time" disabled={values.is_day_off} value={values.expected_lunch_start} onChange={(e) => onUpdate('expected_lunch_start', e.target.value)} className="h-8 w-24 text-xs" />
      </td>
      <td className="py-2 pr-2">
        <select disabled={values.is_day_off} value={values.lunch_duration_minutes} onChange={(e) => onUpdate('lunch_duration_minutes', e.target.value)} className="h-8 w-28 rounded-md border border-input bg-background px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50">
          {lunchOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </td>
      <td className="py-2 pr-2">
        <div className="flex flex-col gap-0.5">
          <Input type="time" disabled={values.is_day_off} value={values.expected_end} onChange={(e) => onUpdate('expected_end', e.target.value)} error={!!errors.expected_end} className="h-8 w-24 text-xs" />
          {errors.expected_end && <span className="text-[10px] text-red-600">{errors.expected_end}</span>}
        </div>
      </td>
      <td className="py-2 pr-2 text-right tabular-nums text-xs text-muted-foreground">
        {formatHours(editHours)}
      </td>
      {showActions && (
        <td className="py-2 pr-3">
          <div className="flex items-center gap-1">
            <button type="button" onClick={onSave} disabled={hasErrors || isPending} className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-40" title="Guardar excepción"><Check className="h-4 w-4" /></button>
            <button type="button" onClick={onCancel} className="rounded p-1 text-muted-foreground hover:bg-muted" title="Cancelar"><Ban className="h-4 w-4" /></button>
          </div>
        </td>
      )}
    </tr>
  )
}
