import { apiClient } from '@/lib/api-client'
import type { ConfirmClosePayPeriodResponse, PayPeriodPreviewResponse } from '@/types/attendance-payroll'

export const payrollApi = {
  getClosePreview: (branchId: number, periodStart: string, periodEnd: string) =>
    apiClient.get<PayPeriodPreviewResponse>('/pay-periods/preview', {
      params: { branch_id: branchId, period_start: periodStart, period_end: periodEnd },
    }),

  confirmClose: (branchId: number, periodStart: string, periodEnd: string) =>
    apiClient.post<ConfirmClosePayPeriodResponse>('/pay-periods', {
      branch_id: branchId,
      period_start: periodStart,
      period_end: periodEnd,
    }),
}
