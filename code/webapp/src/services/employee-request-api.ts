import { apiClient } from '@/lib/api-client'
import type { PaginatedResponse, EntityResponse } from '@/types/employee'
import type {
  EmployeeRequest,
  EmployeeRequestFilters,
  CreateEmployeeRequestData,
} from '@/types/employee-request'

export const employeeRequestApi = {
  list: (params?: EmployeeRequestFilters) =>
    apiClient.get<PaginatedResponse<EmployeeRequest>>('/employee-requests', { params }),

  create: (data: CreateEmployeeRequestData) =>
    apiClient.post<EntityResponse<EmployeeRequest>>('/employee-requests', data),
}
