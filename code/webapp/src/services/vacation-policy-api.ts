import { apiClient } from '@/lib/api-client'
import type { VacationPolicySettings, UpdateVacationPolicyPayload } from '@/types/attendance-payroll'

export const vacationPolicyApi = {
  get: () =>
    apiClient.get<{ status: number; data: VacationPolicySettings }>('/vacation-policy'),

  update: (payload: UpdateVacationPolicyPayload) =>
    apiClient.put<{ status: number; data: VacationPolicySettings }>('/vacation-policy', payload),
}
