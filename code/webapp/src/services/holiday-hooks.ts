import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-provider'
import { getApiErrorMessage } from '@/lib/api-error'
import { holidayApi } from './holiday-api'
import type { CreateHolidayPayload, UpdateHolidayPayload } from '@/types/attendance-payroll'

// ── Query keys ────────────────────────────────────────────────────────────────

const holidayKeys = {
  all: ['holidays'] as const,
  byYear: (year: number) => ['holidays', year] as const,
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useHolidays(year?: number) {
  return useQuery({
    queryKey: year ? holidayKeys.byYear(year) : holidayKeys.all,
    queryFn: () => holidayApi.list(year),
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateHoliday() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (payload: CreateHolidayPayload) => holidayApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.all })
      showSuccess('El día festivo ha sido creado.', 'Festivo creado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo crear el día festivo.'), 'Error')
    },
  })
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateHolidayPayload }) =>
      holidayApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.all })
      showSuccess('El día festivo ha sido actualizado.', 'Festivo actualizado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo actualizar el día festivo.'), 'Error')
    },
  })
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (id: number) => holidayApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.all })
      showSuccess('El día festivo ha sido eliminado.', 'Festivo eliminado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo eliminar el día festivo.'), 'Error')
    },
  })
}
