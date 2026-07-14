import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { usePayPeriods } from '@/services/payroll-hooks'
import { getApiErrorMessage } from '@/lib/api-error'
import type { PayPeriodStatus } from '@/types/attendance-payroll'

export function usePayPeriodsListPage() {
  const currentBranch = useAuthStore(s => s.currentBranch)
  const branchId = currentBranch?.id ?? null

  const [statusValue, setStatusValue] = useState<PayPeriodStatus | ''>('')
  const [periodStartValue, setPeriodStartValue] = useState('')
  const [periodEndValue, setPeriodEndValue] = useState('')
  const [page, setPage] = useState(1)

  // branchId changes come from the auth store (external), not a local setter,
  // so there's no event handler to reset the page from — an effect is needed.
  useEffect(() => {
    setPage(1)
  }, [branchId])

  // The other filters reset the page synchronously in their own setter instead
  // of via an effect, so the query never fires with a stale page number for a
  // new filter (which could otherwise briefly request a page past the end of
  // the new, smaller result set).
  const setStatus = (value: PayPeriodStatus | '') => {
    setStatusValue(value)
    setPage(1)
  }

  const setPeriodStart = (value: string) => {
    setPeriodStartValue(value)
    setPage(1)
  }

  const setPeriodEnd = (value: string) => {
    setPeriodEndValue(value)
    setPage(1)
  }

  const { data, isLoading, error } = usePayPeriods({
    branch_id: branchId ?? undefined,
    status: statusValue || undefined,
    period_start: periodStartValue || undefined,
    period_end: periodEndValue || undefined,
    page,
  })

  return {
    hasBranch: Boolean(branchId),
    status: statusValue,
    setStatus,
    periodStart: periodStartValue,
    setPeriodStart,
    periodEnd: periodEndValue,
    setPeriodEnd,
    periods: data?.data ?? [],
    meta: data?.meta,
    page,
    setPage,
    isLoading,
    errorMessage: error ? getApiErrorMessage(error, 'No se pudieron cargar los periodos de nómina.') : null,
  }
}
