import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/api-error'
import { useToast } from '@/components/ui/toast-context'
import type { OvertimeLftTier, UpdateOvertimeLftTiersPayload } from '@/types/attendance-payroll'
import { overtimeLftTiersApi } from './overtime-lft-tiers-api'

export function useOvertimeLftTiers() {
  return useQuery<OvertimeLftTier[]>({
    queryKey: ['overtime-lft-tiers'],
    queryFn: async () => {
      const response = await overtimeLftTiersApi.list()
      return response.data.data
    },
    staleTime: 5 * 60_000,
  })
}

export function useUpdateOvertimeLftTiers() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (payload: UpdateOvertimeLftTiersPayload) => overtimeLftTiersApi.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-lft-tiers'] })
      showSuccess('Tramos de horas extra actualizados.', 'Horas extra')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Error al actualizar los tramos.'), 'Horas extra')
    },
  })
}
