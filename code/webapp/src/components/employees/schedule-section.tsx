import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, X, Plus, Pencil, Check, Ban, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DAY_LABELS, formatLunchDuration } from '@/types/schedule'
import type { EmployeeSchedule, ScheduleDay, ScheduleDayOverride } from '@/types/schedule'
import type { Employee } from '@/types/employee'
import { useScheduleSection } from './-use-schedule-section'
import { useCreateDayOverride } from './-use-create-day-override'
import type { OverrideScope, EditDayValues } from './-use-create-day-override'

// ── Section (trigger inside detail view) ─────────────────────────────────────

interface ScheduleSectionProps {
  employee: Employee
}

export function ScheduleSection({ employee }: ScheduleSectionProps) {
  const { isOpen, open, close, schedule, periodId, isLoading, isError, goToCreateSchedule } =
    useScheduleSection(employee.id)

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4" />
          Horario activo
        </h3>
        <Button size="sm" variant="ghost" onClick={open} className="h-7 gap-1 px-2 text-xs">
          <CalendarDays className="h-3.5 w-3.5" />
          Ver horario
        </Button>
      </div>

      <ScheduleDialog
        isOpen={isOpen}
        onClose={close}
        employeeName={`${employee.first_name} ${employee.last_name}`}
        employeeId={employee.id}
        schedule={schedule}
        periodId={periodId}
        isLoading={isLoading}
        isError={isError}
        onCreateSchedule={goToCreateSchedule}
      />
    </>
  )
}

// ── Dialog (portals to viewport, centered on page) ───────────────────────────

interface ScheduleDialogProps {
  isOpen: boolean
  onClose: () => void
  employeeName: string
  employeeId: string
  schedule: EmployeeSchedule | null
  periodId: string | null
  isLoading: boolean
  isError: boolean
  onCreateSchedule: () => void
}

