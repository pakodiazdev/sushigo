import { apiClient } from '@/lib/api-client'
import type { VacationEntitlement } from '@/types/attendance-payroll'

interface ListResponse<T> {
  data: T[]
  status: number
  meta: null
}

export const vacationApi = {
  getEntitlements: (employeeId: string) =>
    apiClient.get<ListResponse<VacationEntitlement>>(
      `/employees/${employeeId}/vacation-entitlements`,
    ),
}
