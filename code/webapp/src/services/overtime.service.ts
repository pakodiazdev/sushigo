import { apiClient } from '@/lib/api-client'
import type { OvertimePayConfig, SetOvertimeConfigPayload } from '@/types/attendance-payroll'

export const overtimeConfigApi = {
  getOvertimeConfig: (employeeId: string) =>
    apiClient.get<{ status: number; data: OvertimePayConfig[] }>(`/employees/${employeeId}/overtime-config`),

  setOvertimeConfig: (employeeId: string, payload: SetOvertimeConfigPayload) =>
    apiClient.post<{ status: number; data: OvertimePayConfig }>(`/employees/${employeeId}/overtime-config`, payload),
}
