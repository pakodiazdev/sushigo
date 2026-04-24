import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-provider'
import { getApiErrorMessage } from '@/lib/api-error'
import { employeeRequestApi } from './employee-request-api'
import type {
  EmployeeRequestFilters,
  CreateEmployeeRequestData,
} from '@/types/employee-request'

export function useEmployeeRequests(filters?: EmployeeRequestFilters) {
  return useQuery({
    queryKey: ['employee-requests', filters],
    queryFn: async () => {
      const response = await employeeRequestApi.list(filters)
      return response.data
    },
  })
}

export function usePendingRequestsCount({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['employee-requests', 'pending-count'],
    queryFn: async () => {
      const response = await employeeRequestApi.list({ status: 'PENDING', per_page: 1 })
      return response.data.meta?.total ?? 0
    },
    refetchInterval: 60_000,
    enabled,
  })
}

export function useApprovedExtraDays(employeeId: string) {
  return useQuery({
    queryKey: ['employee-requests', 'approved-extra-days', employeeId],
    queryFn: async () => {
      const response = await employeeRequestApi.list({
        employee_id: employeeId,
        type: 'EXTRA_DAY',
        status: 'APPROVED',
        per_page: 10,
      })
      return response.data.data
    },
    enabled: !!employeeId,
  })
}

export function useCreateEmployeeRequest() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: CreateEmployeeRequestData) => employeeRequestApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-requests'] })
      showSuccess('El día extra ha sido registrado y aprobado.', 'Día extra acordado')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo registrar el día extra.'), 'Error')
    },
  })
}
