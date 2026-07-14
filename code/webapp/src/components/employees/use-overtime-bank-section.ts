import { useState } from 'react'
import { useOvertimeBank } from '@/services/overtime-bank-hooks'
import type { ManualOvertimeMovementEmployee } from './use-manual-overtime-movement-dialog'

export function useOvertimeBankSection(employeeId: string, employee?: ManualOvertimeMovementEmployee) {
  const { data, isLoading } = useOvertimeBank(employeeId)

  const [showManualMovementDialog, setShowManualMovementDialog] = useState(false)

  function openManualMovementDialog() {
    if (!employee) return
    setShowManualMovementDialog(true)
  }

  function closeManualMovementDialog() {
    setShowManualMovementDialog(false)
  }

  return {
    movements: data?.movements ?? [],
    summary: data?.summary ?? null,
    isLoading,
    showManualMovementDialog,
    manualMovementEmployee: employee ?? null,
    openManualMovementDialog,
    closeManualMovementDialog,
  }
}
