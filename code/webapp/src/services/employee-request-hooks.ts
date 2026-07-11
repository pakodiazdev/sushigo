import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth.store'
import { employeeRequestApi } from './employee-request-api'
import type {
  EmployeeRequest,
  EmployeeRequestFilters,
  CreateEmployeeRequestData,
  ApproveEmployeeRequestData,
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
  const currentBranch = useAuthStore((s) => s.currentBranch)
  const branchId = currentBranch?.id
  return useQuery({
    queryKey: ['employee-requests', 'pending-count', branchId],
    queryFn: async () => {
      const response = await employeeRequestApi.list({ branch_id: branchId, status: 'PENDING', per_page: 1 })
      return response.data.meta?.total ?? 0
    },
    refetchInterval: 60_000,
    enabled: enabled && branchId !== undefined,
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

export function useRequestExtraDay() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: CreateEmployeeRequestData) => employeeRequestApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-requests'] })
      showSuccess('Tu solicitud ha sido enviada al Manager.', 'Solicitud enviada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo enviar la solicitud.'), 'Error')
    },
  })
}

export function useRequestLeave() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: CreateEmployeeRequestData) => employeeRequestApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-requests'] })
      showSuccess('Tu solicitud de permiso ha sido enviada al Manager.', 'Solicitud enviada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo enviar la solicitud.'), 'Error')
    },
  })
}

export function useRequestVacation() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (data: CreateEmployeeRequestData) => employeeRequestApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-requests'] })
      showSuccess('Tu solicitud de vacaciones ha sido enviada al Manager.', 'Solicitud enviada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo enviar la solicitud.'), 'Error')
    },
  })
}

export function useCancelEmployeeRequest() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: (id: string) => employeeRequestApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-requests'] })
      showSuccess('La solicitud ha sido cancelada.', 'Solicitud cancelada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo cancelar la solicitud.'), 'Error')
    },
  })
}

export function usePendingRequests() {
  const currentBranch = useAuthStore((s) => s.currentBranch)
  const branchId = currentBranch?.id
  return useQuery({
    queryKey: ['employee-requests', 'pending-inbox', branchId],
    queryFn: async () => {
      const response = await employeeRequestApi.list({
        branch_id: branchId,
        status: 'PENDING',
        sort: ['created_at:asc'],
        per_page: 50,
      })
      return response.data.data
    },
    enabled: branchId !== undefined,
    refetchInterval: 60_000,
  })
}

/** VACATION requests materialize into a real VacationRequest on approval — refresh
 * the employee's entitlement balance and vacation history so the Employee panel
 * (Vacaciones section) reflects it immediately, without waiting for a manual refetch. */
function invalidateVacationQueriesIfApplicable(queryClient: ReturnType<typeof useQueryClient>, employeeRequest: EmployeeRequest) {
  if (employeeRequest.type !== 'VACATION') return
  queryClient.invalidateQueries({ queryKey: ['vacation-entitlements', employeeRequest.employee_id] })
  queryClient.invalidateQueries({ queryKey: ['employees', employeeRequest.employee_id, 'vacation-requests'] })
}

export function useApproveEmployeeRequest() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ApproveEmployeeRequestData }) =>
      employeeRequestApi.approve(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['employee-requests'] })
      invalidateVacationQueriesIfApplicable(queryClient, response.data.data)
      showSuccess('La solicitud ha sido aprobada.', 'Solicitud aprobada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo aprobar la solicitud.'), 'Error')
    },
  })
}

export function useRejectEmployeeRequest() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      employeeRequestApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-requests'] })
      showSuccess('La solicitud ha sido rechazada.', 'Solicitud rechazada')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo rechazar la solicitud.'), 'Error')
    },
  })
}

export function useMyRequests(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-requests', 'mine', employeeId],
    queryFn: async () => {
      const response = await employeeRequestApi.list({
        employee_id: employeeId,
        status: ['PENDING', 'APPROVED', 'REJECTED'],
        per_page: 20,
      })
      return response.data.data
    },
    enabled: !!employeeId,
  })
}
