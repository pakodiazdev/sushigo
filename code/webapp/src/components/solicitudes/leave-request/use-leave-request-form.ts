import { useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLeaveTypes } from '@/services/leave-hooks'
import { useRequestLeave } from '@/services/employee-request-hooks'
import { todayDateCdmx } from '@/lib/datetime'
import type { LeaveType } from '@/types/leave'

const schema = z
  .object({
    leave_type_id: z.number().min(1, 'Selecciona un tipo de ausencia'),
    start_date: z.string().min(1, 'La fecha de inicio es requerida'),
    end_date: z.string().min(1, 'La fecha de fin es requerida'),
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
  .refine((v) => v.end_date >= v.start_date, {
    message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
    path: ['end_date'],
  })

export type LeaveRequestFormValues = z.infer<typeof schema>

export interface UseLeaveRequestFormResult {
  form: UseFormReturn<LeaveRequestFormValues>
  leaveTypes: LeaveType[]
  isLoadingTypes: boolean
  isProportionalHours: boolean
  isScheduled: boolean
  isPending: boolean
  handleSubmit: () => void
}

export function useLeaveRequestForm(employeeId: string, onSuccess: () => void): UseLeaveRequestFormResult {
  const { data: leaveTypes = [], isLoading: isLoadingTypes } = useLeaveTypes()
  const mutation = useRequestLeave()

  const today = todayDateCdmx()

  const form = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      leave_type_id: 0,
      start_date: today,
      end_date: today,
      pay_percentage: null,
      time_mode: null,
      scheduled_start_time: null,
      scheduled_end_time: null,
      notes: null,
    },
  })

  const watchedTypeId = form.watch('leave_type_id')
  const watchedTimeMode = form.watch('time_mode')
  const watchedStartDate = form.watch('start_date')

  const selectedType = useMemo(
    () => leaveTypes.find((t) => t.id === watchedTypeId) ?? null,
    [leaveTypes, watchedTypeId]
  )

  const isProportionalHours = selectedType?.calculation_mode === 'PROPORTIONAL_HOURS'
  const isScheduled = watchedTimeMode === 'SCHEDULED'

  // PROPORTIONAL_HOURS leaves must be single-day — keep end_date in sync with start_date.
  useEffect(() => {
    if (isProportionalHours) {
      form.setValue('end_date', watchedStartDate)
    }
  }, [isProportionalHours, watchedStartDate, form])

  useEffect(() => {
    if (!isProportionalHours) {
      form.setValue('time_mode', null)
      form.setValue('scheduled_start_time', null)
      form.setValue('scheduled_end_time', null)
      form.clearErrors(['time_mode', 'scheduled_start_time', 'scheduled_end_time'])
    }
  }, [isProportionalHours, form])

  useEffect(() => {
    if (watchedTimeMode !== 'SCHEDULED') {
      form.setValue('scheduled_end_time', null)
      form.clearErrors('scheduled_end_time')
    }
  }, [watchedTimeMode, form])

  const handleSubmit = form.handleSubmit((values) => {
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

    const emptyToNull = (v: string | null | undefined) => v || null

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
        employee_id: employeeId,
        type: 'LEAVE',
        auto_approve: false,
        notes: emptyToNull(values.notes) ?? undefined,
        payload: {
          leave_type_id: values.leave_type_id,
          start_date: values.start_date,
          end_date: values.end_date,
          pay_percentage: payPct,
          time_mode: timeMode,
          scheduled_start_time: emptyToNull(values.scheduled_start_time),
          scheduled_end_time: emptyToNull(values.scheduled_end_time),
        },
      },
      {
        onSuccess: () => {
          form.reset()
          onSuccess()
        },
      }
    )
  })

  return {
    form,
    leaveTypes,
    isLoadingTypes,
    isProportionalHours,
    isScheduled,
    isPending: mutation.isPending,
    handleSubmit,
  }
}
