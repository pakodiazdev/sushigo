import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, X, Plus, Pencil, Check, Ban, Zap, ArrowLeft, AlertTriangle } from 'lucide-react'
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

// ── Section (trigger inside detail view) ─────────────────────────────────────

interface ScheduleSectionProps {
  employee: Employee
}

export function ScheduleSection({ employee }: ScheduleSectionProps) {
  const ctx = useScheduleSection(employee.id)

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4" />
          Horario activo
        </h3>
        <Button size="sm" variant="ghost" onClick={ctx.open} className="h-7 gap-1 px-2 text-xs">
          <CalendarDays className="h-3.5 w-3.5" />
          Ver horario
        </Button>
      </div>

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
  onSuccess: () => void
  onCancel: () => void
}

function CreateScheduleForm({ employeeId, periodId, hasExistingSchedule, onSuccess, onCancel }: CreateScheduleFormProps) {
  const { form, onSubmit, isPending, dowKeys, dayLabels, lunchOptions } =
    useCreateScheduleInline(employeeId, periodId, onSuccess)

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

  const overridesByDow = (schedule.active_overrides ?? []).reduce<Record<number, ScheduleDayOverride[]>>(
    (acc, o) => ({ ...acc, [o.day_of_week]: [...(acc[o.day_of_week] ?? []), o] }),
    {}
  )

  const sortedDays = [...(schedule.days ?? [])].sort((a, b) => a.day_of_week - b.day_of_week)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          {schedule.workday_type === 'FULL' ? 'Jornada completa' : 'Jornada parcial'}
        </span>
        <span className="text-muted-foreground">{schedule.working_days_per_week} días/sem</span>
        <span className="text-muted-foreground">
          Desde {new Date(schedule.effective_from).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="py-2 pl-3 pr-2 text-left">Día</th>
              <th className="py-2 pr-2 text-left">Entrada</th>
              <th className="py-2 pr-2 text-left">Inicio comida</th>
              <th className="py-2 pr-2 text-left">Duración</th>
              <th className="py-2 pr-2 text-left">Salida</th>
              {periodId && <th className="py-2 pr-3 text-left" />}
            </tr>
          </thead>
          <tbody>
            {sortedDays.map((day) => {
              const hasOverride = !!(overridesByDow[day.day_of_week]?.length)
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
                  hasOverride={hasOverride}
                  onEdit={() => override.startEdit(day, sortedDays)}
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
          isPending={override.isPending}
          isError={override.isError}
          onSubmit={override.submit}
          onClose={override.closeScopeDialog}
        />
      )}
    </div>
  )
}

// ── ReadRow ───────────────────────────────────────────────────────────────────

interface ReadRowProps {
  day: ScheduleDay
  hasOverride: boolean
  onEdit: () => void
  showActions: boolean
}

function ReadRow({ day, hasOverride, onEdit, showActions }: ReadRowProps) {
  if (day.is_day_off) {
    return (
      <tr className="border-b last:border-0 opacity-40">
        <td className="py-2 pl-3 pr-2 font-medium">
          <DayLabel label={DAY_LABELS[day.day_of_week] ?? ''} hasOverride={hasOverride} />
        </td>
        <td colSpan={4} className="py-2 pr-2 italic text-muted-foreground">Descanso</td>
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

  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pl-3 pr-2 font-medium">
        <DayLabel label={DAY_LABELS[day.day_of_week] ?? ''} hasOverride={hasOverride} />
      </td>
      <td className="py-2 pr-2 text-muted-foreground">{day.expected_start ?? '—'}</td>
      <td className="py-2 pr-2 text-muted-foreground">{day.expected_lunch_start ?? '—'}</td>
      <td className="py-2 pr-2 text-muted-foreground">{formatLunchDuration(day.lunch_duration_minutes)}</td>
      <td className="py-2 pr-2 text-muted-foreground">{day.expected_end ?? '—'}</td>
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

function DayLabel({ label, hasOverride }: { label: string; hasOverride: boolean }) {
  return (
    <span className="flex items-center gap-1">
      {label}
      {hasOverride && (
        <span title="Tiene una excepción activa o próxima">
          <Zap className="h-3 w-3 text-amber-500" aria-hidden />
        </span>
      )}
    </span>
  )
}

// ── OverrideScopeDialog ───────────────────────────────────────────────────────

interface OverrideScopeDialogProps {
  dayLabel: string
  isPending: boolean
  isError: boolean
  onSubmit: (params: { scope: OverrideScope; effectiveFrom: string; effectiveTo: string | null; note: string }) => void
  onClose: () => void
}

function OverrideScopeDialog({ dayLabel, isPending, isError, onSubmit, onClose }: OverrideScopeDialogProps) {
  const [scope, setScope] = useState<OverrideScope>('single_date')
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [effectiveTo, setEffectiveTo] = useState('')
  const [note, setNote] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const canSubmit = !!effectiveFrom && (
    scope === 'single_date' || scope === 'indefinite' ||
    (scope === 'range' && !!effectiveTo && effectiveTo >= effectiveFrom)
  )

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-lg border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" aria-hidden />
            <h3 className="text-base font-semibold">Excepción — {dayLabel}</h3>
          </div>
          <button onClick={onClose} className="rounded-sm text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-5">
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">¿Cuándo aplica?</legend>
            {([
              { value: 'single_date', label: 'Solo esta fecha' },
              { value: 'range', label: 'Rango de fechas' },
              { value: 'indefinite', label: 'Indefinido (sin fecha de fin)' },
            ] as { value: OverrideScope; label: string }[]).map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="override-scope" value={opt.value} checked={scope === opt.value} onChange={() => setScope(opt.value)} className="h-4 w-4" />
                {opt.label}
              </label>
            ))}
          </fieldset>
          <div className="space-y-2">
            <label className="block text-xs font-medium">
              {scope === 'single_date' ? 'Fecha' : 'Inicio'}<span className="ml-0.5 text-red-500">*</span>
            </label>
            <Input type="date" value={effectiveFrom} min={today} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>
          {scope === 'range' && (
            <div className="space-y-2">
              <label className="block text-xs font-medium">Fin<span className="ml-0.5 text-red-500">*</span></label>
              <Input type="date" value={effectiveTo} min={effectiveFrom || today} onChange={(e) => setEffectiveTo(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">Motivo (opcional)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Paco llega tarde este lunes" maxLength={255} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          {isError && <p className="text-xs text-red-600">Ocurrió un error. Intenta de nuevo.</p>}
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button type="button" size="sm" disabled={!canSubmit || isPending}
            onClick={() => onSubmit({ scope, effectiveFrom, effectiveTo: scope === 'range' ? (effectiveTo || null) : null, note })}>
            {isPending ? 'Guardando…' : 'Guardar excepción'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
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
