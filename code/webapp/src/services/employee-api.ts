import { apiClient } from '@/lib/api-client'
import type {
  Employee,
  EmployeeFormData,
  EmployeeUpdateData,
  EmployeeFilters,
  PaginatedResponse,
  EntityResponse,
} from '@/types/employee'

const api = apiClient

// ============================================================================
// Employees
// ============================================================================

export const employeeApi = {
  list: (params?: EmployeeFilters) =>
    api.get<PaginatedResponse<Employee>>('/employees', { params }),

  get: (id: string) =>
    api.get<EntityResponse<Employee>>(`/employees/${id}`),

  create: (data: EmployeeFormData) =>
    api.post<EntityResponse<Employee>>('/employees', data),

  update: (id: string, data: EmployeeUpdateData) =>
    api.put<EntityResponse<Employee>>(`/employees/${id}`, data),

  toggleActive: (id: string) =>
    api.patch<EntityResponse<Employee>>(`/employees/${id}/toggle-active`),
}