function ScheduleDialog({
  isOpen,
  onClose,
  employeeName,
  employeeId,
  schedule,
  periodId,
  isLoading,
  isError,
  onCreateSchedule,
}: ScheduleDialogProps) {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState<'enter' | 'exit' | null>(null)

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating('enter'))
      })
    } else if (visible) {
      setAnimating('exit')
      document.body.style.overflow = ''
      const timer = setTimeout(() => {
        setVisible(false)
        setAnimating(null)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen, visible])

  useEffect(() => {
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!visible) return null

  const backdropAnimation =
    animating === 'enter'
      ? 'animate-dialog-backdrop-in'
      : animating === 'exit'
        ? 'animate-dialog-backdrop-out'
        : ''

  const panelAnimation =
    animating === 'enter'
      ? 'animate-dialog-in'
      : animating === 'exit'
        ? 'animate-dialog-out'
        : ''

  const content = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 ${backdropAnimation}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative z-10 w-full max-w-2xl rounded-lg border border-border bg-background shadow-xl ${panelAnimation}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Horario de ${employeeName}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold">Horario activo</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm text-muted-foreground hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {isLoading ? (
            <ScheduleSkeleton />
          ) : isError ? (
            <p className="text-sm text-muted-foreground">Error al cargar el horario.</p>
          ) : schedule ? (
            <ScheduleContent
              schedule={schedule}
              employeeId={employeeId}
              periodId={periodId}
            />
          ) : (
            <EmptySchedule canCreate={!!periodId} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-5 py-3">
          {periodId && !isLoading ? (
            <Button type="button" size="sm" onClick={onCreateSchedule}>
              <Plus className="mr-1 h-4 w-4" />
              {schedule ? 'Nuevo horario' : 'Crear horario'}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
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
    (acc, o) => {
      const list = acc[o.day_of_week] ?? []
      return { ...acc, [o.day_of_week]: [...list, o] }
    },
    {}
  )

  const sortedDays = [...(schedule.days ?? [])].sort((a, b) => a.day_of_week - b.day_of_week)

  return (
    <div className="space-y-3">
      {/* Schedule header info */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{schedule.name}</span>
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          {schedule.workday_type === 'FULL' ? 'Jornada completa' : 'Jornada parcial'}
        </span>
        <span className="text-muted-foreground">{schedule.working_days_per_week} días/sem</span>
        <span className="text-muted-foreground">
          Desde {new Date(schedule.effective_from).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* Days table */}
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
                  onEdit={() => override.startEdit(day)}
                  showActions={!!periodId}
                />
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Override scope dialog */}
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
            <button
              onClick={onEdit}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Agregar excepción"
            >
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
          <button
            onClick={onEdit}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Agregar excepción"
          >
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

function EditRow({
  day,
  values,
  errors,
  hasErrors,
  isPending,
  onUpdate,
  onToggleDayOff,
  onSave,
  onCancel,
  lunchOptions,
  showActions,
}: EditRowProps) {
  return (
    <tr className="border-b last:border-0 bg-muted/20">
      {/* Day label + day-off toggle */}
      <td className="py-2 pl-3 pr-2 font-medium text-sm">
        <div className="flex flex-col gap-0.5">
          <span>{DAY_LABELS[day.day_of_week]}</span>
          <label className="flex items-center gap-1 text-xs font-normal text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={values.is_day_off}
              onChange={(e) => onToggleDayOff(e.target.checked)}
              className="h-3 w-3"
            />
            Descanso
          </label>
        </div>
      </td>

      {/* Entrada */}
      <td className="py-2 pr-2">
        <div className="flex flex-col gap-0.5">
          <Input
            type="time"
            disabled={values.is_day_off}
            value={values.expected_start}
            onChange={(e) => onUpdate('expected_start', e.target.value)}
            error={!!errors.expected_start}
            className="h-8 w-24 text-xs"
          />
          {errors.expected_start && (
            <span className="text-[10px] text-red-600">{errors.expected_start}</span>
          )}
        </div>
      </td>

      {/* Inicio comida */}
      <td className="py-2 pr-2">
        <Input
          type="time"
          disabled={values.is_day_off}
          value={values.expected_lunch_start}
          onChange={(e) => onUpdate('expected_lunch_start', e.target.value)}
          className="h-8 w-24 text-xs"
        />
      </td>

      {/* Duración comida */}
      <td className="py-2 pr-2">
        <select
          disabled={values.is_day_off}
          value={values.lunch_duration_minutes}
          onChange={(e) => onUpdate('lunch_duration_minutes', e.target.value)}
          className="h-8 w-28 rounded-md border border-input bg-background px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {lunchOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </td>

      {/* Salida */}
      <td className="py-2 pr-2">
        <div className="flex flex-col gap-0.5">
          <Input
            type="time"
            disabled={values.is_day_off}
            value={values.expected_end}
            onChange={(e) => onUpdate('expected_end', e.target.value)}
            error={!!errors.expected_end}
            className="h-8 w-24 text-xs"
          />
          {errors.expected_end && (
            <span className="text-[10px] text-red-600">{errors.expected_end}</span>
          )}
        </div>
      </td>

      {/* Save / Cancel */}
      {showActions && (
        <td className="py-2 pr-3">
          <div className="flex items-center gap-1">
            <button
              onClick={onSave}
              disabled={hasErrors || isPending}
              className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-40"
              title="Guardar excepción"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={onCancel}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              title="Cancelar"
            >
              <Ban className="h-4 w-4" />
            </button>
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
  onSubmit: (params: {
    scope: OverrideScope
    effectiveFrom: string
    effectiveTo: string | null
    note: string
  }) => void
  onClose: () => void
}

function OverrideScopeDialog({ dayLabel, isPending, isError, onSubmit, onClose }: OverrideScopeDialogProps) {
  const [scope, setScope] = useState<OverrideScope>('single_date')
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [effectiveTo, setEffectiveTo] = useState('')
  const [note, setNote] = useState('')

  const today = new Date().toISOString().slice(0, 10)

  const canSubmit = !!effectiveFrom && (
    scope === 'single_date' ||
    scope === 'indefinite' ||
    (scope === 'range' && !!effectiveTo && effectiveTo >= effectiveFrom)
  )

  function handleSubmit() {
    if (!canSubmit) return
    onSubmit({
      scope,
      effectiveFrom,
      effectiveTo: scope === 'range' ? (effectiveTo || null) : null,
      note,
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h3 className="text-base font-semibold">Excepción — {dayLabel}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Scope selector */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              ¿Cuándo aplica?
            </legend>
            {(
              [
                { value: 'single_date', label: 'Solo esta fecha' },
                { value: 'range', label: 'Rango de fechas' },
                { value: 'indefinite', label: 'Indefinido (sin fecha de fin)' },
              ] as { value: OverrideScope; label: string }[]
            ).map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="override-scope"
                  value={opt.value}
                  checked={scope === opt.value}
                  onChange={() => setScope(opt.value)}
                  className="h-4 w-4"
                />
                {opt.label}
              </label>
            ))}
          </fieldset>

          {/* Date inputs */}
          <div className="space-y-2">
            <label className="block text-xs font-medium">
              {scope === 'single_date' ? 'Fecha' : 'Inicio'}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={effectiveFrom}
              min={today}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>

          {scope === 'range' && (
            <div className="space-y-2">
              <label className="block text-xs font-medium">
                Fin
                <span className="ml-0.5 text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={effectiveTo}
                min={effectiveFrom || today}
                onChange={(e) => setEffectiveTo(e.target.value)}
              />
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">
              Motivo (opcional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Paco llega tarde este lunes"
              maxLength={255}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {isError && (
            <p className="text-xs text-red-600">Ocurrió un error. Intenta de nuevo.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canSubmit || isPending}
            onClick={handleSubmit}
          >
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
      <p className="mb-4 text-xs text-muted-foreground">
        Este empleado no tiene un horario vigente configurado.
      </p>
      {!canCreate && (
        <p className="text-xs text-muted-foreground">El empleado no tiene un período laboral activo.</p>
      )}
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
