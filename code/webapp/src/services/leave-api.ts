import { apiClient } from '@/lib/api-client'
import type { Leave, LeaveType, LeaveStatus, RegisterDirectLeaveRequest } from '@/types/leave'
import type { PaginatedResponse } from '@/types/employee'

export interface LeaveFilters {
  status?: LeaveStatus | ''
  date_from?: string
  date_to?: string
  leave_type_id?: number
  per_page?: number
  page?: number
}

export const leaveApi = {
  /**
   * GET /leave-types
   * Returns all active leave types for the form selector.
   */
  listLeaveTypes: () =>
    apiClient.get<{ status: number; data: LeaveType[] }>('/leave-types'),

  /**
   * POST /leaves
   * Registers a direct (immediately approved) leave for an employee.
   */
  registerDirectLeave: (data: RegisterDirectLeaveRequest) =>
    apiClient.post<{ status: number; data: Leave }>('/leaves', data),

  /**
   * GET /employees/{employeeId}/leaves
   * Returns paginated leave history for an employee.
   */
  listEmployeeLeaves: (employeeId: string, filters: LeaveFilters = {}) => {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.date_from) params.set('date_from', filters.date_from)
    if (filters.date_to) params.set('date_to', filters.date_to)
    if (filters.leave_type_id) params.set('leave_type_id', String(filters.leave_type_id))
    if (filters.per_page) params.set('per_page', String(filters.per_page))
    if (filters.page) params.set('page', String(filters.page))
    const query = params.toString()
    const url = `/employees/${employeeId}/leaves`
    return apiClient.get<PaginatedResponse<Leave>>(
      query ? `${url}?${query}` : url
    )
  },
}
