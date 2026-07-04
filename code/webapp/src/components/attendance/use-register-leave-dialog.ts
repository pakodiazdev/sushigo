import { useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLeaveTypes, useRegisterDirectLeave } from '@/services/leave-hooks'
import { todayDateCdmx } from '@/lib/datetime'
import type { LeaveType } from '@/types/leave'
import type { TodayAttendanceEmployee } from '@/types/attendance'

// ── Schema ──────────────────────────────────────────────────────────────────────
// Use z.number() (not z.coerce) so the inferred input type stays consistent
// with react-hook-form. The select registers with valueAsNumber:true so the
// value is already a number by the time the resolver sees it.

const schema = z.object({
  leave_type_id: z.number().min(1, 'Selecciona un tipo de ausencia'),
  pay_percentage: z.string().optional().nullable(),
  time_mode: z.enum(['SCHEDULED', 'OPEN_ENDED', '']).optional().nullable(),
  scheduled_start_time: z
    .string()
    .regex(/^(\d{2}:\d{2})?$/, 'Formato HH:mm')
    .optional()
    .nullable(),
  scheduled_end_time: z
    .string()
    .regex(/^(\d{2}:\d{2})?$/, 'Formato HH:mm')
    .optional()
    .nullable(),
  notes: z.string().max(1000, 'Máximo 1000 caracteres').optional().nullable(),
})

export type RegisterLeaveFormValues = z.infer<typeof schema>

// ── Props / Return ──────────────────────────────────────────────────────────────

export interface UseRegisterLeaveDialogProps {
  employee: TodayAttendanceEmployee | null
  onSuccess: () => void
}

export interface UseRegisterLeaveDialogResult {
  form: UseFormReturn<RegisterLeaveFormValues>
  leaveTypes: LeaveType[]
  isLoadingTypes: boolean
  isProportionalHours: boolean
  isScheduled: boolean
  isPending: boolean
  handleSubmit: () => void
  handleClose: () => void
}

// ── Hook ────────────────────────────────────────────────────────────────────────

export function useRegisterLeaveDialog({
  employee,
  onSuccess,
}: UseRegisterLeaveDialogProps): UseRegisterLeaveDialogResult {
  const { data: leaveTypes = [], isLoading: isLoadingTypes } = useLeaveTypes()
  const mutation = useRegisterDirectLeave()

  const form = useForm<RegisterLeaveFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      leave_type_id: 0,
      pay_percentage: null,
      time_mode: null,
      scheduled_start_time: null,
      scheduled_end_time: null,
      notes: null,
    },
  })

  const watchedTypeId = form.watch('leave_type_id')
  const watchedTimeMode = form.watch('time_mode')

  const selectedType = useMemo(
    () => leaveTypes.find((t) => t.id === watchedTypeId) ?? null,
    [leaveTypes, watchedTypeId]
  )

  const isProportionalHours = selectedType?.calculation_mode === 'PROPORTIONAL_HOURS'
  const isScheduled = watchedTimeMode === 'SCHEDULED'

  // Reset time fields when leave type changes away from PROPORTIONAL_HOURS
  useEffect(() => {
    if (!isProportionalHours) {
      form.setValue('time_mode', null)
      form.setValue('scheduled_start_time', null)
      form.setValue('scheduled_end_time', null)
      form.clearErrors(['time_mode', 'scheduled_start_time', 'scheduled_end_time'])
    }
  }, [isProportionalHours, form])

  // Reset scheduled_end_time when time_mode changes to OPEN_ENDED
  useEffect(() => {
    if (watchedTimeMode !== 'SCHEDULED') {
      form.setValue('scheduled_end_time', null)
      form.clearErrors('scheduled_end_time')
    }
  }, [watchedTimeMode, form])

  const handleSubmit = form.handleSubmit((values) => {
    if (!employee) return

    // Conditional validation beyond Zod schema
    if (isProportionalHours && !values.time_mode) {
      form.setError('time_mode', { message: 'Requerido para permisos por horas' })
      return
    }
    if (isScheduled && !values.scheduled_end_time) {
      form.setError('scheduled_end_time', { message: 'Requerido cuando el horario es definido' })
      return
    }
    if (isProportionalHours && !values.scheduled_start_time) {
      form.setError('scheduled_start_time', { message: 'Hora de salida requerida' })
      return
    }

    const today = todayDateCdmx()
    const emptyToNull = (v: string | null | undefined) => v || null

    // Validate and normalize pay_percentage
    const rawPct = emptyToNull(values.pay_percentage)
    let payPct: number | null = null
    if (rawPct !== null) {
      const n = Number(rawPct)
      if (Number.isNaN(n) || n < 0 || n > 100) {
        form.setError('pay_percentage', { message: 'Debe ser un número entre 0 y 100' })
        return
      }
      payPct = n
    }

    const timeMode = emptyToNull(values.time_mode) as 'SCHEDULED' | 'OPEN_ENDED' | null

    mutation.mutate(
      {
        employee_id: employee.id,
        leave_type_id: values.leave_type_id,
        dates: [today],
        pay_percentage: payPct,
        time_mode: timeMode,
        scheduled_start_time: emptyToNull(values.scheduled_start_time),
        scheduled_end_time: emptyToNull(values.scheduled_end_time),
        notes: emptyToNull(values.notes),
      },
      {
        onSuccess: () => {
          form.reset()
          onSuccess()
        },
      }
    )
  })

  const handleClose = () => {
    form.reset()
  }

  return {
    form,
    leaveTypes,
    isLoadingTypes,
    isProportionalHours,
    isScheduled,
    isPending: mutation.isPending,
    handleSubmit,
    handleClose,
  }
}
