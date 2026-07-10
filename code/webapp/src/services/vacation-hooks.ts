import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vacationApi } from '@/services/vacation.service'
import type { VacationRequestFilters } from '@/services/vacation.service'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import type { RegisterVacationRequestData, VacationRequest } from '@/types/attendance-payroll'

const QUERY_KEY = (employeeId: string) => ['vacation-entitlements', employeeId]

export function useVacationEntitlements(employeeId: string) {
  return useQuery({
    queryKey: QUERY_KEY(employeeId),
    queryFn: async () => {
      const response = await vacationApi.getEntitlements(employeeId)
      return { entitlements: response.data.data, summary: response.data.meta }
    },
    enabled: !!employeeId,
  })
}

/**
 * Fetch paginated vacation request history for a specific employee.
 */
export function useVacationRequests(employeeId: string, filters: VacationRequestFilters = {}) {
  return useQuery<{ data: VacationRequest[]; meta: { current_page: number; last_page: number; per_page: number; total: number } }>({
    queryKey: ['employees', employeeId, 'vacation-requests', filters],
    queryFn: async () => {
      const response = await vacationApi.listEmployeeVacationRequests(employeeId, filters)
      return { data: response.data.data, meta: response.data.meta! }
    },
    enabled: !!employeeId,
  })
}

/**
 * Mutation: register a vacation request (status = PENDING).
 * On success: invalidates the employee's vacation requests and entitlements.
 */
export function useCreateVacationRequest() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: RegisterVacationRequestData) =>
      vacationApi.createVacationRequest(data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees', variables.employee_id, 'vacation-requests'] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(variables.employee_id) })
      const message = response.data.data.status === 'APPROVED'
        ? 'Vacaciones registradas y aprobadas.'
        : 'Solicitud de vacaciones creada. Pendiente de aprobación.'
      showSuccess(message, 'Solicitud')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo crear la solicitud de vacaciones.'),
        'Error al solicitar'
      )
    },
  })
}

/**
 * Hook: approve/reject mutations for managing vacation requests.
 * Invalidates attendance + employee vacation queries on success.
 */
export function useVacationRequestActions(employeeId: string) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const approveMutation = useMutation({
    mutationFn: (vacationRequestId: string) => vacationApi.approveRequest(vacationRequestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', 'daily'] })
      queryClient.invalidateQueries({ queryKey: ['employees', employeeId, 'vacation-requests'] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(employeeId) })
      showSuccess('Vacaciones aprobadas correctamente.', 'Aprobación')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo aprobar la solicitud de vacaciones.'),
        'Error al aprobar'
      )
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (vacationRequestId: string) => vacationApi.rejectRequest(vacationRequestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', employeeId, 'vacation-requests'] })
      showSuccess('Solicitud de vacaciones rechazada.', 'Rechazo')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo rechazar la solicitud de vacaciones.'),
        'Error al rechazar'
      )
    },
  })

  return {
    approve: approveMutation.mutate,
    reject: rejectMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  }
}
