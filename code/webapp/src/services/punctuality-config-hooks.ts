import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/api-error'
import { useToast } from '@/components/ui/toast-provider'
import type {
  AssignBonusConfigPayload,
  CreateBonusGroupPayload,
  EmployeeBonusConfig,
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

export function useEmployeeBonusConfig(employeeId: string) {
  return useQuery<EmployeeBonusConfig[]>({
    queryKey: ['employee-bonus-config', employeeId],
    queryFn: async () => {
      const response = await punctualityConfigApi.getBonusConfig(employeeId)
      return response.data.data
    },
    staleTime: 2 * 60_000,
  })
}

export function useAssignBonusConfig(employeeId: string) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (payload: AssignBonusConfigPayload) =>
      punctualityConfigApi.assignBonusConfig(employeeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-bonus-config', employeeId] })
      showSuccess('Grupo de bono asignado.', 'Puntualidad')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Error al asignar el grupo.'), 'Puntualidad')
    },
  })
}
