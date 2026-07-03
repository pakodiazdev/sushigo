import { useState } from 'react'
import { useVacationEntitlements, useVacationRequests, useVacationRequestActions } from '@/services/vacation-hooks'
import type { RegisterVacationRequestEmployee } from './use-register-vacation-request-dialog'

export function useVacationSection(employeeId: string, employee?: RegisterVacationRequestEmployee) {
  const { data, isLoading } = useVacationEntitlements(employeeId)
  const requestsQuery = useVacationRequests(employeeId, { per_page: 10 })
  const actions = useVacationRequestActions(employeeId)

  const [showRequestDialog, setShowRequestDialog] = useState(false)

  function openRequestDialog() {
    if (!employee) return
    setShowRequestDialog(true)
  }

  function closeRequestDialog() {
    setShowRequestDialog(false)
  }

  function handleApprove(vacationRequestId: string) {
    if (confirm('¿Aprobar esta solicitud de vacaciones? Se descontará del saldo y se crearán los registros de asistencia.')) {
      actions.approve(vacationRequestId)
    }
  }

  function handleReject(vacationRequestId: string) {
    if (confirm('¿Rechazar esta solicitud de vacaciones?')) {
      actions.reject(vacationRequestId)
    }
  }

  return {
    entitlements: data?.entitlements ?? [],
    summary: data?.summary ?? null,
    isLoading,
    requests: requestsQuery.data?.data ?? [],
    isLoadingRequests: requestsQuery.isLoading,
    showRequestDialog,
    pendingRequestEmployee: employee ?? null,
    openRequestDialog,
    closeRequestDialog,
    handleApprove,
    handleReject,
    isApproving: actions.isApproving,
    isRejecting: actions.isRejecting,
  }
}
