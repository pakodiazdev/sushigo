// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLeaveReviewDialog } from '../use-leave-review-dialog'
import type { EmployeeRequest } from '@/types/employee-request'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockApproveMutate = vi.fn()
const mockRejectMutate = vi.fn()

vi.mock('@/services/employee-request-hooks', () => ({
  useApproveEmployeeRequest: () => ({ mutate: mockApproveMutate, isPending: false }),
  useRejectEmployeeRequest: () => ({ mutate: mockRejectMutate, isPending: false }),
}))

// ── Fixture ────────────────────────────────────────────────────────────────────

const request: EmployeeRequest = {
  id: 'req-1',
  employee_id: 'emp-1',
  employee_name: 'Ana García',
  type: 'LEAVE',
  status: 'PENDING',
  payload: { leave_type_id: 1, start_date: '2026-06-15', end_date: '2026-06-15' },
  requestable: null,
  requested_by: 'emp-1',
  approved_by: null,
  approved_at: null,
  notes: null,
  rejection_reason: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('useLeaveReviewDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handleApprove calls approve mutation with the request id and no overrides', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    act(() => result.current.handleApprove())

    expect(mockApproveMutate).toHaveBeenCalledWith(
      { id: 'req-1' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('handleApprove onSuccess calls onClose', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    act(() => result.current.handleApprove())

    const [, options] = mockApproveMutate.mock.calls[0] as [unknown, { onSuccess: () => void }]
    options.onSuccess()

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('handleReject sends the trimmed rejectReason', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    act(() => result.current.setRejectReason('  No hay cobertura  '))
    act(() => result.current.handleReject())

    expect(mockRejectMutate).toHaveBeenCalledWith(
      { id: 'req-1', reason: 'No hay cobertura' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('handleReject sends undefined reason when empty', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    act(() => result.current.handleReject())

    expect(mockRejectMutate).toHaveBeenCalledWith(
      { id: 'req-1', reason: undefined },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('handleReject onSuccess closes the confirm dialog, clears the reason, and closes the panel', async () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useLeaveReviewDialog(request, onClose))

    act(() => {
      result.current.setShowRejectConfirm(true)
      result.current.setRejectReason('motivo')
    })
    act(() => result.current.handleReject())

    const [, options] = mockRejectMutate.mock.calls[0] as [unknown, { onSuccess: () => void }]
    act(() => options.onSuccess())

    await waitFor(() => {
      expect(result.current.showRejectConfirm).toBe(false)
      expect(result.current.rejectReason).toBe('')
    })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
