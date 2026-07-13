import { apiClient } from '@/lib/api-client'
import type { OvertimeBankMovement, OvertimeBankSummary } from '@/types/attendance-payroll'

interface OvertimeBankResponse {
  data: OvertimeBankMovement[]
  status: number
  meta: OvertimeBankSummary
}

export const overtimeBankApi = {
  getBank: (employeeId: string) =>
    apiClient.get<OvertimeBankResponse>(`/employees/${employeeId}/overtime-bank`),
}
