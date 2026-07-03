import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leaveApi } from './leave-api'
import type { LeaveFilters } from './leave-api'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import type { LeaveType, Leave, RegisterDirectLeaveRequest } from '@/types/leave'

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
