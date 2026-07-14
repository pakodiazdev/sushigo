import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/api-error'
import { useToast } from '@/components/ui/toast-context'
import type { UpdateEmployeeVacationPolicyPayload } from '@/types/attendance-payroll'
import { employeeVacationPolicyApi } from './employee-vacation-policy-api'

export function useUpdateEmployeeVacationPolicy(employeeId: string) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (payload: UpdateEmployeeVacationPolicyPayload) =>
      employeeVacationPolicyApi.updateOverride(employeeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-entitlements', employeeId] })
      showSuccess('Política de vacaciones del empleado actualizada.', 'Vacaciones')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Error al actualizar la política de vacaciones del empleado.'), 'Vacaciones')
    },
  })
}
