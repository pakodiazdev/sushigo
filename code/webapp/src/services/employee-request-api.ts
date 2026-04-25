import { apiClient } from '@/lib/api-client'
import type { PaginatedResponse, EntityResponse } from '@/types/employee'
import type {
  EmployeeRequest,
  EmployeeRequestFilters,
  CreateEmployeeRequestData,
  ApproveEmployeeRequestData,
} from '@/types/employee-request'

export const employeeRequestApi = {
  list: (params?: EmployeeRequestFilters) =>
    apiClient.get<PaginatedResponse<EmployeeRequest>>('/employee-requests', { params }),

  create: (data: CreateEmployeeRequestData) =>
    apiClient.post<EntityResponse<EmployeeRequest>>('/employee-requests', data),

  approve: (id: string, data?: ApproveEmployeeRequestData) =>
    apiClient.patch<EntityResponse<EmployeeRequest>>(`/employee-requests/${id}/approve`, data ?? {}),

  reject: (id: string, reason?: string) =>
    apiClient.patch<EntityResponse<EmployeeRequest>>(`/employee-requests/${id}/reject`, { reason }),

  cancel: (id: string) =>
    apiClient.patch<EntityResponse<EmployeeRequest>>(`/employee-requests/${id}/cancel`),
}
