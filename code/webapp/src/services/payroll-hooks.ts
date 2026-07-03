import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiFieldError } from '@/lib/api-error'
import { payrollApi } from './payroll.service'
import type { ConfirmClosePayPeriodResponse, PayPeriodEmployeePreview } from '@/types/attendance-payroll'

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

export interface ConfirmCloseVariables {
  branchId: number
  periodStart: string
  periodEnd: string
}

export function useConfirmClose() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  return useMutation<ConfirmClosePayPeriodResponse, unknown, ConfirmCloseVariables>({
    mutationFn: async ({ branchId, periodStart, periodEnd }: ConfirmCloseVariables) => {
      const res = await payrollApi.confirmClose(branchId, periodStart, periodEnd)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll', 'preview'] })
      showSuccess('El cierre semanal de nómina ha sido confirmado.', 'Cierre confirmado')
    },
    onError: (error: unknown) => {
      showError(
        getApiFieldError(error, 'period_start', 'No se pudo confirmar el cierre de nómina.'),
        'Error',
      )
    },
  })
}
