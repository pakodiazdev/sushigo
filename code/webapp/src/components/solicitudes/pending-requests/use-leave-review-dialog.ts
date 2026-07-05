import { useState } from 'react'
import { useApproveEmployeeRequest, useRejectEmployeeRequest } from '@/services/employee-request-hooks'
import { useLeaveTypes } from '@/services/leave-hooks'
import { useWageHistory } from '@/services/employee-hooks'
import type { EmployeeRequest, LeavePayload } from '@/types/employee-request'

export const LEAVE_QUICK_PAY_PERCENTAGES = [0, 25, 50, 75, 100] as const
export type LeaveQuickPayPercentage = (typeof LEAVE_QUICK_PAY_PERCENTAGES)[number]
export type LeavePayOption = LeaveQuickPayPercentage | 'custom'

function closestPayOption(pct: number): LeavePayOption {
  return (LEAVE_QUICK_PAY_PERCENTAGES as readonly number[]).includes(pct)
    ? (pct as LeaveQuickPayPercentage)
    : 'custom'
}

export function useLeaveReviewDialog(request: EmployeeRequest, onClose: () => void) {
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { data: leaveTypes = [] } = useLeaveTypes()
  const { data: wages = [] } = useWageHistory(request.employee_id)
  const payload = request.payload as LeavePayload | null
  const leaveType = leaveTypes.find((t) => t.id === payload?.leave_type_id)
  // The requester's checkbox at creation time is only a suggested default here —
  // the admin/manager always makes the final call when approving.
  const requestedPayPercentage = payload?.pay_percentage ?? null
  const defaultPayPercentage = requestedPayPercentage ?? leaveType?.default_pay_percentage ?? 0

  const currentWage = wages[0]
  // daily wage = hourly_rate × (weekly_scheduled_hours / 6 days) — same derivation as EXTRA_DAY
  const dailyWage = currentWage
    ? Number.parseFloat(currentWage.hourly_rate) * (currentWage.weekly_scheduled_hours / 6)
    : 0
  const totalDays = payload?.dates.length ?? 0
  const totalWage = dailyWage * totalDays

  const [payOption, setPayOption] = useState<LeavePayOption>(closestPayOption(defaultPayPercentage))
  const [payPercentage, setPayPercentage] = useState<number>(defaultPayPercentage)

  const approveMutation = useApproveEmployeeRequest()
  const rejectMutation = useRejectEmployeeRequest()

  function amountForPercentage(pct: number): number {
    return (pct / 100) * totalWage
  }

  const payAmount = amountForPercentage(payPercentage)

  function selectQuickOption(value: LeaveQuickPayPercentage) {
    setPayOption(value)
    setPayPercentage(value)
  }

  function selectCustomOption() {
    setPayOption('custom')
  }

  function setCustomPercentage(value: number) {
    setPayOption('custom')
    setPayPercentage(value)
  }

  function setCustomAmount(amount: number) {
    setPayOption('custom')
    setPayPercentage(totalWage > 0 ? (amount / totalWage) * 100 : 0)
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
    requestedPayPercentage,
    payOption,
    payPercentage,
    payAmount,
    dailyWage,
    totalDays,
    totalWage,
    amountForPercentage,
    selectQuickOption,
    selectCustomOption,
    setCustomPercentage,
    setCustomAmount,
    handleApprove,
    handleReject,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  }
}
