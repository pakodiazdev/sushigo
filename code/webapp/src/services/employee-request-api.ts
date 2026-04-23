import { apiClient } from '@/lib/api-client'
import type { PaginatedResponse } from '@/types/employee'
import type { EmployeeRequest, EmployeeRequestFilters } from '@/types/employee-request'

export const employeeRequestApi = {
  list: (params?: EmployeeRequestFilters) =>
    apiClient.get<PaginatedResponse<EmployeeRequest>>('/employee-requests', { params }),
}
