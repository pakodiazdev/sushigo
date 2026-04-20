import { useMutation, useQueryClient } from '@tanstack/react-query'
import { negotiatedExtraDayApi } from '@/services/negotiated-extra-day-api'
import { useToast } from '@/components/ui/toast-provider'
import { getApiErrorMessage } from '@/lib/api-error'
import type { RegisterExtraDayPayload } from '@/types/negotiated-extra-day'

/**
 * Mutation hook to register a negotiated extra day.
 * On success: invalidates today attendance queries and shows a toast.
 */
export function useExtraDayExpress() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (payload: RegisterExtraDayPayload) => negotiatedExtraDayApi.register(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', 'today'] })
      showSuccess('Día extra registrado correctamente.', 'Día extra')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo registrar el día extra.'), 'Error')
    },
  })
}
