import { useState } from 'react'
import { usePayPeriodDetail, useExportPayPeriod, useReopenPayPeriod, useReclosePayPeriod } from '@/services/payroll-hooks'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth.store'

export function usePayPeriodDetailPage(periodId: string) {
  const { data, isLoading, error } = usePayPeriodDetail(periodId)
  const hasExportPermission = useAuthStore(s => s.can('payroll.preview'))
  const isAdmin = useAuthStore(s => s.isAdmin)
  const exportMutation = useExportPayPeriod()

  const [isReopenOpen, setIsReopenOpen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [isRecloseOpen, setIsRecloseOpen] = useState(false)

  const reopenMutation = useReopenPayPeriod()
  const recloseMutation = useReclosePayPeriod()

  const openReopenConfirm = () => {
    setReopenReason('')
    setIsReopenOpen(true)
  }

  const closeReopenConfirm = () => setIsReopenOpen(false)

  const confirmReopen = async () => {
    await reopenMutation.mutateAsync({ periodId, reason: reopenReason })
    setIsReopenOpen(false)
  }

  const openRecloseConfirm = () => setIsRecloseOpen(true)

  const closeRecloseConfirm = () => setIsRecloseOpen(false)

  const confirmReclose = async () => {
    await recloseMutation.mutateAsync(periodId)
    setIsRecloseOpen(false)
  }

  return {
    payPeriod: data ?? null,
    isLoading,
    errorMessage: error ? getApiErrorMessage(error, 'No se pudo cargar el detalle del periodo.') : null,
    canExport: hasExportPermission && !!data && data.status === 'CLOSED',
    isExporting: exportMutation.isPending,
    exportCsv: () => exportMutation.mutate(periodId),
    isAdmin,
    isReopenOpen,
    reopenReason,
    setReopenReason,
    openReopenConfirm,
    closeReopenConfirm,
    confirmReopen,
    isReopening: reopenMutation.isPending,
    isRecloseOpen,
    openRecloseConfirm,
    closeRecloseConfirm,
    confirmReclose,
    isReclosing: recloseMutation.isPending,
  }
}
