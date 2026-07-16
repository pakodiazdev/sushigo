import { usePayPeriodDetail, useExportPayPeriod } from '@/services/payroll-hooks'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth.store'

export function usePayPeriodDetailPage(periodId: string) {
  const { data, isLoading, error } = usePayPeriodDetail(periodId)
  const hasExportPermission = useAuthStore(s => s.can('payroll.preview'))
  const exportMutation = useExportPayPeriod()

  return {
    payPeriod: data ?? null,
    isLoading,
    errorMessage: error ? getApiErrorMessage(error, 'No se pudo cargar el detalle del periodo.') : null,
    canExport: hasExportPermission && !!data && data.status === 'CLOSED',
    isExporting: exportMutation.isPending,
    exportCsv: () => exportMutation.mutate(periodId),
  }
}
