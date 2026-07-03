import { apiClient } from '@/lib/api-client'
import type {
  VacationEntitlement,
  VacationSummary,
  VacationRequest,
  VacationRequestStatus,
  RegisterVacationRequestData,
} from '@/types/attendance-payroll'
import type { PaginatedResponse } from '@/types/employee'

interface ListResponse<T> {
  data: T[]
  status: number
  meta: VacationSummary | null
}

export interface VacationRequestFilters {
  status?: VacationRequestStatus | ''
  per_page?: number
  page?: number
}

export const vacationApi = {
  getEntitlements: (employeeId: string) =>
    apiClient.get<ListResponse<VacationEntitlement>>(
      `/employees/${employeeId}/vacation-entitlements`,
    ),

  /**
   * POST /vacation-requests
   * Registers a vacation request (status = PENDING, awaiting approval).
   */
  createVacationRequest: (data: RegisterVacationRequestData) =>
    apiClient.post<{ status: number; data: VacationRequest }>('/vacation-requests', data),

  /**
   * PATCH /vacation-requests/{id}/approve
   * Approves a PENDING vacation request → deducts balance and creates Attendance records.
   */
  approveRequest: (id: string) =>
    apiClient.patch<{ status: number; data: VacationRequest }>(`/vacation-requests/${id}/approve`),

  /**
   * PATCH /vacation-requests/{id}/reject
   * Rejects a PENDING vacation request — no balance or attendance impact.
   */
  rejectRequest: (id: string) =>
    apiClient.patch<{ status: number; data: VacationRequest }>(`/vacation-requests/${id}/reject`),

  /**
   * GET /employees/{employeeId}/vacation-requests
   * Returns paginated vacation request history for an employee.
   */
  listEmployeeVacationRequests: (employeeId: string, filters: VacationRequestFilters = {}) => {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.per_page) params.set('per_page', String(filters.per_page))
    if (filters.page) params.set('page', String(filters.page))
    const query = params.toString()
    const url = `/employees/${employeeId}/vacation-requests`
    return apiClient.get<PaginatedResponse<VacationRequest>>(
      query ? `${url}?${query}` : url
    )
  },
}
