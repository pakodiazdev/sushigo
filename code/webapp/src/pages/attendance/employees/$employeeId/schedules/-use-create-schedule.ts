import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useToast } from '@/components/ui/toast-provider'
import { scheduleApi } from '@/services/schedule-api'
import type { CreateScheduleFormValues } from '@/types/schedule'

export function useCreateSchedule(periodId: string, employeeId: string) {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  const mutation = useMutation({
    mutationFn: (values: CreateScheduleFormValues) =>
      scheduleApi.create(periodId, values),

    onSuccess: () => {
      showSuccess('Horario creado correctamente')
      navigate({
        to: '/attendance/employees/$employeeId',
        params: { employeeId },
      })
    },

    onError: () => {
      showError('Error al crear el horario. Verifica los datos e intenta de nuevo.')
    },
  })

  return {
    submit: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
