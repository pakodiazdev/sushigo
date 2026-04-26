import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-provider'
import { getApiErrorMessage } from '@/lib/api-error'
import { negotiatedExtraDayApi } from './negotiated-extra-day-api'

export function useCancelNegotiatedExtraDay() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (id: string) => negotiatedExtraDayApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['negotiated-extra-days'] })
      showSuccess('El día extra ha sido cancelado.', 'Día extra cancelado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo cancelar el día extra.'), 'Error')
    },
  })
}
