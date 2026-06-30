import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-provider'
import { getApiErrorMessage } from '@/lib/api-error'
import { vacationApi } from '@/services/vacation.service'
import type { RegisterEntitlementData } from '@/services/vacation.service'

const QUERY_KEY = (employeeId: string) => ['vacation-entitlements', employeeId]

export function useVacationEntitlements(employeeId: string) {
  return useQuery({
    queryKey: QUERY_KEY(employeeId),
    queryFn: async () => {
      const response = await vacationApi.getEntitlements(employeeId)
      return response.data.data
    },
    enabled: !!employeeId,
  })
}

export function useRegisterEntitlement(employeeId: string) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: RegisterEntitlementData) =>
      vacationApi.registerEntitlement(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(employeeId) }).catch(() => null)
      showSuccess('Derecho vacacional registrado correctamente.')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo registrar el derecho vacacional.'))
    },
  })
}
