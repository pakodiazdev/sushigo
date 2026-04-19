import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-fields'
import { useCreateScheduleInline } from './use-create-schedule-inline'
import type { CreateScheduleSimpleValues } from './use-create-schedule-inline'
import type { EmployeeSchedule } from '@/types/schedule'

export interface CreateScheduleFormProps {
  readonly employeeId: string
  readonly periodId: string | null
  readonly hasExistingSchedule: boolean
  /** Current schedule to pre-fill the form with existing values. */
  readonly currentSchedule?: EmployeeSchedule | null
  /** Start date of the active employment period (for first-time schedule creation). */
  readonly periodStartDate?: string
  readonly onSuccess: () => void
  readonly onCancel: () => void
}

export function CreateScheduleForm({ employeeId, periodId, hasExistingSchedule, currentSchedule, periodStartDate, onSuccess, onCancel }: CreateScheduleFormProps) {
  const { form, onSubmit, isPending, dowKeys, dayLabels, lunchOptions } =
    useCreateScheduleInline(employeeId, periodId, onSuccess, currentSchedule, periodStartDate)

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
              {workingDays} día{workingDays === 1 ? '' : 's'} laborable{workingDays === 1 ? '' : 's'}
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
