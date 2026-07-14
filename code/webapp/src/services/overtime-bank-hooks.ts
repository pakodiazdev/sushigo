import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { overtimeBankApi } from '@/services/overtime-bank-api'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import type { CreateManualOvertimeMovementData } from '@/types/attendance-payroll'

const QUERY_KEY = (employeeId: string) => ['overtime-bank', employeeId]

export function useOvertimeBank(employeeId: string) {
  return useQuery({
    queryKey: QUERY_KEY(employeeId),
    queryFn: async () => {
      const response = await overtimeBankApi.getBank(employeeId)
      return { movements: response.data.data, summary: response.data.meta }
    },
    enabled: !!employeeId,
  })
}

export function useCreateManualOvertimeMovement(employeeId: string) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: CreateManualOvertimeMovementData) =>
      overtimeBankApi.createManualMovement(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(employeeId) })
      showSuccess('Movimiento registrado correctamente.', 'Movimiento manual')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo registrar el movimiento.'),
        'Error al registrar movimiento'
      )
    },
  })
}
