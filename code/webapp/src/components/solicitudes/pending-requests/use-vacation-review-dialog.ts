import { useState } from 'react'
import { useApproveEmployeeRequest, useRejectEmployeeRequest } from '@/services/employee-request-hooks'
import type { EmployeeRequest } from '@/types/employee-request'

export function useVacationReviewDialog(request: EmployeeRequest, onClose: () => void) {
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const approveMutation = useApproveEmployeeRequest()
  const rejectMutation = useRejectEmployeeRequest()

  function handleApprove() {
    approveMutation.mutate({ id: request.id }, { onSuccess: onClose })
  }

  function handleReject() {
    rejectMutation.mutate(
      { id: request.id, reason: rejectReason.trim() || undefined },
      {
        onSuccess: () => {
          setShowRejectConfirm(false)
          setRejectReason('')
          onClose()
        },
      }
    )
  }

  return {
    showRejectConfirm,
    setShowRejectConfirm,
    rejectReason,
    setRejectReason,
    handleApprove,
    handleReject,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  }
}
