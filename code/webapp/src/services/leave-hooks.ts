import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leaveApi } from './leave-api'
import type { LeaveFilters } from './leave-api'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import type { LeaveType, Leave, RegisterDirectLeaveRequest, RegisterLeaveRequestData } from '@/types/leave'

/**
 * Fetch all active leave types for the register-absence form.
 * Cached for 5 minutes — these rarely change.
 */
export function useLeaveTypes() {
  return useQuery<LeaveType[]>({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const response = await leaveApi.listLeaveTypes()
      return response.data.data
    },
    staleTime: 5 * 60_000,
  })
}

/**
 * Mutation: register a direct (immediately-approved) absence for an employee.
 * On success: invalidates today's attendance query so the card updates.
 */
export function useRegisterDirectLeave() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: RegisterDirectLeaveRequest) =>
      leaveApi.registerDirectLeave(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', 'daily'] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      showSuccess('Ausencia registrada correctamente.', 'Ausencia')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo registrar la ausencia.'),
        'Error al registrar'
      )
    },
  })
}

/**
 * Mutation: register a leave REQUEST (status = PENDING).
 * On success: invalidates employee leaves so the list updates.
 */
export function useRegisterLeaveRequest() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: RegisterLeaveRequestData) =>
      leaveApi.registerLeaveRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      showSuccess('Solicitud de ausencia creada. Pendiente de aprobación.', 'Solicitud')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo crear la solicitud.'),
        'Error al solicitar'
      )
    },
  })
}

/**
 * Hook: approve/reject mutations for managing leave requests.
 * Invalidates attendance + employee leave queries on success.
 */
export function useLeaveActions(employeeId: string) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const approveMutation = useMutation({
    mutationFn: (leaveId: string) => leaveApi.approveLeave(leaveId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances', 'daily'] })
      queryClient.invalidateQueries({ queryKey: ['employees', employeeId, 'leaves'] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      showSuccess('Ausencia aprobada correctamente.', 'Aprobación')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo aprobar la ausencia.'),
        'Error al aprobar'
      )
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (leaveId: string) => leaveApi.rejectLeave(leaveId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', employeeId, 'leaves'] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      showSuccess('Ausencia rechazada.', 'Rechazo')
    },
    onError: (error: unknown) => {
      showError(
        getApiErrorMessage(error, 'No se pudo rechazar la ausencia.'),
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

/**
 * Fetch paginated leave history for a specific employee.
 */
export function useEmployeeLeaves(employeeId: string, filters: LeaveFilters = {}) {
  return useQuery<{ data: Leave[]; meta: { current_page: number; last_page: number; per_page: number; total: number } }>({
    queryKey: ['employees', employeeId, 'leaves', filters],
    queryFn: async () => {
      const response = await leaveApi.listEmployeeLeaves(employeeId, filters)
      return { data: response.data.data, meta: response.data.meta! }
    },
    enabled: !!employeeId,
  })
}
