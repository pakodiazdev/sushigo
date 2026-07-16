import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage, getApiFieldError } from '@/lib/api-error'
import { payrollApi } from './payroll.service'
import type {
  ConfirmClosePayPeriodResponse,
  PayPeriodDetail,
  PayPeriodEmployeePreview,
  PayPeriodListFilters,
  PayPeriodListItem,
  PayPeriodListMeta,
} from '@/types/attendance-payroll'

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
      queryClient.invalidateQueries({ queryKey: ['payroll', 'periods'] })
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

export function usePayPeriods(filters: PayPeriodListFilters) {
  return useQuery<{ data: PayPeriodListItem[]; meta: PayPeriodListMeta }>({
    queryKey: ['payroll', 'periods', filters],
    queryFn: async () => {
      const res = await payrollApi.getPayPeriods(filters)
      return { data: res.data.data, meta: res.data.meta }
    },
    enabled: Boolean(filters.branch_id),
  })
}

export function usePayPeriodDetail(periodId: string | null) {
  return useQuery<PayPeriodDetail | null>({
    queryKey: ['payroll', 'periods', periodId],
    queryFn: async () => {
      if (!periodId) return null
      const res = await payrollApi.getPayPeriodDetail(periodId)
      return res.data.data
    },
    enabled: Boolean(periodId),
  })
}

function filenameFromContentDisposition(contentDisposition: string | undefined): string {
  const match = contentDisposition?.match(/filename="?([^"\s;]+)"?/)
  return match?.[1] ?? 'periodo-nomina.csv'
}

export function useExportPayPeriod() {
  const { showSuccess, showError } = useToast()

  return useMutation<void, unknown, string>({
    mutationFn: async (periodId: string) => {
      const res = await payrollApi.exportCsv(periodId)
      const filename = filenameFromContentDisposition(res.headers['content-disposition'])
      const url = URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      try {
        link.click()
      } finally {
        link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 0)
      }
    },
    onSuccess: () => {
      showSuccess('Archivo descargado', 'Exportación completa')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'No se pudo exportar el periodo a CSV.'), 'Error')
    },
  })
}
