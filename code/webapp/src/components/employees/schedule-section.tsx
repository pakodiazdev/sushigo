import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, X, Plus, Pencil, Check, Ban, Zap, ArrowLeft, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-fields'
import { DAY_LABELS, formatLunchDuration } from '@/types/schedule'
import type { EmployeeSchedule, ScheduleDay, ScheduleDayOverride } from '@/types/schedule'
import type { Employee } from '@/types/employee'
import { useScheduleSection } from './-use-schedule-section'
import { useCreateScheduleInline } from './-use-create-schedule-inline'
import type { CreateScheduleSimpleValues } from './-use-create-schedule-inline'
import { useCreateDayOverride } from './-use-create-day-override'
import type { OverrideScope, EditDayValues } from './-use-create-day-override'
import { useWeeklyCalendar, resolveWeek, addDays, fmtDayShort } from './-use-weekly-calendar'
import type { ResolvedDay } from './-use-weekly-calendar'
import { formatTime } from '@/lib/time-format'

// ── Schedule summary helpers ──────────────────────────────────────────────────

/** Single-letter abbreviations for ISO DOW 1=Mon…7=Sun (Mexican convention). */
const DOW_ABBR  = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const
const DOW_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const

/**
 * Given the 7 schedule days, build 1-3 compact summary lines:
 *   • Work:  "L-V · 1:00 PM – 10:00 PM"
 *   • Lunch: "Comida 1 hr a las 4:00 PM"   (omitted if no lunch configured)
 *   • Rest:  "Descansa Sábado, Domingo"     (omitted if 0 rest days)
 */
export function buildSummaryLines(days: ScheduleDay[]): { icon: 'work' | 'lunch' | 'rest'; text: string }[] {
  const working = days.filter((d) => !d.is_day_off).sort((a, b) => a.day_of_week - b.day_of_week)
  const resting = days.filter((d) =>  d.is_day_off).sort((a, b) => a.day_of_week - b.day_of_week)

  if (working.length === 0) return []

  // ── Day-range label ──────────────────────────────────────────────────────────
  let dayRange: string
  if (working.length === 7) {
    dayRange = 'L-D'
  } else if (working.length === 1) {
    dayRange = DOW_NAMES[working[0]!.day_of_week - 1]!
  } else {
    // Are the working days consecutive in ISO order (no gaps)?
    const isConsecutive = working.every(
      (d, i) => i === 0 || d.day_of_week === working[i - 1]!.day_of_week + 1,
    )
    if (isConsecutive) {
      dayRange = `${DOW_ABBR[working[0]!.day_of_week - 1]}-${DOW_ABBR[working[working.length - 1]!.day_of_week - 1]}`
    } else {
      // Non-consecutive (e.g. Mon+Wed+Fri) — check circular block (rest is a
      // contiguous gap). If rest days are all consecutive, show a circular range.
      const isRestConsecutive = resting.every(
        (d, i) => i === 0 || d.day_of_week === resting[i - 1]!.day_of_week + 1,
      )
      if (isRestConsecutive) {
        // Work wraps around: start right after the rest block, end right before.
        const firstWork = working[0]!
        const lastWork  = working[working.length - 1]!
        dayRange = `${DOW_ABBR[firstWork.day_of_week - 1]}-${DOW_ABBR[lastWork.day_of_week - 1]}`
      } else {
        dayRange = working.map((d) => DOW_ABBR[d.day_of_week - 1]).join('')
      }
    }
  }

  // ── Times (use the first working day as reference) ───────────────────────────
  const ref = working[0]!
  const startT = formatTime(ref.expected_start)
  const endT   = formatTime(ref.expected_end)

  const lines: { icon: 'work' | 'lunch' | 'rest'; text: string }[] = []

  lines.push({ icon: 'work', text: `🕐 ${dayRange} · ${startT} – ${endT}` })

  // ── Lunch ────────────────────────────────────────────────────────────────────
  if (ref.expected_lunch_start && ref.lunch_duration_minutes) {
    const mins = ref.lunch_duration_minutes
    const durLabel = mins % 60 === 0 ? `${mins / 60} hr` : `${mins} min`
    lines.push({
      icon: 'lunch',
      text: `🍽️ ${durLabel} a las ${formatTime(ref.expected_lunch_start)}`,
    })
  }

  // ── Rest days ────────────────────────────────────────────────────────────────
  if (resting.length > 0) {
    const restLabel = resting.map((d) => DOW_NAMES[d.day_of_week - 1]).join(', ')
    lines.push({ icon: 'rest', text: `🏠 ${restLabel}` })
  }

  return lines
}

