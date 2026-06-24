import { useQuery } from '@tanstack/react-query'
import { payrollApi } from './payroll.service'
import type { PayPeriodEmployeePreview } from '@/types/attendance-payroll'

export interface ClosePreviewRange {
  periodStart: string
  periodEnd: string
}

export function useClosePreview(branchId: number | null, range: ClosePreviewRange | null) {
  return useQuery<PayPeriodEmployeePreview[]>({
    queryKey: ['payroll', 'preview', branchId, range?.periodStart, range?.periodEnd],
    queryFn: async () => {
      if (!branchId || !range) return []
      const res = await payrollApi.getClosePreview(branchId, range.periodStart, range.periodEnd)
      return res.data.data
    },
    enabled: Boolean(branchId && range),
    staleTime: 0,
  })
}
