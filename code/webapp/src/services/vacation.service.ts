import { apiClient } from '@/lib/api-client'
import type { VacationEntitlement } from '@/types/attendance-payroll'

interface EntityResponse<T> {
  data: T
  status: number
  meta: null
}

interface ListResponse<T> {
  data: T[]
  status: number
  meta: null
}

export interface RegisterEntitlementData {
  year: number
}

export const vacationApi = {
  getEntitlements: (employeeId: string) =>
    apiClient.get<ListResponse<VacationEntitlement>>(
      `/employees/${employeeId}/vacation-entitlements`,
    ),

  registerEntitlement: (employeeId: string, data: RegisterEntitlementData) =>
    apiClient.post<EntityResponse<VacationEntitlement>>(
      `/employees/${employeeId}/vacation-entitlements`,
      data,
    ),
}