function ScheduleSummary({ schedule }: { schedule: EmployeeSchedule }) {
  const lines = buildSummaryLines(schedule.days)
  if (lines.length === 0) return null

  return (
    <div className="mt-1.5 space-y-0.5 pl-0.5">
      {lines.map((line, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{line.text}</span>
        </div>
      ))}
    </div>
  )
}

// ── Section (trigger inside detail view) ─────────────────────────────────────

interface ScheduleSectionProps {
  employee: Employee
}

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

// ── Dialog ────────────────────────────────────────────────────────────────────

type CtxType = ReturnType<typeof useScheduleSection>

interface ScheduleDialogProps {
  ctx: CtxType
  employee: Employee
}

function ScheduleDialog({ ctx, employee }: ScheduleDialogProps) {
  const { isOpen, close, view, isTransitioning } = ctx
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState<'enter' | 'exit' | null>(null)

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating('enter')))
    } else if (visible) {
      setAnimating('exit')
      document.body.style.overflow = ''
      const timer = setTimeout(() => { setVisible(false); setAnimating(null) }, 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen, visible])

  useEffect(() => { return () => { document.body.style.overflow = '' } }, [])

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) close() }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [isOpen, close])

  if (!visible) return null

  const backdropCls = animating === 'enter' ? 'animate-dialog-backdrop-in'
    : animating === 'exit' ? 'animate-dialog-backdrop-out' : ''
  const panelCls = animating === 'enter' ? 'animate-dialog-in'
    : animating === 'exit' ? 'animate-dialog-out' : ''

  const content = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <div className={`absolute inset-0 bg-black/50 ${backdropCls}`} onClick={close} />

      <div
        className={`relative z-10 w-full max-w-2xl rounded-lg border border-border bg-background shadow-xl ${panelCls}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            {view === 'create' && (
              <button
                onClick={ctx.showSchedule}
                className="rounded-sm text-muted-foreground hover:text-foreground mr-1"
                aria-label="Volver"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold">
              {view === 'create' ? 'Nuevo horario' : 'Horario activo'}
            </h3>
          </div>
          <button onClick={close} className="rounded-sm text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — switches between schedule view and create form, with fade */}
        <div
          className="transition-opacity duration-[150ms]"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          {view === 'create' ? (
            <CreateScheduleForm
              employeeId={employee.id}
              periodId={ctx.periodId}
              hasExistingSchedule={!!ctx.schedule}
              initialEffectiveFrom={
                // When there's no schedule yet, pre-fill with the active
                // employment period's start date so the admin doesn't have to
                // look it up. Leave empty when replacing an existing schedule.
                !ctx.schedule
                  ? employee.employment_periods?.find((p) => p.is_active)?.start_date
                  : undefined
              }
              onSuccess={ctx.onScheduleCreated}
              onCancel={ctx.showSchedule}
            />
          ) : (
            <>
              <div className="p-5">
                {ctx.isLoading ? (
                  <ScheduleSkeleton />
                ) : ctx.isError ? (
                  <p className="text-sm text-muted-foreground">Error al cargar el horario.</p>
                ) : ctx.schedule ? (
                  <ScheduleContent schedule={ctx.schedule} employeeId={employee.id} periodId={ctx.periodId} />
                ) : (
                  <EmptySchedule canCreate={!!ctx.periodId} />
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t px-5 py-3">
                {ctx.periodId && !ctx.isLoading ? (
                  <Button type="button" size="sm" onClick={ctx.showCreate}>
                    <Plus className="mr-1 h-4 w-4" />
                    {ctx.schedule ? 'Nuevo horario' : 'Crear horario'}
                  </Button>
                ) : <span />}
                <Button type="button" variant="outline" size="sm" onClick={close}>Cerrar</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

// ── CreateScheduleForm ────────────────────────────────────────────────────────

interface CreateScheduleFormProps {
  employeeId: string
  periodId: string | null
  hasExistingSchedule: boolean
  /** Pre-filled value for the "Vigente desde" date field (YYYY-MM-DD). */
  initialEffectiveFrom?: string
  onSuccess: () => void
  onCancel: () => void
}

function CreateScheduleForm({ employeeId, periodId, hasExistingSchedule, initialEffectiveFrom, onSuccess, onCancel }: CreateScheduleFormProps) {
  const { form, onSubmit, isPending, dowKeys, dayLabels, lunchOptions } =
    useCreateScheduleInline(employeeId, periodId, onSuccess, initialEffectiveFrom)

  const { register, formState: { errors }, watch } = form

  const dowValues = dowKeys.map((k) => watch(k as keyof CreateScheduleSimpleValues) as boolean)
  const workingDays = dowValues.filter((v) => !v).length

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-5 p-5">
        {/* Warning when replacing existing schedule */}
        {hasExistingSchedule && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Si existe un horario activo, se cerrará automáticamente al guardar.</span>
          </div>
        )}

        {/* Date */}
        <FormField label="Vigente desde" error={errors.effective_from?.message} required>
          <Input type="date" error={!!errors.effective_from} {...register('effective_from')} />
        </FormField>

        {/* Shared work hours */}
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Horario laboral — aplica a todos los días laborables
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FormField label="Entrada" error={errors.expected_start?.message} required>
              <Input type="time" error={!!errors.expected_start} {...register('expected_start')} />
            </FormField>
            <FormField label="Inicio comida" error={errors.expected_lunch_start?.message}>
              <Input type="time" {...register('expected_lunch_start')} />
            </FormField>
            <FormField label="Duración comida">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register('lunch_duration_minutes')}
              >
                {lunchOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Salida" error={errors.expected_end?.message} required>
              <Input type="time" error={!!errors.expected_end} {...register('expected_end')} />
            </FormField>
          </div>
        </div>

        {/* Rest days */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Días de descanso
            </p>
            <span className="text-xs text-muted-foreground">
              {workingDays} día{workingDays !== 1 ? 's' : ''} laborable{workingDays !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {dowKeys.map((key, i) => {
              const dow = i + 1
              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
                >
                  <input type="checkbox" className="sr-only" {...register(key as keyof CreateScheduleSimpleValues)} />
                  {dayLabels[dow]}
                </label>
              )
            })}
          </div>
          {errors.dow_7_off?.message && (
            <p className="mt-1 text-xs text-red-600">{errors.dow_7_off.message}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 border-t px-5 py-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending || !periodId}>
          {isPending ? 'Guardando…' : 'Guardar horario'}
        </Button>
      </div>
    </form>
  )
}

// ── ScheduleContent ───────────────────────────────────────────────────────────

interface ScheduleContentProps {
  schedule: EmployeeSchedule
  employeeId: string
  periodId: string | null
}

function ScheduleContent({ schedule, employeeId, periodId }: ScheduleContentProps) {
  const override = useCreateDayOverride(employeeId, periodId)
  const [viewMode, setViewMode] = useState<'config' | 'week'>('config')
  const { weekStart, prevWeek, nextWeek, jumpToDate, overrideListDow, openOverrideList, closeOverrideList } =
    useWeeklyCalendar()

  const overridesByDow = (schedule.active_overrides ?? []).reduce<Record<number, ScheduleDayOverride[]>>(
    (acc, o) => ({ ...acc, [o.day_of_week]: [...(acc[o.day_of_week] ?? []), o] }),
    {}
  )

  const sortedDays = [...(schedule.days ?? [])].sort((a, b) => a.day_of_week - b.day_of_week)

  // Use the browser's local date so that late-evening sessions in Mexico don't
  // accidentally roll over to UTC tomorrow when checking if an override is active.
  const todayLocal = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  const totalWeeklyHours = sortedDays.reduce<number>((sum, day) => {
    return sum + (calcDayHours(day.expected_start, day.expected_end, day.lunch_duration_minutes) ?? 0)
  }, 0)

  // Expected hours: 8h/day × working days (only for FULL jornada)
  const expectedWeeklyHours = schedule.workday_type === 'FULL' ? schedule.working_days_per_week * 8 : null
  const pendingHours = expectedWeeklyHours !== null ? Math.max(0, expectedWeeklyHours - totalWeeklyHours) : null

  const overridesForDow =
    overrideListDow !== null
      ? (schedule.active_overrides ?? []).filter((o) => o.day_of_week === overrideListDow)
      : []

  const handleOverrideSelect = (o: ScheduleDayOverride) => {
    closeOverrideList()
    jumpToDate(o.effective_from)
    setViewMode('week')
  }

  const tabCls = (mode: 'config' | 'week') =>
    `px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
      viewMode === mode
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          {schedule.workday_type === 'FULL' ? 'Jornada completa' : 'Jornada parcial'}
        </span>
        <span className="text-muted-foreground">{schedule.working_days_per_week} días/sem</span>
        {expectedWeeklyHours !== null ? (
          <span className="font-medium tabular-nums">
            {formatHours(totalWeeklyHours > 0 ? totalWeeklyHours : null)} de {formatHours(expectedWeeklyHours)}
          </span>
        ) : (
          <span className="font-medium tabular-nums">{formatHours(totalWeeklyHours > 0 ? totalWeeklyHours : null)}/sem</span>
        )}
        {pendingHours !== null && pendingHours > 0 && (
          <span className="text-xs text-amber-600 dark:text-amber-400">· {formatHours(pendingHours)} pendientes</span>
        )}
        <span className="text-muted-foreground">
          Desde {new Date(schedule.effective_from).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* View tabs */}
      <div className="flex border-b">
        <button className={tabCls('config')} onClick={() => setViewMode('config')}>Configuración</button>
        <button className={tabCls('week')} onClick={() => setViewMode('week')}>Vista semanal</button>
      </div>

      {viewMode === 'config' ? (
        <>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
                  <th className="py-2 pl-3 pr-2 text-left">Día</th>
                  <th className="py-2 pr-2 text-left">Entrada</th>
                  <th className="py-2 pr-2 text-left">Inicio comida</th>
                  <th className="py-2 pr-2 text-left">Duración</th>
                  <th className="py-2 pr-2 text-left">Salida</th>
                  <th className="py-2 pr-2 text-right">Hrs</th>
                  {periodId && <th className="py-2 pr-3 text-left" />}
                </tr>
              </thead>
              <tbody>
                {sortedDays.map((day) => {
                  const allOverridesForDow = overridesByDow[day.day_of_week] ?? []
                  // An indefinite override that has already started is treated as
                  // the day's current effective schedule, not as an "exception".
                  const permanentOverride =
                    allOverridesForDow.find(
                      (o) => o.effective_to === null && o.effective_from <= todayLocal,
                    ) ?? null
                  // Any override that is NOT the active permanent one is a
                  // temporary exception (single date, range, or future indefinite).
                  const hasTemporaryOverride = allOverridesForDow.some((o) => o !== permanentOverride)
                  const isEditing = override.editingDow === day.day_of_week

                  if (isEditing && override.editValues) {
                    return (
                      <EditRow
                        key={day.day_of_week}
                        day={day}
                        values={override.editValues}
                        errors={override.editErrors}
                        hasErrors={override.hasEditErrors}
                        isPending={override.isPending}
                        onUpdate={override.updateEditField}
                        onToggleDayOff={override.toggleDayOff}
                        onSave={override.openScopeDialog}
                        onCancel={override.cancelEdit}
                        lunchOptions={override.lunchOptions}
                        showActions={!!periodId}
                      />
                    )
                  }

                  return (
                    <ReadRow
                      key={day.day_of_week}
                      day={day}
                      permanentOverride={permanentOverride}
                      hasTemporaryOverride={hasTemporaryOverride}
                      onEdit={() => {
                        if (permanentOverride) {
                          // Pre-fill the edit form from the currently active
                          // permanent override, not from the base schedule day.
                          const prefill: EditDayValues = {
                            is_day_off: permanentOverride.is_day_off,
                            expected_start: permanentOverride.expected_start ?? '',
                            expected_lunch_start: permanentOverride.expected_lunch_start ?? '',
                            lunch_duration_minutes:
                              permanentOverride.lunch_duration_minutes != null
                                ? String(permanentOverride.lunch_duration_minutes)
                                : '',
                            expected_end: permanentOverride.expected_end ?? '',
                          }
                          override.startEdit(day, sortedDays, prefill)
                        } else {
                          override.startEdit(day, sortedDays)
                        }
                      }}
                      onClickOverride={
                        allOverridesForDow.length > 0
                          ? () => openOverrideList(day.day_of_week)
                          : undefined
                      }
                      showActions={!!periodId}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>

          {override.scopeOpen && override.editingDow && (
            <OverrideScopeDialog
              dayLabel={DAY_LABELS[override.editingDow] ?? ''}
              dayOfWeek={override.editingDow}
              existingOverrides={overridesByDow[override.editingDow] ?? []}
              isPending={override.isPending}
              isError={override.isError}
              onSubmit={override.submit}
              onClose={override.closeScopeDialog}
            />
          )}
        </>
      ) : (
        <WeeklyCalendar
          schedule={schedule}
          weekStart={weekStart}
          prevWeek={prevWeek}
          nextWeek={nextWeek}
          openOverrideList={openOverrideList}
        />
      )}

      {/* OverrideListDialog — shared between Configuración and Vista semanal */}
      {overrideListDow !== null && (
        <OverrideListDialog
          dow={overrideListDow}
          dayLabel={DAY_LABELS[overrideListDow] ?? ''}
          overrides={overridesForDow}
          onSelect={handleOverrideSelect}
          onClose={closeOverrideList}
        />
      )}
    </div>
  )
}

// ── Hours helpers ─────────────────────────────────────────────────────────────

function calcDayHours(start: string | null, end: string | null, lunchMinutes: number | null): number | null {
  if (!start || !end) return null
  const toMin = (t: string) => { const [h = 0, m = 0] = t.split(':').map(Number); return h * 60 + m }
  const startMin = toMin(start)
  const endMin = toMin(end)
  // Handle cross-midnight shifts (e.g. 19:00 → 04:00)
  const span = endMin >= startMin ? endMin - startMin : endMin + 1440 - startMin
  const net = span - (lunchMinutes ?? 0)
  return net > 0 ? net / 60 : null
}

function formatHours(h: number | null): string {
  if (h === null) return '—'
  const total = Math.round(h * 60)
  const hours = Math.floor(total / 60)
  const mins = total % 60
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`
}

// ── ReadRow ───────────────────────────────────────────────────────────────────

interface ReadRowProps {
  day: ScheduleDay
  /** An indefinite override whose effective_from ≤ today — treated as the
   *  day's current schedule rather than a temporary exception. */
  permanentOverride: ScheduleDayOverride | null
  /** True when there are active/upcoming overrides besides the permanentOverride. */
  hasTemporaryOverride: boolean
  onEdit: () => void
  onClickOverride?: () => void
  showActions: boolean
}

function ReadRow({ day, permanentOverride, hasTemporaryOverride, onEdit, onClickOverride, showActions }: ReadRowProps) {
  const hasPermanentOverride = permanentOverride !== null
  // The effective day-off state: override wins over base when active.
  const effectiveIsDayOff = permanentOverride ? permanentOverride.is_day_off : day.is_day_off

  // Row tint: amber when a permanent change is in effect; dim when a base rest day.
  const rowCls = hasPermanentOverride
    ? 'border-b last:border-0 bg-amber-50/40 dark:bg-amber-950/15'
    : effectiveIsDayOff
      ? 'border-b last:border-0 opacity-40'
      : 'border-b last:border-0'

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
            <button onClick={onEdit} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Agregar excepción">
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
          <button onClick={onEdit} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Agregar excepción">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </td>
      )}
    </tr>
  )
}

// ── EditRow ───────────────────────────────────────────────────────────────────

interface EditRowProps {
  day: ScheduleDay
  values: EditDayValues
  errors: { expected_start: string | null; expected_end: string | null }
  hasErrors: boolean
  isPending: boolean
  onUpdate: <K extends keyof EditDayValues>(field: K, value: EditDayValues[K]) => void
  onToggleDayOff: (val: boolean) => void
  onSave: () => void
  onCancel: () => void
  lunchOptions: { value: string; label: string }[]
  showActions: boolean
}

function EditRow({ day, values, errors, hasErrors, isPending, onUpdate, onToggleDayOff, onSave, onCancel, lunchOptions, showActions }: EditRowProps) {
  return (
    <tr className="border-b last:border-0 bg-muted/20">
      <td className="py-2 pl-3 pr-2 font-medium text-sm">
        <div className="flex flex-col gap-0.5">
          <span>{DAY_LABELS[day.day_of_week]}</span>
          <label className="flex items-center gap-1 text-xs font-normal text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={values.is_day_off} onChange={(e) => onToggleDayOff(e.target.checked)} className="h-3 w-3" />
            Descanso
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
        <select disabled={values.is_day_off} value={values.lunch_duration_minutes} onChange={(e) => onUpdate('lunch_duration_minutes', e.target.value)} className="h-8 w-28 rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed">
          {lunchOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </td>
      <td className="py-2 pr-2">
        <div className="flex flex-col gap-0.5">
          <Input type="time" disabled={values.is_day_off} value={values.expected_end} onChange={(e) => onUpdate('expected_end', e.target.value)} error={!!errors.expected_end} className="h-8 w-24 text-xs" />
          {errors.expected_end && <span className="text-[10px] text-red-600">{errors.expected_end}</span>}
        </div>
      </td>
      <td className="py-2 pr-2 text-right tabular-nums text-muted-foreground text-xs">
        {formatHours(values.is_day_off ? null : calcDayHours(
          values.expected_start,
          values.expected_end,
          values.lunch_duration_minutes ? Number(values.lunch_duration_minutes) : null,
        ))}
      </td>
      {showActions && (
        <td className="py-2 pr-3">
          <div className="flex items-center gap-1">
            <button onClick={onSave} disabled={hasErrors || isPending} className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-40" title="Guardar excepción"><Check className="h-4 w-4" /></button>
            <button onClick={onCancel} className="rounded p-1 text-muted-foreground hover:bg-muted" title="Cancelar"><Ban className="h-4 w-4" /></button>
          </div>
        </td>
      )}
    </tr>
  )
}

// ── DayLabel ─────────────────────────────────────────────────────────────────

/**
 * Three visual states:
 *   ⚡ (Zap)  — hasTemporaryOverride: there are active/upcoming exceptions
 *   ● (dot)   — hasPermanentOverride only: the day's schedule was permanently
 *               changed and that change is already in effect (it IS the schedule)
 *   (nothing) — no overrides
 *
 * Temporary exceptions take visual priority when both flags are true.
 */
function DayLabel({
  label,
  hasTemporaryOverride,
  hasPermanentOverride,
  onClickOverride,
}: {
  label: string
  hasTemporaryOverride: boolean
  hasPermanentOverride: boolean
  onClickOverride?: () => void
}) {
  const showZap = hasTemporaryOverride
  const showDot = !hasTemporaryOverride && hasPermanentOverride

  return (
    <span className="flex items-center gap-1">
      {label}
      {showZap && (
        onClickOverride ? (
          <button
            onClick={onClickOverride}
            title="Ver excepciones"
            className="rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900"
          >
            <Zap className="h-3 w-3 text-amber-500" />
          </button>
        ) : (
          <span title="Tiene una excepción activa o próxima">
            <Zap className="h-3 w-3 text-amber-500" aria-hidden />
          </span>
        )
      )}
      {showDot && (
        onClickOverride ? (
          <button
            onClick={onClickOverride}
            title="Cambio permanente activo — ver historial"
            className="rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-900"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          </button>
        ) : (
          <span
            className="inline-block h-2 w-2 rounded-full bg-amber-500"
            title="Cambio permanente activo"
          />
        )
      )}
    </span>
  )
}

// ── OverrideScopeDialog ───────────────────────────────────────────────────────

/** Returns the next calendar date (local) that falls on the given ISO day-of-week (1=Mon … 7=Sun). */
function nextDateForDow(dow: number): string {
  const jsTarget = dow === 7 ? 0 : dow
  const today = new Date()
  const daysAhead = (jsTarget - today.getDay() + 7) % 7 // 0 = today, >0 = next occurrence
  const result = new Date(today)
  result.setDate(today.getDate() + daysAhead)
  const y = result.getFullYear()
  const m = String(result.getMonth() + 1).padStart(2, '0')
  const d = String(result.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface OverrideScopeDialogProps {
  dayLabel: string
  dayOfWeek: number
  existingOverrides: ScheduleDayOverride[]
  isPending: boolean
  isError: boolean
  onSubmit: (params: { scope: OverrideScope; effectiveFrom: string; effectiveTo: string | null; note: string }) => void
  onClose: () => void
}

/**
 * Detect existing overrides that overlap with the proposed [newFrom, newTo] range.
 * null newTo means indefinite (treated as +∞ via sentinel '9999-12-31').
 * Overlap condition: newFrom <= oTo AND oFrom <= newTo  (null = +∞)
 */
function detectConflicts(
  newFrom: string,
  newTo: string | null,
  existing: ScheduleDayOverride[],
): ScheduleDayOverride[] {
  const INF = '9999-12-31'
  const newToStr = newTo ?? INF
  return existing.filter((o) => {
    const oToStr = o.effective_to ?? INF
    return newFrom <= oToStr && o.effective_from <= newToStr
  })
}

const SCOPE_OPTIONS: { value: OverrideScope; label: string; description: string }[] = [
  {
    value: 'single_date',
    label: 'Solo esta fecha',
    description: 'Un cambio puntual para una fecha específica.',
  },
  {
    value: 'range',
    label: 'Rango de fechas',
    description: 'Aplica durante un período con fecha de fin.',
  },
  {
    value: 'indefinite',
    label: 'De aquí en adelante',
    description: 'Solo este día cambia permanentemente. Los demás días conservan su horario.',
  },
]

function OverrideScopeDialog({ dayLabel, dayOfWeek, existingOverrides, isPending, isError, onSubmit, onClose }: OverrideScopeDialogProps) {
  const [scope, setScope] = useState<OverrideScope>('single_date')
  const [effectiveFrom, setEffectiveFrom] = useState(() => nextDateForDow(dayOfWeek))
  const [effectiveTo, setEffectiveTo] = useState('')
  const [note, setNote] = useState('')
  // step: 'form' → filling dates | 'conflicts' → reviewing conflicts before confirm
  const [step, setStep] = useState<'form' | 'conflicts'>('form')
  const [conflicts, setConflicts] = useState<ScheduleDayOverride[]>([])

  const today = new Date().toISOString().slice(0, 10)
  const canSubmit =
    !!effectiveFrom &&
    (scope !== 'range' || (!!effectiveTo && effectiveTo >= effectiveFrom))

  const isIndefinite = scope === 'indefinite'
  const dateLabel = scope === 'single_date' ? 'Fecha' : 'A partir de'
  const submitLabel = isIndefinite ? 'Aplicar cambio permanente' : 'Guardar excepción'

  function handlePrimaryClick() {
    // Resolve the effective_to that will be sent (mirrors hook logic)
    const resolvedTo = scope === 'single_date' ? effectiveFrom : (effectiveTo || null)
    const found = detectConflicts(effectiveFrom, resolvedTo, existingOverrides)
    if (found.length > 0) {
      setConflicts(found)
      setStep('conflicts')
    } else {
      onSubmit({ scope, effectiveFrom, effectiveTo: effectiveTo || null, note })
    }
  }

  function handleConfirmConflicts() {
    onSubmit({ scope, effectiveFrom, effectiveTo: effectiveTo || null, note })
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" aria-hidden />
            <h3 className="text-base font-semibold">Ajuste — {dayLabel}</h3>
          </div>
          <button onClick={onClose} className="rounded-sm text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {step === 'form' ? (
          <>
            <div className="space-y-4 p-5">
              <fieldset className="space-y-1">
                <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">¿Cuándo aplica?</legend>
                {SCOPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-3 transition-colors ${
                      scope === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent hover:border-border hover:bg-muted/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="override-scope"
                      value={opt.value}
                      checked={scope === opt.value}
                      onChange={() => setScope(opt.value)}
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">{opt.label}</span>
                      <span className="block text-xs text-muted-foreground">{opt.description}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <div className="space-y-2">
                <label className="block text-xs font-medium">
                  {dateLabel}<span className="ml-0.5 text-red-500">*</span>
                </label>
                <Input type="date" value={effectiveFrom} min={today} onChange={(e) => setEffectiveFrom(e.target.value)} />
              </div>

              {scope === 'range' && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium">Hasta<span className="ml-0.5 text-red-500">*</span></label>
                  <Input type="date" value={effectiveTo} min={effectiveFrom || today} onChange={(e) => setEffectiveTo(e.target.value)} />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">Motivo (opcional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej. Clases de inglés los jueves"
                  maxLength={255}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {isError && <p className="text-xs text-red-600">Ocurrió un error. Intenta de nuevo.</p>}
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
              <Button type="button" size="sm" disabled={!canSubmit || isPending} onClick={handlePrimaryClick}>
                {isPending ? 'Guardando…' : submitLabel}
              </Button>
            </div>
          </>
        ) : (
          /* ── Paso 2: confirmación de conflictos ─────────────────────── */
          <>
            <div className="space-y-3 p-5">
              <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Se encontró{conflicts.length === 1 ? '' : 'n'}{' '}
                  <strong>{conflicts.length} ajuste{conflicts.length === 1 ? '' : 's'}</strong>{' '}
                  existente{conflicts.length === 1 ? '' : 's'} para {dayLabel} que se cruza{conflicts.length === 1 ? '' : 'n'} con las fechas seleccionadas.
                </p>
              </div>
              <ul className="divide-y rounded-md border text-sm">
                {conflicts.map((o) => {
                  const hrs = calcDayHours(o.expected_start, o.expected_end, o.lunch_duration_minutes)
                  return (
                    <li key={o.id} className="px-3 py-2.5 space-y-0.5">
                      <p className="font-medium text-xs text-amber-600 dark:text-amber-400">{overrideDateLabel(o)}</p>
                      <p className="text-muted-foreground">
                        {o.is_day_off
                          ? 'Descanso'
                          : `${formatTime(o.expected_start)} → ${formatTime(o.expected_end)}${hrs ? ` · ${formatHours(hrs)}` : ''}`}
                      </p>
                      {o.note && <p className="text-xs text-muted-foreground">{o.note}</p>}
                    </li>
                  )
                })}
              </ul>
              <p className="text-xs text-muted-foreground">
                El sistema aplicará el ajuste con <strong>fecha de inicio más reciente</strong>. Los ajustes anteriores permanecerán en el registro histórico.
              </p>
              {isError && <p className="text-xs text-red-600">Ocurrió un error. Intenta de nuevo.</p>}
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep('form')}>← Volver</Button>
              <Button type="button" size="sm" disabled={isPending} onClick={handleConfirmConflicts}>
                {isPending ? 'Guardando…' : 'Continuar de todos modos'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── WeeklyCalendar ────────────────────────────────────────────────────────────

interface WeeklyCalendarProps {
  schedule: EmployeeSchedule
  weekStart: string
  prevWeek: () => void
  nextWeek: () => void
  openOverrideList: (dow: number) => void
}

function WeeklyCalendar({ schedule, weekStart, prevWeek, nextWeek, openOverrideList }: WeeklyCalendarProps) {
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
  day: ResolvedDay
  onClickOverride: () => void
}

function WeekDayRow({ day, onClickOverride }: WeekDayRowProps) {
  const isOverride = day.source === 'override'
  const rowCls = day.is_day_off
    ? 'border-b last:border-0 opacity-40'
    : isOverride
      ? 'border-b last:border-0 bg-amber-50/60 dark:bg-amber-950/20'
      : 'border-b last:border-0'

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
  dow: number
  dayLabel: string
  overrides: ScheduleDayOverride[]
  onSelect: (override: ScheduleDayOverride) => void
  onClose: () => void
}

function overrideDateLabel(o: ScheduleDayOverride): string {
  const from = new Date(o.effective_from + 'T00:00:00')
    .toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
  if (o.effective_to === null) return `desde ${from}`
  if (o.effective_from === o.effective_to) return from
  const to = new Date(o.effective_to + 'T00:00:00')
    .toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${from} – ${to}`
}

function OverrideListDialog({ dow: _dow, dayLabel, overrides, onSelect, onClose }: OverrideListDialogProps) {
  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
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
                return (
                  <li key={o.id}>
                    <button
                      onClick={() => onSelect(o)}
                      className="w-full px-5 py-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{overrideDateLabel(o)}</p>
                      <p className="mt-0.5 text-sm">
                        {o.is_day_off
                          ? 'Descanso'
                          : `${formatTime(o.expected_start)} → ${formatTime(o.expected_end)}${hrs ? ` · ${formatHours(hrs)}` : ''}`}
                      </p>
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

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptySchedule({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <CalendarDays className="mb-2 h-8 w-8 text-muted-foreground/50" />
      <p className="mb-1 text-sm font-medium">Sin horario activo</p>
      <p className="mb-4 text-xs text-muted-foreground">Este empleado no tiene un horario vigente configurado.</p>
      {!canCreate && <p className="text-xs text-muted-foreground">El empleado no tiene un período laboral activo.</p>}
    </div>
  )
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-10 animate-pulse rounded bg-muted" />
          <div className="h-4 w-10 animate-pulse rounded bg-muted" />
          <div className="h-4 w-10 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
