import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/api-error'
import { useToast } from '@/components/ui/toast-provider'
import type {
  CreateBonusGroupPayload,
  PunctualityBonusGroup,
  PunctualityRange,
  UpdatePunctualityRangesPayload,
} from '@/types/punctuality'
import { punctualityConfigApi } from './punctuality-config-api'

export function usePunctualityRanges() {
  return useQuery<PunctualityRange[]>({
    queryKey: ['punctuality-ranges'],
    queryFn: async () => {
      const response = await punctualityConfigApi.listRanges()
      return response.data.data
    },
    staleTime: 5 * 60_000,
  })
}

export function useUpdatePunctualityRanges() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (payload: UpdatePunctualityRangesPayload) =>
      punctualityConfigApi.updateRanges(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punctuality-ranges'] })
      showSuccess('Rangos de puntualidad actualizados.', 'Puntualidad')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Error al actualizar los rangos.'), 'Puntualidad')
    },
  })
}

export function useBonusGroups() {
  return useQuery<PunctualityBonusGroup[]>({
    queryKey: ['punctuality-bonus-groups'],
    queryFn: async () => {
      const response = await punctualityConfigApi.listBonusGroups()
      return response.data.data
    },
    staleTime: 5 * 60_000,
  })
}

export function useCreateBonusGroup() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (payload: CreateBonusGroupPayload) =>
      punctualityConfigApi.createBonusGroup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['punctuality-bonus-groups'] })
      showSuccess('Grupo de bono creado.', 'Puntualidad')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Error al crear el grupo.'), 'Puntualidad')
    },
  })
}
