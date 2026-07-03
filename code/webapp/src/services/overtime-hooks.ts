import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/api-error'
import { useToast } from '@/components/ui/toast-context'
import type { OvertimePayConfig, SetOvertimeConfigPayload } from '@/types/attendance-payroll'
import { overtimeConfigApi } from './overtime.service'

export function useOvertimeConfig(employeeId: string) {
  return useQuery<OvertimePayConfig[]>({
    queryKey: ['overtime-config', employeeId],
    queryFn: async () => {
      const response = await overtimeConfigApi.getOvertimeConfig(employeeId)
      return response.data.data
    },
    staleTime: 2 * 60_000,
  })
}

export function useSetOvertimeConfig(employeeId: string) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (payload: SetOvertimeConfigPayload) =>
      overtimeConfigApi.setOvertimeConfig(employeeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-config', employeeId] })
      showSuccess('Configuración de horas extra guardada.', 'Horas extra')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Error al guardar la configuración.'), 'Horas extra')
    },
  })
}
