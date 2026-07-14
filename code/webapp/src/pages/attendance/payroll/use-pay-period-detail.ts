import { usePayPeriodDetail } from '@/services/payroll-hooks'
import { getApiErrorMessage } from '@/lib/api-error'

export function usePayPeriodDetailPage(periodId: string) {
  const { data, isLoading, error } = usePayPeriodDetail(periodId)

  return {
    payPeriod: data ?? null,
    isLoading,
    errorMessage: error ? getApiErrorMessage(error, 'No se pudo cargar el detalle del periodo.') : null,
  }
}
