import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-provider'
import { getApiErrorMessage } from '@/lib/api-error'
import { holidayDefinitionApi } from './holiday-api'
import type {
  CreateHolidayDefinitionPayload,
  UpdateHolidayDefinitionPayload,
} from '@/types/attendance-payroll'

// ── Query keys ────────────────────────────────────────────────────────────────

const definitionKeys = {
  all: ['holiday-definitions'] as const,
}

const holidayKeys = {
  all: ['holidays'] as const,
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useHolidayDefinitions() {
  return useQuery({
    queryKey: definitionKeys.all,
    queryFn: () => holidayDefinitionApi.list(),
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateHolidayDefinition() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (payload: CreateHolidayDefinitionPayload) =>
      holidayDefinitionApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: definitionKeys.all })
      queryClient.invalidateQueries({ queryKey: holidayKeys.all })
      showSuccess('El festivo ha sido creado.', 'Festivo creado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo crear el festivo.'), 'Error')
    },
  })
}

export function useUpdateHolidayDefinition() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateHolidayDefinitionPayload }) =>
      holidayDefinitionApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: definitionKeys.all })
      showSuccess('El festivo ha sido actualizado.', 'Festivo actualizado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo actualizar el festivo.'), 'Error')
    },
  })
}

export function useDeleteHolidayDefinition() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (id: number) => holidayDefinitionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: definitionKeys.all })
      showSuccess('El festivo ha sido eliminado.', 'Festivo eliminado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo eliminar el festivo.'), 'Error')
    },
  })
}
