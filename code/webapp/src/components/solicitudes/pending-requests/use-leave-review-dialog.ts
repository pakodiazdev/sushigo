import { useState } from 'react'
import { useApproveEmployeeRequest, useRejectEmployeeRequest } from '@/services/employee-request-hooks'
import { useLeaveTypes } from '@/services/leave-hooks'
import type { EmployeeRequest, LeavePayload } from '@/types/employee-request'

export type LeavePayType = 'unpaid' | 'paid' | 'custom'

export function useLeaveReviewDialog(request: EmployeeRequest, onClose: () => void) {
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { data: leaveTypes = [] } = useLeaveTypes()
  const payload = request.payload as LeavePayload | null
  const leaveType = leaveTypes.find((t) => t.id === payload?.leave_type_id)
  const defaultPayPercentage = leaveType?.default_pay_percentage ?? 0

  const [payType, setPayType] = useState<LeavePayType>(
    defaultPayPercentage === 0 ? 'unpaid' : defaultPayPercentage === 100 ? 'paid' : 'custom'
  )
  const [payPercentage, setPayPercentage] = useState<number>(defaultPayPercentage)

  const approveMutation = useApproveEmployeeRequest()
  const rejectMutation = useRejectEmployeeRequest()

  function selectUnpaid() {
    setPayType('unpaid')
    setPayPercentage(0)
  }

  function selectPaid() {
    setPayType('paid')
    setPayPercentage(100)
  }

  function selectCustom(value: number) {
    setPayType('custom')
    setPayPercentage(value)
  }

  function handleApprove() {
    approveMutation.mutate({ id: request.id, data: { pay_percentage: payPercentage } }, { onSuccess: onClose })
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
    payType,
    payPercentage,
    selectUnpaid,
    selectPaid,
    selectCustom,
    handleApprove,
    handleReject,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  }
}
