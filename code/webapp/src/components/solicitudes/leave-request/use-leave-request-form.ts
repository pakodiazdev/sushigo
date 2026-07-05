import { useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useLeaveTypes } from '@/services/leave-hooks'
import { useRequestLeave } from '@/services/employee-request-hooks'
import type { LeaveType } from '@/types/leave'

const schema = z.object({
  leave_type_id: z.number().min(1, 'Selecciona un tipo de ausencia'),
  dates: z.array(z.string()).min(1, 'Selecciona al menos un día'),
  request_paid: z.boolean().optional(),
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

  const form = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      leave_type_id: 0,
      dates: [],
      request_paid: false,
      time_mode: null,
      scheduled_start_time: null,
      scheduled_end_time: null,
      notes: null,
    },
  })

  const watchedTypeId = form.watch('leave_type_id')
  const watchedTimeMode = form.watch('time_mode')
  const watchedDates = form.watch('dates')

  const selectedType = useMemo(
    () => leaveTypes.find((t) => t.id === watchedTypeId) ?? null,
    [leaveTypes, watchedTypeId]
  )

  const isProportionalHours = selectedType?.calculation_mode === 'PROPORTIONAL_HOURS'
  const isScheduled = watchedTimeMode === 'SCHEDULED'

  // PROPORTIONAL_HOURS leaves must be single-day — collapse to the first
  // selected date if more were picked before switching leave types.
  useEffect(() => {
    const [firstDate] = watchedDates
    if (isProportionalHours && watchedDates.length > 1 && firstDate) {
      form.setValue('dates', [firstDate])
    }
  }, [isProportionalHours, watchedDates, form])

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

    const timeMode = emptyToNull(values.time_mode) as 'SCHEDULED' | 'OPEN_ENDED' | null

    mutation.mutate(
      {
        employee_id: employeeId,
        type: 'LEAVE',
        auto_approve: false,
        notes: emptyToNull(values.notes) ?? undefined,
        payload: {
          leave_type_id: values.leave_type_id,
          dates: values.dates,
          pay_percentage: values.request_paid ? 100 : 0,
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
