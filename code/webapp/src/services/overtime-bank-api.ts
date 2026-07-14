import { apiClient } from '@/lib/api-client'
import type { CreateManualOvertimeMovementData, OvertimeBankMovement, OvertimeBankSummary } from '@/types/attendance-payroll'

interface OvertimeBankResponse {
  data: OvertimeBankMovement[]
  status: number
  meta: OvertimeBankSummary
}

interface CreateManualOvertimeMovementResponse {
  data: OvertimeBankMovement
  status: number
}

export const overtimeBankApi = {
  getBank: (employeeId: string) =>
    apiClient.get<OvertimeBankResponse>(`/employees/${employeeId}/overtime-bank`),
  createManualMovement: (employeeId: string, data: CreateManualOvertimeMovementData) =>
    apiClient.post<CreateManualOvertimeMovementResponse>(`/employees/${employeeId}/overtime-bank/movements`, data),
}
