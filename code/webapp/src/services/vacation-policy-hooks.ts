import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/api-error'
import { useToast } from '@/components/ui/toast-context'
import type { VacationPolicySettings, UpdateVacationPolicyPayload } from '@/types/attendance-payroll'
import { vacationPolicyApi } from './vacation-policy-api'

export function useVacationPolicy() {
  return useQuery<VacationPolicySettings>({
    queryKey: ['vacation-policy'],
    queryFn: async () => {
      const response = await vacationPolicyApi.get()
      return response.data.data
    },
    staleTime: 5 * 60_000,
  })
}

export function useUpdateVacationPolicy() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (payload: UpdateVacationPolicyPayload) => vacationPolicyApi.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-policy'] })
      showSuccess('Política de vacaciones actualizada.', 'Vacaciones')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Error al actualizar la política de vacaciones.'), 'Vacaciones')
    },
  })
}
