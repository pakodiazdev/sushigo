import { apiClient } from '@/lib/api-client'
import type { EmployeeVacationPolicyOverride, UpdateEmployeeVacationPolicyPayload } from '@/types/attendance-payroll'

export const employeeVacationPolicyApi = {
  updateOverride: (employeeId: string, payload: UpdateEmployeeVacationPolicyPayload) =>
    apiClient.put<{ status: number; data: EmployeeVacationPolicyOverride }>(
      `/employees/${employeeId}/vacation-policy-override`,
      payload,
    ),
}
