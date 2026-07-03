import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useClosePreview, type ClosePreviewRange } from '@/services/payroll-hooks'
import { getApiErrorMessage } from '@/lib/api-error'
import type { PayPeriodEmployeePreview } from '@/types/attendance-payroll'
import { currentWeekRange as getWeekRange } from '@/lib/week'

export interface UseClosePreviewResult {
  range: ClosePreviewRange
  setRange: (range: ClosePreviewRange) => void
  rows: PayPeriodEmployeePreview[]
  isLoading: boolean
  errorMessage: string | null
  hasBranch: boolean
  calculate: () => void
  pendingRange: ClosePreviewRange
  setPendingRange: (range: ClosePreviewRange) => void
}

export function useClosePreviewPage(): UseClosePreviewResult {
  const currentBranch = useAuthStore(s => s.currentBranch)
  const branchId = currentBranch?.id ?? null

  const { start, end } = getWeekRange()
  const defaultRange: ClosePreviewRange = { periodStart: start, periodEnd: end }
  const [pendingRange, setPendingRange] = useState<ClosePreviewRange>(defaultRange)
  const [activeRange, setActiveRange] = useState<ClosePreviewRange | null>(null)

  const { data = [], isLoading, error } = useClosePreview(branchId, activeRange)

  return {
    range: pendingRange,
    setRange: setPendingRange,
    rows: data,
    isLoading,
    errorMessage: error ? getApiErrorMessage(error, 'Error al calcular el preview') : null,
    hasBranch: Boolean(branchId),
    calculate: () => setActiveRange(pendingRange),
    pendingRange,
    setPendingRange,
  }
}
