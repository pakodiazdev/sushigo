import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth.store'
import { useClosePreview, useConfirmClose, type ClosePreviewRange } from '@/services/payroll-hooks'
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
  activeRange: ClosePreviewRange | null
  isConfirmOpen: boolean
  openConfirm: () => void
  closeConfirm: () => void
  confirmClose: () => Promise<void>
  isClosing: boolean
}

export function useClosePreviewPage(): UseClosePreviewResult {
  const navigate = useNavigate()
  const currentBranch = useAuthStore(s => s.currentBranch)
  const branchId = currentBranch?.id ?? null

  const { start, end } = getWeekRange()
  const defaultRange: ClosePreviewRange = { periodStart: start, periodEnd: end }
  const [pendingRange, setPendingRange] = useState<ClosePreviewRange>(defaultRange)
  const [activeRange, setActiveRange] = useState<ClosePreviewRange | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const { data = [], isLoading, error } = useClosePreview(branchId, activeRange)
  const confirmCloseMutation = useConfirmClose()

  const confirmClose = async (): Promise<void> => {
    try {
      if (!branchId || !activeRange) return

      await confirmCloseMutation.mutateAsync({
        branchId,
        periodStart: activeRange.periodStart,
        periodEnd: activeRange.periodEnd,
      })
      await navigate({ to: '/attendance' })
    } catch {
      // Error toast already shown by useConfirmClose's onError. Close the dialog so the
      // toast (z-50) isn't hidden behind the still-open confirm overlay (z-60).
    } finally {
      // `finally` always runs — including the branchId/activeRange guard above — so the
      // dialog never gets stuck open if branch context changes while it's visible.
      setIsConfirmOpen(false)
    }
  }

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
    activeRange,
    isConfirmOpen,
    openConfirm: () => setIsConfirmOpen(true),
    closeConfirm: () => setIsConfirmOpen(false),
    confirmClose,
    isClosing: confirmCloseMutation.isPending,
  }
}
