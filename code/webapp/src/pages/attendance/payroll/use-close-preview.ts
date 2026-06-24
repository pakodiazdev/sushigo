import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useClosePreview, type ClosePreviewRange } from '@/services/payroll-hooks'
import { getApiErrorMessage } from '@/lib/api-error'
import type { PayPeriodEmployeePreview } from '@/types/attendance-payroll'

function currentWeekRange(): ClosePreviewRange {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = (day === 0 ? -6 : 1 - day)
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { periodStart: fmt(monday), periodEnd: fmt(sunday) }
}

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

  const defaultRange = currentWeekRange()
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
