import { apiClient } from '@/lib/api-client'
import type {
  ConfirmClosePayPeriodResponse,
  PayPeriodDetailResponse,
  PayPeriodListFilters,
  PayPeriodListResponse,
  PayPeriodPreviewResponse,
  ReopenPayPeriodPayload,
} from '@/types/attendance-payroll'

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

  getPayPeriods: (filters: PayPeriodListFilters) =>
    apiClient.get<PayPeriodListResponse>('/pay-periods', { params: filters }),

  getPayPeriodDetail: (periodId: string) =>
    apiClient.get<PayPeriodDetailResponse>(`/pay-periods/${periodId}`),

  exportCsv: (periodId: string) =>
    apiClient.get<Blob>(`/pay-periods/${periodId}/export`, {
      params: { format: 'csv' },
      responseType: 'blob',
    }),

  reopenPeriod: (periodId: string, payload: ReopenPayPeriodPayload) =>
    apiClient.patch<PayPeriodDetailResponse>(`/pay-periods/${periodId}/reopen`, payload),

  reclosePeriod: (periodId: string) =>
    apiClient.patch<PayPeriodDetailResponse>(`/pay-periods/${periodId}/reclose`),
}
