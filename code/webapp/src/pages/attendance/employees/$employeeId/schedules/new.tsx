import { createFileRoute } from '@tanstack/react-router'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Select } from '@/components/ui/form-fields'
import { ScheduleDayRow } from './-schedule-day-row'
import { useCreateSchedule } from './-use-create-schedule'
import { buildEmptyDays } from '@/types/schedule'
import type { CreateScheduleFormValues } from '@/types/schedule'

export const Route = createFileRoute(
  '/attendance/employees/$employeeId/schedules/new'
)({
  component: CreateSchedulePage,
  validateSearch: (search: Record<string, unknown>) => ({
    periodId: typeof search.periodId === 'string' ? search.periodId : '',
  }),
})

// ── Zod schema ────────────────────────────────────────────────────────────────

const daySchema = z
  .object({
    day_of_week: z.number().int().min(1).max(7),
    is_day_off: z.boolean(),
    expected_start: z.string(),
    expected_lunch_start: z.string(),
    expected_lunch_end: z.string(),
    lunch_duration_minutes: z.string(),
    expected_end: z.string(),
  })
  .superRefine((day, ctx) => {
    if (!day.is_day_off) {
      if (!day.expected_start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expected_start'],
          message: 'La hora de entrada es requerida',
        })
      }
      if (!day.expected_end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expected_end'],
          message: 'La hora de salida es requerida',
        })
      }
    }
  })

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  effective_from: z.string().min(1, 'La fecha de vigencia es requerida'),
  workday_type: z.enum(['FULL', 'PARTIAL']),
  working_days_per_week: z
    .string()
    .min(1)
    .refine((v) => Number(v) >= 1 && Number(v) <= 7, {
      message: 'Entre 1 y 7 días',
    }),
  days: z.array(daySchema).length(7),
})

// ── Page ──────────────────────────────────────────────────────────────────────

function CreateSchedulePage() {
  const { employeeId } = Route.useParams()
  const { periodId } = Route.useSearch()

  const { submit, isPending } = useCreateSchedule(periodId, employeeId)

  const methods = useForm<CreateScheduleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      effective_from: '',
      workday_type: 'FULL',
      working_days_per_week: '5',
      days: buildEmptyDays(),
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = methods

  const onSubmit = async (values: CreateScheduleFormValues) => {
    await submit(values)
  }

  return (
    <PageContainer>
      <PageHeader title="Nuevo Horario" description="Define el horario semanal del empleado" />

      {/* Auto-close warning */}
      <div className="mb-6 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Si existe un horario activo, se cerrará automáticamente al guardar.</span>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Header fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Nombre" error={errors.name?.message} required className="lg:col-span-2">
              <Input
                placeholder="Ej. Horario estándar"
                error={!!errors.name}
                {...register('name')}
              />
            </FormField>

            <FormField label="Vigente desde" error={errors.effective_from?.message} required>
              <Input
                type="date"
                error={!!errors.effective_from}
                {...register('effective_from')}
              />
            </FormField>

            <FormField label="Tipo de jornada" error={errors.workday_type?.message} required>
              <Select error={!!errors.workday_type} {...register('workday_type')}>
                <option value="FULL">Completa</option>
                <option value="PARTIAL">Parcial</option>
              </Select>
            </FormField>

            <FormField label="Días por semana" error={errors.working_days_per_week?.message} required>
              <Select error={!!errors.working_days_per_week} {...register('working_days_per_week')}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {/* Day grid */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Configuración por día
            </h3>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                    <th className="py-2 pr-4 pl-3">Día</th>
                    <th className="py-2 pr-4">Descanso</th>
                    <th className="py-2 pr-2">Entrada</th>
                    <th className="py-2 pr-2">Inicio almuerzo</th>
                    <th className="py-2 pr-2">Fin almuerzo</th>
                    <th className="py-2 pr-3">Salida</th>
                  </tr>
                </thead>
                <tbody className="pl-3">
                  {Array.from({ length: 7 }, (_, i) => (
                    <ScheduleDayRow key={i} index={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => history.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando…' : 'Guardar horario'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </PageContainer>
  )
}
